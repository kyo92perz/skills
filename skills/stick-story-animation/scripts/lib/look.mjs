// The "look stack": everything that separates a flat vector clip from the
// TikTok reference. Each layer is a documented craft decision, not decoration.
import { hash } from './easing.mjs';

// ---------------------------------------------------------------------------
// Paper/plate preparation
// ---------------------------------------------------------------------------
// Slight parallax push on the plate so static backgrounds don't feel dead.
export function drawPlate(ctx, img, { x, y, w, h, cam, parallax = 0.85, darken = 0.35 } = {}) {
  if (!img) return;
  const s = Math.max(w / img.width, h / img.height) * 1.12;
  const dw = img.width * s;
  const dh = img.height * s;
  const ox = (w - dw) / 2 - (cam.x - w / 2) * parallax;
  const oy = (h - dh) / 2 - (cam.y - h / 2) * parallax;
  ctx.save();
  ctx.drawImage(img, ox, oy, dw, dh);
  if (darken > 0) {
    ctx.fillStyle = `rgba(6,8,10,${darken})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Optical layers
// ---------------------------------------------------------------------------
export function vignette(ctx, w, h, strength = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h * 0.46, h * 0.16, w / 2, h * 0.5, h * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.65, `rgba(0,0,0,${strength * 0.45})`);
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Film grain. Must be *animated* (per frame) or it looks like a static overlay.
// Cheap but convincing: pre-rendered noise tile, offset randomly per frame.
let noiseTile = null;
let offscreenFactory = (w, h) => new OffscreenCanvasFallback(w, h);
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const size = 256;
  const c = offscreenFactory(size, size);
  const g = c.getContext('2d');
  const id = g.createImageData(size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 128 + (hash(i * 0.37) - 0.5) * 255;
    id.data[i] = v;
    id.data[i + 1] = v;
    id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  noiseTile = c;
  return c;
}

// OffscreenCanvasFallback is injected by the renderer (Node's @napi-rs/canvas has
// no OffscreenCanvas, browsers do). Keeping it swappable avoids a hard dependency.
let OffscreenCanvasFallback = class {
  constructor(w, h) {
    throw new Error('Offscreen canvas factory not registered — call setCanvasFactory()');
  }
};
export function setCanvasFactory(fn) {
  offscreenFactory = fn;
  noiseTile = null;
}

export function grain(ctx, w, h, frame, amount = 0.09) {
  const tile = getNoiseTile();
  const ox = -Math.floor(hash(frame * 1.31) * 256);
  const oy = -Math.floor(hash(frame * 2.17 + 7) * 256);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  for (let y = oy; y < h; y += 256) {
    for (let x = ox; x < w; x += 256) ctx.drawImage(tile, x, y);
  }
  ctx.restore();
}

// Subtle CRT-ish scanlines — sells "shot on a screen" and hides banding.
export function scanlines(ctx, w, h, amount = 0.05, gap = 4) {
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += gap) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

// Chromatic aberration on impact frames. Keep it off most of the time.
export function aberration(ctx, w, h, frame, amount = 0) {
  if (amount <= 0.05) return;
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const shift = Math.round(amount);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = row + x * 4;
      const rIdx = row + Math.min(w - 1, x + shift) * 4;
      const bIdx = row + Math.max(0, x - shift) * 4;
      out.data[i] = src.data[rIdx];
      out.data[i + 1] = src.data[i + 1];
      out.data[i + 2] = src.data[bIdx];
      out.data[i + 3] = src.data[i + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
  void frame;
}

// Light falloff / flicker for the single practical light in the scene.
export function flickerLight(ctx, x, y, r, t, color = 'rgba(180,220,200,0.10)') {
  const f = 0.85 + 0.15 * Math.sin(t * 27) * Math.sin(t * 7.3);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = f;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// Speed lines / dust to sell fast motion (cheap, huge perceived motion gain).
export function speedLines(ctx, { w, h, dir = 1, intensity = 0.5, frame = 0, y = h / 2, spread = 320 }) {
  if (intensity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = Math.min(0.5, intensity);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = hash(i * 3.1 + frame * 0.13);
    const yy = y - spread / 2 + a * spread;
    const len = 60 + hash(i * 7.7 + frame) * 220;
    const xx = ((hash(i * 1.9 + frame * 0.37) * (w + len)) - len) % (w + len);
    const x0 = dir > 0 ? xx : w - xx;
    ctx.beginPath();
    ctx.moveTo(x0, yy);
    ctx.lineTo(x0 + dir * len, yy);
    ctx.stroke();
  }
  ctx.restore();
}

// Impact frame: one or two white frames on a hit. Amateur edits skip this;
// pro shorts use it constantly and it's why their hits feel loud.
export function impactFlash(ctx, w, h, t, t0, dur = 0.07) {
  if (t < t0 || t > t0 + dur) return;
  const a = 1 - (t - t0) / dur;
  ctx.save();
  ctx.globalAlpha = 0.55 * a;
  ctx.fillStyle = '#dfe9ff';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Dark halo behind the character. The references all do this: a soft radial
// darkening that separates the figure from a detailed background without an outline.
export function subjectHalo(ctx, x, y, r, strength = 0.3) {
  if (strength <= 0.01) return;
  const g = ctx.createRadialGradient(x, y - r * 0.15, r * 0.12, x, y - r * 0.15, r);
  g.addColorStop(0, `rgba(0,0,0,${strength})`);
  g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.45})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r * 1.2, r * 2, r * 2.4);
  ctx.restore();
}

// 2.5D depth helper: draw a prop scaled by its z, darker as it recedes.
export function depthTint(ctx, z) {
  // z: 1 = on-stage, 0 = far background
  const dark = Math.min(0.6, (1 - z) * 0.75);
  return dark;
}
