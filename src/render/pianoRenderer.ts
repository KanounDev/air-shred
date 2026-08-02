import {
  NOTE_NAMES,
  OCTAVE_BASE,
  PIANO_BLACK_AFTER_WHITE_IDX,
  PIANO_BLACK_H,
  PIANO_BLACK_SEMITONES,
  PIANO_MARGIN_X,
  PIANO_TOP_Y,
  PIANO_WHITE_H,
  PIANO_WHITE_SEMITONES,
} from '../core/constants';
import type { GestureState } from '../hooks/useGestureSound';

const COL_WHITE = '#d8d6c8'; // slightly warm off-white, not clinical bright-white
const COL_BLACK = '#141311';
const COL_BORDER = 'rgba(255, 255, 255, 0.18)';
const COL_HELD = '#39ff8f'; // steady highlight while a note is actively held
const COL_FLASH = '#c9ffe4'; // brief brighter pulse right at the instant a note fires
const COL_LABEL_LIGHT = '#0a0a0a';
const COL_LABEL_DARK = '#f2f2f2';

/**
 * Draws a one-octave piano strip and highlights whichever key corresponds
 * to the currently-held left-hand note. Purely visual — reads gesture
 * state, doesn't affect input. Direct port of main.py's _draw_piano().
 *
 * The strip only has room for 12 keys (one octave), but you can actually
 * play across 4 octaves — so the ACTUAL octave is shown two ways: a label
 * above the strip, and the real octave number stamped on whichever key is
 * currently lit (e.g. "C4" not just "C").
 */
export function drawPiano(
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  state: GestureState,
  now: number,
): void {
  const pianoW = width - 2 * PIANO_MARGIN_X;
  const nWhite = PIANO_WHITE_SEMITONES.length;
  const whiteW = pianoW / nWhite;

  const heldSemitone = state.heldSemitone;
  const heldOctaveNum = OCTAVE_BASE + state.activeOctave - 1;
  const isFlashing = state.lastNotePlayed !== null && now - state.lastNoteTime < 250;

  ctx.save();
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillStyle = COL_LABEL_DARK;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    `Octave ${state.activeOctave}  (playing octave ${heldOctaveNum})`,
    PIANO_MARGIN_X,
    PIANO_TOP_Y - 8,
  );

  // white keys first (so black keys can be drawn on top of the seams)
  const whiteRects: [number, number][] = [];
  PIANO_WHITE_SEMITONES.forEach((semitone, i) => {
    const x0 = PIANO_MARGIN_X + i * whiteW;
    const x1 = PIANO_MARGIN_X + (i + 1) * whiteW;
    whiteRects.push([x0, x1]);

    let color: string = COL_WHITE;
    if (semitone === heldSemitone) color = isFlashing ? COL_FLASH : COL_HELD;

    ctx.fillStyle = color;
    ctx.fillRect(x0, PIANO_TOP_Y, x1 - x0, PIANO_WHITE_H);
    ctx.strokeStyle = COL_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, PIANO_TOP_Y, x1 - x0, PIANO_WHITE_H);

    let label: string = NOTE_NAMES[semitone];
    if (semitone === heldSemitone) label = `${label}${heldOctaveNum}`; // show the real octave on the active key
    ctx.fillStyle = COL_LABEL_LIGHT;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(label, x0 + 6, PIANO_TOP_Y + PIANO_WHITE_H - 8);
  });

  // black keys on top, centered on the seam after their white key
  const blackW = whiteW * 0.55;
  for (const semitone of PIANO_BLACK_SEMITONES) {
    const whiteIdx = PIANO_BLACK_AFTER_WHITE_IDX[semitone];
    const seamX = whiteRects[whiteIdx][1];
    const x0 = seamX - blackW / 2;
    const x1 = seamX + blackW / 2;

    let color: string = COL_BLACK;
    if (semitone === heldSemitone) color = isFlashing ? COL_FLASH : COL_HELD;

    ctx.fillStyle = color;
    ctx.fillRect(x0, PIANO_TOP_Y, x1 - x0, PIANO_BLACK_H);
    ctx.strokeStyle = COL_BORDER;
    ctx.strokeRect(x0, PIANO_TOP_Y, x1 - x0, PIANO_BLACK_H);

    if (semitone === heldSemitone) {
      ctx.fillStyle = color === COL_HELD ? COL_LABEL_DARK : COL_LABEL_LIGHT;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${NOTE_NAMES[semitone]}${heldOctaveNum}`, x0 - 2, PIANO_TOP_Y + PIANO_BLACK_H - 6);
    }
  }
  ctx.restore();
}
