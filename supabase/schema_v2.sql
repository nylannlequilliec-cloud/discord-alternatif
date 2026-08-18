-- ============================================================
-- SCHEMA V2 - Discord Alternatif
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor > Run
-- Ajoute : DM, fils, réactions, modération, uploads, push
-- (La V1 continue de fonctionner sans ce script ; les nouvelles
--  fonctions s'activent dès que celui-ci est exécuté.)
-- ============================================================

-- ------------------------------------------------------------
-- 1. MESSAGES PRIVÉS (DM)
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

-- Un user voit les conversations dont il est membre
create policy "dm_conversations: voir ses conversations"
  on public.dm_conversations for select
  to authenticated
  using (id in (select conversation_id from public.dm_members where user_id = auth.uid()));

create policy "dm_conversations: créer une conversation"
  on public.dm_conversations for insert
  to authenticated
  with check (true);

create policy "dm_members: voir les membres de ses conversations"
  on public.dm_members for select
  to authenticated
  using (conversation_id in (select conversation_id from public.dm_members where user_id = auth.uid()));

create policy "dm_members: ajouter un membre via la fonction dédiée"
  on public.dm_members for insert
  to authenticated
  with check (true);

create policy "dm_messages: lire les messages de ses conversations"
  on public.dm_messages for select
  to authenticated
  using (conversation_id in (select conversation_id from public.dm_members where user_id = auth.uid()));

create policy "dm_messages: poster dans ses conversations"
  on public.dm_messages for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and conversation_id in (select conversation_id from public.dm_members where user_id = auth.uid())
  );

create policy "dm_messages: modifier ses messages"
  on public.dm_messages for update
  to authenticated
  using (author_id = auth.uid());

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
-- 2. FILS DE DISCUSSION (threads) + PIÈCES JOINTES
-- ------------------------------------------------------------
alter table public.messages add column if not exists thread_id uuid references public.messages(id) on delete cascade;
alter table public.messages add column if not exists attachments jsonb default '[]'::jsonb;
alter table public.messages add column if not exists edited_at timestamptz;

-- ------------------------------------------------------------
-- 3. RÉACTIONS
-- ------------------------------------------------------------
create table if not exists public.reactions (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.reactions enable row level security;

create policy "reactions: lire (membres du serveur du salon)"
  on public.reactions for select
  to authenticated
  using (
    message_id in (
      select m.id from public.messages m
      join public.channels c on c.id = m.channel_id
      join public.server_members sm on sm.server_id = c.server_id
      where sm.user_id = auth.uid()
    )
  );

create policy "reactions: ajouter sa réaction"
  on public.reactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "reactions: retirer sa réaction"
  on public.reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4. MODÉRATION : BANS + MUTE
-- ------------------------------------------------------------
create table if not exists public.bans (
  server_id uuid references public.servers(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  banned_by uuid references public.profiles(id),
  reason text,
  created_at timestamptz default now(),
  primary key (server_id, user_id)
);

alter table public.bans enable row level security;

-- Seuls les admins/owner voient la liste des bans
create policy "bans: voir (admin/owner)"
  on public.bans for select
  to authenticated
  using (
    server_id in (
      select sm.server_id from public.server_members sm
      where sm.user_id = auth.uid() and sm.role in ('owner','admin')
    )
  );

create policy "bans: bannir (admin/owner)"
  on public.bans for insert
  to authenticated
  with check (
    server_id in (
      select sm.server_id from public.server_members sm
      where sm.user_id = auth.uid() and sm.role in ('owner','admin')
    )
  );

create policy "bans: débannir (admin/owner)"
  on public.bans for delete
  to authenticated
  using (
    server_id in (
      select sm.server_id from public.server_members sm
      where sm.user_id = auth.uid() and sm.role in ('owner','admin')
    )
  );

-- Mute : colonne sur server_members
alter table public.server_members add column if not exists muted_until timestamptz;

-- Bloque le rejointure si banni (remplace la policy d'insert existante)
drop policy if exists "Un user peut rejoindre un serveur" on public.server_members;
create policy "Un user peut rejoindre un serveur (sauf banni)"
  on public.server_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and server_id not in (
      select b.server_id from public.bans b where b.user_id = auth.uid()
    )
  );

-- Bloque l'écriture si banni ou muet (remplace la policy d'insert existante)
drop policy if exists "Un membre peut poster dans les salons de ses serveurs" on public.messages;
create policy "Un membre peut poster (sauf banni/muet)"
  on public.messages for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and channel_id in (
      select c.id from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where sm.user_id = auth.uid()
        and sm.server_id not in (select b.server_id from public.bans b where b.user_id = auth.uid())
        and (sm.muted_until is null or sm.muted_until < now())
    )
  );

-- ------------------------------------------------------------
-- 5. NOTIFICATIONS : type ('mention' | 'dm')
-- ------------------------------------------------------------
alter table public.notifications add column if not exists type text default 'mention';

-- ------------------------------------------------------------
-- 6. ABONNEMENTS PUSH
-- ------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  keys jsonb not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push: gérer ses propres abonnements"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 7. STORAGE : buckets avatars + fichiers
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
-- 8. REALTIME
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.dm_messages;
alter publication supabase_realtime add table public.dm_conversations;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.server_members;

-- ============================================================
-- FIN DU SCRIPT V2
-- ============================================================
