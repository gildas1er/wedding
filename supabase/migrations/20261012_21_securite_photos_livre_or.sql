-- =====================================================================
-- MIGRATION 21 — Sécurité : photos et livre d'or ne sont plus lisibles par tous.
-- Problème corrigé (audit de sécurité du 12 octobre 2026, constat 2) :
--   n'importe qui, sans compte, pouvait lire les fiches photo (noms et messages des invités)
--   et tout le livre d'or de TOUS les mariages, et lister les fichiers des trois espaces de stockage.
-- Désormais :
--   • fiches photo : lues seulement par les mariés (page Album) ou le serveur ;
--   • livre d'or : les invités lisent et écrivent celui d'UN mariage via deux fonctions
--     (get_guestbook, add_guestbook_message) ; les mariés lisent le leur ;
--   • stockage : plus de liste des fichiers. Les liens publics des photos, images et musiques
--     continuent de fonctionner (buckets publics), et les invités peuvent toujours envoyer.
-- Les règles existantes ont été créées dans le tableau de bord Supabase : leurs noms ne sont pas connus.
-- La migration les retrouve elle-même et affiche dans « Messages » ce qu'elle a changé.
-- À lancer APRÈS le déploiement du code (le livre d'or utilise les nouvelles fonctions).
-- Relançable sans risque.
-- =====================================================================

-- 1. Retire les règles de LECTURE ouvertes sur une table ; une règle « tout autoriser » (ALL)
--    est remplacée par une règle d'AJOUT seul, pour garder les envois des invités.
create or replace function pg_temp.close_reads(p_schema text, p_table text, p_keep text[], p_filter text default null)
returns void language plpgsql as $$
declare
  r record;
  v_check text;
begin
  for r in
    select policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = p_schema and tablename = p_table
      and cmd in ('SELECT', 'ALL')
      and not (policyname = any (p_keep))
      -- pour le stockage : seulement les règles qui visent nos buckets (ou tous les buckets)
      and (p_filter is null
           or coalesce(qual, '') ~ p_filter or coalesce(with_check, '') ~ p_filter
           or (coalesce(qual, '') !~ 'bucket_id' and coalesce(with_check, '') !~ 'bucket_id'))
  loop
    begin
      execute format('drop policy %I on %I.%I', r.policyname, p_schema, p_table);
      if r.cmd = 'ALL' then
        v_check := coalesce(r.with_check, r.qual, 'true');
        execute format('create policy %I on %I.%I for insert to %s with check (%s)',
          left(r.policyname || ' (ajout seul)', 63), p_schema, p_table,
          (select string_agg(quote_ident(x), ', ') from unnest(r.roles) x), v_check);
        raise notice '% : règle « % » (lecture + écriture) remplacée par une règle d''ajout seul', p_table, r.policyname;
      else
        raise notice '% : règle de lecture « % » supprimée', p_table, r.policyname;
      end if;
    exception when insufficient_privilege then
      raise notice 'À FAIRE À LA MAIN — %.% : impossible de modifier la règle « % » ici. Ouvrez Storage > Policies et supprimez sa partie lecture (SELECT).', p_schema, p_table, r.policyname;
    end;
  end loop;
end;
$$;

-- 2. Fiches photo : lecture réservée aux mariés (le serveur utilise la clé service)
select pg_temp.close_reads('public', 'photos_metadata', array['Les mariés lisent les photos de leur album']);
alter table public.photos_metadata enable row level security;
drop policy if exists "Les mariés lisent les photos de leur album" on public.photos_metadata;
create policy "Les mariés lisent les photos de leur album" on public.photos_metadata
  for select to authenticated
  using (marriage_id in (select id from public.marriages where user_id = (select auth.uid())));

-- 3. Livre d'or : lecture par les mariés ; les invités passent par les fonctions ci-dessous
select pg_temp.close_reads('public', 'guestbook', array['Les mariés lisent leur livre d''or', 'Tout le monde peut ajouter un message']);
alter table public.guestbook enable row level security;
drop policy if exists "Les mariés lisent leur livre d'or" on public.guestbook;
create policy "Les mariés lisent leur livre d'or" on public.guestbook
  for select to authenticated
  using (marriage_id in (select id from public.marriages where user_id = (select auth.uid())));

-- Messages d'UN mariage (page publique du livre d'or)
-- (renvoie la ligne complète : fonctionne quels que soient les types des colonnes en production)
create or replace function public.get_guestbook(p_marriage_id uuid)
returns setof public.guestbook
language sql stable security definer set search_path = public
as $$
  select g.*
  from public.guestbook g
  where g.marriage_id = p_marriage_id
  order by g.created_at desc
  limit 300;
$$;

-- Ajout d'un message : longueurs bornées, photo obligatoirement rangée dans le dossier de ce mariage
create or replace function public.add_guestbook_message(p_marriage_id uuid, p_author text, p_message text, p_image_url text default null)
returns setof public.guestbook
language plpgsql security definer set search_path = public
as $$
declare
  v_author text := left(trim(coalesce(p_author, '')), 80);
  v_message text := left(trim(coalesce(p_message, '')), 2000);
  v_image text := nullif(trim(coalesce(p_image_url, '')), '');
begin
  if not exists (select 1 from public.marriages m where m.id = p_marriage_id) then
    raise exception 'GUESTBOOK_UNKNOWN' using errcode = 'P0001', detail = 'Livre d''or introuvable.';
  end if;
  if v_author = '' or v_message = '' then
    raise exception 'GUESTBOOK_EMPTY' using errcode = 'P0001', detail = 'Indiquez votre nom et votre message.';
  end if;
  if v_image is not null and (v_image !~ '^https://' or position('/storage/v1/object/public/guestbook-photos/' || p_marriage_id::text || '/' in v_image) = 0) then
    raise exception 'GUESTBOOK_IMAGE' using errcode = 'P0001', detail = 'Photo invalide.';
  end if;
  return query
    insert into public.guestbook as g (marriage_id, author_name, message, image_url)
    values (p_marriage_id, v_author, v_message, v_image)
    returning g.*;
end;
$$;

revoke all on function public.get_guestbook(uuid) from public;
revoke all on function public.add_guestbook_message(uuid, text, text, text) from public;
grant execute on function public.get_guestbook(uuid) to anon, authenticated;
grant execute on function public.add_guestbook_message(uuid, text, text, text) to anon, authenticated;

-- 4. Stockage : plus de liste des fichiers pour les visiteurs ni pour les autres couples.
--    Les fichiers restent accessibles par leur lien public ; le serveur (clé service) n'est pas concerné.
select pg_temp.close_reads('storage', 'objects', array[]::text[], '(wedding-photos|guestbook-photos|invitations)');

-- 5. Bilan : règles de lecture encore ouvertes (doit être vide)
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname, roles from pg_policies
    where cmd in ('SELECT', 'ALL')
      and ((schemaname = 'public' and tablename in ('photos_metadata', 'guestbook') and not ('authenticated' = any (roles) and coalesce(qual, '') ~ 'auth\.uid'))
        or (schemaname = 'storage' and tablename = 'objects' and (coalesce(qual, '') ~ '(wedding-photos|guestbook-photos|invitations)' or coalesce(qual, '') !~ 'bucket_id')))
  loop
    raise notice 'ENCORE OUVERTE : %.% « % » (%)', r.schemaname, r.tablename, r.policyname, r.roles;
  end loop;
end $$;
