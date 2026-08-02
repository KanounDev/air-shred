import { useMemo, useRef } from 'react';
import { AudioEngine } from '../core/audioEngine';
import { HandPoseClassifier } from '../core/classifier';
import {
  NOTE_NAMES,
  OCTAVE_BASE,
  POSE_CONFIRM_FRAMES,
  POSE_MARGIN_RATIO,
  POSE_MAX_MATCH_DISTANCE,
  POSE_SMOOTHING_ALPHA,
  FRAME_H,
  FRAME_W,
} from '../core/constants';
import { extractPoseFeatures } from '../core/poseFeatures';
import { LEFT_HAND_POSE_TEMPLATES } from '../data/leftHandPoses';
import { RIGHT_HAND_OCTAVE_TEMPLATES } from '../data/rightHandOctaves';
import type { HandFrameResult } from './useHandTracking';

export interface GestureState {
  /** 1..4, the right-hand-latched octave (persists through "no match" frames). */
  activeOctave: number;
  /** Semitone (0-11) of the currently-lit piano key, or null. Mirrors main.py's last_fired_note. */
  heldSemitone: number | null;
  lastNotePlayed: string | null; // e.g. "C#4"
  lastNoteTime: number; // performance.now() timestamp of the last fire, for the piano's brief flash
  liveMatchNote: number | null;
  liveMatchDist: number | null;
  liveMatchOctave: number | null;
  liveMatchOctaveDist: number | null;
  frameMs: number;
}

function initialState(): GestureState {
  return {
    activeOctave: 1,
    heldSemitone: null,
    lastNotePlayed: null,
    lastNoteTime: 0,
    liveMatchNote: null,
    liveMatchDist: null,
    liveMatchOctave: null,
    liveMatchOctaveDist: null,
    frameMs: 0,
  };
}

/** Exponential smoothing on the live (post-normalization) feature vector — reduces landmark jitter without adding much lag. */
function ema(prev: number[] | null, next: number[], alpha: number): number[] {
  if (!prev) return next;
  return next.map((v, i) => alpha * v + (1 - alpha) * prev[i]);
}

/**
 * The gesture-to-sound state machine: takes raw per-frame hand landmarks
 * from useHandTracking and turns them into fired notes / a latched octave,
 * with the same debounce rules as main.py's _process_left_hand /
 * _process_right_hand:
 *
 *   - LEFT hand (note): the SAME recognized note must hold for
 *     POSE_CONFIRM_FRAMES consecutive frames before it *fires* (plays a
 *     sound), and it will not re-fire again until the hand leaves that
 *     pose (goes to "no match" or a different pose first) — "fires once
 *     per touch", not "fires every frame it's held".
 *
 *   - RIGHT hand (octave): the SAME recognized octave must hold for
 *     POSE_CONFIRM_FRAMES frames before the active octave *latches* to it.
 *     Unlike the note, an ambiguous/no-match frame does NOT reset it —
 *     the octave just stays wherever it last confidently landed.
 *
 * A hand that isn't visible in a given frame is treated exactly like
 * main.py treats it: that hand's processing is simply skipped for the
 * frame (state is left untouched), not reset to "no match".
 */
export function useGestureSound() {
  const poseClassifier = useMemo(
    () => new HandPoseClassifier(LEFT_HAND_POSE_TEMPLATES, POSE_MAX_MATCH_DISTANCE, POSE_MARGIN_RATIO),
    [],
  );
  const octaveClassifier = useMemo(
    () => new HandPoseClassifier(RIGHT_HAND_OCTAVE_TEMPLATES, POSE_MAX_MATCH_DISTANCE, POSE_MARGIN_RATIO),
    [],
  );
  const audioEngine = useMemo(() => new AudioEngine(), []);

  // Rendered UI (StatusBar/PianoOverlay) reads this ref on its own throttled
  // tick rather than via React state, so 60fps landmark processing doesn't
  // force 60fps React re-renders — see hooks/useTickState.ts.
  const stateRef = useRef<GestureState>(initialState());

  const left = useRef({
    ema: null as number[] | null,
    pendingNote: null as number | null,
    pendingCount: 0,
    lastFiredNote: null as number | null,
  });

  const right = useRef({
    ema: null as number[] | null,
    pendingOctave: null as number | null,
    pendingCount: 0,
  });

  const processFrame = (frame: HandFrameResult) => {
    const s = stateRef.current;
    s.frameMs = frame.frameMs;

    // ---- LEFT HAND: note selection (fire-once-per-touch) ----
    if (frame.left) {
      const raw = extractPoseFeatures(frame.left, FRAME_W, FRAME_H);
      const L = left.current;
      L.ema = ema(L.ema, raw, POSE_SMOOTHING_ALPHA);

      const { index: noteIdx, distance: dist } = poseClassifier.classify(L.ema);
      s.liveMatchNote = noteIdx;
      s.liveMatchDist = dist;

      if (noteIdx === L.pendingNote) {
        L.pendingCount += 1;
      } else {
        L.pendingNote = noteIdx;
        L.pendingCount = 1;
      }

      if (noteIdx === null) {
        L.lastFiredNote = null; // hand left recognizable pose -> re-armed
      } else if (L.pendingCount >= POSE_CONFIRM_FRAMES && L.pendingNote !== L.lastFiredNote) {
        audioEngine.playNote(noteIdx, s.activeOctave);
        s.lastNotePlayed = `${NOTE_NAMES[noteIdx]}${OCTAVE_BASE + s.activeOctave - 1}`;
        s.lastNoteTime = performance.now();
        L.lastFiredNote = noteIdx;
      }

      s.heldSemitone = L.lastFiredNote;
    }

    // ---- RIGHT HAND: octave selection (latches) ----
    if (frame.right) {
      const raw = extractPoseFeatures(frame.right, FRAME_W, FRAME_H);
      const R = right.current;
      R.ema = ema(R.ema, raw, POSE_SMOOTHING_ALPHA);

      const { index: octIdx, distance: dist } = octaveClassifier.classify(R.ema);
      s.liveMatchOctave = octIdx;
      s.liveMatchOctaveDist = dist;

      if (octIdx === R.pendingOctave) {
        R.pendingCount += 1;
      } else {
        R.pendingOctave = octIdx;
        R.pendingCount = 1;
      }

      if (octIdx !== null && R.pendingCount >= POSE_CONFIRM_FRAMES) {
        s.activeOctave = octIdx + 1; // classifier index 0..3 -> octave_select 1..4
      }
    }
  };

  return { stateRef, processFrame, audioEngine };
}
