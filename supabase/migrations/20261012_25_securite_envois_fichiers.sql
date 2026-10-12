-- =====================================================================
-- MIGRATION 25 — Sécurité : règles d'envoi des fichiers (audit du 12 octobre 2026, point 10.4).
-- Avant : les invités pouvaient envoyer n'importe quel fichier, de n'importe quelle taille, à n'importe quel
-- endroit des espaces de stockage publics (vidéos lourdes, programmes, contenus douteux hébergés par le projet).
-- Désormais :
--   • taille et types limités pour chaque espace :
--       wedding-photos    5 Mo   images (le site compresse les photos à 1,5 Mo environ)
--       guestbook-photos  5 Mo   images (idem depuis la mise à jour de la page du livre d'or)
--       invitations      10 Mo   images et musiques mp3 / m4a (images de fond et musique du faire-part)
--   • un fichier ne peut être envoyé que dans le dossier d'un mariage existant ; pour les images et
--     musiques du faire-part, seulement dans celui du couple connecté.
-- Les fichiers déjà envoyés ne sont pas touchés. Relançable.
-- Si Supabase refuse une étape ici, l'onglet « Messages » indique quoi régler à la main (Storage).
-- =====================================================================

-- 1. Taille et types autorisés
do $$
begin
  update storage.buckets set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'wedding-photos';
  update storage.buckets set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'guestbook-photos';
  update storage.buckets set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4']
  where id = 'invitations';
  raise notice 'Tailles et types : réglés pour wedding-photos (5 Mo), guestbook-photos (5 Mo), invitations (10 Mo).';
exception when insufficient_privilege then
  raise notice 'À FAIRE À LA MAIN — Storage > chaque bucket > Edit bucket : « Restrict file size » et « Allowed MIME types » (voir l''en-tête de ce fichier).';
end $$;

-- 2. Le dossier d'un mariage existe-t-il ? (utilisable par les règles du stockage, sans ouvrir la table)
create or replace function public.storage_folder_marriage(p_folder text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and exists (select 1 from public.marriages where id = p_folder::uuid);
$$;
revoke all on function public.storage_folder_marriage(text) from public;
grant execute on function public.storage_folder_marriage(text) to anon, authenticated;

-- 3. Règles « restrictives » : elles s'ajoutent aux règles d'envoi existantes (toutes doivent être respectées)
do $$
begin
  drop policy if exists "Envois : dossier d'un mariage existant" on storage.objects;
  create policy "Envois : dossier d'un mariage existant" on storage.objects
    as restrictive for insert to anon, authenticated
    with check (
      case bucket_id
        -- photos des invités : invites/<mariage>/<fichier>
        when 'wedding-photos' then name ~ '^invites/[^/]+/[^/]+$' and public.storage_folder_marriage(split_part(name, '/', 2))
        -- photos du livre d'or : <mariage>/<fichier>
        when 'guestbook-photos' then name ~ '^[^/]+/[^/]+$' and public.storage_folder_marriage(split_part(name, '/', 1))
        -- faire-part : backgrounds/<mariage du couple connecté>-… ou music/<mariage du couple connecté>-…
        when 'invitations' then auth.uid() is not null
          and name ~ '^(backgrounds|music)/[0-9a-f-]{36}-[^/]+$'
          and exists (select 1 from public.marriages m where m.user_id = auth.uid() and m.id::text = substr(split_part(name, '/', 2), 1, 36))
        else true
      end
    );
  raise notice 'Règle de dossier : créée sur storage.objects.';
exception when insufficient_privilege then
  raise notice 'À FAIRE À LA MAIN — impossible de créer la règle de dossier sur storage.objects depuis ici. Envoyez-moi ce message : je vous donnerai la marche à suivre dans Storage > Policies.';
end $$;
