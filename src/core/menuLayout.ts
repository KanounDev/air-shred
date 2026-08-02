export interface MenuButtonDef {
  id: 'play' | 'training' | 'tutorial';
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
 * Only TRAINING is wired up right now — PLAY and TUTORIAL exist as real,
 * pointable buttons (so the menu reads as a real game menu, not a stub)
 * but are flagged `enabled: false`; dwelling on them flashes a "locked"
 * state instead of navigating anywhere. Flip `enabled` here once there's
 * something behind them.
 */
export const MENU_BUTTONS: MenuButtonDef[] = [
  { id: 'play', label: 'PLAY', enabled: false },
  { id: 'training', label: 'TRAINING', enabled: true },
  { id: 'tutorial', label: 'TUTORIAL', enabled: false },
];

/** Lays the three buttons out centered, in the lower third of the given canvas size. */
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

/** Returns whichever button rect contains (x, y), or null if none does. */
export function hitTestButtons(x: number, y: number, rects: MenuButtonRect[]): MenuButtonRect | null {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}
