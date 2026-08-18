-- ============================================================
-- SCHEMA COMPLET - Discord Alternatif
-- A coller UNE FOIS dans Supabase > SQL Editor > Run
-- ============================================================

-- Extension pour générer des codes d'invitation aléatoires
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. PROFILS UTILISATEURS
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  status text default 'online' check (status in ('online','idle','dnd','offline')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Les profils sont visibles par tous les connectés"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Un user peut modifier son propre profil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Création automatique du profil à l'inscription
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. SERVEURS
-- ------------------------------------------------------------
create table public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  owner_id uuid references public.profiles(id) on delete cascade,
  invite_code text unique not null default substr(md5(random()::text), 0, 9),
  created_at timestamptz default now()
);

alter table public.servers enable row level security;

-- ------------------------------------------------------------
-- 3. MEMBRES DE SERVEUR
-- ------------------------------------------------------------
create table public.server_members (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.servers(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz default now(),
  unique (server_id, user_id)
);

alter table public.server_members enable row level security;

create policy "Un membre voit les membres de ses serveurs"
  on public.server_members for select
  to authenticated
  using (
    server_id in (select server_id from public.server_members where user_id = auth.uid())
  );

create policy "Un user peut rejoindre un serveur"
  on public.server_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Un user peut quitter un serveur"
  on public.server_members for delete
  to authenticated
  using (user_id = auth.uid());

-- Policies serveurs (dépendent de server_members donc définies après)
create policy "Un user voit les serveurs dont il est membre"
  on public.servers for select
  to authenticated
  using (
    id in (select server_id from public.server_members where user_id = auth.uid())
  );

create policy "Un user connecté peut créer un serveur"
  on public.servers for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Le owner peut modifier son serveur"
  on public.servers for update
  to authenticated
  using (owner_id = auth.uid());

-- Ajout auto du créateur comme owner + membre
create function public.handle_new_server()
returns trigger as $$
begin
  insert into public.server_members (server_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_server_created
  after insert on public.servers
  for each row execute procedure public.handle_new_server();

-- ------------------------------------------------------------
-- 4. SALONS (channels)
-- ------------------------------------------------------------
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.servers(id) on delete cascade,
  name text not null,
  type text default 'text' check (type in ('text','voice')),
  position int default 0,
  created_at timestamptz default now()
);

alter table public.channels enable row level security;

create policy "Un membre voit les salons de ses serveurs"
  on public.channels for select
  to authenticated
  using (
    server_id in (select server_id from public.server_members where user_id = auth.uid())
  );

create policy "Un membre peut créer un salon"
  on public.channels for insert
  to authenticated
  with check (
    server_id in (select server_id from public.server_members where user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 5. MESSAGES
-- ------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  mentions uuid[] default '{}',
  created_at timestamptz default now(),
  edited_at timestamptz
);

alter table public.messages enable row level security;

create policy "Un membre voit les messages des salons de ses serveurs"
  on public.messages for select
  to authenticated
  using (
    channel_id in (
      select c.id from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where sm.user_id = auth.uid()
    )
  );

create policy "Un membre peut poster dans les salons de ses serveurs"
  on public.messages for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and channel_id in (
      select c.id from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where sm.user_id = auth.uid()
    )
  );

create policy "Un user peut modifier ses propres messages"
  on public.messages for update
  to authenticated
  using (author_id = auth.uid());

create policy "Un user peut supprimer ses propres messages"
  on public.messages for delete
  to authenticated
  using (author_id = auth.uid());

-- ------------------------------------------------------------
-- 6. NOTIFICATIONS (mentions)
-- ------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Un user voit ses propres notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Un user peut marquer ses notifs comme lues"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

-- Création auto de notifs quand un message mentionne quelqu'un
create function public.handle_new_message_mentions()
returns trigger as $$
declare
  mentioned_id uuid;
begin
  if new.mentions is not null then
    foreach mentioned_id in array new.mentions loop
      if mentioned_id != new.author_id then
        insert into public.notifications (user_id, message_id)
        values (mentioned_id, new.id);
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.handle_new_message_mentions();

-- ------------------------------------------------------------
-- 7. LAYOUT UI PERSONNALISÉ (pour la v1.5, préparé à l'avance)
-- ------------------------------------------------------------
create table public.ui_layouts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  layout jsonb default '{}',
  updated_at timestamptz default now()
);

alter table public.ui_layouts enable row level security;

create policy "Un user gère son propre layout"
  on public.ui_layouts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 8. ACTIVER REALTIME sur les tables qui en ont besoin
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.server_members;

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
