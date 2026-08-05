import type { MenuButtonRect } from '../core/menuLayout';
import type { MenuNavState } from '../hooks/useMenuNavigation';

const COL_TITLE = '#ece8df';
const COL_TITLE_GLOW = 'rgba(57, 255, 143, 0.55)';
const COL_SUBTITLE = 'rgba(236, 232, 223, 0.72)';
const COL_STATUS_READY = '#39ff8f';
const COL_STATUS_WAIT = '#ffb020';
const COL_STATUS_TEXT = 'rgba(236, 232, 223, 0.55)';

const COL_BTN_BG = 'rgba(20, 19, 17, 0.82)';
const COL_BTN_BORDER = 'rgba(255, 255, 255, 0.22)';
const COL_BTN_LABEL = '#ece8df';
const COL_BTN_ENABLED_ACCENT = '#39ff8f';
const COL_BTN_DISABLED_LABEL = 'rgba(236, 232, 223, 0.32)';
const COL_BTN_SOON_TAG = 'rgba(255, 176, 32, 0.75)';
const COL_BTN_LOCKED_FLASH = 'rgba(255, 47, 58, 0.35)';
const COL_HOVER_RING_BG = 'rgba(255, 255, 255, 0.12)';

const COL_CURSOR_IDLE = 'rgba(236, 232, 223, 0.55)';
const COL_CURSOR_HOVER = '#39ff8f';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawButton(ctx: CanvasRenderingContext2D, btn: MenuButtonRect, nav: MenuNavState, now: number) {
  const isHovered = nav.hoveredId === btn.id;
  const isFlashing = nav.lockedFlashId === btn.id && now < nav.lockedFlashUntil;
  const cx = btn.x + btn.w / 2;
  const cy = btn.y + btn.h / 2;

  ctx.save();

  // dwell progress ring drawn behind the button so it reads as "filling up"
  if (isHovered && nav.dwellProgress > 0) {
    const radius = Math.max(btn.w, btn.h) * 0.62;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = COL_HOVER_RING_BG;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * nav.dwellProgress);
    ctx.strokeStyle = btn.enabled ? COL_BTN_ENABLED_ACCENT : COL_STATUS_WAIT;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fillStyle = isFlashing ? COL_BTN_LOCKED_FLASH : COL_BTN_BG;
  ctx.fill();
  ctx.strokeStyle = btn.enabled && isHovered ? COL_BTN_ENABLED_ACCENT : COL_BTN_BORDER;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(btn.h * 0.28)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = btn.enabled ? COL_BTN_LABEL : COL_BTN_DISABLED_LABEL;
  ctx.fillText(btn.label, cx, cy - (btn.enabled ? 0 : btn.h * 0.08));

  if (!btn.enabled) {
    ctx.font = `${Math.round(btn.h * 0.16)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = COL_BTN_SOON_TAG;
    ctx.fillText('SOON', cx, cy + btn.h * 0.26);
  }

  ctx.restore();
}


function drawCursor(ctx: CanvasRenderingContext2D, nav: MenuNavState) {
  if (!nav.cursor) return;
  const { x, y } = nav.cursor;
  const hovering = nav.hoveredId !== null;

  ctx.save();
  ctx.strokeStyle = hovering ? COL_CURSOR_HOVER : COL_CURSOR_IDLE;
  ctx.lineWidth = 2;
  ctx.shadowColor = hovering ? COL_CURSOR_HOVER : 'transparent';
  ctx.shadowBlur = hovering ? 10 : 0;

  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.stroke();

  // small crosshair ticks, CV-HUD-flavored rather than a plain dot
  const tick = 6;
  ctx.beginPath();
  ctx.moveTo(x - 14, y);
  ctx.lineTo(x - 14 + tick, y);
  ctx.moveTo(x + 14, y);
  ctx.lineTo(x + 14 - tick, y);
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x, y - 14 + tick);
  ctx.moveTo(x, y + 14);
  ctx.lineTo(x, y + 14 - tick);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the whole "title screen" — title, instructions, tracking-status
 * indicator, the three mode buttons, and the fingertip cursor/dwell ring —
 * onto the menu overlay canvas. Pure function: reads MenuNavState, writes
 * pixels.
 */
export function drawMenu(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  nav: MenuNavState,
  trackingReady: boolean,
  now: number,
): void {
  ctx.clearRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `${Math.round(height * 0.09)}px "Metal Mania", cursive`;
  ctx.fillStyle = COL_TITLE;
  ctx.shadowColor = COL_TITLE_GLOW;
  ctx.shadowBlur = 16;
  ctx.fillText('AirShred', width / 2, height * 0.22);
  ctx.shadowBlur = 0;

  ctx.font = `${Math.max(11, Math.round(height * 0.026))}px "JetBrains Mono", monospace`;
  ctx.fillStyle = COL_SUBTITLE;
  ctx.fillText('POINT WITH YOUR RIGHT INDEX FINGER · HOLD TO SELECT', width / 2, height * 0.29);

  // tracking-ready indicator, left-aligned under the subtitle
  const dotX = width / 2 - 148;
  const statusY = height * 0.29 + height * 0.045;
  ctx.beginPath();
  ctx.fillStyle = trackingReady ? COL_STATUS_READY : COL_STATUS_WAIT;
  ctx.arc(dotX, statusY - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = `${Math.max(10, Math.round(height * 0.02))}px "JetBrains Mono", monospace`;
  ctx.fillStyle = COL_STATUS_TEXT;
  ctx.fillText(trackingReady ? 'TRACKING ONLINE' : 'ACQUIRING HANDS…', dotX + 10, statusY);

  for (const btn of nav.buttons) {
    drawButton(ctx, btn, nav, now);
  }
  drawCursor(ctx, nav);
}