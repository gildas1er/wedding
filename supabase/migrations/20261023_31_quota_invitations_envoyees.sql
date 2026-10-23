-- =====================================================================
-- MIGRATION 31 — Quota « invitations envoyées », permanent.
--   Version gratuite : 30 personnes invitées (accompagnants compris).
--   Une invitation envoyée consomme définitivement sa place : supprimer
--   un invité ne libère plus de place.
--   Les paliers payants (Intime → Royal) ne sont PAS concernés : ils
--   gardent la limite de leur palier (100/150/200/250/300).
--   Aucune donnée existante n'est supprimée. À lancer après la 30.
--
--   Complète la migration 17 (limite « liste » : personnes présentes).
--   Ici on ajoute la limite « envoyées » (cumul, jamais décrémenté).
-- =====================================================================

-- 1. Compteur cumulatif sur le mariage (jamais décrémenté pour un non-privilégié)
alter table public.marriages
  add column if not exists invited_persons_used integer not null default 0;

-- 2. Mémoire par fiche : a-t-on déjà compté cette invitation ?
--    invitation_sent_at servira aussi à la future relance des invités sans réponse.
alter table public.invite
  add column if not exists invitation_sent_at timestamptz,
  add column if not exists counted_as_sent boolean not null default false;

-- 3. Reprise : les invitations déjà envoyées sont comptées une fois
update public.invite
   set counted_as_sent = true,
       invitation_sent_at = coalesce(invitation_sent_at, now())
 where invitation_sent is true and counted_as_sent is not true;

update public.marriages m
   set invited_persons_used = greatest(m.invited_persons_used, coalesce((
         select sum(greatest(coalesce(i.guests_count, 1), 1))
           from public.invite i
          where i.marriage_id = m.id and i.invitation_sent is true), 0));

-- 4. Le cumul ne redescend jamais (sauf admin / service role / éditeur SQL)
create or replace function public.guard_invited_usage()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_privileged_writer() then return new; end if;
  new.invited_persons_used := greatest(coalesce(new.invited_persons_used, 0), coalesce(old.invited_persons_used, 0));
  return new;
end;
$$;

drop trigger if exists marriages_guard_invited_usage on public.marriages;
create trigger marriages_guard_invited_usage
  before update on public.marriages
  for each row execute function public.guard_invited_usage();

-- 5. Compter au premier envoi, refuser au-delà de la limite gratuite
create or replace function public.count_sent_invitation()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_marriage public.marriages%rowtype;
  v_persons  integer := greatest(coalesce(new.guests_count, 1), 1);
begin
  if public.is_privileged_writer() then return new; end if;

  -- Uniquement le premier envoi (faux -> vrai), et une seule fois par fiche
  if not (new.invitation_sent and not coalesce(old.invitation_sent, false))
     or new.counted_as_sent then
    return new;
  end if;

  -- Verrou : deux envois simultanés ne peuvent pas dépasser la limite
  select * into v_marriage from public.marriages where id = new.marriage_id for update;

  -- Palier payant actif : NON concerné par la règle des 30 invitations envoyées
  if v_marriage.plan = 'premium'
     and (v_marriage.premium_until is null or v_marriage.premium_until > now()) then
    new.invitation_sent_at := coalesce(new.invitation_sent_at, now());
    new.counted_as_sent := true;
    return new;
  end if;

  -- Version gratuite : 30 personnes invitées au total (accompagnants compris)
  if coalesce(v_marriage.invited_persons_used, 0) + v_persons > 30 then
    raise exception 'GUEST_LIMIT_REACHED'
      using errcode = 'P0001', hint = 'premium',
      detail = format('Vos %s invitations gratuites ont été envoyées. Passez à une formule pour inviter davantage.',
                      coalesce(v_marriage.invited_persons_used, 0));
  end if;

  update public.marriages
     set invited_persons_used = coalesce(invited_persons_used, 0) + v_persons
   where id = new.marriage_id;

  new.invitation_sent_at := coalesce(new.invitation_sent_at, now());
  new.counted_as_sent := true;
  return new;
end;
$$;

drop trigger if exists invite_count_sent on public.invite;
create trigger invite_count_sent
  before update of invitation_sent on public.invite
  for each row execute function public.count_sent_invitation();

-- 6. Contrôle d'état (lecture) pour l'affichage éventuel côté serveur
create or replace function public.marriage_sent_quota(p_marriage_id uuid)
returns table (sent_limit integer, sent_used integer)
language sql stable security definer set search_path = public
as $$
  select
    case when m.plan = 'premium' and (m.premium_until is null or m.premium_until > now()) then null else 30 end,
    coalesce(m.invited_persons_used, 0)
  from public.marriages m
  where m.id = p_marriage_id;
$$;
grant execute on function public.marriage_sent_quota(uuid) to authenticated;

revoke all on function public.guard_invited_usage() from public, anon, authenticated;
revoke all on function public.count_sent_invitation() from public, anon, authenticated;
