import { A4_FREQ, OCTAVE_BASE } from './constants';
// The octave selector is translated into the MIDI octave space so the UI can stay on four simple buckets.
export function noteToFreq(noteIndex: number, octaveSelect: number): number {
    const actualOctave = OCTAVE_BASE + (octaveSelect - 1);
    const midiNote = 12 * (actualOctave + 1) + noteIndex;
    return A4_FREQ * 2 ** ((midiNote - 69) / 12);
}
