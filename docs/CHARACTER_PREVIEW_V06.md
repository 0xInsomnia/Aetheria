# Character preview 0.6 — independent compositing checkpoint

Aetheria Alpha 0.6 adds a **temporary** alpha-masked full-body figure, `assets/aetheria-character-concept-v06.webp`, rendered as a separate HTML layer in the empty room. The original reference photographs/illustrations from the user's chat are **not committed**. The sprite was extracted from a generated concept created in the project conversation. Its raster extraction may show edge artefacts, and its ear shape is not the approved final human-ear design. It must be replaced.

This is a proof of scene composition, **not** a rig, animation or actual walking. The apparent idle is a tiny image transform; moving between location presets is an interpolation of the entire raster image. No body part is independently animated.

The room remains `assets/aetheria-room-empty-v05.svg` and its existing controls are unchanged. The new visual module `src/room-avatar-preview.mjs` and stylesheet `src/room-avatar-preview.css` add a show/hide toggle and location presets, stored only in browser localStorage (`aetheria.avatar-preview-v06`).

## Technical verification

- Tested with local inline-asset Chromium desktop 1280×900 and mobile 390×844 fixtures. The image loaded, changed positions, hid and reappeared. No page errors.
- This does not verify the hosted Pages deployment on a physical smartphone.

## Next step

Replace the temporary concept with approved full-body master art **with human ears** and complete layered hair/face/limbs/outfit assets, then connect a skeletal rig. Maintain the alpha image as a **preview fallback only**. Keep style semi-realistic.
