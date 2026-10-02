// Suppression définitive d'un espace (à la demande du couple ou 12 mois après le mariage).
// Réservé au serveur : utilise la clé service.
import type { SupabaseClient } from '@supabase/supabase-js';

// Fichiers rangés sous un préfixe dans un bucket (pagination par 100)
async function removeFiles(db: SupabaseClient, bucket: string, folder: string, match: (name: string) => boolean) {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await db.storage.from(bucket).list(folder, { limit: 100, offset });
    if (error || !data?.length) break;
    data.filter((f) => f.name !== '.emptyFolderPlaceholder' && match(f.name)).forEach((f) => paths.push(folder ? `${folder}/${f.name}` : f.name));
    if (data.length < 100) break;
  }
  for (let i = 0; i < paths.length; i += 100) await db.storage.from(bucket).remove(paths.slice(i, i + 100));
  return paths.length;
}

// Ordre de suppression : les invités avant les tables (invite.table_id)
const CHILD_TABLES = ['photos_metadata', 'guestbook', 'invite', 'tables', 'budget_items', 'planning_events', 'tasks', 'payments'];

export async function deleteSpace(db: SupabaseClient, { marriageId, userId }: { marriageId: string | null; userId: string | null }) {
  if (marriageId) await deleteMarriageData(db, marriageId);

  // 3. Compte de connexion : le couple ne pourra plus se connecter
  if (userId) {
    await db.from('profiles').delete().eq('id', userId);
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) throw new Error(`compte : ${error.message}`);
  }
}

async function deleteMarriageData(db: SupabaseClient, marriageId: string) {
  // 1. Fichiers : couverture et musique (bucket invitations), photos du livre d'or et de l'album
  await removeFiles(db, 'invitations', 'backgrounds', (n) => n.startsWith(`${marriageId}-`));
  await removeFiles(db, 'invitations', 'music', (n) => n.startsWith(`${marriageId}-`));
  await removeFiles(db, 'guestbook-photos', marriageId, () => true);
  await removeFiles(db, 'wedding-photos', `invites/${marriageId}`, () => true);

  // 2. Données du mariage
  for (const table of CHILD_TABLES) {
    const { error } = await db.from(table).delete().eq('marriage_id', marriageId);
    // Table absente sur cette base : on continue ; toute autre erreur arrête la suppression
    if (error && !/does not exist|schema cache/i.test(error.message)) throw new Error(`${table} : ${error.message}`);
  }
  const { error: marriageError } = await db.from('marriages').delete().eq('id', marriageId);
  if (marriageError) throw new Error(`marriages : ${marriageError.message}`);
}
