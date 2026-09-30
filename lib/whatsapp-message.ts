// Message d'invitation WhatsApp, personnalisable depuis le studio.
// Repères remplacés à l'envoi : {prenom} (nom de l'invité), {maries} (prénoms du couple), {lien} (lien RSVP personnel).

export const DEFAULT_WHATSAPP_TEMPLATE = `👑 *INVITATION OFFICIELLE* 👑

> NB : Cette invitation est strictement personnelle.

Bonjour *{prenom}* ! 👋

Nous avons l'immense joie de vous inviter à célébrer notre union. Votre présence à nos côtés rendra cette journée inoubliable ! 🕊️💍

📍 *Pour confirmer votre présence (RSVP) :*
Merci de cliquer sur le lien ci-dessous pour valider votre venue :
👉 {lien}

Nous avons hâte de partager ce moment unique avec vous ! 🥂🎉

_{maries}_`;

export const WHATSAPP_PLACEHOLDERS = [
  { token: '{prenom}', label: "Nom de l'invité" },
  { token: '{maries}', label: 'Vos prénoms' },
  { token: '{lien}', label: 'Lien de réponse' },
] as const;

export function hasLinkPlaceholder(template: string) {
  return /\{lien\}/i.test(template);
}

export function buildInvitationMessage(
  template: string | null | undefined,
  vars: { prenom: string; maries: string; lien: string }
) {
  let text = template?.trim() ? template : DEFAULT_WHATSAPP_TEMPLATE;
  // Sans lien, l'invité ne pourrait pas répondre : on l'ajoute à la fin
  if (!hasLinkPlaceholder(text)) text = `${text.trimEnd()}\n\n👉 {lien}`;
  return text
    .replace(/\{pr[ée]nom\}/gi, vars.prenom)
    .replace(/\{mari[ée]s\}/gi, vars.maries)
    .replace(/\{lien\}/gi, vars.lien);
}
