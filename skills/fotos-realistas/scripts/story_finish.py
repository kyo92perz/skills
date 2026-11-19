#!/usr/bin/env python3
"""Finaliza uma imagem para story do Instagram: recorte 9:16 sem distorcer, 1080x1920,
granulado leve de sensor de celular (opcional) e previa com zonas seguras.

Uso:
  python story_finish.py entrada.png --out final/story_01.jpg [--focus-y 0.4] [--grain 2] [--guides]
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

W, H = 1080, 1920
# Faixas aproximadas cobertas pela interface do story (barra de perfil em cima,
# caixa de resposta embaixo). Mantenha rosto e elementos importantes fora delas.
SAFE_TOP = 250
SAFE_BOTTOM = 340


def cover_crop(im, focus_y):
    target = W / H
    w, h = im.size
    if w / h > target:  # larga demais: corta laterais, centralizado
        nw = int(h * target)
        left = (w - nw) // 2
        im = im.crop((left, 0, left + nw, h))
    else:  # alta demais: corta em cima/embaixo conforme focus_y
        nh = int(w / target)
        top = int((h - nh) * min(max(focus_y, 0.0), 1.0))
        im = im.crop((0, top, w, top + nh))
    return im.resize((W, H), Image.LANCZOS)


def add_grain(im, amount, seed=None):
    """Ruido de luminancia levemente desfocado, mais forte nas sombras (como sensor de celular)."""
    if amount <= 0:
        return im
    rng = np.random.default_rng(seed)
    arr = np.asarray(im, dtype=np.float32)
    noise = rng.normal(0, amount, (H, W)).astype(np.float32)
    noise_img = Image.fromarray(np.clip(noise * 8 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    noise = (np.asarray(noise_img, dtype=np.float32) - 128) / 8
    lum = arr.mean(axis=2, keepdims=True) / 255.0
    weight = 1.4 - 0.8 * lum  # sombras recebem mais ruido
    out = arr + noise[..., None] * weight
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def guides(im):
    g = im.copy()
    over = Image.new("RGBA", g.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    d.rectangle((0, 0, W, SAFE_TOP), fill=(255, 0, 0, 70))
    d.rectangle((0, H - SAFE_BOTTOM, W, H), fill=(255, 0, 0, 70))
    d.text((20, 20), "zona da barra de perfil", fill=(255, 255, 255, 255))
    d.text((20, H - SAFE_BOTTOM + 20), "zona da caixa de resposta", fill=(255, 255, 255, 255))
    return Image.alpha_composite(g.convert("RGBA"), over).convert("RGB")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--out", required=True)
    ap.add_argument("--focus-y", type=float, default=0.35,
                    help="onde manter o recorte vertical: 0=topo, 0.5=centro, 1=base (padrao 0.35)")
    ap.add_argument("--grain", type=float, default=2.0, help="intensidade do granulado (0 desliga; 1.5-3 natural)")
    ap.add_argument("--quality", type=int, default=92)
    ap.add_argument("--guides", action="store_true", help="salva tambem uma previa com zonas seguras")
    a = ap.parse_args()

    im = ImageOps.exif_transpose(Image.open(a.input)).convert("RGB")
    im = cover_crop(im, a.focus_y)
    im = add_grain(im, a.grain)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, quality=a.quality, subsampling=0)
    print(f"{out} ({W}x{H})")
    if a.guides:
        gp = out.with_name(out.stem + "_zonas.jpg")
        guides(im).save(gp, quality=85)
        print(f"{gp} (previa com zonas seguras; nao poste esta)")


if __name__ == "__main__":
    main()
