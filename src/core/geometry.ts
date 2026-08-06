// Euclidean distance is used as a simple pose similarity metric because these vectors are already normalized and centered.
export type Vec2 = [
    number,
    number
];
export function euclidean(a: ArrayLike<number>, b: ArrayLike<number>): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        sum += d * d;
    }
    return Math.sqrt(sum);
}
