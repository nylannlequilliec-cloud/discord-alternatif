-- ============================================================
-- FIX : création de serveur qui échoue silencieusement
-- Colle ce script dans Supabase > SQL Editor > Run
-- (sans risque, il ne fait que compléter ce qui existe déjà)
-- ============================================================

-- 1. Vérifie que le trigger existe bien
select tgname from pg_trigger where tgname = 'on_server_created';

-- 2. Vérifie qu'il n'y a pas eu d'erreur silencieuse en testant une policy
--    manquante : la policy INSERT sur server_members doit exister,
--    sinon le trigger (qui est SECURITY DEFINER donc bypass RLS) devrait
--    quand même fonctionner. On s'assure malgré tout que tout est présent.

-- 3. Recrée la fonction et le trigger au cas où l'un des deux
--    n'aurait pas été créé correctement au premier passage.
drop trigger if exists on_server_created on public.servers;
drop function if exists public.handle_new_server();

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

-- 4. Vérifie que la policy d'insertion sur servers existe et est correcte
drop policy if exists "Un user connecté peut créer un serveur" on public.servers;
create policy "Un user connecté peut créer un serveur"
  on public.servers for insert
  to authenticated
  with check (owner_id = auth.uid());

-- 5. Vérifie la policy de lecture (nécessaire pour le .select().single() après insert)
drop policy if exists "Un user voit les serveurs dont il est membre" on public.servers;
create policy "Un user voit les serveurs dont il est membre"
  on public.servers for select
  to authenticated
  using (
    id in (select server_id from public.server_members where user_id = auth.uid())
  );

-- ============================================================
-- FIN
-- ============================================================
