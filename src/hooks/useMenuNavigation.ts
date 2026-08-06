import { useRef } from 'react';
import { FRAME_H, FRAME_W, INDEX_FINGER_TIP, MENU_DWELL_MS, MENU_LOCKED_FLASH_MS } from '../core/constants';
import { computeAllMenuButtons, hitTestButtons, type MenuButtonRect } from '../core/menuLayout';
import type { HandFrameResult } from './useHandTracking';
export interface MenuNavState {
    cursor: {
        x: number;
        y: number;
    } | null;
    hoveredId: string | null;
    dwellProgress: number;
    lockedFlashId: string | null;
    lockedFlashUntil: number;
    buttons: MenuButtonRect[];
    ignoreUntil: number;
    blockedId: string | null;
}
function initialState(): MenuNavState {
    return {
        cursor: null,
        hoveredId: null,
        dwellProgress: 0,
        lockedFlashId: null,
        lockedFlashUntil: 0,
        buttons: computeAllMenuButtons(FRAME_W, FRAME_H),
        ignoreUntil: 0,
        blockedId: null,
    };
}
export function useMenuNavigation(onSelect: (id: string) => void) {
    const stateRef = useRef<MenuNavState>(initialState());
    const lastTickRef = useRef<number | null>(null);
    const MENU_RESET_GRACE_MS = 250;
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
        // The menu uses the right index finger as a cursor because it is the least ambiguous pointer for this interaction.
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
            s.blockedId = null;
            return;
        }
        if (hit.id !== s.blockedId) {
            s.blockedId = null;
        }
        else {
            s.hoveredId = null;
            s.dwellProgress = 0;
            return;
        }
        if (hit.id !== s.hoveredId) {
            s.hoveredId = hit.id;
            s.dwellProgress = 0;
        }
        else {
            s.dwellProgress = Math.min(1, s.dwellProgress + dt / MENU_DWELL_MS);
        }
        if (s.dwellProgress >= 1) {
            // A full dwell interval is treated as a deliberate selection rather than a transient hover.
            if (hit.enabled) {
                onSelect(hit.id);
            }
            else {
                s.lockedFlashId = hit.id;
                s.lockedFlashUntil = now + MENU_LOCKED_FLASH_MS;
            }
            s.dwellProgress = 0;
            s.hoveredId = null;
        }
    };
    const reset = (blockedId: string | null = null) => {
        const s = initialState();
        s.ignoreUntil = performance.now() + MENU_RESET_GRACE_MS;
        s.blockedId = blockedId;
        stateRef.current = s;
        lastTickRef.current = null;
    };
    return { stateRef, processFrame, reset };
}
