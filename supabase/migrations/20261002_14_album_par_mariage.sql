-- =====================================================================
-- MIGRATION 14 — Album photo rattaché à chaque mariage.
--   • Chaque photo envoyée par un invité appartient à un mariage (photos_metadata.marriage_id).
--   • Les fichiers sont rangés dans wedding-photos/invites/<identifiant du mariage>/.
--   • En mode souvenir, l'envoi de photos est clos (comme les réponses et le livre d'or).
-- À lancer après la migration 13.
-- =====================================================================

alter table public.photos_metadata add column if not exists marriage_id uuid references public.marriages (id) on delete cascade;
create index if not exists photos_metadata_marriage_id_idx on public.photos_metadata (marriage_id, created_at desc);

-- Les nouvelles photos doivent appartenir à un mariage existant
create or replace function public.require_photo_marriage()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  if new.marriage_id is null or not exists (select 1 from public.marriages where id = new.marriage_id) then
    raise exception 'ALBUM_REQUIRED'
      using errcode = 'P0001', detail = 'Utilisez le lien d''envoi de photos partagé par les mariés.';
  end if;
  -- Le fichier doit être rangé dans le dossier du mariage
  if new.file_name not like 'invites/' || new.marriage_id::text || '/%' then
    raise exception 'ALBUM_PATH'
      using errcode = 'P0001', detail = 'Emplacement de photo invalide.';
  end if;
  return new;
end;
$$;

drop trigger if exists photos_metadata_require_marriage on public.photos_metadata;
create trigger photos_metadata_require_marriage
  before insert on public.photos_metadata
  for each row execute function public.require_photo_marriage();

-- Mode souvenir : plus d'envoi ni de modification (réutilise la règle de la migration 13)
drop trigger if exists photos_metadata_space_active on public.photos_metadata;
create trigger photos_metadata_space_active
  before insert or update or delete on public.photos_metadata
  for each row execute function public.enforce_space_active();

revoke all on function public.require_photo_marriage() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Anciennes photos (envoyées avant cette migration, sans mariage) : elles restent visibles
-- dans la galerie à mot de passe (/galerie). Pour les rattacher à VOTRE mariage :
--   update public.photos_metadata set marriage_id = '<identifiant complet du mariage>'
--   where marriage_id is null;
-- (elles apparaîtront alors dans « Album photos » de votre espace)
-- ---------------------------------------------------------------------
