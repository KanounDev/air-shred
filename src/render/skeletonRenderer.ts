import { HAND_CONNECTIONS } from '../core/handConnections';
import type { LandmarkLike } from '../core/poseFeatures';
const LEFT_COLOR = '#39ff8f';
const RIGHT_COLOR = '#ffb020';
export function drawMirroredFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number): void {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();
}
function drawHandSkeleton(ctx: CanvasRenderingContext2D, landmarks: LandmarkLike[], width: number, height: number, color: string): void {
    const pts = landmarks.map((lm) => [lm.x * width, lm.y * height] as const);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
        const [ax, ay] = pts[a];
        const [bx, by] = pts[b];
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
    }
    ctx.stroke();
    for (const [x, y] of pts) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
export function drawSkeletons(ctx: CanvasRenderingContext2D, left: LandmarkLike[] | null, right: LandmarkLike[] | null, width: number, height: number): void {
    if (left)
        drawHandSkeleton(ctx, left, width, height, LEFT_COLOR);
    if (right)
        drawHandSkeleton(ctx, right, width, height, RIGHT_COLOR);
}
