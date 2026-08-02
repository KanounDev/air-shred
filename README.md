# AirShred

A client-side port of the Python `main.py` two-handed pose-controlled
synthesizer: **left hand shape → note**, **right hand shape → octave**,
matched against a fixed set of recorded pose templates. No backend, no
camera data ever leaves the tab.

## Run it

```bash
npm install
npm run dev
```

Open the printed `localhost` URL, click **`> INITIALIZE_RIG`** (this is the
required user-gesture click that unlocks both the camera and Web Audio),
grant camera access, and play. `npm run build` produces a static bundle in
`dist/` (no server needed to host it — any static file host works).

## What changed vs. main.py

- **Poses are fixed, not recorded.** The original's `r`/`o` recording
  wizards, `x`/`n`/SPACE/ENTER key handling, and JSON save/load are gone.
  `left_hand_poses.json` / `right_hand_octaves.json` are baked in as
  `src/data/leftHandPoses.ts` / `rightHandOctaves.ts` (generated straight
  from the uploaded JSON, byte-for-byte) and loaded once at startup.
- **Tracking:** OpenCV + `mediapipe` (Python) → `@mediapipe/tasks-vision`'s
  `HandLandmarker` running in-browser via WASM/WebGL. Same lite/float16
  model tier as `MP_MODEL_COMPLEXITY=0`.
- **Audio:** `main.py`'s "tone engine" pre-rendered 48 additive-sine PCM
  buffers (fundamental + weighted 2nd/3rd harmonics) via `pygame.mixer`.
  Per product direction, this port keeps the same *architecture*
  (instantiate voices once, trigger cheaply at note-fire time) but voices
  it with `Tone.PluckSynth` — a Karplus-Strong plucked-string model — for
  an actual guitar-ish timbre, through a small distortion/reverb/limiter
  bus. `core/audioEngine.ts` has the full rationale in comments.
- **Mirroring:** the camera feed is mirrored (selfie-view) exactly like
  `main.py`'s `cv2.flip(frame, 1)`, and — same as the original — that flip
  happens *before* the frame is handed to hand detection, so MediaPipe's
  `"Left"`/`"Right"` handedness labels line up with your actual hands. See
  `render/skeletonRenderer.ts` and `hooks/useHandTracking.ts`.
- **UI:** OpenCV `cv2.putText`/`cv2.rectangle` HUD → a mix of `<canvas>`
  (camera feed, skeleton, piano — anything that needs to track the video
  frame 1:1) and styled HTML/CSS (status bar, start/error gate) skinned in
  a dark CV-HUD / metal-gig aesthetic instead of OpenCV's flat debug
  colors.

Everything else — the pose-normalization math, the nearest-neighbor
classifier with its max-distance gate and ambiguity margin, the
confirm-frame debounce, the "note fires once per touch" vs. "octave
latches" behavior, the note→frequency math — is a direct, line-by-line
port. Where a threshold or formula came from `main.py`, the comment next
to it says so.

## Structure

```
src/
  core/                 — pure logic, no React, no DOM. Independently testable.
    constants.ts          all tunable numbers (ported from main.py section 1)
    geometry.ts           euclidean()
    poseFeatures.ts       extract_pose_features() port (translate/rotate/scale normalize)
    classifier.ts         HandPoseClassifier port (nearest-neighbor + gates)
    noteMath.ts           note_to_freq() port
    audioEngine.ts        Tone.js voice pool (guitar-ish PluckSynth)
    handConnections.ts    21-landmark skeleton topology (static data)

  render/                — pure canvas-drawing functions (ctx + data in, pixels out)
    skeletonRenderer.ts   mirrored video frame + glowing hand skeleton
    pianoRenderer.ts      one-octave piano strip + held-key highlight

  hooks/                 — React state/effects, wire core+render into the app
    useHandTracking.ts    camera + HandLandmarker + per-frame detect/draw loop
    useGestureSound.ts    debounce/latch state machine -> classifier -> audioEngine
    useTickState.ts       throttled ref->state bridge for the status bar

  components/            — presentation only
    CameraCanvas.tsx      video/canvas markup, CV-HUD corners/scanlines, start gate
    PianoOverlay.tsx      canvas layer + its own draw loop reading gesture state
    StatusBar.tsx         octave/note/frame-time HUD text row

  data/                  — baked pose templates (generated from the uploaded JSON)
    leftHandPoses.ts       12 notes x samples x 40 features
    rightHandOctaves.ts    4 octaves x samples x 40 features

  styles/global.css      — design tokens + all styling
  App.tsx                — composes the two hooks + three components
  main.tsx               — entry point
```

**Why this split:** `core/` has zero React or DOM dependencies, so the pose
math and classifier can be unit-tested or reused (e.g. in a Node script)
without a browser. `render/` isolates canvas drawing so you can change the
look of the skeleton or piano without touching any state logic. The two
hooks are the only things that know about camera/audio side effects;
components are dumb enough to re-skin without risk of breaking behavior.

## Debugging / extending pointers

- **Pose feels too strict/loose:** `POSE_MAX_MATCH_DISTANCE` and
  `POSE_MARGIN_RATIO` in `core/constants.ts` (same knobs as `main.py`).
- **Notes fire too eagerly/laggy:** `POSE_CONFIRM_FRAMES` and
  `POSE_SMOOTHING_ALPHA`, same file.
- **Want a different instrument voice:** `core/audioEngine.ts` — swap
  `Tone.PluckSynth` for any other Tone.js instrument; `playNote()`'s
  contract (`(noteIndex, octaveSelect) -> void`) doesn't change.
- **Tracking feels off / handedness swapped:** check
  `hooks/useHandTracking.ts`'s `toFrameResult()` — that's the only place
  that maps MediaPipe's `"Left"/"Right"` labels to hands.
- **Re-recording poses:** not supported by design (poses are fixed per the
  product requirement) — to change them, regenerate
  `src/data/leftHandPoses.ts` / `rightHandOctaves.ts` from new 40-value
  feature vectors captured with `core/poseFeatures.ts`.

## Browser requirements

Needs a browser with WebGL2 + `getUserMedia` (any recent Chrome, Edge,
Firefox, or Safari). Camera and audio both require the initial
`INITIALIZE_RIG` click — browsers block both without a user gesture.
