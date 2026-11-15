// Easing + timing helpers. Everything is normalized to 0..1 unless noted.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => (b === a ? 0 : clamp((v - a) / (b - a)));

export const linear = (t) => t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeInQuad = (t) => t * t;
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
export const easeInExpo = (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeOutBack = (t, s = 1.70158) =>
  1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const easeInBack = (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t;

// Damped oscillation — good for camera shake and elastic settles.
export const shake = (t, freq = 18, decay = 6) =>
  Math.sin(t * freq) * Math.exp(-decay * t);

// Piecewise keyframes: [[t, value], ...] with per-span easing.
export function key(t, keys, fn = easeInOutCubic) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t >= t0 && t <= t1) return lerp(v0, v1, fn(inv(t0, t1, t)));
  }
  return last[1];
}

// 0→1 ramp inside [a,b], holds 1 until [c,d] then back to 0. For flashes/moves.
export function pulse(t, a, b, c = b, d = c) {
  if (t < a || t > d) return 0;
  if (t < b) return inv(a, b, t);
  if (t < c) return 1;
  return 1 - inv(c, d, t);
}

// Deterministic hash noise — used for line boil and grain (same seed => same frame).
export function hash(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}
export const noise1 = (x) => hash(Math.floor(x * 1000) * 0.017);

// Two independent [-1,1] jitters for a given seed + boil tick.
export function jitter(seed, tick, amp) {
  const a = (hash(seed * 13.37 + tick * 7.11) - 0.5) * 2 * amp;
  const b = (hash(seed * 91.13 + tick * 3.77 + 5.5) - 0.5) * 2 * amp;
  return [a, b];
}
