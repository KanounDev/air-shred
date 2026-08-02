import { euclidean } from './geometry';

export interface ClassifyResult {
  /** Winning class index (note 0..11, or octave 0..3), or null if unmatched. */
  index: number | null;
  /** Distance to the winning class's nearest sample (for on-screen "~C (d=0.31)" feedback). */
  distance: number | null;
}

/**
 * Direct port of main.py's HandPoseClassifier. No training, no deep
 * learning — just Euclidean nearest-neighbor in the normalized landmark
 * feature space, with:
 *   - a maximum-distance gate (too far from every recorded sample = no
 *     match, e.g. hand in a relaxed/transition position between poses)
 *   - a margin check (the best match must be clearly closer than the best
 *     match from any OTHER class; otherwise the shape is ambiguous between
 *     two poses and we report "no match" rather than guess wrong)
 *
 * Each class can hold MULTIPLE recorded samples (see the baked template
 * files) — that's what gives tolerance for natural variation: "close to
 * ANY of the recorded reps of this pose", not "must exactly reproduce one
 * single recording".
 *
 * Unlike main.py, this version is read-only: poses are baked in at build
 * time (data/leftHandPoses.ts, data/rightHandOctaves.ts) rather than
 * recorded/saved/loaded at runtime, so all the recording-wizard machinery
 * from the original class has been dropped — only classify() survives.
 */
export class HandPoseClassifier {
  /** [class][sample][40] — one entry per note/octave, each with 1+ recorded feature vectors. */
  private readonly templates: number[][][];
  private readonly maxMatchDistance: number;
  private readonly marginRatio: number;

  constructor(templates: number[][][], maxMatchDistance: number, marginRatio: number) {
    this.templates = templates;
    this.maxMatchDistance = maxMatchDistance;
    this.marginRatio = marginRatio;
  }

  classify(featureVec: number[]): ClassifyResult {
    // (min distance to this class, class index), one entry per class that
    // has at least one recorded sample.
    const bestPerClass: [number, number][] = [];
    for (let i = 0; i < this.templates.length; i++) {
      const samples = this.templates[i];
      if (!samples || samples.length === 0) continue;
      let best = Infinity;
      for (const sample of samples) {
        const d = euclidean(featureVec, sample);
        if (d < best) best = d;
      }
      bestPerClass.push([best, i]);
    }

    if (bestPerClass.length === 0) return { index: null, distance: null };

    bestPerClass.sort((a, b) => a[0] - b[0]);
    const [bestDist, bestIdx] = bestPerClass[0];

    if (bestDist > this.maxMatchDistance) {
      return { index: null, distance: bestDist }; // too far from anything recorded
    }

    if (bestPerClass.length > 1) {
      const secondDist = bestPerClass[1][0];
      if (bestDist > secondDist * this.marginRatio) {
        return { index: null, distance: bestDist }; // too ambiguous between two poses
      }
    }

    return { index: bestIdx, distance: bestDist };
  }
}
