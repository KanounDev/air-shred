export type MenuButtonId = 'play' | 'training' | 'tutorial';

export interface MenuButtonDef {
  id: MenuButtonId;
  label: string;
  enabled: boolean;
}

export interface MenuButtonRect extends MenuButtonDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * All three mode buttons are wired up now: PLAY -> song-select screen,
 * TRAINING -> the freeform playing screen, TUTORIAL -> the pose-reference
 * popup.
 */
export const MENU_BUTTONS: MenuButtonDef[] = [
  { id: 'play', label: 'PLAY', enabled: true },
  { id: 'training', label: 'TRAINING', enabled: true },
  { id: 'tutorial', label: 'TUTORIAL', enabled: true },
];

/** Lays the three mode buttons out centered, in the lower third of the given canvas size. */
export function computeMenuButtonLayout(width: number, height: number): MenuButtonRect[] {
  const btnW = Math.min(230, width * 0.27);
  const btnH = Math.max(52, height * 0.13);
  const gap = width * 0.03;
  const totalW = MENU_BUTTONS.length * btnW + (MENU_BUTTONS.length - 1) * gap;
  const startX = (width - totalW) / 2;
  const y = height * 0.6;

  return MENU_BUTTONS.map((def, i) => ({
    ...def,
    x: startX + i * (btnW + gap),
    y,
    w: btnW,
    h: btnH,
  }));
}

/** All pointable menu buttons in one array — what useMenuNavigation hit-tests and drawMenu iterates over. */
export function computeAllMenuButtons(width: number, height: number): MenuButtonRect[] {
  return computeMenuButtonLayout(width, height);
}

/** Returns whichever button rect contains (x, y), or null if none does. */
export function hitTestButtons(x: number, y: number, rects: MenuButtonRect[]): MenuButtonRect | null {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}