import * as Tone from 'tone';
import { noteToFreq } from './noteMath';
const VOICE_POOL_SIZE = 6;
export class AudioEngine {
    private readonly voices: Tone.PluckSynth[] = [];
    private nextVoice = 0;
    private started = false;
    constructor() {
        const distortion = new Tone.Distortion(0.1);
        const reverb = new Tone.Reverb({ decay: 1.1, wet: 0.16, preDelay: 0.01 });
        const limiter = new Tone.Limiter(-1);
        distortion.chain(reverb, limiter, Tone.getDestination());
        for (let i = 0; i < VOICE_POOL_SIZE; i++) {
            const voice = new Tone.PluckSynth({
                attackNoise: 1,
                dampening: 3200,
                resonance: 0.9,
            });
            voice.connect(distortion);
            this.voices.push(voice);
        }
    }
    async ensureStarted(): Promise<void> {
        if (this.started)
            return;
        await Tone.start();
        this.started = true;
    }
    playNote(noteIndex: number, octaveSelect: number): void {
        if (!this.started)
            return;
        const freq = noteToFreq(noteIndex, octaveSelect);
        const voice = this.voices[this.nextVoice];
        this.nextVoice = (this.nextVoice + 1) % this.voices.length;
        voice.triggerAttack(freq, Tone.now());
    }
    dispose(): void {
        this.voices.forEach((v) => v.dispose());
    }
}
