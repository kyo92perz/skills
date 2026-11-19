#!/usr/bin/env python3
"""Prepara fotos de referencia: corrige rotacao, converte para JPEG, padroniza tamanho,
avisa sobre fotos pequenas/borradas e gera uma folha de contato numerada (contato.jpg).

Uso:
  python prepare_refs.py PASTA_OU_ARQUIVOS... --out referencias_prontas [--max-side 1600]
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIF = True
except ImportError:
    HEIF = False

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".bmp", ".tif", ".tiff"}


def sharpness(img):
    """Variancia do Laplaciano em escala de cinza (numero baixo = borrada)."""
    g = np.asarray(img.convert("L").resize((512, int(512 * img.height / img.width))), dtype=np.float32)
    lap = (-4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:])
    return float(lap.var())


def collect(inputs):
    files = []
    for item in inputs:
        p = Path(item)
        if p.is_dir():
            files += sorted(f for f in p.iterdir() if f.suffix.lower() in EXTS)
        elif p.is_file():
            files.append(p)
        else:
            print(f"Ignorado (nao existe): {p}", file=sys.stderr)
    return files


def contact_sheet(paths, out_path, thumb=360):
    cols = min(4, len(paths))
    rows = (len(paths) + cols - 1) // cols
    label_h = 36
    sheet = Image.new("RGB", (cols * thumb, rows * (thumb + label_h)), "white")
    draw = ImageDraw.Draw(sheet)
    for i, p in enumerate(paths):
        im = Image.open(p)
        im.thumbnail((thumb, thumb))
        x, y = (i % cols) * thumb, (i // cols) * (thumb + label_h)
        sheet.paste(im, (x + (thumb - im.width) // 2, y + label_h + (thumb - im.height) // 2))
        draw.text((x + 8, y + 8), p.name, fill="black")
    sheet.save(out_path, quality=90)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-side", type=int, default=1600)
    a = ap.parse_args()

    files = collect(a.inputs)
    if not files:
        sys.exit("Nenhuma imagem encontrada.")
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    start = len(list(out.glob("ref_*.jpg"))) + 1

    saved, report = [], []
    for i, f in enumerate(files, start):
        if f.suffix.lower() in (".heic", ".heif") and not HEIF:
            report.append(f"{f.name}: HEIC nao suportado -> pip install pillow-heif (ou exporte como JPG)")
            continue
        try:
            im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        except Exception as e:
            report.append(f"{f.name}: nao abriu ({e})")
            continue
        w, h = im.size
        im.thumbnail((a.max_side, a.max_side), Image.LANCZOS)
        dest = out / f"ref_{i:02d}.jpg"
        im.save(dest, quality=95)
        saved.append(dest)
        warn = []
        if min(w, h) < 600:
            warn.append(f"pequena ({w}x{h})")
        s = sharpness(im)
        if s < 60:
            warn.append(f"possivelmente borrada (nitidez {s:.0f})")
        report.append(f"{dest.name} <- {f.name} ({w}x{h})" + (f"  AVISO: {', '.join(warn)}" if warn else ""))

    (out / "origem.txt").open("a", encoding="utf-8").write("\n".join(report) + "\n")
    all_refs = sorted(out.glob("ref_*.jpg"))
    if all_refs:
        contact_sheet(all_refs, out / "contato.jpg")
    print("\n".join(report))
    print(f"\n{len(saved)} foto(s) preparada(s). Total em {out}: {len(all_refs)}")
    print(f"Folha de contato: {out / 'contato.jpg'}  <- abra e avalie angulos, luz e nitidez")
    if len(all_refs) < 3:
        print("Dica: 3 a 8 fotos com angulos variados dao resultados bem mais fieis.")


if __name__ == "__main__":
    main()
