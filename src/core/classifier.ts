import { euclidean } from './geometry';
// The classifier only accepts a pose when it is clearly better than the runner-up, which avoids flapping between similar hand shapes.
export interface ClassifyResult {
    index: number | null;
    distance: number | null;
}
export class HandPoseClassifier {
    private readonly templates: number[][][];
    private readonly maxMatchDistance: number;
    private readonly marginRatio: number;
    constructor(templates: number[][][], maxMatchDistance: number, marginRatio: number) {
        this.templates = templates;
        this.maxMatchDistance = maxMatchDistance;
        this.marginRatio = marginRatio;
    }
    classify(featureVec: number[]): ClassifyResult {
        const bestPerClass: [
            number,
            number
        ][] = [];
        for (let i = 0; i < this.templates.length; i++) {
            const samples = this.templates[i];
            if (!samples || samples.length === 0)
                continue;
            let best = Infinity;
            for (const sample of samples) {
                const d = euclidean(featureVec, sample);
                if (d < best)
                    best = d;
            }
            bestPerClass.push([best, i]);
        }
        if (bestPerClass.length === 0)
            return { index: null, distance: null };
        bestPerClass.sort((a, b) => a[0] - b[0]);
        const [bestDist, bestIdx] = bestPerClass[0];
        if (bestDist > this.maxMatchDistance) {
            return { index: null, distance: bestDist };
        }
        if (bestPerClass.length > 1) {
            const secondDist = bestPerClass[1][0];
            if (bestDist > secondDist * this.marginRatio) {
                return { index: null, distance: bestDist };
            }
        }
        return { index: bestIdx, distance: bestDist };
    }
    isReady(): boolean {
        return this.templates.some((samples) => samples.length > 0);
    }
}
