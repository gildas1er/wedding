import { NextResponse } from 'next/server';
import { serviceSupabase } from '../../../lib/premium-server';
import { spaceLifecycle } from '../../../lib/lifecycle';
import {
  DEFAULT_THANKS_MESSAGE, bestMatch, ceremoniesSentence, guestCame, resolveThanksTemplate, thanksOpen, type ThanksCardData,
} from '../../../lib/thanks';

export const dynamic = 'force-dynamic';

// Carte de remerciements d'un invité (migration 35), lue avec la clé service : l'invité n'a pas de compte.
// Visible à partir du jour du mariage, seulement pour un invité venu (confirmé ou entré à l'accueil).
// La photo de l'album est servie par une adresse signée valable 1 jour (album privé).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'wedding-photos';
const PHOTO_TTL = 60 * 60 * 24;

const noStore = { 'Cache-Control': 'no-store' };
const notFound = () => NextResponse.json({ error: 'Carte introuvable.' }, { status: 404, headers: noStore });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const marriageId = params.get('m') ?? '';
  const inviteId = params.get('g') ?? '';
  if (!UUID.test(marriageId) || !UUID.test(inviteId)) return notFound();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Service indisponible.' }, { status: 503, headers: noStore });
  const db = serviceSupabase();

  const [{ data: m }, { data: g }] = await Promise.all([
    db.from('marriages').select('*').eq('id', marriageId).maybeSingle(),
    db.from('invite').select('*').eq('id', inviteId).eq('marriage_id', marriageId).maybeSingle(),
  ]);
  if (!m || !g || !guestCame(g)) return notFound();
  const weddingDate = m.wedding_date ? String(m.wedding_date).slice(0, 10) : null;
  if (!thanksOpen(weddingDate)) {
    return NextResponse.json({ available: false, weddingDate, partner1: m.partner_1_name ?? '', partner2: m.partner_2_name ?? '' }, { headers: noStore });
  }

  // Base sans la migration 35 : modèle et mot par défaut
  const [{ data: settings }, { data: card }, { data: table }] = await Promise.all([
    db.from('thanks_settings').select('template, message').eq('marriage_id', marriageId).maybeSingle(),
    db.from('thanks_cards').select('photo_file, quote_id, note, opened_at').eq('invite_id', inviteId).maybeSingle(),
    g.table_id ? db.from('tables').select('name').eq('id', g.table_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const template = resolveThanksTemplate(settings?.template);
  const paid = m.plan === 'premium' || Boolean(m.tier);

  // Photo de l'album : celle choisie par le couple, sinon celle envoyée sous le nom de l'invité
  let photoUrl: string | null = null;
  if (template === 'souvenir') {
    const { data: photos } = await db.from('photos_metadata').select('file_name, guest_name').eq('marriage_id', marriageId).order('created_at', { ascending: false }).limit(1000);
    const list = photos ?? [];
    const chosen = card?.photo_file ? list.find((p) => p.file_name === card.photo_file) : bestMatch(g.name ?? '', list, (p) => p.guest_name);
    if (chosen) {
      const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(chosen.file_name, PHOTO_TTL);
      photoUrl = signed?.signedUrl ?? null;
    }
  }

  // Message du livre d'or : celui choisi, sinon celui signé du nom de l'invité
  let quote: ThanksCardData['quote'] = null;
  if (template === 'souvenir') {
    const { data: book } = await db.from('guestbook').select('id, author_name, message').eq('marriage_id', marriageId).order('created_at', { ascending: false }).limit(1000);
    const list = (book ?? []).filter((b) => b.message?.trim());
    const chosen = card?.quote_id ? list.find((b) => String(b.id) === card.quote_id) : bestMatch(g.name ?? '', list, (b) => b.author_name);
    if (chosen) quote = { text: chosen.message.trim().slice(0, 240), author: chosen.author_name ?? '' };
  }

  if (card && !card.opened_at) {
    await db.from('thanks_cards').update({ opened_at: new Date().toISOString() }).eq('invite_id', inviteId).then(() => undefined, () => undefined);
  }

  const data: ThanksCardData = {
    template,
    marriageId,
    partner1: m.partner_1_name ?? '',
    partner2: m.partner_2_name ?? '',
    weddingDate,
    city: m.location_city && m.location_city !== 'À définir' ? m.location_city : null,
    guestName: g.name ?? '',
    ceremonies: ceremoniesSentence(m, g),
    table: table?.name ?? null,
    message: settings?.message?.trim() || DEFAULT_THANKS_MESSAGE,
    note: paid ? card?.note?.trim() || null : null,
    coverUrl: m.bg_image_url ?? null,
    photoUrl,
    quote,
    primary: m.primary_color ?? null,
    accent: m.accent_color ?? null,
    namesFont: m.names_font ?? null,
    referralCode: m.referral_code ?? null,
    paid,
    guestbookOpen: spaceLifecycle(m, new Date()).phase === 'active',
  };
  return NextResponse.json({ available: true, card: data }, { headers: noStore });
}
