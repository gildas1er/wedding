// Modèles d'invitation proposés dans le studio (le contenu reste le même, seule la mise en scène change).

export const INVITATION_TEMPLATES = [
  { id: 'classique', label: 'Classique', description: 'La photo de couverture puis l’invitation, en douceur.' },
  { id: 'enveloppe', label: 'L’Enveloppe', description: 'Vos invités ouvrent une enveloppe scellée à vos initiales : la carte en sort, la musique démarre.' },
  { id: 'story', label: 'La Story', description: 'L’invitation en plein écran, écran par écran, comme une story : photo, date, programme, réponse.' },
] as const;

export type InvitationTemplate = (typeof INVITATION_TEMPLATES)[number]['id'];

export const DEFAULT_TEMPLATE: InvitationTemplate = 'classique';

export function resolveTemplate(value: unknown): InvitationTemplate {
  return INVITATION_TEMPLATES.some((t) => t.id === value) ? (value as InvitationTemplate) : DEFAULT_TEMPLATE;
}

// Initiales pour le cachet de cire : « Awa » & « Yao » -> « A & Y »
export function coupleInitials(p1?: string | null, p2?: string | null) {
  const first = (s?: string | null) => (s?.trim()?.[0] ?? '').toUpperCase();
  return [first(p1), first(p2)].filter(Boolean);
}
