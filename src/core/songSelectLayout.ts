export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SongRowRect extends Rect {
  id: string;
  index: number;
}

export interface SongSelectLayout {
  list: Rect;
  rows: SongRowRect[];
  globalScoreBox: Rect;
  globalTimeBox: Rect;
  scoreBox: Rect;
  timeBox: Rect;
  startButton: Rect;
}

/**
 * Lays out the song-select screen: a tall list panel on the left (one row
 * per song — see core/songLibrary.ts) and a right-hand column holding the
 * two stat boxes and the Start button beneath them. Mirrors
 * core/menuLayout.ts's approach — everything as a fraction of the shared
 * FRAME_W x FRAME_H canvas space, so it scales with the stage the same way
 * the menu buttons and piano strip do.
 *
 * Doesn't handle scrolling — with SONGS.length around a dozen, rows still
 * come out tap-legible at 960x540. Revisit with a scrollable/paged list if
 * the catalog grows a lot once real songs are added.
 */
export function computeSongSelectLayout(width: number, height: number, songIds: string[]): SongSelectLayout {
  const list: Rect = {
    x: width * 0.06,
    y: height * 0.16,
    w: width * 0.42,
    h: height * 0.74,
  };

  const rowGap = height * 0.025;
  const rowH = (list.h - rowGap * Math.max(0, songIds.length - 1)) / Math.max(1, songIds.length);
  const rows: SongRowRect[] = songIds.map((id, i) => ({
    id,
    index: i,
    x: list.x,
    y: list.y + i * (rowH + rowGap),
    w: list.w,
    h: rowH,
  }));

  const rightColX = list.x + list.w + width * 0.06;
  const statBoxW = width * 0.15;
  const statBoxH = height * 0.14;
  const statGap = width * 0.025;

  // Vertically center the stat groups and the start button within the right
  // column. Global and user stats are separated with a dedicated section gap.
  const startBtnH = height * 0.135;
  const sectionGap = height * 0.07;
  const gapBetween = height * 0.05;
  const totalGroupH = statBoxH * 2 + sectionGap + gapBetween + startBtnH;
  const groupTop = list.y + (list.h - totalGroupH) / 2;

  const globalScoreBox: Rect = { x: rightColX, y: groupTop, w: statBoxW, h: statBoxH };
  const globalTimeBox: Rect = { x: rightColX + statBoxW + statGap, y: groupTop, w: statBoxW, h: statBoxH };

  const scoreBox: Rect = { x: rightColX, y: groupTop + statBoxH + sectionGap, w: statBoxW, h: statBoxH };
  const timeBox: Rect = { x: rightColX + statBoxW + statGap, y: groupTop + statBoxH + sectionGap, w: statBoxW, h: statBoxH };

  const startButton: Rect = {
    x: rightColX,
    y: groupTop + statBoxH * 2 + sectionGap + gapBetween,
    w: statBoxW * 2 + statGap,
    h: startBtnH,
  };

  return {
    list,
    rows,
    globalScoreBox,
    globalTimeBox,
    scoreBox,
    timeBox,
    startButton,
  };
}

export function hitTestRows(x: number, y: number, rows: SongRowRect[]): SongRowRect | null {
  for (const r of rows) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}

export function hitTestRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}