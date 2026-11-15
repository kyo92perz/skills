// Diagnostic: one walk cycle across 8 phases, to check knee/elbow folding.
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs/promises';
import { drawFigure, walkPose, sprintPose } from './lib/figure.mjs';
import * as Look from './lib/look.mjs';
Look.setCanvasFactory((w, h) => createCanvas(w, h));
const cw = 240, ch = 620, N = 8;
const c = createCanvas(cw * N, ch * 2);
const ctx = c.getContext('2d');
ctx.fillStyle = '#15181b'; ctx.fillRect(0, 0, c.width, c.height);
for (let row = 0; row < 2; row++) {
  for (let i = 0; i < N; i++) {
    const phase = (i / N) * Math.PI * 2;
    const pose = row === 0 ? walkPose(phase) : sprintPose(phase);
    ctx.save();
    ctx.translate(i * cw, row * ch);
    // ground line
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.moveTo(10, ch - 120); ctx.lineTo(cw - 10, ch - 120); ctx.stroke();
    drawFigure(ctx, { x: cw / 2, y: ch - 120, scale: 460, pose, style: 'cinematic',
      line: 10, color: '#f0eee6', lightInk: true, outlineColor: 'rgba(6,6,8,0.9)',
      headFill: 'rgba(240,238,230,0.98)', face: 'neutral', boil: 0.8, depth: 1, t: i * 0.13, seed: 2 });
    ctx.restore();
  }
}
await fs.mkdir('out', { recursive: true });
await fs.writeFile('out/walksheet.png', c.toBuffer('image/png'));
console.log('ok');
