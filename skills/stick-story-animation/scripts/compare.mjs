// Renders the SAME shot with two different "looks" side by side.
// This is the diagnostic that tells you which layer is making your clip look cheap.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs/promises';
import { drawFigure, POSES } from './lib/figure.mjs';
import * as Look from './lib/look.mjs';
import * as Cap from './lib/caption.mjs';
import { Camera } from './lib/camera.mjs';

Look.setCanvasFactory((w, h) => createCanvas(w, h));
Cap.registerCanvas((w, h) => createCanvas(w, h));

const W = 1080, H = 1920;
const plate = await loadImage(await fs.readFile(new URL('../reference/plates/plate-corridor.png', import.meta.url)));
const canvas = createCanvas(W * 2 + 40, H);
const ctx = canvas.getContext('2d');

const LOOKS = {
  'FLAT  (vetor puro)': {
    figureStyle: 'flat', inkColor: '#111111', headFill: 'rgba(255,255,255,1)',
    faceColor: '#111', boil: 0, depth: 0, plateDarken: 0.12, outlineColor: null,
    vignette: 0, grain: 0, halo: 0, captionOpts: { size: 84, font: 'heavy', strokeW: 0 },
  },
  'CINEMATIC  (referência)': {
    figureStyle: 'cinematic', inkColor: '#f0eee6', lightInk: true, headFill: 'rgba(240,238,230,0.98)',
    faceColor: '#0b0b0d', boil: 0.9, depth: 1, plateDarken: 0.34,
    outlineColor: 'rgba(6,6,8,0.92)', vignette: 0.62, grain: 0.09, halo: 0.34,
    captionOpts: { size: 92, font: 'condensed', strokeW: 14, stroke: '#08080a' },
  },
};

Object.entries(LOOKS).forEach(([label, L], col) => {
  const ox = col * (W + 40);
  const cam = new Camera(W, H).animate({ x: W / 2, y: 1020, zoom: 1.02 }, 0.5, 15);
  ctx.save();
  ctx.translate(ox, 0);
  // plate
  ctx.fillStyle = '#0b0e0f'; ctx.fillRect(0, 0, W, H);
  ctx.save(); cam.apply(ctx);
  Look.drawPlate(ctx, plate, { x: 0, y: 0, w: W, h: H, cam, parallax: 0.55, darken: L.plateDarken });
  ctx.restore();
  ctx.save(); cam.apply(ctx);
  const sc = 820;
  if (L.halo) Look.subjectHalo(ctx, 520, 1430, sc * 0.62, L.halo);
  drawFigure(ctx, {
    x: 520, y: 1430, scale: sc, pose: POSES.recoil, style: L.figureStyle,
    line: 0.022 * sc, color: L.inkColor, headFill: L.headFill, face: 'scared',
    faceColor: L.faceColor, lightInk: L.lightInk, boil: L.boil, boilHz: 8,
    depth: L.depth, outlineColor: L.outlineColor, t: 0.5, seed: 3,
  });
  ctx.restore();
  if (L.vignette) Look.vignette(ctx, W, H, L.vignette);
  if (L.grain) Look.grain(ctx, W, H, 15, L.grain);
  Cap.caption(ctx, W, H, '3 da manhã.', 0.5, 0.3, 1.5, { y: H * 0.72, ...L.captionOpts });
  // label
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, 92);
  ctx.fillStyle = L.outlineColor ? '#f0eee6' : '#9aa0a4';
  ctx.font = '800 40px "DejaVu Sans"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 40, 46);
  ctx.restore();
});
await fs.mkdir('out', { recursive: true });
await fs.writeFile('out/compare.png', canvas.toBuffer('image/png'));
console.log('ok');
