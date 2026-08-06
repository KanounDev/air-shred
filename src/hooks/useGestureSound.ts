import { useCallback, useMemo, useRef } from 'react';
import { AudioEngine } from '../core/audioEngine';
import { HandPoseClassifier } from '../core/classifier';
import { BUFFER_CONFIRM_FRAMES, BUFFER_MARGIN_RATIO, BUFFER_MAX_MATCH_DISTANCE, NOTE_NAMES, OCTAVE_BASE, POSE_CONFIRM_FRAMES, POSE_MARGIN_RATIO, POSE_MAX_MATCH_DISTANCE, POSE_SMOOTHING_ALPHA, FRAME_H, FRAME_W, } from '../core/constants';
import { extractPoseFeatures } from '../core/poseFeatures';
import { loadLeftHandBufferTemplates, loadLeftHandTemplates, loadRightHandTemplates } from '../core/poseStore';
import type { HandFrameResult } from './useHandTracking';
export interface GestureState {
    activeOctave: number;
    heldSemitone: number | null;
    lastNotePlayed: string | null;
    lastNoteTime: number;
    liveMatchNote: number | null;
    liveMatchDist: number | null;
    liveMatchOctave: number | null;
    liveMatchOctaveDist: number | null;
    gateEnabled: boolean;
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
function ema(prev: number[] | null, next: number[], alpha: number): number[] {
    if (!prev)
        return next;
    return next.map((v, i) => alpha * v + (1 - alpha) * prev[i]);
}
export function useGestureSound() {
    const poseClassifierRef = useRef<HandPoseClassifier | null>(null);
    const octaveClassifierRef = useRef<HandPoseClassifier | null>(null);
    const bufferClassifierRef = useRef<HandPoseClassifier | null>(null);
    if (!poseClassifierRef.current) {
        poseClassifierRef.current = new HandPoseClassifier(loadLeftHandTemplates(), POSE_MAX_MATCH_DISTANCE, POSE_MARGIN_RATIO);
    }
    if (!octaveClassifierRef.current) {
        octaveClassifierRef.current = new HandPoseClassifier(loadRightHandTemplates(), POSE_MAX_MATCH_DISTANCE, POSE_MARGIN_RATIO);
    }
    if (!bufferClassifierRef.current) {
        bufferClassifierRef.current = new HandPoseClassifier(loadLeftHandBufferTemplates(), BUFFER_MAX_MATCH_DISTANCE, BUFFER_MARGIN_RATIO);
    }
    const reloadTemplates = useCallback(() => {
        poseClassifierRef.current = new HandPoseClassifier(loadLeftHandTemplates(), POSE_MAX_MATCH_DISTANCE, POSE_MARGIN_RATIO);
        octaveClassifierRef.current = new HandPoseClassifier(loadRightHandTemplates(), POSE_MAX_MATCH_DISTANCE, POSE_MARGIN_RATIO);
        bufferClassifierRef.current = new HandPoseClassifier(loadLeftHandBufferTemplates(), BUFFER_MAX_MATCH_DISTANCE, BUFFER_MARGIN_RATIO);
    }, []);
    const audioEngine = useMemo(() => new AudioEngine(), []);
    const stateRef = useRef<GestureState>(initialState());
    const left = useRef({
        ema: null as number[] | null,
        pendingNote: null as number | null,
        pendingCount: 0,
        lastFiredNote: null as number | null,
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
        if (frame.left) {
            const raw = extractPoseFeatures(frame.left, FRAME_W, FRAME_H);
            const L = left.current;
            L.ema = ema(L.ema, raw, POSE_SMOOTHING_ALPHA);
            const bufferClassifier = bufferClassifierRef.current!;
            // The neutral-pose gate is only active when a buffer template exists; otherwise the instrument should stay responsive.
            const gateEnabled = bufferClassifier.isReady();
            if (gateEnabled) {
                const { index: bufIdx } = bufferClassifier.classify(L.ema);
                if (bufIdx !== null) {
                    L.bufferPendingCount += 1;
                    if (L.bufferPendingCount >= BUFFER_CONFIRM_FRAMES) {
                        L.armed = true;
                    }
                }
                else {
                    L.bufferPendingCount = 0;
                }
            }
            else {
                L.armed = true;
            }
            s.gateEnabled = gateEnabled;
            s.gateArmed = L.armed;
            const { index: noteIdx, distance: dist } = poseClassifierRef.current!.classify(L.ema);
            s.liveMatchNote = noteIdx;
            s.liveMatchDist = dist;
            if (noteIdx === L.pendingNote) {
                L.pendingCount += 1;
            }
            else {
                L.pendingNote = noteIdx;
                L.pendingCount = 1;
            }
            if (noteIdx === null) {
                // A null match clears the pending note so a stray pose does not carry over into the next frame.
                L.lastFiredNote = null;
            }
            else if (L.pendingCount >= POSE_CONFIRM_FRAMES && L.pendingNote !== L.lastFiredNote && L.armed) {
                audioEngine.playNote(noteIdx, s.activeOctave);
                s.lastNotePlayed = `${NOTE_NAMES[noteIdx]}${OCTAVE_BASE + s.activeOctave - 1}`;
                s.lastNoteTime = performance.now();
                L.lastFiredNote = noteIdx;
                L.armed = false;
                L.bufferPendingCount = 0;
            }
            s.heldSemitone = L.lastFiredNote;
        }
        if (frame.right) {
            const raw = extractPoseFeatures(frame.right, FRAME_W, FRAME_H);
            const R = right.current;
            R.ema = ema(R.ema, raw, POSE_SMOOTHING_ALPHA);
            const { index: octIdx, distance: dist } = octaveClassifierRef.current!.classify(R.ema);
            s.liveMatchOctave = octIdx;
            s.liveMatchOctaveDist = dist;
            if (octIdx === R.pendingOctave) {
                R.pendingCount += 1;
            }
            else {
                R.pendingOctave = octIdx;
                R.pendingCount = 1;
            }
            if (octIdx !== null && R.pendingCount >= POSE_CONFIRM_FRAMES) {
                // The octave selection is offset by one because the templates are zero-based while the UI labels start at 1.
                s.activeOctave = octIdx + 1;
            }
        }
    };
    return { stateRef, processFrame, audioEngine, reloadTemplates };
}
