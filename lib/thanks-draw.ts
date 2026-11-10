// Images des cartes de remerciements, dessinées dans le navigateur : 1 080 × 1 620 px (10 × 15 cm en PDF)
// pour La Lettre et Le Souvenir, 1 080 × 1 920 px (statut WhatsApp) pour Le Générique et Le Statut.
import { coupleInitials } from './invitation-templates';
import { cssFont, fitFont, mix, roundRect, spaced, wrap } from './ticket';
import { formatWeddingDay, type ThanksCardData } from './thanks';
import { CREAM, GOLD, GOLD_LIGHT, INK, NIGHT, PAPER, SOFT, THANKS_SCRIPT, coupleOf, signatureFont, thanksColors } from '../components/thanks/style';

const W = 1080;
const H = 1620;       // Lettre et Souvenir : 10 × 15 cm
const STORY_H = 1920; // Générique et Statut : format statut 9:16

// Photo chargée pour le dessin ; null si elle ne peut pas être lue (réseau, autorisation)
function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Photo recadrée pour remplir la zone (comme object-fit: cover), ou dégradé si absente
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  if (!img) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#e6cfb0');
    g.addColorStop(0.6, '#b88a66');
    g.addColorStop(1, '#6b4a38');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    return;
  }
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

// Paragraphe à gauche, renvoie la hauteur utilisée
function paragraph(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineH: number, maxLines: number) {
  const lines = text.split('\n').flatMap((p) => (p.trim() ? wrap(ctx, p.trim(), maxWidth, maxLines) : [])).slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
  return lines.length * lineH;
}

export async function drawThanksCard(card: ThanksCardData): Promise<HTMLCanvasElement> {
  const display = cssFont('--font-fraunces', 'Georgia, serif');
  const body = cssFont('--font-manrope', 'system-ui, sans-serif');
  const sign = signatureFont(card.namesFont);
  await Promise.all([
    document.fonts.load(`400 80px ${THANKS_SCRIPT}`),
    document.fonts.load(`400 80px ${sign}`),
    document.fonts.load(`400 40px ${display}`),
    document.fonts.load(`italic 400 40px ${display}`),
    document.fonts.load(`600 40px ${display}`),
    document.fonts.load(`700 24px ${body}`),
  ]).catch(() => {});

  const { wine } = thanksColors(card);
  const couple = [card.partner1, card.partner2].filter(Boolean).join(' & ');
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';

  if (card.template === 'souvenir') {
    const img = await loadImage(card.photoUrl ?? card.coverUrl);
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);

    // Polaroïd légèrement penché
    ctx.save();
    ctx.translate(W / 2, 425);
    ctx.rotate(-0.035);
    ctx.shadowColor = 'rgba(0,0,0,.22)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-300, -340, 600, 700);
    ctx.shadowColor = 'transparent';
    drawCover(ctx, img, -272, -312, 544, 544);
    ctx.fillStyle = '#4a3b30';
    ctx.textAlign = 'center';
    fitFont(ctx, card.photoUrl ? 'Votre plus beau moment' : couple, (px) => `400 ${px}px ${THANKS_SCRIPT}`, 58, 520, 36);
    ctx.fillText(card.photoUrl ? 'Votre plus beau moment' : couple, 0, 310);
    ctx.restore();

    let y = 850;
    const x = 100;
    const width = W - 200;
    ctx.textAlign = 'left';
    if (card.quote) {
      ctx.font = `italic 400 36px ${display}`;
      const quoteLines = wrap(ctx, `« ${card.quote.text} »`, width - 60, 3);
      const boxH = 70 + quoteLines.length * 48;
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      roundRect(ctx, x - 10, y, width + 20, boxH, 26);
      ctx.fill();
      ctx.fillStyle = SOFT;
      ctx.font = `700 20px ${body}`;
      ctx.fillText('VOUS NOUS AVEZ ÉCRIT', x + 20, y + 44);
      ctx.fillStyle = INK;
      ctx.font = `italic 400 36px ${display}`;
      quoteLines.forEach((l, i) => ctx.fillText(l, x + 20, y + 92 + i * 48));
      y += boxH + 56;
    }
    ctx.fillStyle = wine;
    ctx.font = `600 38px ${display}`;
    ctx.fillText(wrap(ctx, `Merci ${card.guestName}${card.quote ? ',' : '.'}`, width, 1)[0], x, y);
    y += 56;
    ctx.fillStyle = INK;
    ctx.font = `400 34px ${display}`;
    const text = [card.message, card.note].filter(Boolean).join('\n');
    const where = [card.ceremonies && `avec vous ${card.ceremonies}`, card.table && `table ${card.table.replace(/^table\s+/i, '')}`].filter(Boolean).join(', ');
    // Autant de lignes que la place laisse avant la signature
    const room = Math.max(2, Math.floor((H - 200 - (where ? 56 : 0) - y) / 48));
    y += paragraph(ctx, text, x, y, width, 48, room);
    if (where) {
      ctx.fillStyle = SOFT;
      ctx.font = `italic 400 30px ${display}`;
      ctx.fillText(wrap(ctx, `${where.charAt(0).toUpperCase()}${where.slice(1)}.`, width, 1)[0], x, y + 14);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = wine;
    fitFont(ctx, couple, (px) => `400 ${px}px ${sign}`, 78, width, 40);
    ctx.fillText(couple, W - x, H - 110);
  } else {
    const img = await loadImage(card.coverUrl);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#eadfcd';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    drawCover(ctx, img, 80, 80, W - 160, 690);

    // Cachet de cire aux initiales
    const seal = ctx.createRadialGradient(930, 98, 6, 950, 120, 78);
    seal.addColorStop(0, mix(wine, '#ffffff', 0.15));
    seal.addColorStop(1, mix(wine, '#000000', 0.55));
    ctx.save();
    ctx.shadowColor = 'rgba(60,15,25,.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = seal;
    ctx.beginPath();
    ctx.arc(940, 110, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f3d9c0';
    ctx.textAlign = 'center';
    ctx.font = `italic 400 40px ${display}`;
    ctx.fillText(coupleInitials(card.partner1, card.partner2).join('&') || '♥', 940, 124);

    const x = 100;
    const width = W - 200;
    ctx.textAlign = 'left';
    ctx.fillStyle = wine;
    fitFont(ctx, `Merci ${card.guestName},`, (px) => `400 ${px}px ${THANKS_SCRIPT}`, 96, width, 52);
    ctx.fillText(`Merci ${card.guestName},`, x, 890);

    let y = 975;
    ctx.fillStyle = INK;
    ctx.font = `400 38px ${display}`;
    // Le mot, la ligne des cérémonies et le mot personnel tiennent au-dessus de la signature
    const reserve = (card.ceremonies ? 62 : 0) + (card.note ? 106 : 0);
    y += paragraph(ctx, card.message, x, y, width, 54, Math.max(2, Math.floor((1370 - 975 - reserve) / 54)));
    if (card.ceremonies) {
      ctx.fillStyle = SOFT;
      ctx.font = `italic 400 32px ${display}`;
      ctx.fillText(wrap(ctx, `Avec vous ${card.ceremonies}.`, width, 1)[0], x, y + 8);
      y += 62;
    }
    if (card.note) {
      ctx.fillStyle = INK;
      ctx.font = `400 34px ${display}`;
      paragraph(ctx, card.note, x, y + 10, width, 48, 2);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = INK;
    fitFont(ctx, couple, (px) => `400 ${px}px ${sign}`, 80, width, 40);
    ctx.fillText(couple, W - x, 1430);

    const place = [card.city, formatWeddingDay(card.weddingDate)].filter(Boolean).join(' · ').toUpperCase();
    ctx.fillStyle = '#e7dccb';
    ctx.fillRect(x, 1478, width, 2);
    if (place) {
      ctx.fillStyle = SOFT;
      ctx.font = `700 22px ${body}`;
      spaced(ctx, place, W / 2, 1528, 5);
    }
  }

  // Signature discrète de la plateforme
  ctx.textAlign = 'center';
  ctx.fillStyle = mix(SOFT, card.template === 'souvenir' ? CREAM : PAPER, 0.25);
  ctx.font = `600 20px ${body}`;
  spaced(ctx, 'CARTE CRÉÉE AVEC WEDDINGSTUDIO', W / 2, H - 46, 4);
  return canvas;
}

/* ── Générique de fin et Statut (1 080 × 1 920) ── */
async function storyFonts(card: ThanksCardData) {
  const display = cssFont('--font-fraunces', 'Georgia, serif');
  const body = cssFont('--font-manrope', 'system-ui, sans-serif');
  const sign = signatureFont(card.namesFont);
  await Promise.all([
    document.fonts.load(`400 80px ${THANKS_SCRIPT}`),
    document.fonts.load(`400 80px ${sign}`),
    document.fonts.load(`400 40px ${display}`),
    document.fonts.load(`italic 400 40px ${display}`),
    document.fonts.load(`700 24px ${body}`),
  ]).catch(() => {});
  return { display, body, sign };
}

function storyCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  return { canvas, ctx };
}

// Paragraphe centré ; renvoie la hauteur utilisée (sans rien dessiner si draw = false)
function centered(ctx: CanvasRenderingContext2D, text: string, y: number, maxWidth: number, lineH: number, maxLines: number, draw = true) {
  const lines = wrap(ctx, text.replace(/\s*\n\s*/g, ' ').trim(), maxWidth, maxLines);
  if (draw) lines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * lineH));
  return lines.length * lineH;
}

// Dégradé sombre en haut et en bas d'une photo plein écran, pour lire le texte
function veil(ctx: CanvasRenderingContext2D, top = 0.45, bottom = 0.85) {
  const g = ctx.createLinearGradient(0, 0, 0, STORY_H);
  g.addColorStop(0, `rgba(0,0,0,${top})`);
  g.addColorStop(0.3, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(15,8,5,${bottom})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, STORY_H);
}

function brand(ctx: CanvasRenderingContext2D, body: string, color: string, y = STORY_H - 60) {
  ctx.fillStyle = color;
  ctx.font = `600 20px ${body}`;
  spaced(ctx, 'CARTE CRÉÉE AVEC WEDDINGSTUDIO', W / 2, y, 4);
}

const day = (card: ThanksCardData) => [formatWeddingDay(card.weddingDate), card.city].filter(Boolean).join(' · ');

export async function drawGenerique(card: ThanksCardData): Promise<HTMLCanvasElement> {
  const { display, body } = await storyFonts(card);
  const { canvas, ctx } = storyCanvas();
  const muted = '#a9997f';
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, W, STORY_H);
  const glow = ctx.createRadialGradient(W / 2, 0, 20, W / 2, 0, 1100);
  glow.addColorStop(0, 'rgba(214,170,90,.24)');
  glow.addColorStop(1, 'rgba(214,170,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, STORY_H);

  ctx.fillStyle = muted;
  ctx.font = `700 22px ${body}`;
  spaced(ctx, `${coupleOf(card)} PRÉSENTENT`.toUpperCase(), W / 2, 220, 7);
  ctx.fillStyle = GOLD;
  ctx.font = `italic 400 170px ${display}`;
  ctx.fillText('Fin', W / 2, 420);
  ctx.fillStyle = muted;
  ctx.font = `700 22px ${body}`;
  spaced(ctx, 'DE LA SAISON 1', W / 2, 490, 7);

  // Rôles et invité en vedette
  let y = 700;
  const label = (text: string) => { ctx.fillStyle = muted; ctx.font = `700 20px ${body}`; spaced(ctx, text, W / 2, y, 5); };
  label('AVEC LA PARTICIPATION EXCEPTIONNELLE DE');
  ctx.fillStyle = GOLD_LIGHT;
  fitFont(ctx, card.guestName, (px) => `400 ${px}px ${THANKS_SCRIPT}`, 130, 940, 60);
  ctx.fillText(card.guestName, W / 2, y + 140);
  y += 230;
  if (card.tableRole) {
    label('DANS LE RÔLE DE');
    ctx.fillStyle = '#efe4d0';
    ctx.font = `400 52px ${display}`;
    ctx.fillText(wrap(ctx, card.tableRole, 940, 1)[0], W / 2, y + 70);
    y += 140;
  }
  if (card.tableMates.length) {
    label('AUX CÔTÉS DE');
    ctx.fillStyle = '#efe4d0';
    ctx.font = `400 42px ${display}`;
    y += 10 + centered(ctx, card.tableMates.join(' · '), y + 64, 940, 54, 2);
    y += 50;
  }
  ctx.fillStyle = '#d8ccb6';
  ctx.font = `italic 400 38px ${display}`;
  centered(ctx, card.message, y + 40, 860, 54, Math.max(2, Math.floor((1470 - y) / 54)));

  // Les chiffres du mariage
  const s = card.stats;
  if (s) {
    ctx.fillStyle = 'rgba(217,177,107,.35)';
    ctx.fillRect(110, 1500, W - 220, 2);
    ctx.fillRect(110, 1660, W - 220, 2);
    const cells: [number, string][] = [[s.guests, 'INVITÉS'], [s.ceremonies, s.ceremonies > 1 ? 'CÉRÉMONIES' : 'CÉRÉMONIE'], s.photos ? [s.photos, 'PHOTOS'] : [s.messages, 'MESSAGES']];
    cells.forEach(([n, l], i) => {
      const cx = 110 + ((W - 220) / 3) * (i + 0.5);
      ctx.fillStyle = GOLD_LIGHT;
      ctx.font = `400 76px ${display}`;
      ctx.fillText(n.toLocaleString('fr-FR'), cx, 1595);
      ctx.fillStyle = muted;
      ctx.font = `700 19px ${body}`;
      spaced(ctx, l, cx, 1635, 3);
    });
  }
  ctx.fillStyle = '#efe4d0';
  ctx.font = `400 130px ${THANKS_SCRIPT}`;
  ctx.fillText('Merci', W / 2, 1790);
  if (day(card)) {
    ctx.fillStyle = '#7d705f';
    ctx.font = `700 20px ${body}`;
    spaced(ctx, day(card).toUpperCase(), W / 2, 1838, 5);
  }
  brand(ctx, body, '#5d5246', STORY_H - 36);
  return canvas;
}

export async function drawStatus(card: ThanksCardData): Promise<HTMLCanvasElement[]> {
  const { display, body, sign } = await storyFonts(card);
  const { wine } = thanksColors(card);
  const [cover, photo] = await Promise.all([loadImage(card.coverUrl), card.photoUrl ? loadImage(card.photoUrl) : Promise.resolve(null)]);
  const couple = coupleOf(card);

  // 1. Photo du couple
  const one = storyCanvas();
  drawCover(one.ctx, cover, 0, 0, W, STORY_H);
  veil(one.ctx);
  one.ctx.fillStyle = 'rgba(255,255,255,.85)';
  one.ctx.font = `700 24px ${body}`;
  spaced(one.ctx, 'NOTRE MARIAGE', W / 2, 1520, 8);
  one.ctx.fillStyle = '#ffffff';
  fitFont(one.ctx, couple, (px) => `400 ${px}px ${sign}`, 150, 960, 60);
  one.ctx.fillText(couple, W / 2, 1680);
  one.ctx.fillStyle = 'rgba(255,255,255,.88)';
  one.ctx.font = `400 42px ${display}`;
  one.ctx.fillText(day(card), W / 2, 1770);

  // 2. Le merci au nom de l'invité, centré verticalement
  const two = storyCanvas();
  const bg = two.ctx.createRadialGradient(W / 2, 560, 40, W / 2, 700, 1500);
  bg.addColorStop(0, wine);
  bg.addColorStop(1, '#1a0c10');
  two.ctx.fillStyle = bg;
  two.ctx.fillRect(0, 0, W, STORY_H);
  const title = `Merci ${card.guestName}`;
  two.ctx.font = `400 150px ${THANKS_SCRIPT}`;
  const titleLines = wrap(two.ctx, title, 940, 2);
  const titleH = titleLines.length * 150;
  two.ctx.font = `400 46px ${display}`;
  const msgH = centered(two.ctx, card.message, 0, 900, 68, 8, false);
  const cerH = card.ceremonies ? 90 : 0;
  const total = titleH + 70 + msgH + cerH + 170;
  let y = (STORY_H - total) / 2 + 120;
  two.ctx.fillStyle = '#ffffff';
  two.ctx.font = `400 150px ${THANKS_SCRIPT}`;
  titleLines.forEach((l, i) => two.ctx.fillText(l, W / 2, y + i * 150));
  y += titleH + 40;
  two.ctx.fillStyle = 'rgba(255,255,255,.92)';
  two.ctx.font = `400 46px ${display}`;
  y += centered(two.ctx, card.message, y, 900, 68, 8);
  if (card.ceremonies) {
    two.ctx.fillStyle = 'rgba(255,255,255,.7)';
    two.ctx.font = `italic 400 38px ${display}`;
    two.ctx.fillText(wrap(two.ctx, `Avec vous ${card.ceremonies}.`, 940, 1)[0], W / 2, y + 40);
    y += cerH;
  }
  two.ctx.fillStyle = GOLD_LIGHT;
  fitFont(two.ctx, couple, (px) => `400 ${px}px ${sign}`, 110, 900, 50);
  two.ctx.fillText(couple, W / 2, y + 120);

  // 3. Un souvenir : sa photo de l'album (sinon la vôtre) et son message du livre d'or
  const three = storyCanvas();
  drawCover(three.ctx, photo ?? cover, 0, 0, W, STORY_H);
  veil(three.ctx, 0.4, 0.9);
  if (card.quote) {
    three.ctx.font = `italic 400 54px ${display}`;
    const quoteLines = wrap(three.ctx, `« ${card.quote.text} »`, 920, 5);
    const top = 1700 - quoteLines.length * 74;
    three.ctx.fillStyle = 'rgba(255,255,255,.8)';
    three.ctx.font = `700 24px ${body}`;
    spaced(three.ctx, 'VOUS NOUS AVEZ ÉCRIT', W / 2, top - 40, 6);
    three.ctx.fillStyle = '#ffffff';
    three.ctx.font = `italic 400 54px ${display}`;
    quoteLines.forEach((l, i) => three.ctx.fillText(l, W / 2, top + 40 + i * 74));
  } else {
    three.ctx.fillStyle = '#ffffff';
    three.ctx.font = `400 120px ${THANKS_SCRIPT}`;
    three.ctx.fillText('Un jour inoubliable', W / 2, 1720, 980);
  }
  brand(three.ctx, body, 'rgba(255,255,255,.6)');
  return [one.canvas, two.canvas, three.canvas];
}

// Toutes les images d'une carte, dans l'ordre (une seule, sauf pour Le Statut)
export async function drawThanksImages(card: ThanksCardData): Promise<HTMLCanvasElement[]> {
  if (card.template === 'generique') return [await drawGenerique(card)];
  if (card.template === 'statut') return drawStatus(card);
  return [await drawThanksCard(card)];
}
