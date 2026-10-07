-- =====================================================================
-- MIGRATION 15 — Les mariés connectés peuvent lire les photos de LEUR album.
-- Sans cette règle, la lecture de photos_metadata n'est permise qu'aux visiteurs anonymes :
-- la page « Album photos » restait vide tant que SUPABASE_SERVICE_ROLE_KEY n'était pas configurée.
-- Sans risque (ajout d'une règle de lecture). À lancer après la migration 14.
-- =====================================================================

alter table public.photos_metadata enable row level security;

drop policy if exists "Les mariés lisent les photos de leur album" on public.photos_metadata;
create policy "Les mariés lisent les photos de leur album" on public.photos_metadata
  for select to authenticated
  using (marriage_id in (select id from public.marriages where user_id = (select auth.uid())));
