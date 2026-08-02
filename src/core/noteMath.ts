import { A4_FREQ, OCTAVE_BASE } from './constants';

/**
 * Direct port of ToneEngine._note_to_freq() from main.py: standard
 * 12-tone-equal-temperament MIDI-to-frequency conversion, offset by the
 * app's OCTAVE_BASE so "octave-select 1" lands on OCTAVE_BASE (C3, by
 * default) rather than MIDI octave 0.
 *
 * @param noteIndex 0..11, index into NOTE_NAMES (C=0 .. B=11)
 * @param octaveSelect 1..4, the *latched* octave from the right hand
 */
export function noteToFreq(noteIndex: number, octaveSelect: number): number {
  const actualOctave = OCTAVE_BASE + (octaveSelect - 1);
  const midiNote = 12 * (actualOctave + 1) + noteIndex;
  return A4_FREQ * 2 ** ((midiNote - 69) / 12);
}
