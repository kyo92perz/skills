// Virtual 2D camera: pan, zoom, rotate, handheld shake, punch-ins, palette shifts.
import { clamp, key, easeInOutCubic, easeOutQuint, easeOutExpo, hash } from './easing.mjs';

export class Camera {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.x = w / 2;        // world point at screen centre
    this.y = h / 2;
    this.zoom = 1;
    this.rot = 0;
    this.shakeAmp = 0;
    this.shakeFreq = 22;
    this.t = 0;
    this.frame = 0;
  }

  // Replace state from a keyframe set (call once per frame).
  animate({ x, y, zoom, rot = 0, shakeAmp = 0, shakeFreq = 22 }, t = 0, frame = 0) {
    this.t = t;
    this.frame = frame;
    if (x !== undefined) this.x = x;
    if (y !== undefined) this.y = y;
    if (zoom !== undefined) this.zoom = zoom;
    this.rot = rot;
    this.shakeAmp = shakeAmp;
    this.shakeFreq = shakeFreq;
    return this;
  }

  // Apply to a canvas context. Everything drawn after this is in world space.
  apply(ctx) {
    const { zoom, x, y, rot, shakeAmp, shakeFreq, frame } = this;
    let sx = 0;
    let sy = 0;
    if (shakeAmp > 0) {
      sx = (hash(frame * 1.7) - 0.5) * 2 * shakeAmp;
      sy = (hash(frame * 2.3 + 11) - 0.5) * 2 * shakeAmp;
      // a slower component keeps it from looking like pure noise
      sx += Math.sin(frame / shakeFreq) * shakeAmp * 0.4;
      sy += Math.cos(frame / (shakeFreq * 1.3)) * shakeAmp * 0.4;
    }
    ctx.translate(this.w / 2 + sx, this.h / 2 + sy);
    if (rot) ctx.rotate(rot);
    ctx.scale(zoom, zoom);
    ctx.translate(-x, -y);
  }

  worldToScreen(px, py) {
    const dx = (px - this.x) * this.zoom;
    const dy = (py - this.y) * this.zoom;
    const c = Math.cos(this.rot);
    const s = Math.sin(this.rot);
    return {
      x: this.w / 2 + dx * c - dy * s,
      y: this.h / 2 + dx * s + dy * c,
    };
  }
}

// Convenience: build a camera animator from keyframe arrays expressed in world space.
export function cameraTrack({
  x = [[0, 540]],
  y = [[0, 960]],
  zoom = [[0, 1]],
  rot = [[0, 0]],
  shake = [[0, 0]],
  ease = easeInOutCubic,
} = {}) {
  return (t, frame) => ({
    x: key(t, x, ease),
    y: key(t, y, ease),
    zoom: key(t, zoom, ease),
    rot: key(t, rot, ease),
    shakeAmp: key(t, shake, ease),
  });
}
