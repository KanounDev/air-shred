# AirShred

AirShred is a browser-based music game that uses hand tracking to turn your
camera feed into a playable instrument. You can train your poses, browse
songs, preview melodies, and play through a full song experience without any
backend service.

## What it does

- Tracks your hands with MediaPipe HandLandmarker in the browser.
- Classifies hand poses against built-in pose templates for notes and octaves.
- Lets you practice in a training mode before jumping into a song.
- Supports song selection, preview playback, score tracking, and in-game play.
- Runs entirely client-side with React, TypeScript, Vite, and Tone.js.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL in your browser. Click the initialize control to
enable camera and audio access, allow camera permission, and start playing.

## Build

```bash
npm run build
```

The production bundle is written to the dist folder and can be hosted as a
static site.

## Available scripts

- `npm run dev` - start the local development server
- `npm run build` - type-check and build the app for production
- `npm run preview` - preview the production build locally
- `npm run lint` - run the linter

## Project structure

```text
src/
  App.tsx                  - main app flow and screen management
  components/              - UI layers such as the camera view, piano strip, and overlays
  core/                    - pose logic, note math, audio engine, and song data helpers
  hooks/                   - camera tracking, gesture/audio handling, menus, and gameplay state
  render/                  - canvas drawing helpers for the visual overlays
  data/                    - baked pose templates used for classification
```

## Browser requirements

A recent browser is required with camera access, WebGL support, and audio
support. The app must be started from a user gesture so the browser allows
camera and audio initialization.

## Notes

- No backend is required.
- The app is designed to work entirely in the browser.
- Pose templates and gameplay logic live in the src folder and can be adjusted
  for tuning or new content.
