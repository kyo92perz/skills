---
name: stick-story-animation
description: Direct and render stick-figure story shorts (TikTok/Reels/Shorts, 9:16) in the style of "stickman survival / narrated story" accounts — cinematic plates, ink-reel characters, virtual camera, punch-in timing, impact frames, burned-in captions. Use when a user wants a stickman animated story, says their stick animation "looks cheap / flat / static", or asks to match the look of accounts like @stickcalypse, @relatando_historias or @tudoem608.
---

# Stick Story Animation

A production kit for 9:16 stick-figure story shorts. It exists because the same
script and the same poses can look like a polished TikTok or like a PowerPoint
slide — the difference is ~10 craft layers, not drawing skill.

Everything here runs **locally and deterministically**: Node + `@napi-rs/canvas`
for frames, ffmpeg for encoding. No GPU, no cloud, no per-frame API cost.

## The one thing to understand first

Amateurs animate the *character*. These accounts animate the *camera, the light
and the cut*. A stick figure is 12 lines — it cannot carry a video alone. What
sells the shot:

| Layer | Cheap version (what the user complained about) | Reference version |
|---|---|---|
| Figure style | flat vector strokes, uniform width, no boil | ink reel: tapered strokes, 6–10 fps line boil, dark outline + light body |
| Background | flat colour or a static image | painted "plate" with parallax push, vignette, animated grain |
| Separation | figure drawn straight onto the plate | dark halo behind the subject + far-limbs-behind-torso depth |
| Camera | locked off, then maybe one linear zoom | push-ins on beats, punch-in on realisations, handheld shake on impacts |
| Timing | every shot the same length | 1.5–4 s cuts, action hits on the narration's stressed syllable |
| Impact | nothing | 1–2 white flash frames + shake + speed lines |
| Typography | tiny subtitle at the bottom | 8–10% frame-height condensed caps, safe-zone placed, pop-in |
| Face | dot eyes, no expression | 4-expression library (neutral/scared/determined/relief) |
| Arms/torso | limbs merge into one X | permanent outward offset angles, far limbs greyed 0.82 |
| Motion | limbs slide between poses | absolute-angle rig + knee/elbow direction constraints |

`scripts/compare.mjs` renders both columns of that table side by side. Run it
first when a user says "the animation looks bad" — it tells you which layer is
missing instead of guessing.

## Quick start

```bash
cd skills/stick-story-animation/scripts
npm i @napi-rs/canvas @ffmpeg-installer/ffmpeg

node compare.mjs                      # before/after diagnostic
node posesheet.mjs                    # pose library contact sheet
node walksheet.mjs                    # walk/sprint cycle check
node render.mjs --story stories/demo.json --out ../out/demo.mp4
node render.mjs --story stories/demo.json --still 3.2 --out ../out/f3.png
```

## Workflow for a real video

1. **Script to beats.** Write the narration first. Split it into one line per
   beat (~1.5–4 s each). Each beat becomes one shot. Never one image per
   sentence — cut *inside* sentences at the verb.
2. **Plates.** Generate 9:16 background art per location with an image model.
   The prompt must end with: empty scene, no people, no text, clear ground plane,
   painterly comic rendering, desaturated palette. Characters are composited on
   top, so plates need a readable floor and an uncluttered centre.
3. **Story JSON** (`scripts/stories/*.json`): shots, actors, camera tracks,
   captions. Actors accept `pose` as a name, a `walk`/`sprint` cycle, or a
   transition `{from,to,t0,t1}`.
4. **Render stills first.** `--still` at each shot's most important frame.
   Fix composition before spending a minute of CPU on video.
5. **Audio.** VO, then SFX on the action frames, then music. Cut the picture to
   the VO, never the other way round. Impact frames go on the SFX transient.
6. **Export.** 1080×1920, 30 fps, CRF 18. Keep the caption band inside the
   safe zone (`SAFE` in `lib/caption.mjs`).

## Look presets

`lib/look.mjs` exposes the stack; `stories/demo.json` shows a full config.

- `figureStyle: "cinematic"` — dark nights, horror, survival. Light body +
  dark outline. This is the @stickcalypse / @relatando_historias look.
- `figureStyle: "ink"` — light paper, explainers, humour. Dark body, no outline.
- `figureStyle: "flat"` — keep only for deliberate "rough sketch" gags.
- `boil: 0.7–1.2` — below 0.4 the figure looks synthetic; above 1.6 it crawls.
- `outlineColor` + `inkColor: "#f0eee6"` — the cut-out look; required on dark plates.
- `halo: 0.25–0.4` — subject separation. Zero on light paper.
- `rim` — defaults to off. On dark plates a light rim reads as a wireframe.

## Motion rules (learned from the references)

- **Knees bend backward, elbows forward, always.** `walkPose` enforces this; any
  custom pose must too. Violating it is the #1 amateur tell.
- **Arms need a resting outward angle (~0.25 rad).** At 0 they merge with the
  torso and read as an X on the chest.
- **Contact before weight.** Feet pass through the ground line by 1–2 px on the
  plant; add a 1-frame squash of `bob`.
- **Anticipation beats reaction.** 3–5 frames of wind-up before every hit or turn.
- **Cut, don't pan.** A cut covering 20% of a zoom is cheaper and faster than a
  full pan. Reserve real camera moves for reveals.
- **One idea per shot.** If a shot needs a caption explaining it, split it.

## Files

```
SKILL.md                      this file
reference/ANALISE-REFERENCIAS.md   shot-by-shot teardown of the reference accounts
reference/plates/             example background plates
scripts/render.mjs            story JSON -> mp4 / stills
scripts/compare.mjs           flat vs cinematic diagnostic
scripts/posesheet.mjs         pose library sheet
scripts/walksheet.mjs         walk/sprint cycle sheet
scripts/lib/figure.mjs        rig, poses, cycles, reels (flat/ink/cinematic)
scripts/lib/camera.mjs        virtual camera: pan/zoom/rot/shake
scripts/lib/look.mjs          plate, vignette, grain, halo, flashes, speed lines
scripts/lib/caption.mjs       captions, title cards, badges, safe zones
scripts/lib/easing.mjs        easing, keyframes, deterministic noise
scripts/stories/demo.json     working example story
```

## Performance

~1.3 s per 1080×1920 frame on one CPU core, so a 30 s short is ~15–20 min.
Render at `--scale 0.5` while iterating, full scale for the final pass.
