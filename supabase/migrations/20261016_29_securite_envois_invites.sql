-- =====================================================================
-- MIGRATION 29 — Sécurité : envois des invités (revue de sécurité du 16 octobre 2026, points 1 et 2).
-- 1. Livre d'or : la photo d'un message doit être une photo de NOTRE stockage, dans le dossier du
--    mariage. Avant, il suffisait que l'adresse CONTIENNE ce chemin : une image d'un autre site
--    (choquante, ou qui relève l'adresse IP des visiteurs) pouvait être affichée dans le livre d'or.
-- 2. Limites d'envoi, pour qu'un programme automatique ne puisse pas remplir un album ou un livre d'or :
--      • messages du livre d'or : 15 par heure par appareil (adresse IP) et par mariage,
--        400 par jour par mariage ;
--      • photos de l'album : 150 par heure par appareil et par mariage, 600 par heure par mariage,
--        1 500 photos et 2,5 Go au plus par mariage ;
--      • photos du livre d'or : 100 par heure et 600 au total par mariage ;
--      • taille d'une photo d'invité : 3 Mo au plus (le site les compresse à 1,5 Mo environ).
--    Les seuils sont larges : le jour J, beaucoup d'invités partagent la même connexion (Wi-Fi de la
--    salle, réseau mobile) ; un vrai invité ne voit jamais la limite.
-- À lancer APRÈS les migrations 21, 23 et 25. Relançable.
-- =====================================================================

-- Adresse publique du stockage de CE projet Supabase (à adapter si le projet change).
-- Un motif plus large (« n'importe quel *.supabase.co ») ne suffit pas : chacun peut créer son propre projet.
create or replace function public.guestbook_photo_ok(p_marriage_id uuid, p_url text)
returns boolean
language sql stable security definer set search_path = public, storage
as $$
  select p_url ~ ('^https://rzzngyohhlyonkgdmozk\.supabase\.co/storage/v1/object/public/guestbook-photos/'
                  || p_marriage_id::text || '/[A-Za-z0-9._-]+$')
     -- et le fichier existe bien dans notre stockage, dans le dossier du mariage
     and exists (
       select 1 from storage.objects o
       where o.bucket_id = 'guestbook-photos'
         and o.name = p_marriage_id::text || '/' || regexp_replace(p_url, '^.*/', '')
     );
$$;
revoke all on function public.guestbook_photo_ok(uuid, text) from public, anon, authenticated;

-- 1 et 2a. Livre d'or : photo de notre stockage seulement, et limite de messages
create or replace function public.add_guestbook_message(p_marriage_id uuid, p_author text, p_message text, p_image_url text default null)
returns setof public.guestbook
language plpgsql security definer set search_path = public
as $$
declare
  v_author text := left(trim(coalesce(p_author, '')), 80);
  v_message text := left(trim(coalesce(p_message, '')), 2000);
  v_image text := nullif(trim(coalesce(p_image_url, '')), '');
  v_ip_key text := 'gb:' || p_marriage_id::text || ':' || public.request_ip();
  v_day_key text := 'gb:' || p_marriage_id::text;
begin
  if not exists (select 1 from public.marriages m where m.id = p_marriage_id) then
    raise exception 'GUESTBOOK_UNKNOWN' using errcode = 'P0001', detail = 'Livre d''or introuvable.';
  end if;
  if v_author = '' or v_message = '' then
    raise exception 'GUESTBOOK_EMPTY' using errcode = 'P0001', detail = 'Indiquez votre nom et votre message.';
  end if;
  -- L'adresse doit être celle d'une photo de notre stockage, dans le dossier du mariage
  if v_image is not null and not public.guestbook_photo_ok(p_marriage_id, v_image) then
    raise exception 'GUESTBOOK_IMAGE' using errcode = 'P0001', detail = 'Photo invalide.';
  end if;
  if public.rate_count(v_ip_key, interval '1 hour') >= 15 or public.rate_count(v_day_key, interval '1 day') >= 400 then
    raise exception 'GUESTBOOK_RATE' using errcode = 'P0001', detail = 'Beaucoup de messages ont été envoyés en peu de temps. Réessayez dans un moment.';
  end if;
  perform public.rate_hit(v_ip_key);
  perform public.rate_hit(v_day_key);
  return query
    insert into public.guestbook as g (marriage_id, author_name, message, image_url)
    values (p_marriage_id, v_author, v_message, v_image)
    returning g.*;
end;
$$;
revoke all on function public.add_guestbook_message(uuid, text, text, text) from public;
grant execute on function public.add_guestbook_message(uuid, text, text, text) to anon, authenticated;

-- 2b. Album : limite des photos enregistrées par les invités (nom et message de la photo)
create or replace function public.limit_guest_photos()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_ip_key text;
  v_all_key text;
begin
  if public.is_privileged_writer() or new.marriage_id is null then
    return new;
  end if;
  v_ip_key := 'photo:' || new.marriage_id::text || ':' || public.request_ip();
  v_all_key := 'photo:' || new.marriage_id::text;
  if (select count(*) from public.photos_metadata where marriage_id = new.marriage_id) >= 1500 then
    raise exception 'ALBUM_FULL' using errcode = 'P0001', detail = 'L''album de ce mariage est complet.';
  end if;
  if public.rate_count(v_ip_key, interval '1 hour') >= 150 or public.rate_count(v_all_key, interval '1 hour') >= 600 then
    raise exception 'ALBUM_RATE' using errcode = 'P0001', detail = 'Beaucoup de photos ont été envoyées en peu de temps. Réessayez dans un moment.';
  end if;
  perform public.rate_hit(v_ip_key);
  perform public.rate_hit(v_all_key);
  return new;
end;
$$;
revoke all on function public.limit_guest_photos() from public, anon, authenticated;

drop trigger if exists photos_metadata_limit on public.photos_metadata;
create trigger photos_metadata_limit
  before insert on public.photos_metadata
  for each row execute function public.limit_guest_photos();

-- 2c. Stockage : place prise par les fichiers d'un mariage (le stockage ne transmet pas l'adresse IP :
--     limites par mariage seulement)
create or replace function public.storage_upload_quota_ok(p_bucket text, p_name text)
returns boolean
language sql stable security definer set search_path = public, storage
as $$
  with f as (
    select case p_bucket
      when 'wedding-photos' then 'invites/' || split_part(p_name, '/', 2) || '/'
      when 'guestbook-photos' then split_part(p_name, '/', 1) || '/'
    end as prefix
  ), s as (
    select count(*) filter (where o.created_at > now() - interval '1 hour') as hour_n,
           count(*) as total_n,
           coalesce(sum(nullif(o.metadata ->> 'size', '')::bigint), 0) as bytes
    from storage.objects o, f
    where f.prefix is not null and o.bucket_id = p_bucket and o.name like f.prefix || '%'
  )
  select case p_bucket
    when 'wedding-photos' then hour_n < 600 and total_n < 1500 and bytes < 2500::bigint * 1024 * 1024
    when 'guestbook-photos' then hour_n < 100 and total_n < 600
    else true
  end
  from s;
$$;
revoke all on function public.storage_upload_quota_ok(text, text) from public;
grant execute on function public.storage_upload_quota_ok(text, text) to anon, authenticated;

do $$
begin
  drop policy if exists "Envois : place limitée par mariage" on storage.objects;
  create policy "Envois : place limitée par mariage" on storage.objects
    as restrictive for insert to anon, authenticated
    with check (bucket_id not in ('wedding-photos', 'guestbook-photos') or public.storage_upload_quota_ok(bucket_id, name));
  raise notice 'Règle de place par mariage : créée sur storage.objects.';
exception when insufficient_privilege then
  raise notice 'À FAIRE À LA MAIN — impossible de créer la règle de place sur storage.objects depuis ici. Envoyez-moi ce message : je vous donnerai la marche à suivre dans Storage > Policies.';
end $$;

-- 2d. Taille d'une photo d'invité : 3 Mo au plus
do $$
begin
  update storage.buckets set file_size_limit = 3 * 1024 * 1024 where id in ('wedding-photos', 'guestbook-photos');
  raise notice 'Taille des photos d''invités : 3 Mo au plus.';
exception when insufficient_privilege then
  raise notice 'À FAIRE À LA MAIN — Storage > wedding-photos et guestbook-photos > Edit bucket : « Restrict file size » à 3 MB.';
end $$;

-- 3. Bilan : messages déjà enregistrés avec une photo venant d'un autre site (à examiner, puis effacer si besoin)
do $$
declare n integer;
begin
  select count(*) into n from public.guestbook g
  where g.image_url is not null
    and g.image_url !~ ('^https://rzzngyohhlyonkgdmozk\.supabase\.co/storage/v1/object/public/guestbook-photos/' || g.marriage_id::text || '/[A-Za-z0-9._-]+$');
  if n > 0 then
    raise notice 'ATTENTION : % message(s) du livre d''or ont une photo venant d''un autre site. Pour les voir : select id, marriage_id, author_name, image_url from public.guestbook where image_url is not null and image_url !~ ''^https://rzzngyohhlyonkgdmozk\.supabase\.co/storage/v1/object/public/guestbook-photos/'';', n;
  else
    raise notice 'Livre d''or : aucune photo extérieure enregistrée.';
  end if;
end $$;
