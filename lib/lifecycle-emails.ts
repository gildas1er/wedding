// E-mails de fin d'espace (serveur uniquement), envoyés par la tâche de nuit /api/cron/purge :
//   • « Vos souvenirs vous attendent » au passage en mode souvenir ;
//   • dernier rappel, 3 jours avant la suppression.
// Envoi par l'API de Brevo. Variables Vercel : BREVO_API_KEY, EMAIL_SENDER (adresse validée dans Brevo),
// EMAIL_SENDER_NAME (facultatif, « WeddingStudio » par défaut). Sans elles, rien n'est envoyé
// et aucun espace n'est supprimé (la suppression attend le dernier rappel).
import { EXTENSION_MONTHS, EXTENSION_PRICE_XOF, extensionWhatsappLink } from './lifecycle';
import { formatXof } from './plan';

export const emailsConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_SENDER);

export type LifecycleEmail = { subject: string; html: string; text: string };

type EmailCouple = { couple: string; firstName: string; marriageId: string; deleteAt: Date; siteUrl: string };

const longDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Mise en page commune : carte blanche sur fond ivoire, compatible avec les messageries (styles en ligne)
function layout(title: string, paragraphs: string[], date: { label: string; urgent: boolean }, c: EmailCouple, footer: string) {
  const souvenirs = `${c.siteUrl}/dashboard/souvenir`;
  const extend = extensionWhatsappLink(c.couple, c.marriageId);
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2f2b27">${t}</p>`;
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f2ec;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px 24px">
<tr><td>
<p style="margin:0 0 18px;font-family:Georgia,serif;font-size:18px;color:#862d47">WeddingStudio</p>
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;font-size:24px;line-height:1.25;color:#1f1b18">${title}</h1>
${paragraphs.map(p).join('')}
<p style="margin:4px 0 20px;padding:12px;border-radius:8px;text-align:center;font-weight:bold;font-size:15px;${date.urgent ? 'background:#fbe9e6;color:#9b2c25' : 'background:#f5ecdc;color:#7a5a22'}">${date.label}</p>
<a href="${souvenirs}" style="display:block;margin:0 0 10px;padding:13px;border-radius:8px;background:#1f1b18;color:#ffffff;text-align:center;font-weight:bold;font-size:15px;text-decoration:none">Télécharger mes souvenirs</a>
<a href="${extend}" style="display:block;margin:0 0 20px;padding:12px;border-radius:8px;border:1px solid #d4ccc0;color:#1f1b18;text-align:center;font-weight:bold;font-size:14px;text-decoration:none">Garder mon espace ${EXTENSION_MONTHS} mois de plus · ${formatXof(EXTENSION_PRICE_XOF)}</a>
<p style="margin:0;font-size:12px;line-height:1.5;color:#7b7369">${footer}</p>
</td></tr></table>
</td></tr></table></body></html>`;
}

export function souvenirEmail(c: EmailCouple): LifecycleEmail {
  const names = escape(c.couple || 'Chers mariés');
  const date = `Il sera supprimé le ${longDate(c.deleteAt)}`;
  const paragraphs = [
    'Votre espace est maintenant en <strong>mode souvenir</strong> : tout reste consultable, mais ne peut plus être modifié.',
    'D’ici la date ci-dessous, pensez à récupérer les photos de vos invités, les messages de votre livre d’or, votre liste d’invités et votre budget.',
  ];
  return {
    subject: 'Vos souvenirs de mariage vous attendent 💍',
    html: layout(`${names}, merci d’avoir organisé votre mariage avec nous`, paragraphs, { label: date, urgent: false }, c,
      'Vous recevez cet e-mail parce que vous avez un espace WeddingStudio. Après la suppression, rien ne pourra être récupéré.'),
    text: `${c.couple || 'Chers mariés'}, votre espace WeddingStudio passe en mode souvenir.\n${date}.\nTéléchargez vos souvenirs : ${c.siteUrl}/dashboard/souvenir\nGarder l'espace ${EXTENSION_MONTHS} mois de plus (${formatXof(EXTENSION_PRICE_XOF)}) : ${extensionWhatsappLink(c.couple, c.marriageId)}`,
  };
}

export function finalReminderEmail(c: EmailCouple, days: number): LifecycleEmail {
  const when = `${longDate(c.deleteAt)}, à 3 h`;
  const inDays = days <= 1 ? 'cette nuit' : `dans ${days} jours`;
  const paragraphs = [
    `Bonjour ${escape(c.firstName || 'à vous')}, ${inDays}, l’espace de votre mariage et votre compte seront <strong>supprimés définitivement</strong>.`,
    'C’est le dernier moment pour télécharger vos photos, votre livre d’or et vos listes, ou pour prolonger votre espace.',
  ];
  return {
    subject: `Dernier rappel : votre espace sera supprimé ${inDays}`,
    html: layout('Dernier rappel avant la suppression de votre espace', paragraphs, { label: when.charAt(0).toUpperCase() + when.slice(1), urgent: true }, c,
      'Après cette date, nous ne pourrons plus rien récupérer. Déjà téléchargé ? Vous n’avez rien à faire.'),
    text: `Dernier rappel : l'espace WeddingStudio de votre mariage sera supprimé ${inDays} (${when}).\nTéléchargez vos souvenirs : ${c.siteUrl}/dashboard/souvenir\nProlonger : ${extensionWhatsappLink(c.couple, c.marriageId)}`,
  };
}

// Envoi par Brevo (API transactionnelle). Renvoie une erreur lisible, ou null si l'e-mail est parti.
export async function sendEmail(to: string, email: LifecycleEmail): Promise<string | null> {
  if (!emailsConfigured()) return 'E-mails non configurés (BREVO_API_KEY, EMAIL_SENDER).';
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY!, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_SENDER, name: process.env.EMAIL_SENDER_NAME || 'WeddingStudio' },
        to: [{ email: to }],
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: ['fin-espace'],
      }),
    });
    if (!res.ok) return `Brevo ${res.status} : ${(await res.text()).slice(0, 200)}`;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Envoi impossible';
  }
}
