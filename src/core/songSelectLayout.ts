export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface SongRowRect extends Rect {
    id: string;
    songId: string | null;
    index: number;
}
export interface SongSelectLayout {
    list: Rect;
    rows: SongRowRect[];
    scoreBox: Rect;
    timeBox: Rect;
    pauseButton: Rect;
    resumeButton: Rect;
    startButton: Rect;
    scrollUpButton: Rect;
    scrollDownButton: Rect;
    showScrollArrows: boolean;
}
export function computeSongSelectLayout(width: number, height: number, songIds: string[], scrollIndex = 0): SongSelectLayout {
    const list: Rect = {
        x: width * 0.06,
        y: height * 0.16,
        w: width * 0.34,
        h: height * 0.74,
    };
    const arrowSize = Math.min(36, height * 0.05);
    const arrowGap = 6;
    const contentY = list.y + arrowSize + arrowGap;
    const contentH = list.h - arrowSize * 2 - arrowGap * 2;
    const maxVisibleRows = 5;
    const visibleCount = maxVisibleRows;
    const showScrollArrows = songIds.length > visibleCount;
    const rowGap = 4;
    const rowH = (contentH - rowGap * Math.max(0, visibleCount - 1)) / visibleCount;
    const rows: SongRowRect[] = Array.from({ length: visibleCount }, (_, i) => {
        const songId = songIds[scrollIndex + i] ?? null;
        return {
            id: songId ?? `empty-${i}`,
            songId,
            index: scrollIndex + i,
            x: list.x,
            y: contentY + i * (rowH + rowGap),
            w: list.w,
            h: rowH,
        };
    });
    const scrollUpButton: Rect = {
        x: list.x + (list.w - arrowSize) / 2,
        y: list.y,
        w: arrowSize,
        h: arrowSize,
    };
    const scrollDownButton: Rect = {
        x: list.x + (list.w - arrowSize) / 2,
        y: list.y + list.h - arrowSize,
        w: arrowSize,
        h: arrowSize,
    };
    const rightColX = list.x + list.w + width * 0.06;
    const statBoxW = width * 0.15;
    const statBoxH = height * 0.15;
    const statGap = width * 0.02;
    const controlH = height * 0.1;
    const controlGap = height * 0.02;
    const startBtnH = height * 0.135;
    const totalGroupH = statBoxH + controlGap + controlH + controlGap + controlH + controlGap + startBtnH;
    const groupTop = list.y + (list.h - totalGroupH) / 2;
    const scoreBox: Rect = { x: rightColX, y: groupTop, w: statBoxW, h: statBoxH };
    const timeBox: Rect = { x: rightColX + statBoxW + statGap, y: groupTop, w: statBoxW, h: statBoxH };
    const pauseButton: Rect = {
        x: rightColX,
        y: timeBox.y + timeBox.h + controlGap,
        w: statBoxW * 2 + statGap,
        h: controlH,
    };
    const resumeButton: Rect = {
        x: rightColX,
        y: pauseButton.y + pauseButton.h + controlGap,
        w: pauseButton.w,
        h: controlH,
    };
    const startButton: Rect = {
        x: rightColX,
        y: resumeButton.y + resumeButton.h + controlGap,
        w: pauseButton.w,
        h: startBtnH,
    };
    return {
        list,
        rows,
        scoreBox,
        timeBox,
        pauseButton,
        resumeButton,
        startButton,
        scrollUpButton,
        scrollDownButton,
        showScrollArrows,
    };
}
export function hitTestRows(x: number, y: number, rows: SongRowRect[]): SongRowRect | null {
    for (const r of rows) {
        if (!r.songId)
            continue;
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
            return r;
    }
    return null;
}
export function hitTestRect(x: number, y: number, r: Rect): boolean {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
