# Guia de prompt

## Estrutura (nesta ordem)

```
[1. IDENTIDADE]
Use the person from the reference images. Keep their face, facial proportions, skin tone,
and distinctive marks exactly as in the references: <3 a 6 traços-chave do perfil.md>.
Do not beautify, slim, smooth, de-age, or alter the face in any way. The result must be
immediately recognizable as the same person.

[2. TIPO DE FOTO + CÂMERA]
A candid smartphone photo <selfie / taken by a friend / mirror selfie>, shot on an iPhone 15 Pro
<front camera / main camera 24mm>, vertical 9:16 framing, <enquadramento: half body / full body / close-up>.

[3. CENA: cada item do checklist, concreto]
<Onde, com detalhes físicos do lugar.> <Roupa com cor e peça exatas.> <Pose e mãos.>
<Objetos.> <Expressão.> <Cabelo/maquiagem, se pedido.>

[4. LUZ + HORA]
<Fonte de luz real e direção.> <Hora do dia.> <Clima.>

[5. REALISMO]
Realistic skin texture with visible pores and natural imperfections, natural flyaway hairs,
slightly wrinkled fabric, everyday background details, true-to-life colors, mild smartphone
HDR, slight noise in the shadows, slightly off-center casual framing.

[6. RESTRIÇÕES ESSENCIAIS: curtas]
No text overlays, no watermark, no extra people in focus. <Restrições específicas do pedido.>
```

Dicas:
- **A identidade vai primeiro** e é repetida nos prompts de correção. Os modelos dão mais peso ao começo do prompt.
- **Traços do perfil:** escolha os que mais distinguem a pessoa (o que um caricaturista exageraria): "strong straight eyebrows, slightly wide nose with rounded tip, small mole on right cheek, gap between front teeth, wavy dark brown shoulder-length hair with lighter ends".
- **Seja concreto nas cores:** "bright cherry red", não "red-ish"; "light-wash straight-leg jeans", não "jeans".
- **Mãos:** diga o que cada mão faz ("right hand holding a coffee cup at chest height, left hand in pocket"). Mãos sem tarefa viram mãos estranhas.
- **Rosto pequeno na cena** (corpo inteiro, paisagem): a identidade se perde mais fácil. Considere um enquadramento um pouco mais próximo ou planeje uma edição do rosto depois.
- **Texto na cena:** se a pessoa pediu uma placa com o nome do lugar, escreva o texto exato entre aspas. Se não pediu, evite placas legíveis em primeiro plano.

## Exemplos completos

### A) Selfie, café, manhã
Pedido: "selfie minha tomando café numa padaria de manhã, de moletom cinza"

```
Use the person from the reference images. Keep their face, facial proportions, skin tone and
distinctive marks exactly as in the references: oval face with soft jawline, dark brown almond
eyes, thick straight eyebrows, small mole under the right eye, straight black hair to the
shoulders with a middle part. Do not beautify, slim, smooth, de-age, or alter the face. The
result must be immediately recognizable as the same person.

A casual front-camera selfie taken with an iPhone 15 Pro, arm extended out of frame, slight
wide-angle perspective, vertical 9:16, head and shoulders with a bit of the table visible.

Sitting at a small table in a simple neighborhood bakery: glass display counter with bread
and pastries out of focus in the background, a paper napkin and a small white espresso cup
on the table. Wearing a plain heather-grey hoodie. Holding the espresso cup near the chin
with the left hand, relaxed soft smile, slightly sleepy morning look.

Soft morning daylight coming from the storefront window on the right, mixed with warm
indoor lights.

Realistic skin texture with visible pores and natural imperfections, natural flyaway hairs,
slightly wrinkled hoodie fabric, everyday background details, true-to-life colors, mild
smartphone HDR, slight noise in the shadows, slightly tilted casual framing.

No text overlays, no watermark, no legible signs, background people out of focus.
```

### B) Foto tirada por amigo, praia, pôr do sol
Pedido: "eu de biquíni preto andando na praia no pôr do sol, de costas olhando pra trás"

```
Use the person from the reference images. Keep their face, facial proportions, body type,
skin tone, tattoos and distinctive marks exactly as in the references: <traços>. Fine-line
tattoo of a small flower on the left forearm. Do not beautify, slim, reshape the body,
smooth or alter the face. Immediately recognizable as the same person.

A candid smartphone photo taken by a friend standing about 3 meters behind, rear camera of
an iPhone 15 Pro (24mm), eye level, vertical 9:16, full body with the sea and sky taking the
upper half.

Walking away from the camera on wet sand at the water's edge, looking back over the left
shoulder toward the camera with a natural half-smile. Wearing a simple black bikini. Hair
moving slightly in the wind. Small waves, footprints in the sand, a few people far away and
out of focus.

Sunset, sun low near the horizon on the right, warm orange backlight, soft long shadows on
the sand, some lens flare typical of a phone.

Realistic skin texture, natural body proportions, slight noise in the darker areas,
true-to-life colors without oversaturation, slightly off-center framing.

No text, no watermark.
```

### C) Selfie no espelho, look do dia
```
<IDENTIDADE>
A mirror selfie in a bedroom full-length mirror, holding an iPhone at chest height with the
right hand (phone visible, not covering the face), vertical 9:16, full body.
Wearing <look exato>. Standing relaxed with weight on one leg, left hand on the hip.
Room details: unmade bed corner, clothes on a chair, warm lamp light plus daylight from a
window on the left.
<REALISMO> Slight smudges on the mirror surface, realistic reflection.
No text, no watermark.
```

### D) Noite, restaurante, com flash
```
<IDENTIDADE>
A candid photo taken by a friend across the table with a phone flash at night, vertical 9:16,
half body.
Sitting at a restaurant table with <comida/bebida pedida>, <roupa>, laughing mid-conversation
looking slightly off-camera.
Direct phone flash lighting the face with slight shine on the skin, dark warm restaurant
background with blurred string lights, hard shadow behind the person on the wall.
Real skin texture, flash glare, slight noise in the background, natural imperfections.
No text, no watermark.
```

## Prompts de correção (edição)

Na edição, **a imagem-base vai primeiro**, depois as referências. Comece sempre fixando o que não pode mudar:

```
Edit the first image. Keep everything exactly the same — composition, pose, clothing, background,
lighting and colors — and change only: <UMA mudança concreta>.
The person must keep the exact face from the reference images (images 2 onward).
```

Exemplos de "change only":
- **Rosto pouco parecido:** `the face: make it match the reference photos exactly — narrower nose bridge, thicker straight eyebrows, the small mole under the right eye, slightly wider jaw. Do not beautify.`
- **Pele de cera:** `the skin: add realistic skin texture with visible pores, slight redness and natural unevenness; remove the smooth airbrushed look.`
- **Cor errada:** `the dress color: bright cherry red (currently burgundy).`
- **Mão estranha:** `the left hand: natural hand with five fingers holding the cup handle correctly.`
- **Faltou item:** `add a croissant in the right hand, held naturally, with flakes on the plate.`
- **Saturado demais / cara de filtro:** `the color grading: more neutral and true-to-life, less saturation and contrast, like an unedited phone photo.`
- **Fundo com texto embaralhado:** `the sign in the background: make it plain without any text.`

Se depois de 2 edições o rosto continuar fugindo, tente: (1) outras referências com ângulo mais parecido com o da cena; (2) um enquadramento mais próximo; (3) gerar do zero com a identidade ainda mais detalhada.

## Modo manual (sem API)

Entregue à pessoa:
1. **Quais arquivos anexar**, em ordem (ex: `ref_02.jpg, ref_05.jpg, ref_01.jpg`).
2. **O prompt pronto**, num bloco de código para copiar.
3. Onde colar: no app/site do Gemini (modelo com geração de imagem) ou no ChatGPT, anexando as fotos na mesma mensagem.
4. Peça para te mandar o resultado. Revise com a mesma lista e devolva um **prompt de correção** pronto para colar na mesma conversa.
