---
name: fotos-realistas
description: Cria fotos ultrarrealistas, com cara de foto de celular de verdade e sem "cara de IA", usando fotos de referência da própria pessoa para manter o rosto o mais fiel possível, prontas para os stories do Instagram (1080x1920). Use esta skill sempre que a pessoa pedir para gerar, criar ou montar uma foto ou imagem dela mesma (ou de alguém que autorizou) a partir de fotos de referência, quiser "uma foto minha em tal lugar/roupa/situação", foto para story, post, perfil ou status, ensaio fotográfico com IA, foto realista, "parecer foto de verdade", "sem efeito de IA", ou mandar selfies pedindo novas fotos, mesmo que não diga a palavra "skill" nem "IA".
---

# Fotos realistas com o seu rosto

Objetivo: gerar fotos que **qualquer pessoa olharia e acharia que foram tiradas com um celular**, com o rosto da pessoa das referências **reconhecível de verdade**, e com **cada detalhe pedido presente exatamente como foi pedido**. São três critérios e todos contam: uma foto realista com outro rosto falhou; uma foto com o rosto certo mas com o vestido da cor errada também falhou.

O Claude não gera pixels sozinho. Esta skill usa um modelo de imagem que aceita fotos de referência (Gemini ou OpenAI, via `scripts/generate.py`) e o Claude faz o que esses modelos fazem mal sozinhos: entender o pedido em detalhes, escrever o prompt certo, **olhar o resultado com olho crítico** e corrigir até ficar certo.

## Limites (leia antes de tudo)

Esta skill é para fotos **da própria pessoa** ou de quem **autorizou** o uso da própria imagem. Não gere:
- imagens de outra pessoa real sem autorização (ex: ex-namorada, colega, famoso) ou que a coloquem em situação comprometedora, falsa ou humilhante;
- nudez ou conteúdo sexual, e nada sexualizado envolvendo menores de idade;
- documentos, provas ou "flagras" falsos feitos para enganar alguém (ex: foto fingindo estar em um lugar para um álibi, foto com uma celebridade apresentada como verdadeira).

Deixar a foto **esteticamente natural** é o objetivo da skill. Mas se a pessoa pedir para burlar detecção ou remover rótulos/marcas d'água de IA, explique que isso não faz parte da skill. O Instagram pode pedir o rótulo de "conteúdo de IA" em imagens realistas geradas; a decisão de postar é da pessoa.

## Organização dos arquivos

Use (ou crie) esta estrutura na pasta de trabalho, a menos que a pessoa indique outra:

```
fotos-ia/
├── referencias/          # fotos originais da pessoa (qualquer formato)
├── referencias_prontas/  # gerado por prepare_refs.py (ref_01.jpg, ref_02.jpg...)
├── perfil.md             # descrição fixa do rosto/corpo (escrita uma vez, reusada sempre)
└── trabalhos/
    └── 2026-11-19_praia-por-do-sol/
        ├── pedido.md     # checklist do pedido
        ├── prompt.txt
        ├── geradas/      # saídas brutas do modelo
        └── final/        # story_01.jpg pronto para postar
```

O `perfil.md` e as `referencias_prontas/` são o que garante que a 10ª foto pareça a mesma pessoa da 1ª. Se já existirem, reaproveite. Não refaça a cada pedido.

## Fluxo de trabalho

### 1. Verificar o gerador (uma vez por sessão)

```bash
python scripts/generate.py --check
```

Mostra quais chaves estão configuradas (`GEMINI_API_KEY` ou `OPENAI_API_KEY`) e qual provedor será usado. Detalhes, modelos e como obter as chaves estão em `references/provedores.md`.

- **Tem chave:** siga o fluxo automático.
- **Não tem chave:** ofereça as duas opções: (a) criar a chave (a do Gemini se cria em poucos minutos no Google AI Studio), ou (b) **modo manual**: você prepara tudo (escolhe as referências, escreve o prompt, diz exatamente quais fotos anexar), a pessoa cola no app do Gemini ou do ChatGPT e te manda o resultado, e você revisa e escreve o prompt de correção. O modo manual dá resultados quase tão bons, porque o que mais pesa é o prompt e a revisão.
- Em ambiente de nuvem com rede restrita, a chamada pode ser bloqueada pelo proxy; nesse caso diga isso e use o modo manual.

### 2. Preparar as referências (uma vez, ou quando chegarem fotos novas)

```bash
python scripts/prepare_refs.py fotos-ia/referencias --out fotos-ia/referencias_prontas
```

O script corrige a rotação, converte para JPEG, padroniza o tamanho, avisa sobre fotos pequenas ou borradas e gera `contato.jpg`, uma folha com todas as fotos numeradas. **Abra o `contato.jpg` e olhe.** Uma boa base tem:
- de 3 a 8 fotos **recentes**, rosto nítido, sem filtro de beleza, sem óculos escuros e sem boné cobrindo a testa;
- ângulos variados: de frente, 3/4 para cada lado e pelo menos uma de corpo inteiro ou meio corpo;
- luz natural (janela, rua); evite flash estourado e luz colorida forte.

Se a base estiver fraca (só 1 foto, fotos com filtro, todas no mesmo ângulo), diga à pessoa o que falta e por quê. Referências ruins são a causa número 1 de rosto "parecido, mas não igual".

### 3. Escrever o `perfil.md` (uma vez)

Olhe as referências e descreva **com precisão e sem embelezar** os traços que não mudam: formato do rosto e do queixo, olhos (cor, formato, pálpebra), sobrancelhas (espessura, arco), nariz (ponte, ponta, largura), lábios, dentes se aparecem ao sorrir, tom e textura da pele, sardas, pintas e cicatrizes **com a localização** ("pinta pequena acima do lado esquerdo do lábio"), cabelo (cor real, raiz, textura, comprimento, divisão), barba, orelhas, piercings, tatuagens (onde e como são), tipo de corpo, altura aparente e idade aparente. Use o modelo em `references/perfil-modelo.md`.

Mostre o perfil à pessoa e peça correções ("o cabelo está mais curto agora", "tirei o piercing"). Esse texto entra em todo prompt e ancora a identidade quando o rosto aparece pequeno ou de lado.

### 4. Transformar o pedido em checklist

"Sair exatamente igual" depende de não perder nenhum detalhe. Antes de escrever o prompt, quebre o pedido em itens atômicos e salve em `pedido.md`:

```
Pedido original: "eu de vestido vermelho num café em Paris, segurando um croissant, de manhã"
[ ] Vestido: vermelho, (comprimento/modelo não especificado → midi simples, declarado)
[ ] Local: café parisiense (mesinha na calçada, cadeiras de vime, fachada típica)
[ ] Segurando croissant (mão visível, croissant real, com farelos)
[ ] Horário: manhã (luz suave, sol baixo, sombras longas)
[ ] Enquadramento: story vertical 9:16, meio corpo
[ ] Quem tira a foto: amigo, câmera traseira (não foi pedido selfie)
```

Regras do checklist:
- **Tudo o que a pessoa disse vira item**: cor, peça, objeto, pose, expressão, lugar, hora, clima, cabelo, maquiagem, acessórios, texto em placas.
- Quando algo **não foi especificado**, escolha a opção mais natural e comum e **marque como escolha sua**, para avisar no final. Não invente elementos chamativos que ela não pediu (nada de chapéu, óculos ou cachorro "para enfeitar").
- Só pergunte antes de gerar se a ambiguidade mudar a foto inteira (ex: "na praia": selfie ou foto de corpo inteiro?). No máximo uma pergunta curta; se der para escolher bem sozinho, escolha.
- Se o pedido mudar algo do perfil (cabelo loiro, de barba), o pedido vence naquele item e o resto do rosto continua igual.

### 5. Escrever o prompt

Leia `references/realismo.md` (o guia anti-"cara de IA") e use a estrutura de `references/prompt-guia.md`. Os pontos que mais pesam:

1. **Âncora de identidade primeiro:** "a pessoa das imagens de referência", mantendo exatamente o rosto, as proporções e as marcas, sem embelezar, afinar ou rejuvenescer, mais os traços-chave do `perfil.md`.
2. **Cada item do checklist escrito de forma concreta**, com a cor exata, a peça exata e a posição das mãos.
3. **Linguagem de foto de celular, não de "arte":** câmera de celular específica, luz ambiente real, enquadramento um pouco imperfeito, textura de pele real, fundo com a bagunça normal da vida. Nunca use "8k, ultra realistic, masterpiece, cinematic, perfect skin, stunning"; essas palavras *produzem* a cara de IA.
4. Escreva o prompt **em inglês** (os modelos seguem melhor), mas mostre à pessoa um resumo em português do que pediu.

**Escolha das referências por geração:** mande de 3 a 6, priorizando as que têm **ângulo e luz parecidos** com a foto pedida, mais uma de frente bem nítida. Mandar 15 fotos misturadas costuma diluir o rosto. Liste no prompt o papel de cada imagem quando ajudar ("Image 1: best frontal face reference").

### 6. Gerar

```bash
python scripts/generate.py \
  --prompt-file fotos-ia/trabalhos/<job>/prompt.txt \
  --refs fotos-ia/referencias_prontas/ref_01.jpg fotos-ia/referencias_prontas/ref_03.jpg fotos-ia/referencias_prontas/ref_04.jpg \
  --out fotos-ia/trabalhos/<job>/geradas --n 3
```

Gere de 2 a 4 variações por pedido; a variação natural entre tentativas é grande e escolher a melhor é barato.

### 7. Revisar com olho crítico (a etapa que faz a diferença)

Monte a comparação lado a lado e **abra para olhar**:

```bash
python scripts/compare.py --refs <2 a 4 refs> --images fotos-ia/trabalhos/<job>/geradas/*.png --out fotos-ia/trabalhos/<job>/comparacao.jpg
```

Avalie cada variação nos três critérios, sendo honesto em vez de otimista:

1. **Identidade:** passe pelo `perfil.md` traço a traço (nariz, olhos, sobrancelhas, queixo, pintas, linha do cabelo, dentes). "Parece alguém parecido" não basta. Pergunte-se: um amigo próximo reconheceria na hora?
2. **Fidelidade ao pedido:** marque cada item do `pedido.md` como ✅ ou ❌. Cor errada, objeto faltando ou pose diferente é ❌.
3. **Realismo:** use a lista de "sinais de IA" em `references/realismo.md` (mãos, dedos, dentes, texto, brincos, pele de cera, brilho de HDR, fundo derretido, sombras incoerentes).

Escolha a melhor variação. Se houver qualquer ❌, **corrija com edição em vez de recomeçar**: passe a melhor imagem como base e peça só a mudança, mantendo todo o resto:

```bash
python scripts/generate.py --edit geradas/var_02.png --refs <refs> \
  --prompt "Keep everything in the image exactly the same. Only change: the dress must be bright red, not burgundy. The face must match the reference photos exactly (nose bridge narrower, mole above left lip)." \
  --out fotos-ia/trabalhos/<job>/geradas --n 2
```

Uma correção por vez funciona melhor que cinco de uma vez. Faça até 3 rodadas; se ainda não estiver bom, mostre a melhor versão, diga claramente o que não ficou igual e sugira o que ajudaria (outra referência, mudar o ângulo, simplificar a cena). Nunca diga que ficou perfeito se não ficou.

### 8. Finalizar para o story

```bash
python scripts/story_finish.py geradas/var_02.png --out final/story_01.jpg --grain 2 --guides
```

- Recorta e redimensiona para **1080x1920** (9:16) sem distorcer; use `--focus-y` (0 = topo, 1 = base) para não cortar a cabeça.
- `--grain` adiciona um granulado leve de sensor de celular, que tira o aspecto "liso demais" (de 1.5 a 3 é natural; 0 desliga).
- `--guides` salva uma prévia com as **zonas seguras do Instagram** (o topo tem barra de perfil e o rodapé tem a caixa de resposta). Confira se o rosto e o que importa estão fora das faixas vermelhas.

### 9. Entregar

Entregue as fotos finais e, em poucas linhas:
- o que foi feito em cada uma;
- **as escolhas que você fez** nos itens não especificados;
- qualquer item que não ficou 100% igual (com honestidade);
- sugestão rápida de próxima variação, se fizer sentido.

## Vários pedidos de uma vez

Para "faz 5 fotos minhas para os stories da semana", crie um job por foto, reaproveite o mesmo `perfil.md` e as mesmas referências, e mantenha consistentes os itens que devem se repetir (mesmo cabelo, mesmas tatuagens). Revise cada foto individualmente; uma série com uma foto de rosto diferente estraga a série toda.

## Arquivos de apoio

- `references/realismo.md`: por que imagens ficam com "cara de IA", vocabulário de foto real e a lista de sinais para a revisão. **Leia antes de escrever o primeiro prompt.**
- `references/prompt-guia.md`: estrutura do prompt, exemplos completos (selfie, foto tirada por amigo, espelho, noite) e prompts de correção.
- `references/perfil-modelo.md`: modelo do `perfil.md`.
- `references/provedores.md`: Gemini e OpenAI, chaves, modelos, custos aproximados e o passo a passo do modo manual.
- `scripts/prepare_refs.py`, `scripts/generate.py`, `scripts/compare.py`, `scripts/story_finish.py`: rode com `--help` para ver todas as opções. Só dependem de Python 3, Pillow e NumPy (`pip install pillow numpy`; `pillow-heif` é opcional, para fotos .HEIC do iPhone).
