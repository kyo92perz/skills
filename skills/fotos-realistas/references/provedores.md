# Provedores de imagem

O `scripts/generate.py` funciona com dois provedores. Com `--provider auto` (o padrão), usa o Gemini se houver `GEMINI_API_KEY`; senão, o OpenAI se houver `OPENAI_API_KEY`.

| | Gemini (recomendado) | OpenAI |
|---|---|---|
| Variável da chave | `GEMINI_API_KEY` (ou `GOOGLE_API_KEY`) | `OPENAI_API_KEY` |
| Modelo padrão | `gemini-3-pro-image-preview` | `gpt-image-1` |
| Trocar o modelo | `--model` ou `GEMINI_IMAGE_MODEL` | `--model` ou `OPENAI_IMAGE_MODEL` |
| Várias referências | Sim (várias imagens na mesma mensagem) | Sim (`image[]` no endpoint de edição) |
| Formato vertical | `aspectRatio` 9:16 nativo | 1024x1536 (2:3), recortado depois para 9:16 |
| Fidelidade de rosto | Muito boa em edição com referência | `input_fidelity=high` ajuda bastante |
| Onde criar a chave | aistudio.google.com → "Get API key" | platform.openai.com → API keys |

Os nomes de modelo mudam com frequência. Se der erro 404 de modelo, rode `python scripts/generate.py --list-models` (Gemini) para ver os disponíveis e passe o mais recente de geração de imagem com `--model`. Modelos com "flash" no nome são mais baratos e rápidos; os "pro" costumam preservar melhor o rosto e seguir melhor o pedido.

## Configurar a chave

Peça para a pessoa configurar a chave **ela mesma**, sem colar no chat:

```bash
export GEMINI_API_KEY="..."   # no terminal, antes de abrir o Claude Code
```

No Claude Code na nuvem (claude.ai/code), a chave deve ser salva nas configurações do ambiente (segredos ou credenciais de rede). Se houver uma ferramenta de solicitar credencial disponível, use-a para o host `generativelanguage.googleapis.com` (Gemini) ou `api.openai.com` (OpenAI). Se a rede do ambiente bloquear esses hosts, use o modo manual.

## Custos (ordem de grandeza)

Cada imagem custa alguns centavos de dólar nos modelos "pro" e menos nos "flash". Gerar 3 variações e fazer 2 correções para cada foto dá cerca de 5 a 8 chamadas por foto final. Avise a pessoa se ela pedir muitas fotos de uma vez.

## Bloqueios de segurança

Os provedores recusam alguns pedidos (nudez, menores, figuras públicas, violência). O script mostra o motivo retornado (`finishReason` / mensagem de erro). Não tente contornar; explique e ajuste o pedido se fizer sentido (ex: "biquíni" costuma passar; "nua" não).

## Modo manual (sem chave)

Funciona em qualquer conta gratuita do Gemini ou do ChatGPT:
1. O Claude prepara as referências (`prepare_refs.py`), o `perfil.md`, o checklist e o prompt.
2. A pessoa abre o app, **anexa as referências indicadas na ordem indicada**, cola o prompt e envia.
3. Pede de 2 a 3 variações ("gere mais duas versões").
4. Manda as imagens de volta para o Claude, que revisa com o checklist e a lista de sinais de IA e escreve o prompt de correção ("Keep everything exactly the same and change only...") para colar **na mesma conversa** do app.
5. No final, o Claude roda `story_finish.py` na imagem aprovada para entregar em 1080x1920.
