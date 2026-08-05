import { useCallback, useMemo, useRef } from 'react';
import { AudioEngine } from '../core/audioEngine';
import { HandPoseClassifier } from '../core/classifier';
import {
  BUFFER_CONFIRM_FRAMES,
  BUFFER_MARGIN_RATIO,
  BUFFER_MAX_MATCH_DISTANCE,
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
import { loadLeftHandBufferTemplates, loadLeftHandTemplates, loadRightHandTemplates } from '../core/poseStore';
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
  /** Whether the buffer/neutral-pose gate is active at all — false until at least one buffer sample is recorded (see data/leftHandBuffer.ts). Mirrors main.py's buffer_classifier.is_ready(). */
  gateEnabled: boolean;
  /** Whether the left hand is currently allowed to fire a NEW note. Only meaningful when gateEnabled is true. Mirrors main.py's left_armed. */
  gateArmed: boolean;
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
    gateEnabled: false,
    gateArmed: true,
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
 *     per touch", not "fires every frame it's held". On top of that, a
 *     NEW note additionally requires the buffer/neutral-pose GATE to be
 *     armed (see below) — this is the main.py "BUFFER GATE (NEW)" feature.
 *
 *   - BUFFER GATE (left hand only): before a new note can fire, the left
 *     hand must show a confident match against the separate buffer/
 *     neutral-pose classifier (data/leftHandBuffer.ts — typically an open
 *     hand), held for BUFFER_CONFIRM_FRAMES. This stops two visually
 *     similar notes from misfiring into each other during the brief
 *     in-between transition. If no buffer pose has been recorded at all,
 *     the gate auto-disables and behaves exactly like before (every note
 *     is always "armed"). The gate starts armed each session so the very
 *     first note doesn't require showing the neutral pose first — it only
 *     applies BETWEEN notes.
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
  // Lazy-init-via-ref (checked once per render, only constructed the first
  // time): lets reloadTemplates() below swap in freshly-saved templates
  // without needing to remount this whole hook, unlike useMemo(() => ..., []).
  const poseClassifierRef = useRef<HandPoseClassifier | null>(null);
  const octaveClassifierRef = useRef<HandPoseClassifier | null>(null);
  const bufferClassifierRef = useRef<HandPoseClassifier | null>(null);
  if (!poseClassifierRef.current) {
    poseClassifierRef.current = new HandPoseClassifier(
      loadLeftHandTemplates(),
      POSE_MAX_MATCH_DISTANCE,
      POSE_MARGIN_RATIO,
    );
  }
  if (!octaveClassifierRef.current) {
    octaveClassifierRef.current = new HandPoseClassifier(
      loadRightHandTemplates(),
      POSE_MAX_MATCH_DISTANCE,
      POSE_MARGIN_RATIO,
    );
  }
  if (!bufferClassifierRef.current) {
    bufferClassifierRef.current = new HandPoseClassifier(
      loadLeftHandBufferTemplates(),
      BUFFER_MAX_MATCH_DISTANCE,
      BUFFER_MARGIN_RATIO,
    );
  }

  /** Rebuilds all three classifiers from whatever's currently saved (custom override, if any, else the baked defaults). Call before re-entering Training if poses may have changed. */
  const reloadTemplates = useCallback(() => {
    poseClassifierRef.current = new HandPoseClassifier(
      loadLeftHandTemplates(),
      POSE_MAX_MATCH_DISTANCE,
      POSE_MARGIN_RATIO,
    );
    octaveClassifierRef.current = new HandPoseClassifier(
      loadRightHandTemplates(),
      POSE_MAX_MATCH_DISTANCE,
      POSE_MARGIN_RATIO,
    );
    bufferClassifierRef.current = new HandPoseClassifier(
      loadLeftHandBufferTemplates(),
      BUFFER_MAX_MATCH_DISTANCE,
      BUFFER_MARGIN_RATIO,
    );
  }, []);

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
    // Buffer/neutral gate runtime state — starts ARMED so the very first
    // note of a session doesn't require showing the buffer pose first.
    armed: true,
    bufferPendingCount: 0,
  });

  const right = useRef({
    ema: null as number[] | null,
    pendingOctave: null as number | null,
    pendingCount: 0,
  });

  const processFrame = (frame: HandFrameResult) => {
    const s = stateRef.current;
    s.frameMs = frame.frameMs;

    // ---- LEFT HAND: note selection (fire-once-per-touch, gated) ----
    if (frame.left) {
      const raw = extractPoseFeatures(frame.left, FRAME_W, FRAME_H);
      const L = left.current;
      L.ema = ema(L.ema, raw, POSE_SMOOTHING_ALPHA);

      // --- buffer/neutral gate: must be seen before the NEXT note fires ---
      const bufferClassifier = bufferClassifierRef.current!;
      const gateEnabled = bufferClassifier.isReady();
      if (gateEnabled) {
        const { index: bufIdx } = bufferClassifier.classify(L.ema);
        if (bufIdx !== null) {
          L.bufferPendingCount += 1;
          if (L.bufferPendingCount >= BUFFER_CONFIRM_FRAMES) {
            L.armed = true;
          }
        } else {
          L.bufferPendingCount = 0;
        }
      } else {
        L.armed = true; // nothing recorded -> gate disabled, old behavior
      }
      s.gateEnabled = gateEnabled;
      s.gateArmed = L.armed;

      const { index: noteIdx, distance: dist } = poseClassifierRef.current!.classify(L.ema);
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
      } else if (L.pendingCount >= POSE_CONFIRM_FRAMES && L.pendingNote !== L.lastFiredNote && L.armed) {
        audioEngine.playNote(noteIdx, s.activeOctave);
        s.lastNotePlayed = `${NOTE_NAMES[noteIdx]}${OCTAVE_BASE + s.activeOctave - 1}`;
        s.lastNoteTime = performance.now();
        L.lastFiredNote = noteIdx;
        L.armed = false; // must show the buffer pose again to re-arm
        L.bufferPendingCount = 0;
      }

      s.heldSemitone = L.lastFiredNote;
    }

    // ---- RIGHT HAND: octave selection (latches) ----
    if (frame.right) {
      const raw = extractPoseFeatures(frame.right, FRAME_W, FRAME_H);
      const R = right.current;
      R.ema = ema(R.ema, raw, POSE_SMOOTHING_ALPHA);

      const { index: octIdx, distance: dist } = octaveClassifierRef.current!.classify(R.ema);
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

  return { stateRef, processFrame, audioEngine, reloadTemplates };
}
