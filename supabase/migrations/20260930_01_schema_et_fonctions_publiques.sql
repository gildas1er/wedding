-- =====================================================================
-- MIGRATION 1/2 — Sans risque : n'enlève aucun accès existant.
-- À exécuter AVANT de déployer le nouveau code.
-- (Supabase > SQL Editor > coller > Run)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colonnes utilisées par le code mais absentes de la base
-- ---------------------------------------------------------------------
-- Plan de table : bouton VIP et création de table (échouaient jusqu'ici)
alter table public.tables   add column if not exists is_vip boolean not null default false;
-- RSVP : musique personnalisée (le code retombait toujours sur la musique par défaut)
alter table public.marriages add column if not exists music_url text;


-- ---------------------------------------------------------------------
-- 2. Index sur les clés les plus filtrées (toutes les pages filtrent par marriage_id)
-- ---------------------------------------------------------------------
create index if not exists marriages_user_id_idx        on public.marriages (user_id);
create index if not exists invite_marriage_id_idx       on public.invite (marriage_id);
create index if not exists invite_table_id_idx          on public.invite (table_id);
create index if not exists tables_marriage_id_idx       on public.tables (marriage_id);
create index if not exists tasks_marriage_id_idx        on public.tasks (marriage_id);
create index if not exists budget_items_marriage_id_idx on public.budget_items (marriage_id);
create index if not exists planning_marriage_id_idx     on public.planning_events (marriage_id);
create index if not exists guestbook_marriage_id_idx    on public.guestbook (marriage_id, created_at desc);


-- ---------------------------------------------------------------------
-- 3. Contraintes de cohérence
--    NOT VALID : s'applique aux nouvelles écritures sans bloquer sur les données existantes.
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.invite add constraint invite_status_check
    check (status is null or status in ('en_attente', 'confirmé', 'décliné')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.invite add constraint invite_guests_count_check
    check (guests_count is null or guests_count between 0 and 50) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.guestbook add constraint guestbook_lengths_check
    check (char_length(author_name) between 1 and 80 and char_length(message) between 1 and 1000) not valid;
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------
-- 4. Fonctions publiques pour les invités (remplacent les accès anonymes "true")
--    SECURITY DEFINER : elles lisent/écrivent à la place de l'invité, mais
--    uniquement ce qui est nécessaire, et seulement si l'invité connaît
--    à la fois l'identifiant du mariage ET son propre identifiant.
-- ---------------------------------------------------------------------

-- Le mariage existe-t-il ? (utilisé par les règles du livre d'or)
create or replace function public.marriage_exists(p_marriage_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.marriages where id = p_marriage_id);
$$;

-- Page RSVP : infos publiques du mariage + fiche de l'invité
create or replace function public.get_rsvp_invitation(p_marriage_id uuid, p_guest_id uuid default null)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'marriage', (
      select to_jsonb(m) from (
        select id, partner_1_name, partner_2_name, wedding_date,
               primary_color, invitation_text, bg_image_url, music_url,
               mairie_date, mairie_hour, mairie_location, mairie_maps_url,
               religious_date, religious_hour, religious_location, religious_maps_url,
               reception_hour, reception_location, reception_maps_url
        from public.marriages
        where id = p_marriage_id
      ) m
    ),
    'guest', (
      select to_jsonb(g) from (
        select id, name, status, guests_count, notes,
               attending_civil, attending_church, attending_reception
        from public.invite
        where id = p_guest_id and marriage_id = p_marriage_id
      ) g
    )
  );
$$;

-- Page RSVP : réponse de l'invité (ne touche qu'à ses champs de réponse)
create or replace function public.submit_rsvp(
  p_marriage_id uuid,
  p_guest_id uuid,
  p_status text,
  p_notes text default null,
  p_attending_civil boolean default true,
  p_attending_church boolean default true,
  p_attending_reception boolean default true
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_declined boolean := p_status = 'décliné';
begin
  if p_status is null or p_status not in ('confirmé', 'décliné') then
    raise exception 'Statut invalide' using errcode = '22023';
  end if;

  update public.invite set
    status              = p_status,
    -- l'invité ne peut pas augmenter son nombre d'accompagnants lui-même
    guests_count        = case when v_declined then 1 else guests_count end,
    notes               = nullif(left(trim(coalesce(p_notes, '')), 500), ''),
    attending_civil     = not v_declined and coalesce(p_attending_civil, false),
    attending_church    = not v_declined and coalesce(p_attending_church, false),
    attending_reception = not v_declined and coalesce(p_attending_reception, false)
  where id = p_guest_id and marriage_id = p_marriage_id;

  return found;
end;
$$;

-- Page "Trouver ma table" : recherche par nom (2 caractères min., 5 résultats max.)
create or replace function public.find_guest_table(p_marriage_id uuid, p_query text)
returns table (id uuid, name text, guests_count int, table_name text)
language sql stable security definer set search_path = public
as $$
  select i.id, i.name, coalesce(i.guests_count, 1), t.name
  from public.invite i
  left join public.tables t on t.id = i.table_id
  where i.marriage_id = p_marriage_id
    and char_length(trim(coalesce(p_query, ''))) >= 2
    and i.name ilike '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by i.name
  limit 5;
$$;

-- ---------------------------------------------------------------------
-- 5. Création automatique du mariage à l'inscription
--    Fonctionne même si la confirmation par e-mail est activée (pas encore de
--    session côté navigateur au moment de l'inscription).
--    Nom volontairement distinct de "handle_new_user" (souvent déjà utilisé pour profiles).
--    Ne bloque jamais l'inscription : en cas d'erreur, le navigateur crée le mariage
--    à la première connexion.
-- ---------------------------------------------------------------------
create or replace function public.create_marriage_for_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_p1 text := coalesce(nullif(trim(v_meta->>'partner_name_1'), ''), nullif(trim(v_meta->>'full_name'), ''), 'Partenaire 1');
  v_p2 text := coalesce(nullif(trim(v_meta->>'partner_name_2'), ''), 'Partenaire 2');
  v_date date;
begin
  begin
    v_date := nullif(v_meta->>'wedding_date', '')::date;
  exception when others then
    v_date := null;
  end;

  if not exists (select 1 from public.marriages where user_id = new.id) then
    insert into public.marriages (user_id, partner_1_name, partner_2_name, wedding_date, location_city, couple_slug)
    values (
      new.id, v_p1, v_p2,
      coalesce(v_date, (now() + interval '1 year')::date),
      'À définir',
      lower(regexp_replace(v_p1 || '-' || v_p2, '\s+', '-', 'g')) || '-' || floor(1000 + random() * 9000)::int
    );
  end if;
  return new;
exception when others then
  raise warning 'create_marriage_for_new_user: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_marriage on auth.users;
create trigger on_auth_user_created_marriage
  after insert on auth.users
  for each row execute function public.create_marriage_for_new_user();

revoke all on function public.create_marriage_for_new_user() from public, anon, authenticated;


revoke all on function public.marriage_exists(uuid) from public;
revoke all on function public.get_rsvp_invitation(uuid, uuid) from public;
revoke all on function public.submit_rsvp(uuid, uuid, text, text, boolean, boolean, boolean) from public;
revoke all on function public.find_guest_table(uuid, text) from public;

grant execute on function public.marriage_exists(uuid) to anon, authenticated;
grant execute on function public.get_rsvp_invitation(uuid, uuid) to anon, authenticated;
grant execute on function public.submit_rsvp(uuid, uuid, text, text, boolean, boolean, boolean) to anon, authenticated;
grant execute on function public.find_guest_table(uuid, text) to anon, authenticated;
