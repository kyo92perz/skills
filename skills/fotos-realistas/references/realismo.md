# Realismo: como evitar a "cara de IA"

## Índice
1. Por que imagens ficam com cara de IA
2. O que faz uma foto parecer de celular
3. Vocabulário: use / evite
4. Tipos de foto e como descrever cada um
5. Lista de sinais de IA (para a revisão)

---

## 1. Por que imagens ficam com cara de IA

Os modelos aprenderam com milhões de fotos "bonitas" (bancos de imagem, publicidade, retratos de estúdio). Sem instrução contrária, tendem para o "ideal médio", e é isso que denuncia a IA:

- **Pele de cera:** lisa demais, sem poros, sem textura, brilho uniforme. É o sinal mais forte.
- **Luz perfeita demais:** o rosto iluminado por igual, com luz de recorte (rim light) dourada, em qualquer cenário.
- **HDR exagerado e cores saturadas:** céu azul demais, pele alaranjada, contraste "pop".
- **Fundo desfocado demais:** desfoque de lente f/1.2 em foto que deveria ser de celular, ou fundo genérico e vazio.
- **Pose de modelo:** centralizada, simétrica, olhar fixo na câmera, sorriso de comercial.
- **Tudo arrumado demais:** cabelo sem fio solto, roupa sem amassado, lugar sem nenhuma bagunça.
- **Embelezamento automático:** afina o rosto, aumenta os olhos, clareia e alinha os dentes, rejuvenesce. Isso também **destrói a semelhança** com a pessoa real.

A estratégia é descrever **o oposto do ideal médio**: a foto comum, um pouco imperfeita, que as pessoas realmente postam.

## 2. O que faz uma foto parecer de celular

- **Câmera e lente concretas:** "shot on an iPhone 15 Pro main camera (24mm)", "front-facing selfie camera". Celular tem muita profundidade de campo: o fundo aparece reconhecível, só um pouco suave (o modo retrato é a exceção, se pedido).
- **Processamento de celular:** HDR leve de smartphone, um pouco de ruído nas sombras, nitidez digital discreta, balanço de branco às vezes um pouco quente ou frio.
- **Luz que existe no lugar:** janela lateral, sol da tarde, luminária de restaurante, poste. Se a luz não tem fonte plausível, parece IA. Diga de onde vem a luz.
- **Enquadramento humano:** levemente torto, um pouco descentralizado, corte "errado" no topo da cabeça ou no cotovelo, braço de selfie aparecendo.
- **Pele real:** poros visíveis, pequenas imperfeições, leve vermelhidão, olheiras naturais, pelinhos finos, brilho natural na zona T, linhas de expressão da idade real.
- **Cabelo real:** fios soltos, frizz leve, mecha fora do lugar.
- **Vida real no fundo:** pessoas desfocadas passando, copos na mesa, fios, placas, carro estacionado, objetos comuns.
- **Momento, não pose:** rindo no meio de uma fala, olhando para o lado, mexendo no cabelo, segurando algo com naturalidade.

## 3. Vocabulário

### Use (em inglês, no prompt)
- `candid smartphone photo`, `casual snapshot`, `photo taken by a friend`, `front camera selfie, arm extended`
- `shot on iPhone 15 Pro, main camera, 24mm`, `smartphone HDR`, `slight digital noise in the shadows`
- `natural daylight from a window on the left`, `overcast soft light`, `late afternoon sun, warm low light, long shadows`, `mixed indoor lighting`
- `realistic skin texture with visible pores, natural imperfections, no retouching, no beauty filter`
- `natural flyaway hairs`, `slightly wrinkled fabric`, `everyday background details`
- `slightly off-center framing`, `slightly tilted angle`, `deep depth of field typical of a phone camera`
- `true-to-life colors, neutral color grading`
- `unposed, natural expression, mid-laugh` (quando combinar com o pedido)

### Evite
- `ultra realistic`, `hyperrealistic`, `photorealistic 8k`, `4k`, `HDR`, `masterpiece`, `best quality`, `highly detailed`
- `cinematic`, `cinematic lighting`, `dramatic lighting`, `studio lighting`, `volumetric light`, `golden glow`
- `beautiful`, `gorgeous`, `stunning`, `flawless`, `perfect skin`, `glowing skin`, `model`, `editorial`, `fashion shoot`
- `bokeh` (desfoque forte), `85mm f/1.2`, `DSLR` (a menos que a pessoa peça uma "foto profissional")
- `octane render`, `unreal engine`, `digital art`, `trending on artstation`

Essas palavras puxam o modelo justamente para o estilo de banco de imagem ou de render 3D.

### Proibições escritas de forma positiva
Os modelos de imagem às vezes "leem" a palavra proibida e a colocam na imagem. Prefira dizer o que **é**: em vez de "no smooth skin", diga "realistic skin texture with visible pores". Use uma linha final curta de restrições só para o essencial: "Do not beautify, slim, or change the face. No text overlays, no watermark."

## 4. Tipos de foto

| Tipo | Como descrever | Cuidados |
|---|---|---|
| **Selfie** | `front camera selfie, arm extended out of frame, slight wide-angle perspective, face fills upper third` | Leve distorção de grande-angular é normal e realista. Celular não aparece na mão (é ele que tira a foto). |
| **Foto tirada por amigo** | `photo taken by a friend standing about 2 meters away, rear phone camera, eye level` | Ângulo da altura dos olhos, não de baixo para cima. |
| **Selfie no espelho** | `mirror selfie, holding the phone at chest height, phone partially covering nothing of the face` | O celular aparece e o reflexo precisa ser coerente. Texto e logos aparecem invertidos no espelho. |
| **Noite / balada / restaurante** | `night, dim ambient light, phone flash` ou `night mode, warm ambient lights, some motion softness` | Foto noturna de celular tem ruído e flash duro, e isso é realista. Não deixe "limpo" demais. |
| **Viagem / paisagem** | Pessoa ocupando de 1/3 a 1/2 da altura e o ponto turístico reconhecível ao fundo | Quanto menor o rosto, mais difícil manter a identidade. Faça uma edição focada no rosto depois, se precisar. |
| **Close / retrato** | `close-up, face and shoulders, window light` | Aqui a pele real é o que mais pesa. Mostre poros e textura. |
| **"Foto profissional"** (se pedido) | `professional photo, 50mm, natural light, minimal retouching` | Mesmo "profissional", peça retoque mínimo para não perder a semelhança. |

## 5. Sinais de IA para a revisão

Ao revisar cada imagem, olhe **ampliado** e confira:

**Rosto e corpo**
- [ ] Pele com textura real? (sem cera, sem plástico, sem brilho uniforme)
- [ ] Olhos: os dois olham para o mesmo ponto? Os reflexos de luz são coerentes entre os dois olhos?
- [ ] Dentes: quantidade e formato normais, sem "fileira infinita" de dentes brancos?
- [ ] Orelhas e brincos: o brinco esquerdo combina com o direito (se for um par)? O brinco está preso à orelha?
- [ ] Mãos: cinco dedos, articulações normais, unhas coerentes, sem dedos fundidos com objetos?
- [ ] Pescoço e ombros com proporção normal? A cabeça não está grande demais para o corpo?
- [ ] Cabelo: as pontas não se dissolvem no fundo?

**Roupa e objetos**
- [ ] Botões, zíperes, alças e costuras fazem sentido?
- [ ] Estampas e logos não estão deformados?
- [ ] Os objetos seguros na mão estão apoiados de forma física (não flutuam, não atravessam os dedos)?
- [ ] Óculos: as hastes vão até as orelhas?

**Cena**
- [ ] Texto em placas, cardápios e camisetas está legível e correto, ou foi evitado? (Texto embaralhado denuncia IA na hora.)
- [ ] As linhas retas do fundo (portas, azulejos, grades) não estão tortas ou derretidas?
- [ ] As sombras vão na mesma direção da fonte de luz? A pessoa tem sombra no chão?
- [ ] O reflexo no espelho ou na água é coerente?
- [ ] As pessoas ao fundo não têm rostos deformados? (Se tiverem, peça "background people out of focus" ou menos pessoas.)
- [ ] A escala está certa (pessoa x porta x carro)?

**Imagem como um todo**
- [ ] A cor está natural, sem saturação de propaganda?
- [ ] Sem halo ou contorno brilhante ao redor da pessoa (sinal de recorte)?
- [ ] A nitidez é coerente (não fica o rosto hipernítido num fundo de outra qualidade)?

Qualquer item que falhar vira uma correção pontual por edição (veja `prompt-guia.md`, seção "Prompts de correção").
