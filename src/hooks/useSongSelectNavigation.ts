import { useRef } from 'react';
import { FRAME_H, FRAME_W, INDEX_FINGER_TIP, MENU_DWELL_MS } from '../core/constants';
import {
  computeSongSelectLayout,
  hitTestRect,
  hitTestRows,
  type SongSelectLayout,
} from '../core/songSelectLayout';
import { SONGS } from '../core/songLibrary';
import type { HandFrameResult } from './useHandTracking';

export interface SongSelectNavState {
  /** Right index fingertip position in the shared FRAME_W x FRAME_H canvas space, or null if the right hand isn't visible. */
  cursor: { x: number; y: number } | null;
  hoveredId: string | null; // a song id, or 'start'
  dwellProgress: number; // 0..1
  selectedSongId: string | null;
  layout: SongSelectLayout;
  // same "grace period + must-leave-before-refire" guards as useMenuNavigation,
  // reused here for the Start button once it actually navigates somewhere.
  ignoreUntil: number;
  blockedId: string | null;
}

function initialState(): SongSelectNavState {
  return {
    cursor: null,
    hoveredId: null,
    dwellProgress: 0,
    selectedSongId: null,
    layout: computeSongSelectLayout(
      FRAME_W,
      FRAME_H,
      SONGS.map((s) => s.id),
    ),
    ignoreUntil: 0,
    blockedId: null,
  };
}

const NAV_RESET_GRACE_MS = 250;

/**
 * Point-and-dwell navigation for the song-select screen: hovering a song
 * row for MENU_DWELL_MS selects it (updates `selectedSongId`, which is
 * what reveals the stat boxes + Start button — see render/songSelectRenderer.ts).
 * Selecting a different row while one is already selected just re-fires
 * the same dwell, no leave-and-return needed — unlike the main menu's
 * buttons, re-picking a song has no "instant re-navigation" hazard to
 * guard against.
 *
 * The Start button (only hittable once a song is selected) uses the same
 * dwell mechanic and calls `onStart(songId)` — currently a no-op upstream
 * since there's no song playback yet (see core/songLibrary.ts).
 */
export function useSongSelectNavigation(onStart: (songId: string) => void) {
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

    const x = tip.x * FRAME_W;
    const y = tip.y * FRAME_H;
    s.cursor = { x, y };

    const hoveredRow = hitTestRows(x, y, s.layout.rows);
    const hoveredStart =
      !hoveredRow && s.selectedSongId !== null && hitTestRect(x, y, s.layout.startButton) ? 'start' : null;
    const hitId = hoveredRow?.id ?? hoveredStart;

    if (!hitId) {
      s.hoveredId = null;
      s.dwellProgress = 0;
      s.blockedId = null;
      return;
    }

    if (hitId !== s.blockedId) {
      s.blockedId = null;
    } else {
      s.hoveredId = null;
      s.dwellProgress = 0;
      return;
    }

    if (hitId !== s.hoveredId) {
      s.hoveredId = hitId;
      s.dwellProgress = 0;
    } else {
      s.dwellProgress = Math.min(1, s.dwellProgress + dt / MENU_DWELL_MS);
    }

    if (s.dwellProgress >= 1) {
      if (hitId === 'start') {
        onStart(s.selectedSongId!);
      } else {
        s.selectedSongId = hitId;
      }
      s.dwellProgress = 0;
      // Rows deliberately DON'T get blocked/require-leave — re-confirming
      // the same song (or picking a new one) by continuing to hover is
      // fine, there's nothing disruptive about re-selecting. Only the
      // Start button (which leaves the screen once wired up) needs that
      // guard, applied via reset() below when returning to this screen.
      if (hitId === 'start') s.hoveredId = null;
    }
  };

  /** Called when (re)entering this screen so a stale hover/dwell doesn't carry over. */
  const reset = (blockedId: string | null = null) => {
    const s = initialState();
    s.ignoreUntil = performance.now() + NAV_RESET_GRACE_MS;
    s.blockedId = blockedId;
    stateRef.current = s;
    lastTickRef.current = null;
  };

  return { stateRef, processFrame, reset };
}