// Captions, titles and HUD text — the typography that makes shorts readable on mute.
import { clamp, inv, easeOutBack, easeOutExpo } from './easing.mjs';
import { setCanvasFactory } from './look.mjs';

// TikTok / Reels UI safe zones (fractions of frame height).
export const SAFE = { top: 0.10, bottom: 0.24, captionY: 0.68 };

const FONT_STACKS = {
  condensed: (px) => `800 ${px}px "Anton", "Oswald", "Archivo Black", "DejaVu Sans", sans-serif`,
  heavy: (px) => `900 ${px}px "Archivo Black", "Inter", "DejaVu Sans", sans-serif`,
  hand: (px) => `700 ${px}px "Caveat", "Comic Sans MS", "DejaVu Sans", cursive`,
  mono: (px) => `700 ${px}px "JetBrains Mono", "DejaVu Sans Mono", monospace`,
};

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Big uppercase caption with a hard shadow + stroke. Appears word-chunk by chunk.
export function caption(ctx, w, h, text, t, t0, t1, {
  y = h * SAFE.captionY,
  size = Math.round(w * 0.085),
  font = 'condensed',
  fill = '#ffffff',
  stroke = '#0a0a0c',
  strokeW = Math.round(w * 0.014),
  shadow = true,
  pop = 0.16,             // seconds of pop-in
  maxW = w * 0.84,
  uppercase = true,
  align = 'center',
} = {}) {
  if (t < t0 || t > t1) return;
  const raw = uppercase ? text.toUpperCase() : text;
  ctx.save();
  ctx.font = FONT_STACKS[font](size);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const lines = wrap(ctx, raw, maxW);
  const lh = size * 1.06;
  const cy = y - ((lines.length - 1) * lh) / 2;

  const inP = inv(t0, t0 + pop, t);
  const outP = inv(t1 - 0.14, t1, t);
  const scale = 0.82 + 0.18 * easeOutBack(clamp(inP));
  const alpha = clamp(inP * 2) * (1 - outP);
  // A caption that never settles looks cheap: overshoot then hold dead still.
  const settle = inP >= 1 ? 0 : Math.sin(inP * Math.PI) * 0.012;

  ctx.translate(w / 2, cy);
  ctx.rotate(settle);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -cy);
  ctx.globalAlpha = alpha;

  lines.forEach((ln, i) => {
    const yy = cy + i * lh;
    if (shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(ln, w / 2 + size * 0.03, yy + size * 0.05);
    }
    if (strokeW > 0) {
      ctx.lineWidth = strokeW * 2;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke;
      ctx.strokeText(ln, w / 2, yy);
    }
    ctx.fillStyle = fill;
    ctx.fillText(ln, w / 2, yy);
  });
  ctx.restore();
}

// Sequential word-by-word captions from an array of cues: [{ text, t0, t1 }]
export function cueTrack(ctx, w, h, cues, t, opts = {}) {
  for (const c of cues) caption(ctx, w, h, c.text, t, c.t0, c.t1, { ...opts, ...c.opts });
}

// Title card matching the reference: bold uppercase, wide tracking, underline rule.
export function titleCard(ctx, w, h, text, t, t0, t1, {
  size = Math.round(w * 0.105),
  fill = '#f4f2ec',
  accent = '#b23a3a',
  rule = true,
} = {}) {
  if (t < t0 || t > t1) return;
  const p = inv(t0, t0 + 0.28, t);
  const a = clamp(p) * (1 - inv(t1 - 0.16, t1, t));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = FONT_STACKS.heavy(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrap(ctx, text.toUpperCase(), w * 0.86);
  const lh = size * 1.12;
  const cy = h * 0.42 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => {
    const yy = cy + i * lh;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(ln, w / 2 + 4, yy + 5);
    ctx.fillStyle = fill;
    ctx.fillText(ln, w / 2, yy);
  });
  if (rule) {
    const rw = w * 0.3 * easeOutExpo(clamp(p));
    const ry = cy + (lines.length - 1) * lh + size * 0.9;
    ctx.fillStyle = accent;
    ctx.fillRect(w / 2 - rw / 2, ry, rw, Math.max(3, w * 0.006));
  }
  ctx.restore();
}

// Loading / "PART 1" badge, bottom-left, like the references use for series hooks.
export function badge(ctx, w, h, text, {
  x = w * 0.08,
  y = h * (1 - SAFE.bottom),
  size = Math.round(w * 0.036),
  bg = 'rgba(10,10,12,0.72)',
  fg = '#e8e6e0',
  accent = '#c8402f',
} = {}) {
  ctx.save();
  ctx.font = FONT_STACKS.mono(size);
  const padX = size * 0.7;
  const padY = size * 0.55;
  const tw = ctx.measureText(text).width;
  const bw = tw + padX * 2;
  const bh = size + padY * 2;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x - padX - size * 0.6, y - bh / 2, bw + size * 0.6, bh, bh * 0.22);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(x - padX - size * 0.6, y - bh / 2, size * 0.34, bh);
  ctx.fillStyle = fg;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + size * 0.15, y);
  ctx.restore();
}

// Register the node canvas factory for the caption/look modules.
export function registerCanvas(CreateCanvas) {
  setCanvasFactory(CreateCanvas);
}
