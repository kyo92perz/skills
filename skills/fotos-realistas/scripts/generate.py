#!/usr/bin/env python3
"""Gera ou edita fotos usando imagens de referencia (Gemini ou OpenAI).

Exemplos:
  python generate.py --check
  python generate.py --prompt-file prompt.txt --refs ref_01.jpg ref_02.jpg --out geradas --n 3
  python generate.py --edit geradas/var_02.png --refs ref_01.jpg --prompt "Keep everything ... change only ..." --out geradas
  python generate.py --list-models
  python generate.py --dry-run --prompt "teste" --refs ref_01.jpg --out /tmp/x

So usa a biblioteca padrao do Python (sem dependencias). A chave vem de variaveis
de ambiente e nunca e gravada em disco nem impressa.
"""
import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path

GEMINI_DEFAULT_MODEL = "gemini-3-pro-image-preview"
OPENAI_DEFAULT_MODEL = "gpt-image-1"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
OPENAI_BASE = "https://api.openai.com/v1"
TIMEOUT = 300


def gemini_key():
    return os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")


def openai_key():
    return os.environ.get("OPENAI_API_KEY")


def pick_provider(requested):
    if requested != "auto":
        return requested
    if gemini_key():
        return "gemini"
    if openai_key():
        return "openai"
    return None


def mime_of(path):
    mt, _ = mimetypes.guess_type(str(path))
    if mt not in ("image/jpeg", "image/png", "image/webp"):
        sys.exit(f"Formato nao suportado: {path} (use JPG/PNG/WEBP; rode prepare_refs.py antes)")
    return mt


def http(req, retries=3):
    """Executa a requisicao com retry em 429/5xx. Retorna (status, bytes)."""
    delay = 5
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            body = e.read()
            if e.code in (429, 500, 502, 503, 504) and attempt < retries:
                print(f"  HTTP {e.code}, tentando de novo em {delay}s...", file=sys.stderr)
                time.sleep(delay)
                delay *= 2
                continue
            return e.code, body
        except urllib.error.URLError as e:
            if attempt < retries:
                print(f"  Erro de rede ({e.reason}), tentando de novo em {delay}s...", file=sys.stderr)
                time.sleep(delay)
                delay *= 2
                continue
            sys.exit(f"Erro de rede: {e.reason}. Se estiver num ambiente com rede restrita, "
                     "use o modo manual (veja references/provedores.md).")


def explain_error(provider, status, body):
    try:
        msg = json.loads(body).get("error", {})
        msg = msg.get("message") if isinstance(msg, dict) else msg
    except Exception:
        msg = body[:500].decode("utf-8", "replace")
    hint = ""
    if status in (401, 403):
        hint = " -> chave invalida/sem permissao, ou host bloqueado pela rede do ambiente."
    elif status == 404:
        hint = " -> modelo nao encontrado; use --list-models e passe --model."
    elif status == 429:
        hint = " -> limite de uso/cota atingido; espere ou verifique o faturamento."
    return f"[{provider}] HTTP {status}: {msg}{hint}"


# ---------------------------------------------------------------- Gemini

def gemini_payload(prompt, images, aspect, size, model):
    parts = [{"text": prompt}]
    for p in images:
        parts.append({"inline_data": {"mime_type": mime_of(p),
                                      "data": base64.b64encode(Path(p).read_bytes()).decode()}})
    image_config = {"aspectRatio": aspect}
    # imageSize so e aceito pelos modelos "pro"/3.x; os "flash" 2.5 recusam o campo.
    if size and ("pro" in model or model.startswith("gemini-3")):
        image_config["imageSize"] = size
    return {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "imageConfig": image_config},
    }


def gemini_generate(prompt, images, aspect, size, model, dry_run):
    payload = gemini_payload(prompt, images, aspect, size, model)
    url = f"{GEMINI_BASE}/models/{model}:generateContent"
    if dry_run:
        return {"dry_run": True, "url": url, "payload": redact(payload)}
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                 headers={"Content-Type": "application/json",
                                          "x-goog-api-key": gemini_key()})
    status, body = http(req)
    if status != 200:
        return {"error": explain_error("gemini", status, body)}
    data = json.loads(body)
    out = {"images": [], "text": []}
    for cand in data.get("candidates", []):
        for part in (cand.get("content") or {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                out["images"].append(base64.b64decode(inline["data"]))
            elif part.get("text"):
                out["text"].append(part["text"])
        if not out["images"] and cand.get("finishReason"):
            out["text"].append(f"finishReason={cand['finishReason']}")
    fb = data.get("promptFeedback")
    if fb and fb.get("blockReason"):
        out["text"].append(f"bloqueado: {fb['blockReason']}")
    return out


def gemini_list_models():
    req = urllib.request.Request(f"{GEMINI_BASE}/models?pageSize=200",
                                 headers={"x-goog-api-key": gemini_key()})
    status, body = http(req)
    if status != 200:
        sys.exit(explain_error("gemini", status, body))
    for m in json.loads(body).get("models", []):
        name = m["name"].split("/")[-1]
        if "image" in name or "imagen" in name:
            print(f"{name:45s} {m.get('displayName', '')}")


# ---------------------------------------------------------------- OpenAI

def multipart(fields, files):
    boundary = uuid.uuid4().hex
    chunks = []
    for k, v in fields.items():
        chunks.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    for k, path in files:
        chunks.append((f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; "
                       f"filename=\"{Path(path).name}\"\r\nContent-Type: {mime_of(path)}\r\n\r\n").encode())
        chunks.append(Path(path).read_bytes())
        chunks.append(b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def openai_generate(prompt, images, n, model, dry_run, high_fidelity=True):
    fields = {"model": model, "prompt": prompt, "n": str(n), "size": "1024x1536", "quality": "high"}
    if high_fidelity:
        fields["input_fidelity"] = "high"
    files = [("image[]", p) for p in images]
    url = f"{OPENAI_BASE}/images/edits"
    if dry_run:
        return {"dry_run": True, "url": url, "fields": {**fields, "prompt": fields["prompt"][:200] + "..."},
                "files": [str(p) for _, p in files]}
    body, ctype = multipart(fields, files)
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Content-Type": ctype, "Authorization": f"Bearer {openai_key()}"})
    status, resp = http(req)
    if status == 400 and high_fidelity and b"input_fidelity" in resp:
        # Modelo nao aceita o parametro: tenta sem ele.
        return openai_generate(prompt, images, n, model, dry_run, high_fidelity=False)
    if status != 200:
        return {"error": explain_error("openai", status, resp)}
    data = json.loads(resp)
    return {"images": [base64.b64decode(d["b64_json"]) for d in data.get("data", []) if d.get("b64_json")],
            "text": [d.get("revised_prompt") for d in data.get("data", []) if d.get("revised_prompt")]}


# ---------------------------------------------------------------- utilidades

def redact(payload):
    p = json.loads(json.dumps(payload))
    for c in p.get("contents", []):
        for part in c.get("parts", []):
            if "inline_data" in part:
                part["inline_data"]["data"] = f"<{len(part['inline_data']['data'])} chars base64>"
    return p


def next_index(out_dir):
    nums = []
    for f in out_dir.glob("var_*.png"):
        try:
            nums.append(int(f.stem.split("_")[1]))
        except (IndexError, ValueError):
            pass
    return max(nums, default=0) + 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prompt", help="texto do prompt")
    ap.add_argument("--prompt-file", help="arquivo com o prompt")
    ap.add_argument("--refs", nargs="*", default=[], help="imagens de referencia (3 a 6 recomendado)")
    ap.add_argument("--edit", help="imagem-base para edicao (vai como primeira imagem)")
    ap.add_argument("--out", help="pasta de saida")
    ap.add_argument("--n", type=int, default=2, help="numero de variacoes (padrao 2)")
    ap.add_argument("--provider", choices=["auto", "gemini", "openai"], default="auto")
    ap.add_argument("--model", help="nome do modelo (sobrepoe o padrao)")
    ap.add_argument("--aspect", default="9:16", help="proporcao no Gemini (padrao 9:16)")
    ap.add_argument("--size", default="2K", help="resolucao no Gemini pro: 1K, 2K, 4K (padrao 2K)")
    ap.add_argument("--check", action="store_true", help="mostra chaves/provedor configurados e sai")
    ap.add_argument("--list-models", action="store_true", help="lista modelos de imagem do Gemini")
    ap.add_argument("--dry-run", action="store_true", help="monta a requisicao sem enviar")
    a = ap.parse_args()

    if a.check:
        prov = pick_provider(a.provider)
        print(f"GEMINI_API_KEY: {'configurada' if gemini_key() else 'ausente'}")
        print(f"OPENAI_API_KEY: {'configurada' if openai_key() else 'ausente'}")
        print(f"Provedor que sera usado: {prov or 'nenhum -> use o modo manual (references/provedores.md)'}")
        if prov:
            default = GEMINI_DEFAULT_MODEL if prov == "gemini" else OPENAI_DEFAULT_MODEL
            env = "GEMINI_IMAGE_MODEL" if prov == "gemini" else "OPENAI_IMAGE_MODEL"
            print(f"Modelo: {os.environ.get(env) or default}")
        return
    if a.list_models:
        if not gemini_key():
            sys.exit("Defina GEMINI_API_KEY para listar modelos.")
        gemini_list_models()
        return

    prompt = a.prompt or (Path(a.prompt_file).read_text(encoding="utf-8") if a.prompt_file else None)
    if not prompt or not a.out:
        ap.error("informe --prompt/--prompt-file e --out")
    images = ([a.edit] if a.edit else []) + list(a.refs)
    if not images:
        ap.error("informe ao menos uma imagem em --refs (ou --edit)")
    for p in images:
        if not Path(p).is_file():
            sys.exit(f"Arquivo nao encontrado: {p}")

    provider = pick_provider(a.provider) or ("gemini" if a.dry_run else None)
    if not provider:
        sys.exit("Nenhuma chave configurada (GEMINI_API_KEY ou OPENAI_API_KEY). "
                 "Use o modo manual: veja references/provedores.md.")
    if provider == "gemini":
        model = a.model or os.environ.get("GEMINI_IMAGE_MODEL") or GEMINI_DEFAULT_MODEL
    else:
        model = a.model or os.environ.get("OPENAI_IMAGE_MODEL") or OPENAI_DEFAULT_MODEL

    out_dir = Path(a.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"Provedor: {provider} | modelo: {model} | imagens de entrada: {len(images)} | variacoes: {a.n}")

    results, notes = [], []
    if provider == "gemini":
        for i in range(a.n):
            print(f"  gerando {i + 1}/{a.n}...")
            r = gemini_generate(prompt, images, a.aspect, a.size, model, a.dry_run)
            if r.get("dry_run"):
                print(json.dumps(r, indent=2, ensure_ascii=False))
                return
            if r.get("error"):
                print(r["error"], file=sys.stderr)
                break
            results += r["images"]
            notes += r["text"]
    else:
        r = openai_generate(prompt, images, a.n, model, a.dry_run)
        if r.get("dry_run"):
            print(json.dumps(r, indent=2, ensure_ascii=False))
            return
        if r.get("error"):
            print(r["error"], file=sys.stderr)
        else:
            results, notes = r["images"], r["text"]

    idx = next_index(out_dir)
    saved = []
    for img in results:
        path = out_dir / f"var_{idx:02d}.png"
        path.write_bytes(img)
        saved.append(str(path))
        idx += 1

    log = out_dir / "log.jsonl"
    with log.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"time": datetime.now().isoformat(timespec="seconds"), "provider": provider,
                            "model": model, "edit": a.edit, "refs": a.refs, "prompt": prompt,
                            "saved": saved, "notes": notes}, ensure_ascii=False) + "\n")

    for n in notes:
        print(f"  nota do modelo: {n[:300]}")
    if not saved:
        sys.exit("Nenhuma imagem gerada. Veja as mensagens acima (bloqueio de seguranca, cota, modelo).")
    print("Salvas:")
    for s in saved:
        print(f"  {s}")


if __name__ == "__main__":
    main()
