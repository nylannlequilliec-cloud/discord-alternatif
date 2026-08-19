-- ============================================================
-- SCHEMA COMPLET - Discord Alternatif (V1 + V2)
-- À exécuter dans Supabase > SQL Editor > Run
--
-- ⚠️ CE FICHIER EST LE SEUL À EXÉCUTER.
-- Il remplace schema.sql (V1) et schema_v2.sql (V2).
-- Il est SÛR À RELANCER : toutes les instructions sont
-- idempotentes (if not exists / drop if exists / or replace).
-- Tu peux le coller et le relancer à chaque mise à jour.
-- ============================================================

-- Extension pour générer des codes d'invitation aléatoires
create extension if not exists "pgcrypto";

-- ============================================================
-- FONCTIONS D'AIDE (security definer)
-- Elles évitent les erreurs "infinite recursion detected in
-- policy" : les policies ne référencent plus leur propre table.
-- ============================================================
create or replace function public.is_server_member(sid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.server_members sm
    where sm.server_id = sid and sm.user_id = auth.uid()
  );
$$;

create or replace function public.get_server_role(sid uuid)
returns text language sql security definer stable as $$
  select role from public.server_members sm
  where sm.server_id = sid and sm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_banned(sid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.bans b
    where b.server_id = sid and b.user_id = auth.uid()
  );
$$;

create or replace function public.can_read_channel(cid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.channels c
    join public.server_members sm on sm.server_id = c.server_id
    where c.id = cid and sm.user_id = auth.uid()
  );
$$;

create or replace function public.can_post_in_channel(cid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.channels c
    join public.server_members sm on sm.server_id = c.server_id
    where c.id = cid and sm.user_id = auth.uid()
      and not exists (select 1 from public.bans b where b.server_id = c.server_id and b.user_id = auth.uid())
      and (sm.muted_until is null or sm.muted_until < now())
  );
$$;

create or replace function public.in_dm_conversation(cid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.dm_members m
    where m.conversation_id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_pin_in_channel(cid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.channels c
    join public.server_members sm on sm.server_id = c.server_id
    where c.id = cid and sm.user_id = auth.uid()
      and sm.role in ('owner','admin')
  );
$$;

-- ------------------------------------------------------------
-- 1. PROFILS UTILISATEURS
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  status text default 'online' check (status in ('online','idle','dnd','offline')),
  created_at timestamptz default now()
);

alter table public.profiles add column if not exists custom_status text;

alter table public.profiles enable row level security;

drop policy if exists "Les profils sont visibles par tous les connectés" on public.profiles;
create policy "Les profils sont visibles par tous les connectés"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Un user peut modifier son propre profil" on public.profiles;
create policy "Un user peut modifier son propre profil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. SERVEURS
-- ------------------------------------------------------------
create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  owner_id uuid references public.profiles(id) on delete cascade,
  invite_code text unique not null default substr(md5(random()::text), 0, 9),
  created_at timestamptz default now()
);

alter table public.servers enable row level security;

drop policy if exists "Un user connecté peut créer un serveur" on public.servers;
create policy "Un user connecté peut créer un serveur"
  on public.servers for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Le owner peut modifier son serveur" on public.servers;
create policy "Le owner peut modifier son serveur"
  on public.servers for update
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Le owner peut supprimer son serveur" on public.servers;
create policy "Le owner peut supprimer son serveur"
  on public.servers for delete
  to authenticated
  using (owner_id = auth.uid());

-- Ajout auto du créateur comme owner + membre
create or replace function public.handle_new_server()
returns trigger as $$
begin
  insert into public.server_members (server_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_server_created on public.servers;
create trigger on_server_created
  after insert on public.servers
  for each row execute procedure public.handle_new_server();

-- ------------------------------------------------------------
-- 3. MEMBRES DE SERVEUR (+ colonne mute pour la modération)
-- ------------------------------------------------------------
create table if not exists public.server_members (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.servers(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz default now(),
  muted_until timestamptz,
  unique (server_id, user_id)
);

alter table public.server_members enable row level security;

-- Colonne mute : nécessaire aussi si la table existait déjà (V1)
alter table public.server_members add column if not exists muted_until timestamptz;

-- La table bans est créée ICI (avant les policies qui la référencent)
-- pour que le script fonctionne aussi sur une base neuve.
create table if not exists public.bans (
  server_id uuid references public.servers(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  banned_by uuid references public.profiles(id),
  reason text,
  created_at timestamptz default now(),
  primary key (server_id, user_id)
);

alter table public.bans enable row level security;

drop policy if exists "Un membre voit les membres de ses serveurs" on public.server_members;
create policy "Un membre voit les membres de ses serveurs"
  on public.server_members for select
  to authenticated
  using (public.is_server_member(server_id));

-- Rejointure interdite si banni (remplace la policy V1 du même nom)
drop policy if exists "Un user peut rejoindre un serveur" on public.server_members;
drop policy if exists "Un user peut rejoindre un serveur (sauf banni)" on public.server_members;
create policy "Un user peut rejoindre un serveur (sauf banni)"
  on public.server_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_banned(server_id)
  );

drop policy if exists "Un user peut quitter un serveur" on public.server_members;
create policy "Un user peut quitter un serveur"
  on public.server_members for delete
  to authenticated
  using (user_id = auth.uid());

-- Policy de lecture des serveurs : définie ici car elle référence
-- server_members (qui vient d'être créée) — base neuve compatible.
drop policy if exists "Un user voit les serveurs dont il est membre" on public.servers;
create policy "Un user voit les serveurs dont il est membre"
  on public.servers for select
  to authenticated
  using (public.is_server_member(id));

-- ------------------------------------------------------------
-- 4. SALONS (channels)
-- ------------------------------------------------------------
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.servers(id) on delete cascade,
  name text not null,
  type text default 'text' check (type in ('text','voice')),
  position int default 0,
  created_at timestamptz default now()
);

alter table public.channels enable row level security;

drop policy if exists "Un membre voit les salons de ses serveurs" on public.channels;
create policy "Un membre voit les salons de ses serveurs"
  on public.channels for select
  to authenticated
  using (public.is_server_member(server_id));

drop policy if exists "Un membre peut créer un salon" on public.channels;
create policy "Un membre peut créer un salon"
  on public.channels for insert
  to authenticated
  with check (public.is_server_member(server_id));

-- ------------------------------------------------------------
-- 5. MESSAGES (+ fils, pièces jointes, édition, réponses)
-- ------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  mentions uuid[] default '{}',
  created_at timestamptz default now(),
  edited_at timestamptz
);

alter table public.messages add column if not exists thread_id uuid references public.messages(id) on delete cascade;
alter table public.messages add column if not exists attachments jsonb default '[]'::jsonb;
alter table public.messages add column if not exists reply_to_id uuid references public.messages(id) on delete set null;

alter table public.messages enable row level security;

drop policy if exists "Un membre voit les messages des salons de ses serveurs" on public.messages;
create policy "Un membre voit les messages des salons de ses serveurs"
  on public.messages for select
  to authenticated
  using (public.can_read_channel(channel_id));

-- Écriture interdite si banni ou muet (remplace la policy V1 du même nom)
drop policy if exists "Un membre peut poster dans les salons de ses serveurs" on public.messages;
drop policy if exists "Un membre peut poster (sauf banni/muet)" on public.messages;
create policy "Un membre peut poster (sauf banni/muet)"
  on public.messages for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.can_post_in_channel(channel_id)
  );

drop policy if exists "Un user peut modifier ses propres messages" on public.messages;
create policy "Un user peut modifier ses propres messages"
  on public.messages for update
  to authenticated
  using (author_id = auth.uid());

drop policy if exists "Un user peut supprimer ses propres messages" on public.messages;
create policy "Un user peut supprimer ses propres messages"
  on public.messages for delete
  to authenticated
  using (author_id = auth.uid());

-- ------------------------------------------------------------
-- 6. NOTIFICATIONS (mentions + DM)
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  message_id uuid,
  type text default 'mention',
  read boolean default false,
  created_at timestamptz default now()
);

-- Colonne type : nécessaire aussi si la table existait déjà (V1)
alter table public.notifications add column if not exists type text default 'mention';

alter table public.notifications enable row level security;

drop policy if exists "Un user voit ses propres notifications" on public.notifications;
create policy "Un user voit ses propres notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Un user peut marquer ses notifs comme lues" on public.notifications;
create policy "Un user peut marquer ses notifs comme lues"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

-- Création auto de notifs quand un message mentionne quelqu'un
create or replace function public.handle_new_message_mentions()
returns trigger as $$
declare
  mentioned_id uuid;
begin
  if new.mentions is not null then
    foreach mentioned_id in array new.mentions loop
      if mentioned_id != new.author_id then
        insert into public.notifications (user_id, message_id, type)
        values (mentioned_id, new.id, 'mention');
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.handle_new_message_mentions();

-- ------------------------------------------------------------
-- 7. LAYOUT UI PERSONNALISÉ (éditeur d'interface)
-- ------------------------------------------------------------
create table if not exists public.ui_layouts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  layout jsonb default '{}',
  updated_at timestamptz default now()
);

alter table public.ui_layouts enable row level security;

drop policy if exists "Un user gère son propre layout" on public.ui_layouts;
create policy "Un user gère son propre layout"
  on public.ui_layouts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 8. MESSAGES PRIVÉS (DM)
-- ------------------------------------------------------------
create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table if not exists public.dm_members (
  conversation_id uuid references public.dm_conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.dm_conversations(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  edited_at timestamptz
);

alter table public.dm_conversations enable row level security;
alter table public.dm_members enable row level security;
alter table public.dm_messages enable row level security;

drop policy if exists "dm_conversations: voir ses conversations" on public.dm_conversations;
create policy "dm_conversations: voir ses conversations"
  on public.dm_conversations for select
  to authenticated
  using (public.in_dm_conversation(id));

drop policy if exists "dm_conversations: créer une conversation" on public.dm_conversations;
create policy "dm_conversations: créer une conversation"
  on public.dm_conversations for insert
  to authenticated
  with check (true);

drop policy if exists "dm_members: voir les membres de ses conversations" on public.dm_members;
create policy "dm_members: voir les membres de ses conversations"
  on public.dm_members for select
  to authenticated
  using (public.in_dm_conversation(conversation_id));

drop policy if exists "dm_members: ajouter un membre via la fonction dédiée" on public.dm_members;
create policy "dm_members: ajouter un membre via la fonction dédiée"
  on public.dm_members for insert
  to authenticated
  with check (true);

drop policy if exists "dm_messages: lire les messages de ses conversations" on public.dm_messages;
create policy "dm_messages: lire les messages de ses conversations"
  on public.dm_messages for select
  to authenticated
  using (public.in_dm_conversation(conversation_id));

drop policy if exists "dm_messages: poster dans ses conversations" on public.dm_messages;
create policy "dm_messages: poster dans ses conversations"
  on public.dm_messages for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.in_dm_conversation(conversation_id)
  );

drop policy if exists "dm_messages: modifier ses messages" on public.dm_messages;
create policy "dm_messages: modifier ses messages"
  on public.dm_messages for update
  to authenticated
  using (author_id = auth.uid());

drop policy if exists "dm_messages: supprimer ses messages" on public.dm_messages;
create policy "dm_messages: supprimer ses messages"
  on public.dm_messages for delete
  to authenticated
  using (author_id = auth.uid());

-- RPC : récupérer (ou créer) la conversation entre deux users
create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql security definer
as $$
declare
  my_id uuid := auth.uid();
  conv uuid;
begin
  if my_id is null then
    raise exception 'Non connecté';
  end if;
  if other_user_id = my_id then
    raise exception 'Impossible de se parler à soi-même';
  end if;

  select dm_members.conversation_id into conv
  from public.dm_members
  where user_id = my_id
    and conversation_id in (
      select conversation_id from public.dm_members where user_id = other_user_id
    )
  limit 1;

  if conv is null then
    insert into public.dm_conversations default values returning id into conv;
    insert into public.dm_members (conversation_id, user_id) values (conv, my_id), (conv, other_user_id);
  end if;

  return conv;
end;
$$;

-- Notif automatique quand un DM arrive
create or replace function public.handle_new_dm_notification()
returns trigger as $$
declare
  other uuid;
begin
  select user_id into other
  from public.dm_members
  where conversation_id = new.conversation_id and user_id != new.author_id
  limit 1;

  if other is not null then
    insert into public.notifications (user_id, message_id, type)
    values (other, new.id, 'dm');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_dm_message_created on public.dm_messages;
create trigger on_dm_message_created
  after insert on public.dm_messages
  for each row execute procedure public.handle_new_dm_notification();

-- ------------------------------------------------------------
-- 9. RÉACTIONS
-- ------------------------------------------------------------
create table if not exists public.reactions (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.reactions enable row level security;

drop policy if exists "reactions: lire (membres du serveur du salon)" on public.reactions;
create policy "reactions: lire (membres du serveur du salon)"
  on public.reactions for select
  to authenticated
  using (
    message_id in (select m.id from public.messages m where public.can_read_channel(m.channel_id))
  );

drop policy if exists "reactions: ajouter sa réaction" on public.reactions;
create policy "reactions: ajouter sa réaction"
  on public.reactions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "reactions: retirer sa réaction" on public.reactions;
create policy "reactions: retirer sa réaction"
  on public.reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 10. MODÉRATION : POLICIES DES BANS
-- (la table bans a été créée en section 3, avant les policies
--  de server_members et messages qui la référencent)
-- ------------------------------------------------------------
drop policy if exists "bans: voir (admin/owner)" on public.bans;
create policy "bans: voir (admin/owner)"
  on public.bans for select
  to authenticated
  using (public.get_server_role(server_id) in ('owner','admin'));

drop policy if exists "bans: bannir (admin/owner)" on public.bans;
create policy "bans: bannir (admin/owner)"
  on public.bans for insert
  to authenticated
  with check (public.get_server_role(server_id) in ('owner','admin'));

drop policy if exists "bans: débannir (admin/owner)" on public.bans;
create policy "bans: débannir (admin/owner)"
  on public.bans for delete
  to authenticated
  using (public.get_server_role(server_id) in ('owner','admin'));

-- ------------------------------------------------------------
-- 11. ABONNEMENTS PUSH (notifications navigateur)
-- ------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  keys jsonb not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push: gérer ses propres abonnements" on public.push_subscriptions;
create policy "push: gérer ses propres abonnements"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 12. STORAGE : buckets avatars + fichiers
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('files', 'files', true)
on conflict (id) do nothing;

drop policy if exists "avatars: lecture publique" on storage.objects;
create policy "avatars: lecture publique"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars: écriture connecté" on storage.objects;
create policy "avatars: écriture connecté"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "files: lecture publique" on storage.objects;
create policy "files: lecture publique"
  on storage.objects for select
  to public
  using (bucket_id = 'files');

drop policy if exists "files: écriture connecté" on storage.objects;
create policy "files: écriture connecté"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'files');

-- ------------------------------------------------------------
-- 12b. AMIS (demandes, acceptation, liste)
-- ------------------------------------------------------------
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  friend_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz default now(),
  unique (user_id, friend_id)
);

alter table public.friends enable row level security;

drop policy if exists "friends: voir ses relations" on public.friends;
create policy "friends: voir ses relations"
  on public.friends for select
  to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists "friends: envoyer une demande" on public.friends;
create policy "friends: envoyer une demande"
  on public.friends for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "friends: accepter/refuser" on public.friends;
create policy "friends: accepter/refuser"
  on public.friends for update
  to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists "friends: retirer un ami" on public.friends;
create policy "friends: retirer un ami"
  on public.friends for delete
  to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());

-- RPC : envoyer une demande d'ami par pseudo (insensible à la casse)
create or replace function public.add_friend(target_username text)
returns uuid
language plpgsql security definer
as $$
declare
  my_id uuid := auth.uid();
  target uuid;
begin
  if my_id is null then
    raise exception 'Non connecté';
  end if;

  select id into target
  from public.profiles
  where lower(username) = lower(target_username)
  limit 1;

  if target is null then
    raise exception 'Utilisateur introuvable';
  end if;
  if target = my_id then
    raise exception 'Impossible de s''ajouter soi-même';
  end if;

  if exists (
    select 1 from public.friends
    where (user_id = my_id and friend_id = target)
       or (user_id = target and friend_id = my_id)
  ) then
    raise exception 'Demande déjà envoyée ou déjà amis';
  end if;

  insert into public.friends (user_id, friend_id, status)
  values (my_id, target, 'pending');

  return target;
end;
$$;

-- RPC : accepter une demande reçue
create or replace function public.accept_friend(friend_uid uuid)
returns boolean
language plpgsql security definer
as $$
begin
  update public.friends
  set status = 'accepted'
  where user_id = friend_uid and friend_id = auth.uid() and status = 'pending';
  return found;
end;
$$;

-- RPC : refuser (ou annuler) une relation
create or replace function public.decline_friend(friend_uid uuid)
returns boolean
language plpgsql security definer
as $$
begin
  delete from public.friends
  where (user_id = auth.uid() and friend_id = friend_uid)
     or (user_id = friend_uid and friend_id = auth.uid());
  return found;
end;
$$;

-- ------------------------------------------------------------
-- 12c. MESSAGES ÉPINGLÉS
-- ------------------------------------------------------------
create table if not exists public.pins (
  message_id uuid primary key references public.messages(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  pinned_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.pins enable row level security;

drop policy if exists "pins: voir les épingles du salon" on public.pins;
create policy "pins: voir les épingles du salon"
  on public.pins for select
  to authenticated
  using (public.can_read_channel(channel_id));

drop policy if exists "pins: épingler (admin/owner)" on public.pins;
create policy "pins: épingler (admin/owner)"
  on public.pins for insert
  to authenticated
  with check (public.can_pin_in_channel(channel_id));

drop policy if exists "pins: désépingler (admin/owner)" on public.pins;
create policy "pins: désépingler (admin/owner)"
  on public.pins for delete
  to authenticated
  using (public.can_pin_in_channel(channel_id));

-- ------------------------------------------------------------
-- 13. REALTIME (temps réel) — sans erreur si déjà activé
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'public.messages',
    'public.notifications',
    'public.server_members',
    'public.dm_messages',
    'public.dm_members',
    'public.dm_conversations',
    'public.reactions',
    'public.friends',
    'public.pins'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %s', t);
    exception when duplicate_object then
      null; -- déjà dans la publication : on ignore
    end;
  end loop;
end $$;

-- ============================================================
-- FIN DU SCRIPT — tu peux le relancer sans risque à tout moment
-- ============================================================
