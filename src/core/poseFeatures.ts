import { WRIST, MIDDLE_MCP } from './constants';
import type { Vec2 } from './geometry';
export interface LandmarkLike {
    x: number;
    y: number;
}
export function extractPoseFeatures(landmarks: LandmarkLike[], w: number, h: number): number[] {
    const pts: Vec2[] = landmarks.map((lm) => [lm.x * w, lm.y * h]);
    const wrist = pts[WRIST];
    const translated: Vec2[] = pts.map(([x, y]) => [x - wrist[0], y - wrist[1]]);
    const refVec = translated[MIDDLE_MCP];
    const angle = Math.atan2(refVec[1], refVec[0]);
    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);
    const rotated: Vec2[] = translated.map(([x, y]) => [
        x * cosA - y * sinA,
        x * sinA + y * cosA,
    ]);
    const scale = Math.max(Math.hypot(rotated[MIDDLE_MCP][0], rotated[MIDDLE_MCP][1]), 1e-6);
    const normalized: Vec2[] = rotated.map(([x, y]) => [x / scale, y / scale]);
    const flat: number[] = [];
    for (let i = 1; i < normalized.length; i++) {
        flat.push(normalized[i][0], normalized[i][1]);
    }
    return flat;
}
