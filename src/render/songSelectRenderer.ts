import { findSong, formatTimeSpent, SONGS } from '../core/songLibrary';
import type { Rect } from '../core/songSelectLayout';
import type { SongSelectNavState } from '../hooks/useSongSelectNavigation';

const COL_TITLE = '#ece8df';
const COL_SUBTITLE = 'rgba(236, 232, 223, 0.72)';

const COL_PANEL_BG = 'rgba(20, 19, 17, 0.82)';
const COL_PANEL_BORDER = 'rgba(255, 255, 255, 0.22)';
const COL_ROW_BORDER = 'rgba(255, 255, 255, 0.1)';
const COL_ROW_LABEL = '#ece8df';
const COL_ROW_HOVER_FILL = 'rgba(57, 255, 143, 0.14)';
const COL_ROW_SELECTED_BORDER = '#39ff8f';
const COL_ROW_SELECTED_BG = 'rgba(57, 255, 143, 0.08)';

const COL_STAT_LABEL = 'rgba(236, 232, 223, 0.55)';
const COL_STAT_VALUE = '#ffb020';
const COL_ICON = '#ffb020';

const COL_BTN_ENABLED_ACCENT = '#39ff8f';
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

function drawTrophyIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.strokeStyle = COL_ICON;
  ctx.lineWidth = 2;
  const cupW = size * 0.7;
  const cupH = size * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - cupW / 2, cy - cupH / 2);
  ctx.lineTo(cx - cupW / 2, cy);
  ctx.quadraticCurveTo(cx - cupW / 2, cy + cupH / 2, cx, cy + cupH / 2);
  ctx.quadraticCurveTo(cx + cupW / 2, cy + cupH / 2, cx + cupW / 2, cy);
  ctx.lineTo(cx + cupW / 2, cy - cupH / 2);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - cupW / 2 - size * 0.12, cy - cupH * 0.15, size * 0.14, Math.PI * 0.3, Math.PI * 1.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + cupW / 2 + size * 0.12, cy - cupH * 0.15, size * 0.14, Math.PI * 1.3, Math.PI * 2.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + cupH / 2);
  ctx.lineTo(cx, cy + cupH / 2 + size * 0.18);
  ctx.moveTo(cx - size * 0.22, cy + cupH / 2 + size * 0.18);
  ctx.lineTo(cx + size * 0.22, cy + cupH / 2 + size * 0.18);
  ctx.stroke();
  ctx.restore();
}

function drawClockIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.strokeStyle = COL_ICON;
  ctx.lineWidth = 2;
  const r = size * 0.42;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 0.6);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.45, cy + r * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawList(ctx: CanvasRenderingContext2D, nav: SongSelectNavState) {
  const { list, rows } = nav.layout;

  roundRect(ctx, list.x, list.y, list.w, list.h, 6);
  ctx.fillStyle = COL_PANEL_BG;
  ctx.fill();
  ctx.strokeStyle = COL_PANEL_BORDER;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const song = SONGS[i];
    const isHovered = nav.hoveredId === row.id;
    const isSelected = nav.selectedSongId === row.id;

    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(row.x, row.y);
      ctx.lineTo(row.x + row.w, row.y);
      ctx.strokeStyle = COL_ROW_BORDER;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (isSelected) {
      ctx.fillStyle = COL_ROW_SELECTED_BG;
      ctx.fillRect(row.x + 1, row.y + 1, row.w - 2, row.h - 2);
    }

    // dwell progress: fills the row's background left-to-right, reads
    // better for a wide list row than a circular ring (which is what the
    // menu buttons use instead).
    if (isHovered && nav.dwellProgress > 0) {
      ctx.fillStyle = COL_ROW_HOVER_FILL;
      ctx.fillRect(row.x + 1, row.y + 1, (row.w - 2) * nav.dwellProgress, row.h - 2);
    }

    if (isSelected) {
      ctx.strokeStyle = COL_ROW_SELECTED_BORDER;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(row.x + 1, row.y + 1, row.w - 2, row.h - 2);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `${isSelected ? '600 ' : ''}${Math.max(11, Math.round(row.h * 0.4))}px "JetBrains Mono", monospace`;
    ctx.fillStyle = isSelected ? COL_ROW_SELECTED_BORDER : COL_ROW_LABEL;
    ctx.fillText(song.title, row.x + 14, row.y + row.h / 2);
  }
}

function drawStatBox(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  icon: 'trophy' | 'clock',
  label: string,
  value: string,
) {
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
  ctx.fillStyle = COL_PANEL_BG;
  ctx.fill();
  ctx.strokeStyle = COL_PANEL_BORDER;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const iconCx = rect.x + rect.w / 2;
  const iconCy = rect.y + rect.h * 0.36;
  const iconSize = Math.min(rect.w, rect.h) * 0.4;
  if (icon === 'trophy') drawTrophyIcon(ctx, iconCx, iconCy, iconSize);
  else drawClockIcon(ctx, iconCx, iconCy, iconSize);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${Math.max(13, Math.round(rect.h * 0.2))}px "JetBrains Mono", monospace`;
  ctx.fillStyle = COL_STAT_VALUE;
  ctx.fillText(value, iconCx, rect.y + rect.h * 0.78);

  ctx.font = `${Math.max(9, Math.round(rect.h * 0.11))}px "JetBrains Mono", monospace`;
  ctx.fillStyle = COL_STAT_LABEL;
  ctx.fillText(label, iconCx, rect.y + rect.h * 0.92);
}

function drawStartButton(ctx: CanvasRenderingContext2D, nav: SongSelectNavState) {
  const btn = nav.layout.startButton;
  const isHovered = nav.hoveredId === 'start';
  const cx = btn.x + btn.w / 2;
  const cy = btn.y + btn.h / 2;

  ctx.save();

  if (isHovered && nav.dwellProgress > 0) {
    const radius = Math.max(btn.w, btn.h) * 0.62;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = COL_HOVER_RING_BG;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * nav.dwellProgress);
    ctx.strokeStyle = COL_BTN_ENABLED_ACCENT;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fillStyle = COL_PANEL_BG;
  ctx.fill();
  ctx.strokeStyle = isHovered ? COL_BTN_ENABLED_ACCENT : COL_PANEL_BORDER;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(btn.h * 0.3)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = isHovered ? COL_BTN_ENABLED_ACCENT : COL_ROW_LABEL;
  ctx.fillText('START', cx, cy);

  ctx.restore();
}

function drawCursor(ctx: CanvasRenderingContext2D, nav: SongSelectNavState) {
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
 * Draws the whole song-select screen: title, the song list (with dwell-fill
 * feedback per row and a persistent highlight on the selected one), and —
 * once a song is selected — the two stat boxes and Start button. Pure
 * function: reads SongSelectNavState, writes pixels. No piano/skeleton
 * content here; that's the camera canvas underneath (see CameraCanvas,
 * always mounted beneath every screen's overlay).
 */
export function drawSongSelect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  nav: SongSelectNavState,
): void {
  ctx.clearRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `${Math.max(16, Math.round(height * 0.05))}px "Metal Mania", cursive`;
  ctx.fillStyle = COL_TITLE;
  ctx.fillText('SELECT A SONG', width / 2, height * 0.09);

  ctx.font = `${Math.max(10, Math.round(height * 0.022))}px "JetBrains Mono", monospace`;
  ctx.fillStyle = COL_SUBTITLE;
  ctx.fillText('POINT WITH YOUR RIGHT INDEX FINGER · HOLD TO CHOOSE', width / 2, height * 0.13);

  drawList(ctx, nav);

  const selected = findSong(nav.selectedSongId);
  if (selected) {
    drawStatBox(ctx, nav.layout.scoreBox, 'trophy', 'HIGHEST SCORE', String(selected.highestScore));
    drawStatBox(ctx, nav.layout.timeBox, 'clock', 'TIME SPENT', formatTimeSpent(selected.timeSpentSec));
    drawStartButton(ctx, nav);
  }

  ctx.font = `${Math.max(9, Math.round(height * 0.018))}px "JetBrains Mono", monospace`;
  ctx.fillStyle = COL_SUBTITLE;
  ctx.fillText('ESC · BACK TO MENU', width / 2, height * 0.97);

  drawCursor(ctx, nav);
}