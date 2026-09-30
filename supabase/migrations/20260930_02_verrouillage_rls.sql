-- =====================================================================
-- MIGRATION 2/2 — Verrouillage des accès (RLS).
-- À exécuter APRÈS avoir déployé le nouveau code
-- (sinon le RSVP et "Trouver ma table" cesseraient de fonctionner).
-- Tout est dans une transaction : en cas d'erreur, rien n'est appliqué.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- invite — CRITIQUE : n'importe qui pouvait lire les invités (noms,
-- téléphones, notes) de TOUS les mariages et modifier n'importe quelle fiche.
-- Les invités passent désormais par get_rsvp_invitation / submit_rsvp /
-- find_guest_table.
-- ---------------------------------------------------------------------
drop policy if exists "Allow public read access on invite"   on public.invite;
drop policy if exists "Enable read access for all users"     on public.invite;
drop policy if exists "Mise à jour non inscrit"              on public.invite;
drop policy if exists "Acces Invites"                        on public.invite;

create policy "Les mariés gèrent leurs invités" on public.invite
  for all to authenticated
  using      (marriage_id in (select id from public.marriages where user_id = (select auth.uid())))
  with check (marriage_id in (select id from public.marriages where user_id = (select auth.uid())));


-- ---------------------------------------------------------------------
-- marriages — la lecture anonyme exposait tous les mariages (user_id,
-- budget, adresses). 11 règles en double remplacées par 4 règles claires.
-- ---------------------------------------------------------------------
drop policy if exists "Acces Mariage"                                           on public.marriages;
drop policy if exists "Enable read access for all users"                        on public.marriages;
drop policy if exists "Insertion par le propriétaire"                           on public.marriages;
drop policy if exists "Lecture par le propriétaire"                             on public.marriages;
drop policy if exists "Les utilisateurs peuvent créer leur propre mariage"      on public.marriages;
drop policy if exists "Les utilisateurs peuvent modifier leur propre mariage"   on public.marriages;
drop policy if exists "Les utilisateurs peuvent voir leur propre mariage"       on public.marriages;
drop policy if exists "Modification par le propriétaire"                        on public.marriages;
drop policy if exists "Users can only view their own wedding"                   on public.marriages;
drop policy if exists "Users can update their own wedding"                      on public.marriages;

create policy "Lecture de son mariage"      on public.marriages for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Création de son mariage"     on public.marriages for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Modification de son mariage" on public.marriages for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Suppression de son mariage"  on public.marriages for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------
-- tables — lecture anonyme retirée (la recherche publique passe par find_guest_table)
-- ---------------------------------------------------------------------
drop policy if exists "Allow public read access on tables" on public.tables;


-- ---------------------------------------------------------------------
-- guests (ancienne table) — lecture anonyme de noms, e-mails et téléphones
-- ---------------------------------------------------------------------
drop policy if exists "Enable read access for all users" on public.guests;


-- ---------------------------------------------------------------------
-- guestbook — reste public (voulu), mais un message doit viser un mariage existant
-- ---------------------------------------------------------------------
drop policy if exists "Tout le monde peut ajouter un message" on public.guestbook;
create policy "Tout le monde peut ajouter un message" on public.guestbook
  for insert to anon, authenticated
  with check (marriage_id is not null and public.marriage_exists(marriage_id));


-- ---------------------------------------------------------------------
-- profiles — aucune règle listée : soit RLS est désactivé (table ouverte à tous),
-- soit la table est inaccessible. On l'active avec accès à sa propre ligne.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists "Lecture de son profil"      on public.profiles;
drop policy if exists "Modification de son profil" on public.profiles;
create policy "Lecture de son profil"      on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Modification de son profil" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

commit;


-- =====================================================================
-- À FAIRE PLUS TARD (laissé en commentaire volontairement)
-- =====================================================================

-- A) Quand SUPABASE_SERVICE_ROLE_KEY est configurée côté serveur, la galerie
--    n'a plus besoin de la lecture anonyme des métadonnées photos :
-- drop policy if exists "Autoriser la lecture publique des métadonnées" on public.photos_metadata;
--    …puis rendre le bucket "wedding-photos" privé (Storage > bucket > Edit > Public: off).

-- B) Un seul mariage par compte (le code utilise .single()).
--    Vérifier d'abord qu'il n'y a pas de doublons :
-- select user_id, count(*) from public.marriages group by user_id having count(*) > 1;
--    Si la requête ne renvoie rien :
-- alter table public.marriages alter column user_id set not null;
-- alter table public.marriages add constraint marriages_user_id_key unique (user_id);
