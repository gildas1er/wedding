import { after, NextResponse } from 'next/server';
import { SeverityNumber, posthogLogger, posthogLogProvider } from '../../../../instrumentation';
import { serviceSupabase } from '../../../../lib/premium-server';
import { deleteSpace } from '../../../../lib/account-server';
import { ACTIVE_MONTHS_AFTER_WEDDING, DELETE_MONTHS_AFTER_WEDDING, FINAL_REMINDER_DAYS, spaceLifecycle } from '../../../../lib/lifecycle';
import { emailsConfigured, finalReminderEmail, sendEmail, souvenirEmail } from '../../../../lib/lifecycle-emails';
import { contactEmail } from '../../../../lib/phone-auth';
import { getSiteUrl } from '../../../../lib/og';

export const dynamic = 'force-dynamic';
// Durée maximale accordée par Vercel à la tâche ; on s'arrête avant pour finir proprement
export const maxDuration = 60;
const TIME_BUDGET_MS = 45_000;
const BATCH = 50;
// Plan gratuit de Brevo : 300 e-mails par jour. Le reste part les nuits suivantes.
const MAX_EMAILS_PER_RUN = 250;
const DAY_MS = 86_400_000;

// Tâche planifiée (vercel.json, chaque nuit). Vercel envoie « Authorization: Bearer CRON_SECRET ».
// 1. E-mails (lib/lifecycle-emails.ts) : « Vos souvenirs vous attendent » au passage en mode souvenir,
//    puis le dernier rappel 3 jours avant la suppression. La date d'envoi est notée sur le mariage (migration 34).
// 2. Suppression des espaces 3 mois après le mariage, sauf prolongation ou transition en cours,
//    et seulement si le dernier rappel est parti (sinon la suppression attend).
// Seuls les espaces réellement arrivés au terme sont demandés à la base (les prolongés en sont exclus),
// les plus anciens d'abord, lot après lot jusqu'à épuisement : un espace prolongé ne peut plus en bloquer d'autres.
// Le bilan est noté dans le journal de l'administration dès qu'un espace est supprimé ou qu'une suppression échoue.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante.' }, { status: 503 });
  }

  const db = serviceSupabase();
  const started = Date.now();
  const now = new Date();
  // Mariage au plus tard ce jour-là, il y a 3 mois (même règle que spaceLifecycle)
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cutoff.setUTCMonth(cutoff.getUTCMonth() - DELETE_MONTHS_AFTER_WEDDING);

  const notices = await sendNotices(db, now, started);

  const deleted: string[] = [];
  const failed: string[] = [];
  const skip = new Set<string>(); // échecs et cas limites : jamais redemandés pendant cette exécution
  let remaining = false;

  while (true) {
    if (Date.now() - started > TIME_BUDGET_MS) { remaining = true; break; }
    let query = db
      .from('marriages').select('id, user_id, wedding_date, kept_until, delete_after, final_reminder_at')
      .lte('wedding_date', cutoff.toISOString().slice(0, 10))
      .or(`kept_until.is.null,kept_until.lte.${now.toISOString()}`)
      .not('final_reminder_at', 'is', null)
      .order('wedding_date', { ascending: true })
      .order('id', { ascending: true })
      .limit(BATCH);
    if (skip.size) query = query.not('id', 'in', `(${[...skip].join(',')})`);
    const { data: candidates, error } = await query;
    if (error) {
      console.error('Purge :', error);
      await journal(db, { deleted, failed, error: error.message });
      return NextResponse.json({ error: error.message, deleted, failed }, { status: 500 });
    }
    if (!candidates?.length) break;

    for (const m of candidates) {
      if (Date.now() - started > TIME_BUDGET_MS) { remaining = true; break; }
      // Double vérification avec la règle de l'application avant toute suppression
      const { deleteAt } = spaceLifecycle(m, now);
      if (!deleteAt || deleteAt > now || !m.final_reminder_at) { skip.add(m.id); continue; }
      try {
        await deleteSpace(db, { marriageId: m.id, userId: m.user_id });
        deleted.push(m.id.slice(0, 8));
      } catch (e) {
        console.error(`Purge ${m.id} :`, e);
        failed.push(m.id.slice(0, 8));
        skip.add(m.id);
      }
    }
    if (remaining) break;
  }

  if (deleted.length || failed.length || remaining) await journal(db, { deleted, failed, remaining });
  if (notices.sent.length || notices.failed.length || notices.waiting) await journal(db, notices, 'rappels');
  posthogLogger?.emit({
    body: 'space_purge_completed',
    severityNumber: SeverityNumber.INFO,
    attributes: {
      deleted_count: deleted.length,
      failed_count: failed.length,
      remaining,
      emails_sent: notices.sent.length,
      emails_failed: notices.failed.length,
    },
  });
  if (posthogLogger) after(async () => { await posthogLogProvider?.forceFlush(); });
  return NextResponse.json({ deleted, failed, remaining, emails: notices });
}

type NoticeRow = {
  id: string; user_id: string | null; partner_1_name: string | null; partner_2_name: string | null;
  wedding_date: string | null; kept_until: string | null; delete_after: string | null;
  souvenir_email_at: string | null; final_reminder_at: string | null;
};

// E-mails du mode souvenir et du dernier rappel. Un e-mail qui n'a pas pu partir est retenté la nuit suivante.
async function sendNotices(db: ReturnType<typeof serviceSupabase>, now: Date, started: number) {
  const sent: string[] = [];
  const failed: string[] = [];
  let waiting = 0; // e-mails dus mais pas envoyés (e-mails non configurés, limite de la nuit)
  const configured = emailsConfigured();
  const siteUrl = getSiteUrl();
  // Mariages passés depuis au moins 1 mois (mode souvenir), ou prolongés : ceux qui peuvent attendre un e-mail
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  since.setUTCMonth(since.getUTCMonth() - ACTIVE_MONTHS_AFTER_WEDDING);

  for (let from = 0; ; from += 500) {
    if (Date.now() - started > TIME_BUDGET_MS / 2) break;
    const { data, error } = await db
      .from('marriages')
      .select('id, user_id, partner_1_name, partner_2_name, wedding_date, kept_until, delete_after, souvenir_email_at, final_reminder_at')
      .lte('wedding_date', since.toISOString().slice(0, 10))
      .is('final_reminder_at', null)
      .order('wedding_date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 499);
    if (error) { failed.push(`lecture : ${error.message}`); break; }
    if (!data?.length) break;

    for (const m of data as NoticeRow[]) {
      const life = spaceLifecycle(m, now);
      if (!life.deleteAt || !life.activeUntil) continue;
      const final = now.getTime() >= life.deleteAt.getTime() - FINAL_REMINDER_DAYS * DAY_MS;
      const souvenir = !final && now >= life.activeUntil && !m.souvenir_email_at;
      if (!final && !souvenir) continue;
      if (!configured || sent.length >= MAX_EMAILS_PER_RUN || Date.now() - started > TIME_BUDGET_MS / 2) { waiting++; continue; }

      const couple = [m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & ');
      const { data: account } = m.user_id ? await db.auth.admin.getUserById(m.user_id) : { data: null };
      const to = contactEmail(account?.user);
      const stamp = new Date().toISOString();
      const update = final ? { final_reminder_at: stamp, souvenir_email_at: m.souvenir_email_at ?? stamp } : { souvenir_email_at: stamp };
      if (!to) {
        // Compte sans adresse e-mail : le couple est prévenu dans l'application ; son numéro est noté
        // dans le journal pour le prévenir aussi sur WhatsApp depuis l'administration
        await db.from('marriages').update(update).eq('id', m.id);
        const tel = (account?.user?.user_metadata?.phone as string | undefined) || null;
        sent.push(`${m.id.slice(0, 8)} (sans e-mail${tel ? ` · à prévenir sur WhatsApp : ${tel}` : ''})`);
        continue;
      }
      const c = { couple, firstName: m.partner_1_name ?? '', marriageId: m.id, deleteAt: life.deleteAt, siteUrl };
      const days = Math.max(1, Math.ceil((life.deleteAt.getTime() - now.getTime()) / DAY_MS));
      const problem = await sendEmail(to, final ? finalReminderEmail(c, days) : souvenirEmail(c));
      if (problem) { failed.push(`${m.id.slice(0, 8)} : ${problem}`); continue; }
      await db.from('marriages').update(update).eq('id', m.id);
      sent.push(`${m.id.slice(0, 8)} (${final ? 'dernier rappel' : 'mode souvenir'})`);
    }
    if (data.length < 500) break;
  }
  return { sent, failed, waiting, configured };
}

// Trace dans le journal de l'administration (onglet Journal)
async function journal(db: ReturnType<typeof serviceSupabase>, details: Record<string, unknown>, action: 'purge' | 'rappels' = 'purge') {
  const d = details as { deleted?: string[]; failed?: string[] };
  await db.from('admin_actions').insert({
    admin_email: 'tâche automatique',
    marriage_id: null,
    couple: null,
    action,
    details: { ...details, deleted_count: d.deleted?.length ?? 0, failed_count: d.failed?.length ?? 0 },
  }).then(() => undefined, () => undefined);
}
