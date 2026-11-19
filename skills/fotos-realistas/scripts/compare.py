#!/usr/bin/env python3
"""Monta uma folha de comparacao: referencias na linha de cima, imagens geradas embaixo,
todas na mesma altura e numeradas. Serve para revisar identidade lado a lado.

Uso:
  python compare.py --refs ref_01.jpg ref_02.jpg --images geradas/*.png --out comparacao.jpg
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

H = 640
LABEL = 34


def row(paths, title):
    ims = []
    for p in paths:
        im = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
        im = im.resize((max(1, int(im.width * H / im.height)), H), Image.LANCZOS)
        ims.append((Path(p).name, im))
    width = sum(im.width for _, im in ims) + 10 * (len(ims) + 1)
    canvas = Image.new("RGB", (max(width, 400), H + LABEL + 10), (245, 245, 245))
    d = ImageDraw.Draw(canvas)
    d.text((10, 4), title, fill=(200, 0, 0))
    x = 10
    for name, im in ims:
        canvas.paste(im, (x, LABEL))
        d.text((x + 4, LABEL + 4), name, fill=(255, 255, 0), stroke_width=2, stroke_fill=(0, 0, 0))
        x += im.width + 10
    return canvas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--refs", nargs="+", required=True)
    ap.add_argument("--images", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    top = row(a.refs[:4], "REFERENCIAS")
    bottom = row(a.images, "GERADAS")
    sheet = Image.new("RGB", (max(top.width, bottom.width), top.height + bottom.height), "white")
    sheet.paste(top, (0, 0))
    sheet.paste(bottom, (0, top.height))
    max_w = 3000
    if sheet.width > max_w:
        sheet = sheet.resize((max_w, int(sheet.height * max_w / sheet.width)), Image.LANCZOS)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out, quality=90)
    print(a.out)


if __name__ == "__main__":
    main()
