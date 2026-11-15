# Análise das referências — o que faz a animação parecer boa

Referências: **@stickcalypse** (sobrevivência pós-apocalíptica, stickman),
**@relatando_historias** (histórias narradas), **@tudoem608 / TudoEm60**
(conteúdo curto de curiosidade/animação em pt-BR).

Este documento é o diagnóstico do "ficou uma merda" e a lista de correções já
implementadas em `scripts/`.

---

## 1. A regra central

Nos três perfis a animação **não é** a estrela. O esqueleto é o mesmo boneco de
palito de sempre — o que muda é:

> **câmera + luz + corte + texto em tela**, com o boneco reagindo dentro disso.

Quem anima o personagem e deixa câmera e luz paradas produz um vídeo "de
PowerPoint". É exatamente esse o sintoma.

Exemplo concreto de @stickcalypse (vídeo "sobreviver no ônibus", 634 mil views,
118 s): a cada 2–3 s há um corte, um push-in ou uma mudança de plano. O boneco
tem **4 poses úteis** nesse vídeo inteiro — choque, agachar, correr, alívio — e
elas são repetidas. A sensação de riqueza vem da montagem.

---

## 2. O que os perfis fazem tecnicamente (e como reproduzir aqui)

### 2.1 Personagem "recortado" em fundo pintado

O boneco é **branco/marfim com contorno escuro** desenhado por cima de um fundo
pintado e detalhado. Não é preto sobre branco.

- Por quê: com fundo escuro, um boneco preto desaparece. A solução dos perfis é
  inverter: corpo claro, contorno escuro, e o contraste vem do contorno.
- No kit: `inkColor: "#f0eee6"` + `outlineColor: "rgba(6,6,8,0.92)"`.

### 2.2 Halo atrás do sujeito

Uma mancha radial escura, sutil, atrás do personagem. Sem ela o boneco "compete"
com a textura do fundo e some.

- No kit: `look.halo` (0.25–0.4) → `Look.subjectHalo()`.

### 2.3 Linha com "boil" (fervura)

O traço treme ~1 px a 6–10 fps, como desenho quadro a quadro. Isso é
**deliberado**: linha perfeita = vetor = cara de template.

- No kit: `boil: 0.7–1.2`, `boilHz: 8` → `taperStroke()` em `lib/figure.mjs`.
- Importante: o jitter é determinístico (hash por tique), não aleatório — senão a
  linha "nada" e dá enjoo.

### 2.4 Peso de linha proporcional ao tamanho

Erro comum: espessura fixa em px. Em close o boneco fica com linha de arame; em
plano aberto vira borrão. Os perfis mantêm o traço em ~2% da altura do boneco.

- No kit: `figureLineRatio: 0.022` → `render.mjs` calcula por ator.

### 2.5 Membros com profundidade falsa

Braços/pernas do lado "longe" são desenhados **antes** do tronco e levemente
acinzentados (0.82). O tronco cobre a junta. Isso cria leitura de 3/4 sem rig 3D.

- No kit: ordem de desenho em `reelInk()` + `farFade`.
- Bônus: ombros explícitos (`shN`/`shF`), então os braços não nascem do meio da
  cabeça — bug clássico de rig feito às pressas.

### 2.6 Câmera que respira

- Push-in lento contínuo (1.0 → 1.15) em quase todo plano.
- **Punch-in** curto (0.15 s, 1.0 → 1.2) no momento da revelação.
- Shake de 6–12 px por 0.2–0.4 s nos impactos.
- Parallax do fundo a 0.5–0.8 da câmera: o fundo se move *menos*.

No kit: `camera` no shot JSON aceita keyframes de `x/y/zoom/rot/shake`.

### 2.7 Impacto: 1–2 quadros brancos

Nos perfis, toda batida tem 1–2 frames quase brancos + shake + linhas de
velocidade. É o que faz o som "doer". Sem isso, o vídeo fica mole.

No kit: `impacts: [{t: 2.92}]` + `Look.impactFlash()` + `speedLines`.

### 2.8 Cortes a cada 1,5–4 s

Nenhum plano passa de ~4 s sem corte, movimento forte ou mudança de escala.
Vídeo de 60 s = 20–30 planos.

No kit: cada shot tem `dur`; quebre o roteiro por batida de narração.

### 2.9 Tipografia

- Caixa alta, condensada, 8–10% da altura do quadro.
- Contorno grosso escuro + sombra dura.
- Aparece em blocos curtos de 2–4 palavras, no ritmo da fala.
- Fica na faixa segura (não embaixo dos botões do TikTok).
- Título tem "regra" (linha horizontal) embaixo, como capa de série.

No kit: `lib/caption.mjs` → `caption()`, `titleCard()`, `badge()`, com `SAFE`
para as zonas de UI.

### 2.10 Expressão

Cara de susto (boca oval), olhar determinado (sobrancelhas), alívio (sorriso).
São 4 expressões reaproveitadas — não precisa de mais.

No kit: `face: 'neutral' | 'scared' | 'determined' | 'relief'`.

---

## 3. Erros que produzem o "ficou uma merda"

1. **Joelho dobrando para a frente.** O rig aceita ângulo absoluto; se você não
   trava a direção, a perna vira elástico. `walkPose()` já trava (joelho só para
   trás, cotovelo só para frente).
2. **Braços colados no tronco (X no peito).** Falta offset externo (0.25 rad).
3. **Cabeça flutuando** sem stub de pescoço.
4. **Pernas cruzando** no repouso por falta de afastamento e de correção do
   tornozelo (`shin` oposto ao `thigh`).
5. **Linha uniforme, sem afinamento** — o traço fica com cara de SVG.
6. **Zero boil** — movimento de vetor puro, "robótico".
7. **Zoom linear único por plano** sem ease — e sem corte.
8. **Legenda pequena em baixo**, fora da zona segura, em fonte de sistema.
9. **Boneco escuro em fundo escuro** (ou claro em fundo claro) — sem contorno.
10. **Mesma duração em todos os planos** — o ritmo vira metrônomo.

---

## 4. Checklist antes de renderizar

- [ ] O plano tem um verbo? (algo *acontece* em cada plano)
- [ ] Há pelo menos um movimento de câmera ou corte dentro do plano?
- [ ] A ação principal cai numa sílaba tônica da narração?
- [ ] O impacto tem flash + shake?
- [ ] A legenda está na zona segura e tem no máximo 6 palavras?
- [ ] O boneco tem contorno suficiente para o fundo em que está?
- [ ] A linha está em ~2% da altura do boneco?
- [ ] Joelhos e cotovelos dobram na direção certa?
- [ ] Existe halo atrás do sujeito?
- [ ] O plano passa de 4 s? Se sim, corte.

---

## 5. Como usar o kit para validar

```bash
cd scripts
node compare.mjs     # flat vs cinematic no mesmo take — mostra a diferença camada a camada
node posesheet.mjs   # biblioteca de poses (checar rig)
node walksheet.mjs   # ciclo de caminhada/corrida (checar dobras)
node render.mjs --story stories/demo.json --still 3.2 --out ../out/f3.png
node render.mjs --story stories/demo.json --out ../out/demo.mp4
```

Se o `compare.mjs` já mostra a coluna da direita como você quer, o problema
restante é **roteiro/ritmo**, não animação.
