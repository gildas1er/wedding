// Image de la carte de remerciements (1 080 × 1 620 px, soit 10 × 15 cm en PDF), dessinée dans le navigateur.
import { coupleInitials } from './invitation-templates';
import { cssFont, fitFont, mix, roundRect, spaced, wrap } from './ticket';
import { formatWeddingDay, type ThanksCardData } from './thanks';
import { THANKS_SCRIPT, signatureFont, thanksColors } from '../components/thanks/ThanksCard';

const W = 1080;
const H = 1620;
const PAPER = '#fbf6ee';
const CREAM = '#f4ead9';
const INK = '#3a2e26';
const SOFT = '#9b8b78';

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
