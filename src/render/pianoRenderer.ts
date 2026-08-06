import { NOTE_NAMES, OCTAVE_BASE, OCTAVE_COUNT, PIANO_BLACK_AFTER_WHITE_IDX, PIANO_BLACK_KEY_HEIGHT_RATIO, PIANO_BLACK_KEY_WIDTH_RATIO, PIANO_BLACK_SEMITONES, PIANO_MIN_WHITE_KEY_PX, PIANO_WHITE_SEMITONES, } from '../core/constants';
import type { ChartNote } from '../core/midiChart';
import type { GestureState } from '../hooks/useGestureSound';
const COL_WHITE = '#d8d6c8';
const COL_BLACK = '#141311';
const COL_BORDER = 'rgba(255, 255, 255, 0.16)';
const COL_HELD = '#39ff8f';
const COL_TARGET = 'rgba(255, 176, 32, 0.35)';
const COL_TARGET_BORDER = 'rgba(255, 176, 32, 0.9)';
const COL_FLASH = '#c9ffe4';
const COL_LABEL_LIGHT = '#0a0a0a';
const COL_LABEL_DARK = '#f2f2f2';
const COL_ACTIVE_BAND = 'rgba(255, 176, 32, 0.10)';
const COL_ACTIVE_BAND_BORDER = 'rgba(255, 176, 32, 0.55)';
const COL_OCTAVE_LABEL = 'rgba(255, 255, 255, 0.35)';
const COL_MORE_HINT = 'rgba(255, 255, 255, 0.28)';
const WHITE_PER_OCTAVE = PIANO_WHITE_SEMITONES.length;
function computeVisibleWindow(canvasWidthPx: number, activeOctaveSelect: number) {
    // The visible octave window is clamped to the canvas width so the keyboard stays readable on smaller screens.
    const maxOctavesThatFit = Math.floor(canvasWidthPx / (PIANO_MIN_WHITE_KEY_PX * WHITE_PER_OCTAVE));
    const count = Math.min(OCTAVE_COUNT, Math.max(1, maxOctavesThatFit));
    const activeIdx = activeOctaveSelect - 1;
    let start = activeIdx - Math.floor((count - 1) / 2);
    start = Math.max(0, Math.min(OCTAVE_COUNT - count, start));
    return { start, count };
}
export function drawPiano(ctx: CanvasRenderingContext2D, width: number, height: number, state: GestureState, target: ChartNote | null, now: number): void {
    const heldSemitone = state.heldSemitone;
    const heldOctaveSelect = state.activeOctave;
    const isFlashing = state.lastNotePlayed !== null && now - state.lastNoteTime < 250;
    const targetSemitone = target ? target.noteIndex : null;
    const targetOctaveSelect = target ? target.octave : null;
    const targetOctaveIndex = targetOctaveSelect !== null ? targetOctaveSelect - 1 : null;
    const { start, count } = computeVisibleWindow(width, heldOctaveSelect);
    const totalWhite = WHITE_PER_OCTAVE * count;
    const whiteW = width / totalWhite;
    const whiteH = height;
    const blackW = whiteW * PIANO_BLACK_KEY_WIDTH_RATIO;
    const blackH = height * PIANO_BLACK_KEY_HEIGHT_RATIO;
    ctx.clearRect(0, 0, width, height);
    const activeWindowIdx = heldOctaveSelect - 1 - start;
    const bandX0 = activeWindowIdx * WHITE_PER_OCTAVE * whiteW;
    const bandW = WHITE_PER_OCTAVE * whiteW;
    ctx.save();
    ctx.fillStyle = COL_ACTIVE_BAND;
    ctx.fillRect(bandX0, 0, bandW, height);
    ctx.strokeStyle = COL_ACTIVE_BAND_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(bandX0 + 1, 1, bandW - 2, height - 2);
    ctx.restore();
    const whiteRects: [
        number,
        number
    ][][] = [];
    for (let w = 0; w < count; w++) {
        const oct = start + w;
        const rects: [
            number,
            number
        ][] = [];
        PIANO_WHITE_SEMITONES.forEach((semitone, i) => {
            const globalIdx = w * WHITE_PER_OCTAVE + i;
            const x0 = globalIdx * whiteW;
            const x1 = x0 + whiteW;
            rects.push([x0, x1]);
            const isHeld = semitone === heldSemitone && oct === heldOctaveSelect - 1;
            const isTarget = targetOctaveIndex !== null && semitone === targetSemitone && oct === targetOctaveIndex;
            ctx.fillStyle = isHeld
                ? isFlashing
                    ? COL_FLASH
                    : COL_HELD
                : isTarget
                    ? COL_TARGET
                    : COL_WHITE;
            ctx.fillRect(x0, 0, x1 - x0, whiteH);
            ctx.strokeStyle = isTarget ? COL_TARGET_BORDER : COL_BORDER;
            ctx.lineWidth = 1;
            ctx.strokeRect(x0, 0, x1 - x0, whiteH);
            const label = isHeld ? `${NOTE_NAMES[semitone]}${OCTAVE_BASE + oct}` : NOTE_NAMES[semitone];
            ctx.fillStyle = COL_LABEL_LIGHT;
            ctx.font = `${Math.max(9, Math.round(whiteW * 0.22))}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(label, x0 + whiteW / 2, whiteH - Math.max(6, whiteH * 0.08));
        });
        whiteRects.push(rects);
    }
    ctx.fillStyle = COL_OCTAVE_LABEL;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let w = 0; w < count; w++) {
        const oct = start + w;
        const cx = w * WHITE_PER_OCTAVE * whiteW + bandW / 2;
        ctx.fillText(`OCT ${oct + 1}`, cx, 12);
    }
    for (let w = 0; w < count; w++) {
        const oct = start + w;
        for (const semitone of PIANO_BLACK_SEMITONES) {
            const whiteIdx = PIANO_BLACK_AFTER_WHITE_IDX[semitone];
            const seamX = whiteRects[w][whiteIdx][1];
            const x0 = seamX - blackW / 2;
            const x1 = seamX + blackW / 2;
            const isHeld = semitone === heldSemitone && oct === heldOctaveSelect - 1;
            const isTarget = targetOctaveIndex !== null && semitone === targetSemitone && oct === targetOctaveIndex;
            const color = isHeld
                ? isFlashing
                    ? COL_FLASH
                    : COL_HELD
                : isTarget
                    ? COL_TARGET
                    : COL_BLACK;
            ctx.fillStyle = color;
            ctx.fillRect(x0, 0, x1 - x0, blackH);
            ctx.strokeStyle = isTarget ? COL_TARGET_BORDER : COL_BORDER;
            ctx.strokeRect(x0, 0, x1 - x0, blackH);
            if (isHeld) {
                ctx.fillStyle = color === COL_HELD ? COL_LABEL_DARK : COL_LABEL_LIGHT;
                ctx.font = `${Math.max(8, Math.round(blackW * 0.28))}px "JetBrains Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(`${NOTE_NAMES[semitone]}${OCTAVE_BASE + oct}`, seamX, blackH - Math.max(5, blackH * 0.1));
            }
        }
    }
    ctx.fillStyle = COL_MORE_HINT;
    ctx.font = `${Math.max(11, Math.round(height * 0.22))}px "JetBrains Mono", monospace`;
    if (start > 0) {
        ctx.textAlign = 'left';
        ctx.fillText('‹', 4, height / 2 + 4);
    }
    if (start + count < OCTAVE_COUNT) {
        ctx.textAlign = 'right';
        ctx.fillText('›', width - 4, height / 2 + 4);
    }
}
