import { useRef } from 'react';
import { FRAME_H, FRAME_W, INDEX_FINGER_TIP, MENU_DWELL_MS, MENU_LOCKED_FLASH_MS } from '../core/constants';
import { computeAllMenuButtons, hitTestButtons, type MenuButtonRect } from '../core/menuLayout';
import type { HandFrameResult } from './useHandTracking';

export interface MenuNavState {
  /** Right index fingertip position in the shared FRAME_W x FRAME_H canvas space, or null if the right hand isn't visible. */
  cursor: { x: number; y: number } | null;
  hoveredId: string | null;
  dwellProgress: number; // 0..1, resets on hover change or on firing
  lockedFlashId: string | null; // briefly set when dwell completes on a disabled button
  lockedFlashUntil: number;
  buttons: MenuButtonRect[];
}

function initialState(): MenuNavState {
  return {
    cursor: null,
    hoveredId: null,
    dwellProgress: 0,
    lockedFlashId: null,
    lockedFlashUntil: 0,
    buttons: computeAllMenuButtons(FRAME_W, FRAME_H),
  };
}

/**
 * There's no click event for a floating fingertip, so — same pattern used
 * by gaze- and finger-point interfaces generally — hovering a button and
 * holding still for MENU_DWELL_MS stands in for a "tap". Disabled buttons
 * still track hover/dwell (so pointing at them feels responsive, not
 * dead) but flash instead of calling onSelect.
 *
 * Only active while the menu screen is showing; App.tsx is responsible
 * for routing frames here vs. to useGestureSound based on which screen
 * is current (see App.tsx's handleFrame dispatcher).
 */
export function useMenuNavigation(onSelect: (id: string) => void) {
  const stateRef = useRef<MenuNavState>(initialState());
  const lastTickRef = useRef<number | null>(null);

  const processFrame = (frame: HandFrameResult) => {
    const s = stateRef.current;
    const now = performance.now();
    const dt = lastTickRef.current === null ? 0 : now - lastTickRef.current;
    lastTickRef.current = now;

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

    const hit = hitTestButtons(x, y, s.buttons);
    if (!hit) {
      s.hoveredId = null;
      s.dwellProgress = 0;
      return;
    }

    if (hit.id !== s.hoveredId) {
      s.hoveredId = hit.id;
      s.dwellProgress = 0;
    } else {
      s.dwellProgress = Math.min(1, s.dwellProgress + dt / MENU_DWELL_MS);
    }

    if (s.dwellProgress >= 1) {
      if (hit.enabled) {
        onSelect(hit.id);
      } else {
        s.lockedFlashId = hit.id;
        s.lockedFlashUntil = now + MENU_LOCKED_FLASH_MS;
      }
      s.dwellProgress = 0;
      s.hoveredId = null; // require the hand to leave and re-enter before it can fire again
    }
  };

  /** Called when returning to the menu (e.g. after Esc from Training) so a stale hover/dwell doesn't carry over. */
  const reset = () => {
    stateRef.current = initialState();
    lastTickRef.current = null;
  };

  return { stateRef, processFrame, reset };
}