import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs/promises';
import { drawFigure, POSES } from './lib/figure.mjs';
import * as Look from './lib/look.mjs';
import { Camera } from './lib/camera.mjs';

Look.setCanvasFactory((w, h) => createCanvas(w, h));
const names = Object.keys(POSES);
const cols = 4, cw = 380, ch = 560;
const W = cols * cw, H = Math.ceil(names.length / cols) * ch;
const c = createCanvas(W, H);
const ctx = c.getContext('2d');
ctx.fillStyle = '#14171a'; ctx.fillRect(0, 0, W, H);
names.forEach((n, i) => {
  const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
  ctx.save(); ctx.translate(x, y);
  drawFigure(ctx, { x: cw / 2, y: ch - 110, scale: 400, pose: POSES[n], style: 'cinematic', line: 11, t: 0.4, seed: i + 1, headFill: 'rgba(236,234,228,0.95)', rim: 'rgba(150,190,210,0.35)' });
  ctx.fillStyle = '#cfd6d9'; ctx.font = '700 26px "DejaVu Sans"'; ctx.textAlign = 'center';
  ctx.fillText(n, cw / 2, ch - 40);
  ctx.restore();
});
await fs.mkdir('out', { recursive: true });
await fs.writeFile('out/posesheet.png', c.toBuffer('image/png'));
console.log('ok');
