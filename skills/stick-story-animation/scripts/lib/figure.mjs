// Stick-figure renderer + per-style "reel" (how the figure is drawn).
//
// The point of this file: the SAME pose data can look flat and cheap, or look like
// the TikTok references. What changes is the reel (line quality, shadow pass,
// thickness taper, rim light) — not the rig.
import { hash, jitter } from './easing.mjs';

// ---------------------------------------------------------------------------
// Pose model. All values are in "figure units", origin at the feet, y up = negative.
// lean/head/limbs are angles in radians, 0 = straight down, positive = clockwise.
// ---------------------------------------------------------------------------
export const POSES = {
  // angle convention: 0 = straight down, + = toward screen-right.
  // "N" = near/greater limb, "F" = far limb. Head/lean are body-space offsets.
  stand:   { lean: 0,     head: 0,     armN: -0.22, armF: 0.24,  foreN: -0.24, foreF: 0.26,  thighN: -0.14, thighF: 0.14,  shinN: -0.14, shinF: 0.14, bob: 0 },
  idle:    { lean: 0.02,  head: 0.04,  armN: -0.25, armF: 0.27,  foreN: -0.27, foreF: 0.29,  thighN: -0.15, thighF: 0.15,  shinN: -0.15, shinF: 0.15, bob: 0 }, // breathing is animated in resolvePose, not here
  slump:   { lean: 0.14,  head: 0.30,  armN: -0.16, armF: 0.18,  foreN: -0.10, foreF: 0.22,  thighN: -0.18, thighF: 0.18,  shinN: -0.18, shinF: 0.18, bob: 0 },
  reach:   { lean: -0.04, head: -0.06, armN: 1.30,  armF: 0.05,  foreN: 1.40,  foreF: 0.12,  thighN: -0.16, thighF: 0.16,  shinN: -0.16, shinF: 0.16, bob: 0 },
  recoil:  { lean: 0.30,  head: 0.42,  armN: 1.10,  armF: 0.80,  foreN: 1.55,  foreF: 1.20,  thighN: -0.30, thighF: 0.26,  shinN: 0.16,  shinF: -0.12, bob: -0.03 },
  sprint:  { lean: 0.34,  head: -0.26, armN: 0.75,  armF: -0.70, foreN: 1.25,  foreF: 0.05,  thighN: 0.62,  thighF: -0.55, shinN: 0.30,  shinF: -0.95, bob: -0.02 },
  crouch:  { lean: 0.30,  head: 0.10,  armN: 0.66,  armF: 0.42,  foreN: 1.30,  foreF: 1.02,  thighN: 0.62,  thighF: 0.44,  shinN: -0.62, shinF: -0.46, bob: -0.20 },
  hide:    { lean: 0.42,  head: -0.12, armN: 1.05,  armF: 0.72,  foreN: 1.88,  foreF: 1.48,  thighN: 0.70,  thighF: 0.52,  shinN: -0.70, shinF: -0.54, bob: -0.26 },
  fall:    { lean: 1.05,  head: 0.35,  armN: 1.90,  armF: -1.75, foreN: 2.30,  foreF: -2.10, thighN: 0.75,  thighF: 0.30,  shinN: 1.10,  shinF: 0.55,  bob: -0.02 },
  point:   { lean: 0.03,  head: -0.08, armN: 1.44,  armF: 0.22,  foreN: 1.44,  foreF: 0.24,  thighN: -0.15, thighF: 0.15,  shinN: -0.15, shinF: 0.15, bob: 0 },
  check_phone: { lean: 0.08, head: 0.34, armN: 0.28, armF: 0.14, foreN: 1.10, foreF: 0.90, thighN: -0.15, thighF: 0.15, shinN: -0.15, shinF: 0.15, bob: 0 },
};

export function mixPose(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
// Total figure height is normalized to 1.0 and multiplied by `scale`,
// so `scale` means "height in px" — no more guessing.
const RIG = {
  hip: 0.475,      // hip height
  shoulder: 0.775, // shoulder line
  neck: 0.792,     // where the head's neck stub ends
  headC: 0.895,    // head centre
  headR: 0.092,
  upperArm: 0.158,
  foreArm: 0.148,
  thigh: 0.240,
  shin: 0.238,
  shoulderW: 0.058,
};

export function joints(pose, scale, footY, x = 0) {
  const h = scale;
  const bob = (pose.bob || 0) * h;
  const px = (v) => v * h;

  const hip = { x: x + Math.sin(pose.lean) * px(0.10), y: footY - px(RIG.hip) + bob };
  const neck = { x: x + Math.sin(pose.lean) * px(0.19), y: footY - px(RIG.shoulder) + bob };
  const torsoAng = pose.lean;
  // shoulders sit perpendicular to the torso line
  const sx = Math.cos(torsoAng) * px(RIG.shoulderW) * 0.5;
  const sy = Math.sin(torsoAng) * px(RIG.shoulderW) * 0.5;
  // The NEAR shoulder is offset toward screen-right and draws its arm in front of
  // the torso; the FAR shoulder is offset left and draws behind. Clamping the
  // near arm to negative angles then keeps BOTH arms off the torso line.
  const shN = { x: neck.x - sx, y: neck.y - sy };
  const shF = { x: neck.x + sx, y: neck.y + sy };

  const headAng = pose.lean + pose.head;
  const head = {
    x: neck.x + Math.sin(headAng) * px(RIG.neck - (RIG.headC - RIG.headR) + 0.058),
    y: neck.y - Math.cos(headAng) * px(RIG.headC - RIG.shoulder),
    r: px(RIG.headR),
  };

  const limb = (o, a1, a2, l1, l2) => {
    const e = { x: o.x + Math.sin(a1) * px(l1), y: o.y + Math.cos(a1) * px(l1) };
    const t = { x: e.x + Math.sin(a2) * px(l2), y: e.y + Math.cos(a2) * px(l2) };
    return { e, h: t };
  };

  const limbAngles = (a, f, l1, l2) => ({
    n: limb(a, a, f, l1, l2),
    f: limb(a, a, f, l1, l2),
  });
  void limbAngles;

  // Angles are absolute (0 = straight down, + = screen right).
  const armN = limb(shN, pose.armN, pose.foreN, RIG.upperArm, RIG.foreArm);
  const armF = limb(shF, pose.armF, pose.foreF, RIG.upperArm, RIG.foreArm);
  const legN = limb(hip, pose.thighN, pose.shinN, RIG.thigh, RIG.shin);
  const legF = limb(hip, pose.thighF, pose.shinF, RIG.thigh, RIG.shin);

  return { neck, hip, head, armN, armF, legN, legF, shN, shF, s: h };
}

// Catmull-ish polyline rendering helpers
function strokePoly(ctx, pts, width, color, closed = false) {
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (closed) ctx.closePath();
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// REEL: flat. Pure vector look — this is what reads as "cheap" on TikTok.
// ---------------------------------------------------------------------------
function reelFlat(ctx, j, pose, opts, tick) {
  const { line = 9, color = '#111' } = opts;
  const w = line;
  const segs = [
    [j.shN, j.shF],
    [j.neck, j.hip],
    [j.shN, j.armN.e], [j.armN.e, j.armN.h],
    [j.shF, j.armF.e], [j.armF.e, j.armF.h],
    [j.hip, j.legN.e], [j.legN.e, j.legN.h],
    [j.hip, j.legF.e], [j.legF.e, j.legF.h],
  ];
  for (const [a, b] of segs) strokePoly(ctx, [a, b], w, color);
  ctx.beginPath();
  ctx.arc(j.head.x, j.head.y, j.head.r, 0, Math.PI * 2);
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// REEL: ink. Hand-drawn look: tapered strokes, line boil, ink bleed, texture.
// Uses a deterministic per-boil-tick jitter so it never "swims" randomly.
// ---------------------------------------------------------------------------
function taperStroke(ctx, a, b, w0, w1, color, seed, tick, boil, opacity = 1) {
  const [jax, jay] = jitter(seed, tick, boil);
  const [jbx, jby] = jitter(seed + 3.1, tick, boil);
  const ax = a.x + jax;
  const ay = a.y + jay;
  const bx = b.x + jbx;
  const by = b.y + jby;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(2, Math.round(len / 14));
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const wob = Math.sin((t0 + seed) * 9.3) * boil * 0.6;
    const x0 = ax + dx * t0 + nx * wob;
    const y0 = ay + dy * t0 + ny * wob;
    const x1 = ax + dx * t1 + nx * wob;
    const y1 = ay + dy * t1 + ny * wob;
    ctx.lineWidth = w0 + (w1 - w0) * t0;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function inkHead(ctx, head, line, color, seed, tick, boil, opts) {
  const r = head.r;
  // sketchy double outline
  for (let pass = 0; pass < 2; pass++) {
    const [jx, jy] = jitter(seed + pass * 7.7, tick, boil * 0.7);
    ctx.beginPath();
    const wob = 1 + (pass ? 0.012 : 0);
    ctx.ellipse(head.x + jx, head.y + jy, r * wob, r * wob, 0, 0, Math.PI * 2);
    ctx.lineWidth = line * (0.85 + pass * 0.3);
    ctx.strokeStyle = color;
    ctx.globalAlpha = pass ? 0.5 : 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // fill so the head reads as a silhouette against dark plates
  if (opts.headFill) {
    ctx.beginPath();
    ctx.ellipse(head.x, head.y, r * 0.97, r * 0.97, 0, 0, Math.PI * 2);
    ctx.fillStyle = opts.headFill;
    ctx.fill();
  }
  // face
  const face = opts.face || 'neutral';
  const ex = r * 0.34;
  const ey = -r * 0.12;
  ctx.fillStyle = opts.faceColor || (opts.lightInk ? '#0b0b0d' : color);
  const dot = (x, y, rr) => {
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  };
  if (face === 'neutral' || face === 'scared' || face === 'determined') {
    dot(head.x - ex, head.y + ey, r * 0.075);
    dot(head.x + ex, head.y + ey, r * 0.075);
  }
  if (face === 'scared') {
    ctx.beginPath();
    ctx.ellipse(head.x, head.y + r * 0.34, r * 0.10, r * 0.145, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (face === 'determined') {
    ctx.lineWidth = r * 0.09;
    ctx.strokeStyle = opts.faceColor || (opts.lightInk ? '#0b0b0d' : color);
    ctx.beginPath();
    ctx.moveTo(head.x - ex * 1.5, head.y + ey - r * 0.22);
    ctx.lineTo(head.x - ex * 0.5, head.y + ey - r * 0.12);
    ctx.moveTo(head.x + ex * 1.5, head.y + ey - r * 0.22);
    ctx.lineTo(head.x + ex * 0.5, head.y + ey - r * 0.12);
    ctx.stroke();
  } else if (face === 'relief') {
    ctx.lineWidth = r * 0.08;
    ctx.strokeStyle = opts.faceColor || (opts.lightInk ? '#0b0b0d' : color);
    ctx.beginPath();
    ctx.arc(head.x, head.y + r * 0.26, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

function reelInk(ctx, j, pose, opts, tick, seedBase = 0) {
  const { line = 9, color = '#141414', boil = 0.7, taper = true } = opts;
  const w = line;
  // ORDER MATTERS: far limbs first (they sit *behind* the torso), then torso,
  // then near limbs on top. This alone reads as depth.
  const segs = [
    [j.shF, j.armF.e, 0.72, 0.70], [j.armF.e, j.armF.h, 0.70, 0.56],
    [j.hip, j.legF.e, 0.88, 0.84], [j.legF.e, j.legF.h, 0.84, 0.62],
    [j.shN, j.shF, 0.9, 0.9],
    [j.neck, j.hip, 1.06, 1.0],
    [j.shN, j.armN.e, 0.82, 0.80], [j.armN.e, j.armN.h, 0.80, 0.64],
    [j.hip, j.legN.e, 1.02, 0.96], [j.legN.e, j.legN.h, 0.96, 0.74],
  ];
  segs.forEach(([a, b, w0, w1], i) => {
    const seed = seedBase + i * 2.37;
    const isFar = i < 4;
    const farFade = isFar ? 0.82 : 1;
    if (!taper) {
      strokePoly(ctx, [a, b], w * ((w0 + w1) / 2), color);
      return;
    }
    // soft pass for ink bleed
    taperStroke(ctx, a, b, w * w0 * 1.25, w * w1 * 1.25, color, seed, tick, boil, 0.14 * farFade);
    taperStroke(ctx, a, b, w * w0, w * w1, color, seed, tick, boil, farFade);
  });
  // neck stub so the head doesn't float
  taperStroke(ctx, { x: j.neck.x, y: j.neck.y }, { x: j.head.x, y: j.head.y + j.head.r * 0.55 },
    w * 0.62, w * 0.56, color, seedBase + 21, tick, boil * 0.6);
  inkHead(ctx, j.head, w, color, seedBase + 40, tick, boil, opts);
  // joints: subtle knuckles/wrist ticks sell the hand-drawn feel
  if (opts.jointTicks) {
    ctx.globalAlpha = 0.5;
    for (const p of [j.armN.e, j.armF.e, j.legN.e, j.legF.e, j.hip, j.neck]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, w * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// REEL: cinematic. Ink figure + contact shadow + rim light + vignette-friendly.
// This is the closest match to @stickalypse / @relatando_historias.
// ---------------------------------------------------------------------------
function reelCinematic(ctx, j, pose, opts, tick, seedBase = 0) {
  // rim defaults to OFF: on dark plates a light rim reads as a wireframe outline.
  // Turn it on only for night scenes with a strong single light source.
  const { line = 10, color = '#0b0b0d', rim = 'rgba(0,0,0,0)', shadow = 'rgba(0,0,0,0.42)' } = opts;

  // 1. contact shadow (squashed ellipse under the back foot)
  const groundY = Math.max(j.legN.h.y, j.legF.h.y) + 2;
  const g = ctx.createRadialGradient(j.hip.x, groundY, 1, j.hip.x, groundY, j.s * 0.34);
  g.addColorStop(0, shadow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(j.hip.x, groundY);
  ctx.scale(1, 0.22);
  ctx.beginPath();
  ctx.arc(0, 0, j.s * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  // 1b. OUTLINE pass. On dark plates an all-dark figure disappears; the refs solve
  // this by drawing a light figure with a dark outline (a "cut-out" look).
  if (opts.outlineColor) {
    reelInk(ctx, j, pose, {
      ...opts,
      color: opts.outlineColor,
      line: line * 2.15,
      headFill: undefined,
      face: 'none',
      jointTicks: false,
    }, tick, seedBase + 0.4);
  }

  // 2. back layer: drawn offset + darker => depth without a full 3D rig
  const off = opts.depth ?? 3.5;
  ctx.save();
  ctx.translate(j.s * 0.004 * off, j.s * 0.004 * off);
  reelInk(ctx, j, pose, { ...opts, color: 'rgba(8,8,10,0.55)', line: line * 0.92, jointTicks: false }, tick, seedBase);
  ctx.restore();

  // 3. main ink pass
  reelInk(ctx, j, pose, { ...opts, color, line, jointTicks: true }, tick, seedBase + 1.3);

  // 4. optional rim light (see note above)
  if (rim && rim !== 'rgba(0,0,0,0)') {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(-line * 0.55, -line * 0.55);
  ctx.globalAlpha = 0.34;
  reelInk(ctx, j, pose, {
    ...opts,
    color: rim,
    line: line * 0.55,
    jointTicks: false,
    taper: true,
    face: 'none',
    headFill: undefined,
    jointTicks: false,
  }, tick, seedBase + 2.9);
  ctx.globalAlpha = 1;
  ctx.restore();
  }
}

export const REELS = { flat: reelFlat, ink: reelInk, cinematic: reelCinematic };

export function drawFigure(ctx, {
  x = 0,
  y = 0,                 // ground line (feet)
  scale = 400,           // figure height in world px
  pose = POSES.stand,
  style = 'cinematic',
  line = 10,
  color = '#0b0b0d',
  boil = 0.7,            // px of line boil (0 = perfectly stable vector, reads synthetic)
  boilHz = 8,            // boil tick rate; 6–10 fps is the published look
  t = 0,
  seed = 1,
  depth = 1,             // 1 = full shading, 0 = flat
  ...rest
} = {}) {
  const tick = Math.floor(t * boilHz);
  const j = joints(pose, scale, y, x);
  const reel = REELS[style] || REELS.cinematic;
  const opts = { line, color, boil: boil * (0.4 + 0.6 * depth), ...rest };
  ctx.save();
  if (depth < 1) {
    // flatten cinematic extras when depth is dialled down
    opts.depth = depth * (opts.depth ?? 3.5);
    opts.rim = depth > 0.15 ? opts.rim : 'rgba(0,0,0,0)';
  }
  reel(ctx, j, pose, opts, tick, seed);
  ctx.restore();
  return j;
}

// ---------------------------------------------------------------------------
// Procedural cycles. Walk/sprint are phase-driven so any clip can be
// retimed without re-keying poses (this is where most hand-made clips break).
// ---------------------------------------------------------------------------
const DEG = Math.PI;

export function walkPose(phase, { amp = 1, lean = 0.08, armSwing = 1 } = {}) {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const bob = Math.abs(Math.sin(phase * 2)) * 0.016;
  // Knees only fold BACKWARD and elbows only FORWARD (a rig that bends both ways
  // is the single most common tell of an amateur walk cycle).
  const kneeFold = (swing) => (swing > 0 ? 1.05 : 0.30) * Math.abs(swing);
  const tN = 0.55 * s * amp;
  const tF = -0.55 * s * amp;
  return {
    lean: lean + 0.02 * s,
    head: 0.03 + 0.02 * c,
    thighN: tN,
    thighF: tF,
    shinN: tN - kneeFold(tN) * 0.62,
    shinF: tF - kneeFold(tF) * 0.62,
    // Arms keep a permanent outward offset and are CLAMPED so they never cross
    // the torso midline. Two limbs crossing at the chest is the classic "X"
    // artifact that instantly reads as amateur.
    armN: Math.min(-0.30 - 0.42 * s * armSwing, -0.15),
    armF: Math.max(0.34 + 0.42 * s * armSwing, 0.17),
    foreN: Math.min(-0.30 - 0.42 * s * armSwing - 0.20 - 0.28 * Math.max(0, s), -0.12),
    foreF: Math.max(0.34 + 0.42 * s * armSwing + 0.20 + 0.28 * Math.max(0, -s), 0.14),
    bob: -bob,
  };
}

export function sprintPose(phase, { amp = 1 } = {}) {
  const p = walkPose(phase, { amp: amp * 1.45, lean: 0.34, armSwing: 1.55 });
  return { ...p, bob: p.bob - 0.02 + Math.abs(Math.sin(phase * 2)) * 0.05 };
}

// Blend two poses with an ease, for transitions (stand -> crouch etc.)
export function poseLerp(a, b, t) {
  return mixPose(a, b, Math.max(0, Math.min(1, t)));
}
