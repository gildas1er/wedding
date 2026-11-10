-- =====================================================================
-- MIGRATION 35 — Cartes de remerciements envoyées aux invités après le mariage.
--   - thanks_settings : le modèle choisi par le couple (« lettre » ou « souvenir ») et son mot commun.
--   - thanks_cards : une ligne par invité à qui le couple a préparé ou envoyé sa carte
--     (photo de l'album et message du livre d'or choisis, mot personnel, dates d'envoi et d'ouverture).
--   Tables à part (et non des colonnes de marriages / invite) : elles restent modifiables en mode
--   souvenir, car envoyer un merci ne change pas l'espace. Lecture et écriture : le couple seulement.
--   La carte de l'invité est lue par le serveur (/api/merci, clé service), jamais par un visiteur.
--   À lancer après la 34.
-- =====================================================================

create table if not exists public.thanks_settings (
  marriage_id uuid primary key references public.marriages (id) on delete cascade,
  template text not null default 'lettre' check (template in ('lettre', 'souvenir')),
  message text check (char_length(message) <= 600),
  updated_at timestamptz not null default now()
);

create table if not exists public.thanks_cards (
  invite_id uuid primary key references public.invite (id) on delete cascade,
  marriage_id uuid not null references public.marriages (id) on delete cascade,
  photo_file text check (char_length(photo_file) <= 300),   -- chemin dans wedding-photos (album)
  quote_id text check (char_length(quote_id) <= 64),         -- message du livre d'or
  note text check (char_length(note) <= 300),                -- mot personnel (formules payantes)
  sent_at timestamptz,
  opened_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists thanks_cards_marriage_idx on public.thanks_cards (marriage_id);

alter table public.thanks_settings enable row level security;
alter table public.thanks_cards enable row level security;

drop policy if exists "Les mariés gèrent leurs remerciements" on public.thanks_settings;
create policy "Les mariés gèrent leurs remerciements" on public.thanks_settings
  for all to authenticated
  using (marriage_id in (select id from public.marriages where user_id = (select auth.uid())))
  with check (marriage_id in (select id from public.marriages where user_id = (select auth.uid())));

drop policy if exists "Les mariés gèrent leurs cartes" on public.thanks_cards;
create policy "Les mariés gèrent leurs cartes" on public.thanks_cards
  for all to authenticated
  using (marriage_id in (select id from public.marriages where user_id = (select auth.uid())))
  with check (
    marriage_id in (select id from public.marriages where user_id = (select auth.uid()))
    and exists (select 1 from public.invite i where i.id = invite_id and i.marriage_id = thanks_cards.marriage_id)
  );

-- L'ouverture de la carte par l'invité n'est écrite que par le serveur
create or replace function public.protect_thanks_opened()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_privileged_writer() then
    new.opened_at := case when tg_op = 'INSERT' then null else old.opened_at end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.protect_thanks_opened() from public, anon, authenticated;

drop trigger if exists thanks_cards_protect on public.thanks_cards;
create trigger thanks_cards_protect
  before insert or update on public.thanks_cards
  for each row execute function public.protect_thanks_opened();

revoke all on table public.thanks_settings, public.thanks_cards from anon;
grant select, insert, update, delete on table public.thanks_settings, public.thanks_cards to authenticated;
