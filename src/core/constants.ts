/**
 * All tunable "magic numbers", ported 1:1 from main.py's section 1
 * (CONFIGURATION CONSTANTS). Keep every threshold/buffer-size/etc. here,
 * not inline in logic — same rule the original file's author note asked
 * for, and it's what makes re-tuning feel-of-the-instrument painless.
 */

// --- Camera -----------------------------------------------------------
// main.py's FRAME_W/FRAME_H/REQUEST_FPS were "lower res = lower MediaPipe
// latency" — same trade-off applies here, so we ask getUserMedia for the
// same target resolution/frame rate (as *ideal* constraints; the browser
// may still hand back something else depending on the webcam).
export const FRAME_W = 960;
export const FRAME_H = 540;
export const REQUEST_FPS = 60;

// --- MediaPipe HandLandmarker tuning for speed over robustness --------
// main.py used MP_MODEL_COMPLEXITY=0 (lite model). tasks-vision doesn't
// expose a complexity knob directly — the equivalent choice is picking
// the lite/float16 model asset itself (see hooks/useHandTracking.ts).
export const MP_MIN_HAND_DETECTION_CONFIDENCE = 0.6;
export const MP_MIN_HAND_PRESENCE_CONFIDENCE = 0.5; // tasks-vision's analog of MIN_TRACKING_CONF's "is a hand still here" role
export const MP_MIN_TRACKING_CONFIDENCE = 0.5;
export const MP_MAX_HANDS = 2;

// --- Pose matching (shared by both the left-hand note classifier and
// the right-hand octave classifier — see core/classifier.ts) -----------
export const POSE_MAX_MATCH_DISTANCE = 0.9; // farther than this from every template = "no match"
export const POSE_MARGIN_RATIO = 0.97; // best match must be this much closer than 2nd-best, else "ambiguous"
export const POSE_CONFIRM_FRAMES = 4; // frames the SAME recognized pose must hold before it fires/latches
export const POSE_SMOOTHING_ALPHA = 0.4; // EMA smoothing on the live (post-normalization) feature vector
export const POSE_CAPTURE_FRAMES = 20; // frames averaged together when recording each template sample

// --- Musical mapping ----------------------------------------------------
export const NOTE_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;
export const OCTAVE_BASE = 3; // Octave-select 1 -> actual octave 3 (C3...)
export const A4_FREQ = 440.0;
export const OCTAVE_COUNT = 4;
export const OCTAVE_LABELS = ['Octave 1', 'Octave 2', 'Octave 3', 'Octave 4'];

// --- MediaPipe hand landmark indices (per hand) --------------------------
// 0 wrist; thumb 1-4; index 5-8; middle 9-12; ring 13-16; pinky 17-20.
export const WRIST = 0;
export const MIDDLE_MCP = 9; // used as the hand-size / orientation reference point
export const INDEX_FINGER_TIP = 8; // used as the on-screen menu pointer

// --- Menu navigation (point-and-dwell to select, no click event exists
// for a floating fingertip) -----------------------------------------------
export const MENU_DWELL_MS = 650; // how long the fingertip must hover a button to "select" it
export const MENU_LOCKED_FLASH_MS = 350; // brief flash shown when dwell completes on a disabled button

// --- Piano strip (visual feedback only, doesn't affect input) -----------
// Lives BELOW the camera canvas, not overlaid on top of it — a hand can
// pass anywhere in the frame (the classifier reads shape, not position),
// so an overlay risked a skeleton line crossing the very key that just
// lit up. As a separate block it sizes itself off its own container
// (see components/PianoStrip.tsx + render/pianoRenderer.ts) rather than
// the fixed FRAME_W/FRAME_H pixel space the camera canvases share.
export const PIANO_WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
export const PIANO_BLACK_SEMITONES = [1, 3, 6, 8, 10]; // C# D# F# G# A#
// Each black key sits right after this white-key index (0-based, C=0..B=6)
export const PIANO_BLACK_AFTER_WHITE_IDX: Record<number, number> = {
  1: 0,
  3: 1,
  6: 3,
  8: 4,
  10: 5,
};
// Fraction of a white key's width used for each black key, and the strip's
// height as a fraction of its own container height (black keys are shorter).
export const PIANO_BLACK_KEY_WIDTH_RATIO = 0.6;
export const PIANO_BLACK_KEY_HEIGHT_RATIO = 0.62;
// Below this white-key width, labels stop being legible — rather than
// shrinking keys further on narrow screens, the renderer shrinks the
// number of octaves shown instead (see render/pianoRenderer.ts), keeping
// keys tap-legible-sized and letting the visible window auto-follow
// whichever octave is currently latched.
export const PIANO_MIN_WHITE_KEY_PX = 30;