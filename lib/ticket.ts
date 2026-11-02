// Billet d'entrée « Le Pass » (formules payantes, migration 32) : dessiné dans le navigateur.
// Image 1 080 × 1 920 px (format story, à garder dans la galerie du téléphone) et PDF 9 × 16 cm.
import QRCode from 'qrcode';
import { formatHourFr, toISODate } from './event-datetime';
import { ceremonyFlags } from './ceremonies';
import { DEFAULT_PALETTE, isHexColor, readableTextOn, resolveAccent } from './palettes';
import { coupleInitials } from './invitation-templates';
import { resolveNameFont } from './name-fonts';

export type GuestTicket = {
  code: string;
  name: string;
  guests_count: number;
  table_name: string | null;
  attending_dot: boolean;
  attending_civil: boolean;
  attending_church: boolean;
  attending_reception: boolean;
};

type Text = string | null | undefined;
// Champs du mariage utilisés par le billet (lus par get_rsvp_invitation)
export type TicketMarriage = {
  partner_1_name?: Text; partner_2_name?: Text; wedding_date?: Text;
  primary_color?: Text; accent_color?: Text; names_font?: Text;
  show_dot?: boolean | null; show_civil?: boolean | null; show_religious?: boolean | null; show_reception?: boolean | null;
  dot_date?: Text; dot_hour?: Text; dot_location?: Text;
  mairie_date?: Text; mairie_hour?: Text; mairie_location?: Text;
  religious_date?: Text; religious_hour?: Text; religious_location?: Text;
  reception_date?: Text; reception_hour?: Text; reception_location?: Text;
};

const W = 1080;
const H = 1920;
const INK = '#2a1f1c';

// Lien du QR code : l'équipe d'accueil le scanne depuis /accueil (ou avec l'appareil photo du téléphone)
export const ticketUrl = (origin: string, marriageId: string, code: string) => `${origin}/accueil?id=${marriageId}&code=${code}`;

// « 4K7Q2C9M » -> « 4K7Q-2C9M »
export const formatTicketCode = (code: string) => code.replace(/^(.{4})(.+)$/, '$1-$2');

/* ── Couleurs ── */
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/* ── Cérémonies confirmées par l'invité ── */
type TicketLine = { hour: string; day: string | null; title: string; place: string };

function ticketLines(m: TicketMarriage, t: GuestTicket): TicketLine[] {
  const flags = ceremonyFlags(m);
  const wedding = toISODate(m.wedding_date);
  const day = (value: string | null | undefined) => {
    const iso = toISODate(value);
    if (!iso || iso === wedding) return null;
    return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const rows: (TicketLine | false)[] = [
    flags.dot && t.attending_dot && { hour: formatHourFr(m.dot_hour), day: day(m.dot_date), title: 'Dot', place: m.dot_location ?? '' },
    flags.civil && t.attending_civil && { hour: formatHourFr(m.mairie_hour), day: day(m.mairie_date), title: 'Mairie', place: m.mairie_location ?? '' },
    flags.religious && t.attending_church && { hour: formatHourFr(m.religious_hour), day: day(m.religious_date), title: 'Cérémonie religieuse', place: m.religious_location ?? '' },
    flags.reception && t.attending_reception && { hour: formatHourFr(m.reception_hour), day: day(m.reception_date), title: 'Réception', place: m.reception_location ?? '' },
  ];
  return rows.filter((r): r is TicketLine => Boolean(r));
}

/* ── Dessin ── */
function cssFont(variable: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v || fallback;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Taille de police la plus grande (≤ size) pour que le texte tienne dans maxWidth
function fitFont(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, size: number, maxWidth: number, min = 24) {
  let px = size;
  ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = font(px);
  }
  return px;
}

// Coupe un texte trop long en lignes (au plus maxLines, la dernière finit par « … »)
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // letterSpacing n'existe pas partout (Safari ancien) : on espace les lettres à la main
  const chars = [...text];
  const width = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cx = x - width / 2;
  ctx.textAlign = 'left';
  for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; }
  ctx.textAlign = 'center';
}

export async function drawTicket(m: TicketMarriage, t: GuestTicket, qrUrl: string): Promise<HTMLCanvasElement> {
  const primary = isHexColor(m.primary_color) ? m.primary_color : DEFAULT_PALETTE.primary;
  const accent = resolveAccent(primary, m.accent_color);
  const onPrimary = readableTextOn(primary);
  const deep = mix(primary, '#000000', 0.35);
  const paper = mix(primary, '#fdfbf8', 0.95);
  const muted = mix(INK, paper, 0.45);

  const display = cssFont('--font-fraunces', 'Georgia, serif');
  const body = cssFont('--font-manrope', 'system-ui, sans-serif');
  const nameFont = resolveNameFont(m.names_font);
  const namesFamily = nameFont.family ?? display;
  const namesStyle = nameFont.family ? '400' : 'italic 400';
  await Promise.all([
    document.fonts.load(`600 64px ${display}`),
    document.fonts.load(`italic 400 64px ${display}`),
    document.fonts.load(`700 36px ${body}`),
    document.fonts.load(`500 36px ${body}`),
    document.fonts.load(`400 64px ${namesFamily}`),
  ]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Fond papier et bandeau aux couleurs du couple
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  const band = ctx.createLinearGradient(0, 0, W * 0.4, 760);
  band.addColorStop(0, primary);
  band.addColorStop(1, deep);
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, 760);

  // Monogramme
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, 170, 86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `600 58px ${display}`;
  ctx.fillText(coupleInitials(m.partner_1_name, m.partner_2_name).join('·') || '♥', W / 2, 190);

  ctx.font = `700 28px ${body}`;
  spaced(ctx, 'PASS INVITÉ', W / 2, 322, 9);

  // Prénoms des mariés
  const couple = [m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & ');
  ctx.fillStyle = onPrimary;
  fitFont(ctx, couple, (px) => `${namesStyle} ${px}px ${namesFamily}`, Math.round(104 * nameFont.scale), 920, 48);
  ctx.fillText(couple, W / 2, 450);

  const weddingIso = toISODate(m.wedding_date);
  if (weddingIso) {
    const label = new Date(`${weddingIso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    ctx.globalAlpha = 0.85;
    ctx.font = `500 32px ${body}`;
    ctx.fillText(label.charAt(0).toUpperCase() + label.slice(1), W / 2, 530);
    ctx.globalAlpha = 1;
  }

  // Carte blanche : invité, nombre de personnes, QR code
  const card = { x: 80, y: 600, w: W - 160, h: 690 };
  ctx.save();
  ctx.shadowColor = 'rgba(40, 20, 10, 0.14)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, card.x, card.y, card.w, card.h, 44);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = INK;
  // Une ligne en grand, sinon deux lignes de plus en plus petites jusqu'à ce que le nom tienne entier
  let nameLines: string[] = [];
  for (const px of [62, 52, 46, 40]) {
    ctx.font = `600 ${px}px ${display}`;
    nameLines = wrap(ctx, t.name, card.w - 100, 2);
    if ((px === 62 && nameLines.length === 1) || (px < 62 && !nameLines[nameLines.length - 1].endsWith('…'))) break;
  }
  const nameTop = nameLines.length === 2 ? 690 : 710;
  nameLines.forEach((line, i) => ctx.fillText(line, W / 2, nameTop + i * 60));

  const persons = Math.max(1, t.guests_count);
  ctx.fillStyle = primary;
  ctx.font = `700 34px ${body}`;
  ctx.fillText(`${persons} personne${persons > 1 ? 's' : ''}`, W / 2, nameTop + (nameLines.length - 1) * 60 + 62);

  const qrSize = 430;
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, qrUrl, { width: qrSize, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1f1b18', light: '#ffffff' } });
  ctx.drawImage(qr, (W - qrSize) / 2, card.y + card.h - qrSize - 40, qrSize, qrSize);

  // Programme de l'invité (seulement ses cérémonies)
  const lines = ticketLines(m, t);
  const rowH = lines.length > 3 ? 112 : 124;
  let y = 1350;
  lines.forEach((l, i) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = primary;
    ctx.font = `700 34px ${body}`;
    ctx.fillText(l.hour || '—', 110, y + 44);
    if (l.day) {
      ctx.fillStyle = muted;
      ctx.font = `500 26px ${body}`;
      ctx.fillText(l.day, 110, y + 80);
    }
    ctx.fillStyle = INK;
    ctx.font = `600 36px ${body}`;
    ctx.fillText(wrap(ctx, l.title, 640, 1)[0], 310, y + 44);
    if (l.place) {
      ctx.fillStyle = muted;
      ctx.font = `500 28px ${body}`;
      ctx.fillText(wrap(ctx, l.place, 660, 1)[0], 310, y + 82);
    }
    if (i < lines.length - 1) {
      ctx.fillStyle = mix(INK, paper, 0.86);
      ctx.fillRect(110, y + rowH - 6, W - 220, 2);
    }
    y += rowH;
  });

  // Pied : numéro du billet et table
  ctx.textAlign = 'left';
  ctx.fillStyle = muted;
  ctx.font = `600 28px ${body}`;
  ctx.fillText(`N° ${formatTicketCode(t.code)}`, 110, 1846);
  if (t.table_name) {
    ctx.font = `700 30px ${body}`;
    const label = wrap(ctx, `Table ${t.table_name.replace(/^table\s+/i, '')}`, 420, 1)[0];
    const w = ctx.measureText(label).width + 64;
    ctx.fillStyle = primary;
    roundRect(ctx, W - 110 - w, 1796, w, 70, 35);
    ctx.fill();
    ctx.fillStyle = onPrimary;
    ctx.textAlign = 'center';
    ctx.fillText(label, W - 110 - w / 2, 1842);
  }
  ctx.textAlign = 'center';
  return canvas;
}

/* ── Exports ── */
export const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image impossible à créer'))), type, quality));

// PDF d'une page 9 × 16 cm contenant l'image du billet (JPEG), sans bibliothèque
export async function canvasToPdf(canvas: HTMLCanvasElement): Promise<Blob> {
  const jpeg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer());
  const pageW = 255.12; // 9 cm
  const pageH = 453.54; // 16 cm
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const obj = (n: number, body: string) => { offsets[n] = length; push(`${n} 0 obj\n${body}\nendobj\n`); };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg);
  push('\nendstream\nendobj\n');
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xref = length;
  push(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

// Enregistre le fichier : feuille de partage sur téléphone (« Enregistrer l'image »), sinon téléchargement
export async function saveFile(blob: Blob, filename: string, preferShare = false) {
  const file = new File([blob], filename, { type: blob.type });
  if (preferShare && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const ticketFilename = (t: GuestTicket, ext: 'png' | 'pdf') =>
  `billet-${t.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'invite'}.${ext}`;
