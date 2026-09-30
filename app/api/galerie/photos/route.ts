import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasGalleryAccess } from '@/lib/gallery-auth';

export const dynamic = 'force-dynamic';

const BUCKET = 'wedding-photos';
const FOLDER = 'invites';
const SIGNED_URL_TTL = 60 * 60; // 1 heure

type GalleryImage = { id: string; name: string; url: string; created_at: string };
type GalleryPost = { guest_name: string; message: string | null; created_at: string; images: GalleryImage[] };

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Avec la clé service, le bucket et la table peuvent être rendus privés
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return {
    supabase: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
    usesServiceKey: Boolean(serviceKey),
  };
}

export async function GET(request: NextRequest) {
  if (!hasGalleryAccess(request)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 401 });
  }

  const { supabase, usesServiceKey } = getServerSupabase();

  const [{ data: dbData, error: dbError }, { data: storageData, error: storageError }] = await Promise.all([
    supabase.from('photos_metadata').select('*').order('created_at', { ascending: false }),
    supabase.storage.from(BUCKET).list(FOLDER, { limit: 150 }),
  ]);

  if (dbError || storageError) {
    console.error("Erreur lors du chargement de l'album:", dbError ?? storageError);
    return NextResponse.json({ error: "Impossible de charger l'album." }, { status: 500 });
  }

  const files = (storageData ?? []).filter((file) => file.name !== '.emptyFolderPlaceholder');
  const paths = files.map((file) => `${FOLDER}/${file.name}`);

  // URLs signées si la clé service est disponible (fonctionne aussi avec un bucket privé)
  const urlByPath = new Map<string, string>();
  if (usesServiceKey && paths.length > 0) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    signed?.forEach((item) => { if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl); });
  }

  // Regroupe les photos par invité + message pour recréer les envois simultanés
  const postMap: Record<string, GalleryPost> = {};
  files.forEach((file, i) => {
    const filePath = paths[i];
    const meta = dbData?.find((d) => d.file_name === filePath);
    const url = urlByPath.get(filePath) ?? supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;

    const guestName = meta?.guest_name || 'Invité anonyme';
    const message = meta?.message || null;
    const groupKey = `${guestName}-${message || 'sans-message'}`;
    const createdAt = file.created_at || new Date().toISOString();
    const image: GalleryImage = { id: file.name, name: file.name, url, created_at: createdAt };

    if (!postMap[groupKey]) {
      postMap[groupKey] = { guest_name: guestName, message, created_at: createdAt, images: [image] };
    } else {
      postMap[groupKey].images.push(image);
    }
  });

  const posts = Object.values(postMap).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ posts }, { headers: { 'Cache-Control': 'no-store' } });
}
