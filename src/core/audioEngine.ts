import * as Tone from 'tone';
import { noteToFreq } from './noteMath';

// main.py's "ToneEngine" pre-rendered 48 sine+harmonics PCM buffers
// (fundamental + 0.35x 2nd harmonic + 0.15x 3rd harmonic, 5ms attack,
// 250ms release) and just called .play() on the right one at trigger
// time — the point being zero synthesis cost on the audio-critical path.
//
// Per product direction, this port keeps that "trigger a pre-built voice,
// no per-note synthesis cost at trigger time" architecture, but *voices*
// it with Tone.PluckSynth (a Karplus-Strong plucked-string model) instead
// of literally replaying the same additive sine formula — it's built for
// exactly the "guitar tone" the brief describes, and Tone.js instantiates/
// warms it up once at startup, same as the Python version's prerender step.
const VOICE_POOL_SIZE = 6; // simple round-robin polyphony, playing the role of pygame's 32-channel mixer

export class AudioEngine {
  private readonly voices: Tone.PluckSynth[] = [];
  private nextVoice = 0;
  private started = false;

  constructor() {
    // Small distortion + reverb + limiter bus: gives the plucked-string
    // voice some "gig" body/grit without smearing note attacks. The
    // limiter plays the same headroom-for-polyphony role as main.py's
    // TONE_AMPLITUDE=0.5 (leaving room so overlapping notes don't clip).
    const distortion = new Tone.Distortion(0.1);
    const reverb = new Tone.Reverb({ decay: 1.1, wet: 0.16, preDelay: 0.01 });
    const limiter = new Tone.Limiter(-1);
    distortion.chain(reverb, limiter, Tone.getDestination());

    for (let i = 0; i < VOICE_POOL_SIZE; i++) {
      const voice = new Tone.PluckSynth({
        attackNoise: 1, // pick-noise burst on attack, standard Karplus-Strong "pluck"
        dampening: 3200, // lowpass cutoff on the feedback loop — lower = darker/warmer string
        resonance: 0.9, // how long the string rings out
      });
      voice.connect(distortion);
      this.voices.push(voice);
    }
  }

  /**
   * Browsers block audio until a user gesture unlocks the AudioContext.
   * Call this from the same click handler that starts the camera.
   */
  async ensureStarted(): Promise<void> {
    if (this.started) return;
    await Tone.start();
    this.started = true;
  }

  /**
   * Direct analog of main.py's ToneEngine.play_note(): compute the
   * frequency for (note, octave) and fire the next voice in the pool.
   * Round-robining voices (rather than always using voice 0) is what lets
   * a fast retrigger still have an audible attack instead of cutting the
   * previous note's tail off.
   */
  playNote(noteIndex: number, octaveSelect: number): void {
    if (!this.started) return; // silently no-op before the user gesture unlock
    const freq = noteToFreq(noteIndex, octaveSelect);
    const voice = this.voices[this.nextVoice];
    this.nextVoice = (this.nextVoice + 1) % this.voices.length;
    voice.triggerAttack(freq, Tone.now());
  }

  dispose(): void {
    this.voices.forEach((v) => v.dispose());
  }
}
