// Guide d'utilisation (public/guide/index.html) : chaque page de l'espace ouvre la rubrique qui la concerne
export const GUIDE_PATH = '/guide';

const SECTIONS: [prefix: string, anchor: string][] = [
  ['/dashboard/invite', 'invites'],
  ['/dashboard/studio', 'studio'],
  ['/dashboard/partage', 'partager'],
  ['/dashboard/album', 'album'],
  ['/dashboard/table', 'table'],
  ['/dashboard/tasks', 'checklist'],
  ['/dashboard/budget', 'budget'],
  ['/dashboard/planning', 'jourj'],
  ['/dashboard/settings', 'parametres'],
  ['/dashboard/premium', 'formules'],
  ['/dashboard/souvenir', 'apres'],
  ['/dashboard', 'tableau'],
];

export function guideHref(pathname: string) {
  const hit = SECTIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return hit ? `${GUIDE_PATH}#${hit[1]}` : GUIDE_PATH;
}
