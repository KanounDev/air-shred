import { useRef } from 'react';
import { FRAME_H, FRAME_W, INDEX_FINGER_TIP, MENU_DWELL_MS } from '../core/constants';
import { computeSongSelectLayout, hitTestRect, hitTestRows, type SongSelectLayout, } from '../core/songSelectLayout';
import { getSongs } from '../core/songLibrary';
import type { HandFrameResult } from './useHandTracking';
export interface SongSelectNavState {
    cursor: {
        x: number;
        y: number;
    } | null;
    hoveredId: string | null;
    dwellProgress: number;
    selectedSongId: string | null;
    scrollIndex: number;
    layout: SongSelectLayout;
    ignoreUntil: number;
    blockedId: string | null;
}
function initialState(): SongSelectNavState {
    const ids = getSongs().map((s) => s.id);
    return {
        cursor: null,
        hoveredId: null,
        dwellProgress: 0,
        selectedSongId: null,
        scrollIndex: 0,
        layout: computeSongSelectLayout(FRAME_W, FRAME_H, ids, 0),
        ignoreUntil: 0,
        blockedId: null,
    };
}
const NAV_RESET_GRACE_MS = 250;
export function useSongSelectNavigation(onStart: (songId: string) => void, onPreview?: (actionId: string) => void) {
    const stateRef = useRef<SongSelectNavState>(initialState());
    const lastTickRef = useRef<number | null>(null);
    const processFrame = (frame: HandFrameResult) => {
        const s = stateRef.current;
        const now = performance.now();
        const dt = lastTickRef.current === null ? 0 : now - lastTickRef.current;
        lastTickRef.current = now;
        if (now < s.ignoreUntil) {
            s.cursor = null;
            s.hoveredId = null;
            s.dwellProgress = 0;
            return;
        }
        const tip = frame.right?.[INDEX_FINGER_TIP];
        if (!tip) {
            s.cursor = null;
            s.hoveredId = null;
            s.dwellProgress = 0;
            return;
        }
        const ids = getSongs().map((song) => song.id);
        s.layout = computeSongSelectLayout(FRAME_W, FRAME_H, ids, s.scrollIndex);
        const x = tip.x * FRAME_W;
        const y = tip.y * FRAME_H;
        s.cursor = { x, y };
        const hoveredRow = hitTestRows(x, y, s.layout.rows);
        const hoveredStart = !hoveredRow && s.selectedSongId !== null && hitTestRect(x, y, s.layout.startButton)
            ? 'start'
            : null;
        const hoveredPause = !hoveredRow && hitTestRect(x, y, s.layout.pauseButton) ? 'pause' : null;
        const hoveredResume = !hoveredRow && hitTestRect(x, y, s.layout.resumeButton) ? 'resume' : null;
        const hoveredScrollUp = !hoveredRow && s.layout.showScrollArrows && hitTestRect(x, y, s.layout.scrollUpButton)
            ? 'scroll-up'
            : null;
        const hoveredScrollDown = !hoveredRow && s.layout.showScrollArrows && hitTestRect(x, y, s.layout.scrollDownButton)
            ? 'scroll-down'
            : null;
        let hitId: string | null = hoveredRow?.songId ?? hoveredStart ?? hoveredPause ?? hoveredResume ?? hoveredScrollUp ?? hoveredScrollDown;
        if (!hitId) {
            s.hoveredId = null;
            s.dwellProgress = 0;
            s.blockedId = null;
            return;
        }
        if (hitId !== s.blockedId) {
            s.blockedId = null;
        }
        else {
            s.hoveredId = null;
            s.dwellProgress = 0;
            return;
        }
        if (hitId !== s.hoveredId) {
            s.hoveredId = hitId;
            s.dwellProgress = 0;
        }
        else {
            s.dwellProgress = Math.min(1, s.dwellProgress + dt / MENU_DWELL_MS);
        }
        if (s.dwellProgress >= 1) {
            if (hitId === 'start') {
                onStart(s.selectedSongId!);
            }
            else if (hitId === 'pause') {
                onPreview?.('pause');
            }
            else if (hitId === 'resume') {
                onPreview?.('resume');
            }
            else if (hitId === 'scroll-up') {
                const maxIndex = Math.max(0, ids.length - s.layout.rows.length);
                s.scrollIndex = Math.max(0, s.scrollIndex - 1);
                if (s.scrollIndex > maxIndex)
                    s.scrollIndex = maxIndex;
            }
            else if (hitId === 'scroll-down') {
                const maxIndex = Math.max(0, ids.length - s.layout.rows.length);
                s.scrollIndex = Math.min(maxIndex, s.scrollIndex + 1);
            }
            else {
                s.selectedSongId = hitId as string;
                onPreview?.(hitId as string);
            }
            s.dwellProgress = 0;
            if (hitId === 'start')
                s.hoveredId = null;
        }
    };
    const reset = (blockedId: string | null = null) => {
        const s = initialState();
        s.ignoreUntil = performance.now() + NAV_RESET_GRACE_MS;
        s.blockedId = blockedId;
        stateRef.current = s;
        lastTickRef.current = null;
    };
    return { stateRef, processFrame, reset };
}
