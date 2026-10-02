import { NextResponse } from 'next/server';
import { createClient as createSessionClient } from '../../../utils/supabase/server';
import { serviceSupabase } from '../../../lib/premium-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'wedding-photos';
const SIGNED_URL_TTL = 60 * 60; // 1 heure

// Album privé du couple connecté : photos envoyées par ses invités (migration 14)
export async function GET() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connectez-vous pour voir votre album.' }, { status: 401 });

  const { data: marriage } = await session.from('marriages').select('id').eq('user_id', user.id).maybeSingle();
  if (!marriage) return NextResponse.json({ photos: [] });

  // Clé service : URLs signées (fonctionne aussi avec un bucket privé)
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const db = hasService ? serviceSupabase() : session;
  const { data: rows, error } = await db
    .from('photos_metadata')
    .select('id, file_name, guest_name, message, created_at')
    .eq('marriage_id', marriage.id)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) {
    const missing = /marriage_id/i.test(error.message);
    return NextResponse.json({ error: missing ? "L'album sera disponible après la migration « 20261002_14_album_par_mariage.sql »." : "Impossible de charger l'album." }, { status: missing ? 503 : 500 });
  }

  const paths = (rows ?? []).map((r) => r.file_name);
  const signed = new Map<string, string>();
  if (hasService && paths.length) {
    // En cas d'échec, les adresses publiques prennent le relais (bucket public)
    try {
      for (let i = 0; i < paths.length; i += 100) {
        const { data } = await db.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 100), SIGNED_URL_TTL);
        if (Array.isArray(data)) data.forEach((item) => { if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl); });
      }
    } catch (e) {
      console.error("Album : URLs signées indisponibles", e);
    }
  }

  const photos = (rows ?? []).map((r) => ({
    id: String(r.id),
    file_name: r.file_name,
    guest_name: r.guest_name || 'Invité anonyme',
    message: r.message || null,
    created_at: r.created_at,
    url: signed.get(r.file_name) ?? db.storage.from(BUCKET).getPublicUrl(r.file_name).data.publicUrl,
  }));
  return NextResponse.json({ photos }, { headers: { 'Cache-Control': 'no-store' } });
}
