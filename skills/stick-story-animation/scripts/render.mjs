#!/usr/bin/env node
// Render a stick-story scene to MP4 (or PNG stills).
//
// Usage:
//   node render.mjs --story stories/demo.json --out out/demo.mp4
//   node render.mjs --story stories/demo.json --still 2.4 --out out/frame.png
//   node render.mjs --story stories/demo.json --out out/demo.mp4 --fps 30 --scale 1
//
// Requires: npm i @napi-rs/canvas @ffmpeg-installer/ffmpeg  (or a system ffmpeg)

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

import { Camera } from './lib/camera.mjs';
import { drawFigure, POSES, poseLerp, walkPose, sprintPose } from './lib/figure.mjs';
import * as Look from './lib/look.mjs';
import * as Cap from './lib/caption.mjs';
import { key, inv, clamp, easeInOutCubic, easeOutQuint, easeOutBack } from './lib/easing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// --- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const storyPath = arg('story', 'stories/demo.json');
const outPath = arg('out', 'out/demo.mp4');
const fps = Number(arg('fps', 30));
const scale = Number(arg('scale', 1));
const still = arg('still', null);

// --- canvas factory registration (look/caption modules need offscreen canvases)
Look.setCanvasFactory((w, h) => createCanvas(w, h));
Cap.registerCanvas((w, h) => createCanvas(w, h));

// --- helpers ----------------------------------------------------------------
const poses = { ...POSES };
function resolvePose(actor, t) {
  const p = actor.pose ?? 'stand';
  if (typeof p === 'string' && poses[p]) return poses[p];
  if (p && p.from) {
    // { from: 'stand', to: 'crouch', t0, t1 }
    return poseLerp(poses[p.from], poses[p.to], inv(p.t0, p.t1, t));
  }
  if (p === 'walk') {
    const phase = (t * (actor.stepHz ?? 2.2) + (actor.phase ?? 0)) * Math.PI * 2;
    return walkPose(phase, actor.walkOpts || {});
  }
  if (p === 'sprint') {
    const phase = (t * (actor.stepHz ?? 3.4) + (actor.phase ?? 0)) * Math.PI * 2;
    return sprintPose(phase, actor.walkOpts || {});
  }
  return poses.stand;
}

async function preload(story) {
  const plates = {};
  for (const sh of story.shots || []) {
    if (sh.plate && !plates[sh.plate]) {
      const p = path.resolve(path.dirname(path.resolve(storyPath)), sh.plate);
      try {
        plates[sh.plate] = await loadImage(p);
      } catch {
        console.warn(`[warn] plate not found: ${p}`);
        plates[sh.plate] = null;
      }
    }
  }
  return plates;
}

// --- the frame --------------------------------------------------------------
function renderFrame(ctx, story, shot, localT, frame, plates) {
  const { width: W, height: H } = story;
  const look = { ...(story.look || {}), ...(shot.look || {}) };
  const cam = new Camera(W, H);

  // camera track
  const base = { x: W / 2, y: H / 2, zoom: 1, rot: 0, shake: 0 };
  const ct = shot.camera || {};
  const camState = {};
  for (const k of ['x', 'y', 'zoom', 'rot', 'shake']) {
    camState[k === 'shake' ? 'shakeAmp' : k] = Array.isArray(ct[k])
      ? key(localT, ct[k], easeInOutCubic)
      : (ct[k] ?? base[k]);
  }
  cam.animate(camState, localT, frame);

  // 1 — background / plate
  ctx.fillStyle = look.paper || '#0c0f10';
  ctx.fillRect(0, 0, W, H);
  if (shot.plate) {
    ctx.save();
    cam.apply(ctx);
    Look.drawPlate(ctx, plates[shot.plate], {
      x: 0, y: 0, w: W, h: H, cam,
      parallax: shot.parallax ?? 0.8,
      darken: look.plateDarken ?? 0.35,
    });
    ctx.restore();
  }

  // 2 — world layer (characters + props), camera applied
  ctx.save();
  cam.apply(ctx);
  for (const actor of shot.actors || []) {
    const pose = resolvePose(actor, localT);
    const flick = actor.flicker ? 0.85 + 0.15 * Math.sin(localT * 31) : 1;
    const ax = Array.isArray(actor.x) ? key(localT, actor.x, easeInOutCubic) : actor.x;
    const ay = Array.isArray(actor.y) ? key(localT, actor.y, easeInOutCubic) : actor.y;
    const ao = Array.isArray(actor.opacity) ? key(localT, actor.opacity) : (actor.opacity ?? 1);
    const sc = actor.scale ?? H * 0.42;
    // Line weight MUST scale with the figure, otherwise close-ups look wire-thin
    // and wide shots look like a blob. ~2.1% of figure height matches the refs.
    const lineW = (look.figureLineRatio ?? 0.021) * sc * (actor.lineMul ?? 1);
    if (actor.halo !== false) Look.subjectHalo(ctx, ax, ay, sc * 0.62, actor.haloStrength ?? look.halo ?? 0.3);
    ctx.save();
    ctx.globalAlpha = ao * flick;
    drawFigure(ctx, {
      x: ax,
      y: ay,
      scale: sc,
      pose,
      style: look.figureStyle ?? 'cinematic',
      line: lineW,
      color: actor.color ?? look.inkColor ?? '#0b0b0d',
      rim: look.rim,
      outlineColor: look.outlineColor,
      headFill: look.headFill ?? 'rgba(232,232,228,0.92)',
      face: actor.face ?? 'neutral',
      faceColor: look.faceColor,
      lightInk: !!look.lightInk,
      boil: look.boil ?? 0.7,
      boilHz: look.boilHz ?? 8,
      depth: actor.depth ?? look.depth ?? 1,
      t: localT,
      seed: actor.seed ?? 1,
    });
    ctx.restore();
  }
  if (shot.prop) shot.prop(ctx, localT, cam);
  ctx.restore();

  // 3 — light & dust in screen space
  if (look.flicker) Look.flickerLight(ctx, W * 0.5, H * 0.12, H * 0.6, localT);
  if (look.speedLines) {
    Look.speedLines(ctx, { w: W, h: H, intensity: look.speedLines, frame, y: H * 0.6 });
  }

  // 4 — optical: vignette, grain, scanlines
  Look.vignette(ctx, W, H, look.vignette ?? 0.5);
  Look.grain(ctx, W, H, frame, look.grain ?? 0.08);
  if (look.scanlines) Look.scanlines(ctx, W, H, look.scanlines);

  // 5 — typography (always on top, never inside the camera transform)
  const caps = shot.captions || [];
  for (const c of caps) {
    Cap.caption(ctx, W, H, c.text, localT, c.t0, c.t1, { ...(look.captionStyle || {}), ...(c.opts || {}) });
  }
  if (shot.title) {
    const ti = shot.title;
    Cap.titleCard(ctx, W, H, ti.text, localT, ti.t0, ti.t1, ti.opts || {});
  }
  if (shot.badge) Cap.badge(ctx, W, H, shot.badge.text, shot.badge.opts || {});

  // 6 — impact flashes last so they read as camera exposure, not overlay
  for (const im of shot.impacts || []) Look.impactFlash(ctx, W, H, localT, im.t, im.dur ?? 0.07);
}

// --- main -------------------------------------------------------------------
async function main() {
  const story = JSON.parse(await fs.readFile(path.resolve(storyPath), 'utf8'));
  const W = Math.round(story.width * scale);
  const H = Math.round(story.height * scale);
  const plates = await preload(story);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const total = story.shots.reduce((s, sh) => s + sh.dur, 0);

  if (still !== null) {
    const t = Number(still);
    let acc = 0;
    let shot = story.shots[story.shots.length - 1];
    for (const sh of story.shots) {
      if (t >= acc && t < acc + sh.dur) { shot = sh; break; }
      acc += sh.dur;
    }
    renderFrame(ctx, { ...story, width: W, height: H }, shot, t - acc, Math.round(t * fps), plates);
    await fs.mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
    await fs.writeFile(path.resolve(outPath), canvas.toBuffer('image/png'));
    console.log(`still -> ${outPath} (t=${t}s, shot=${shot.id})`);
    return;
  }

  const totalFrames = Math.round(total * fps);
  await fs.mkdir(path.dirname(path.resolve(outPath)), { recursive: true });

  // ffmpeg: local install first, then PATH. Give a clear error instead of ENOENT.
  const ffmpegPath = (() => {
    try { return require('@ffmpeg-installer/ffmpeg').path; } catch { return 'ffmpeg'; }
  })();
  if (ffmpegPath === 'ffmpeg') {
    const { spawnSync } = await import('node:child_process');
    const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    if (probe.error) {
      throw new Error('ffmpeg not found. Run: npm i @ffmpeg-installer/ffmpeg  (or install ffmpeg on PATH)');
    }
  }

  const ff = spawn(ffmpegPath, [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    path.resolve(outPath),
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.on('error', (e) => { console.error('ffmpeg failed to start:', e.message); process.exit(1); });

  // Map global frame -> shot + local time
  const bounds = [];
  let acc = 0;
  for (const sh of story.shots) {
    bounds.push({ sh, start: acc, end: acc + sh.dur });
    acc += sh.dur;
  }

  const t0 = Date.now();
  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    const b = bounds.find((x) => t >= x.start && t < x.end) || bounds[bounds.length - 1];
    const localT = t - b.start;
    ctx.clearRect(0, 0, W, H);
    renderFrame(ctx, { ...story, width: W, height: H }, b.sh, localT, f, plates);
    const buf = canvas.toBuffer('image/png');
    if (!ff.stdin.write(buf)) {
      await new Promise((r) => ff.stdin.once('drain', r));
    }
    if (f % fps === 0) {
      const pct = ((f / totalFrames) * 100).toFixed(0);
      process.stdout.write(`\r  frame ${f}/${totalFrames} (${pct}%)`);
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nvideo -> ${outPath}  ${totalFrames} frames in ${secs}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
