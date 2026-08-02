import { WRIST, MIDDLE_MCP } from './constants';
import type { Vec2 } from './geometry';

/**
 * The minimum shape we need from a MediaPipe landmark — kept local (instead
 * of importing @mediapipe/tasks-vision's NormalizedLandmark type) so this
 * module stays a dependency-free, independently-testable pure function,
 * per the "modular, debuggable in isolation" requirement.
 */
export interface LandmarkLike {
  x: number;
  y: number;
}

/**
 * Converts 21 hand landmarks into a shape signature that is invariant to
 * where the hand is on screen (translation), how tilted it is (rotation),
 * and how close it is to the camera (scale) — so the SAME hand shape
 * produces roughly the SAME feature vector no matter how you happen to be
 * holding it up. Direct port of main.py's extract_pose_features().
 *
 * Steps:
 *   1. Translate — subtract the wrist position from every landmark, so the
 *      wrist becomes the origin (0, 0).
 *   2. Rotate — rotate every point so the wrist->middle_MCP vector always
 *      points along a fixed reference direction. This cancels out hand
 *      tilt/rotation.
 *   3. Scale — divide every point by the wrist->middle_MCP length, so hand
 *      size / camera distance cancels out.
 *
 * Returns a flat 40-value array (20 landmarks x (x, y); the wrist itself
 * is dropped since it's always (0, 0) after step 1) — matches the layout
 * baked into data/leftHandPoses.ts and data/rightHandOctaves.ts.
 *
 * `w`/`h` must be the same pixel dimensions the landmarks' normalized (0..1)
 * coordinates are relative to — i.e. FRAME_W/FRAME_H, the shared canvas
 * resolution — so this lines up with how the baked templates were recorded.
 */
export function extractPoseFeatures(
  landmarks: LandmarkLike[],
  w: number,
  h: number,
): number[] {
  const pts: Vec2[] = landmarks.map((lm) => [lm.x * w, lm.y * h]);

  const wrist = pts[WRIST];
  const translated: Vec2[] = pts.map(([x, y]) => [x - wrist[0], y - wrist[1]]);

  const refVec = translated[MIDDLE_MCP];
  const angle = Math.atan2(refVec[1], refVec[0]);
  const cosA = Math.cos(-angle);
  const sinA = Math.sin(-angle);
  // Row-vector * rot.T, expanded — see README for the derivation if this
  // ever needs re-deriving; it must match main.py's `translated @ rot.T`.
  const rotated: Vec2[] = translated.map(([x, y]) => [
    x * cosA - y * sinA,
    x * sinA + y * cosA,
  ]);

  const scale = Math.max(Math.hypot(rotated[MIDDLE_MCP][0], rotated[MIDDLE_MCP][1]), 1e-6);
  const normalized: Vec2[] = rotated.map(([x, y]) => [x / scale, y / scale]);

  const flat: number[] = [];
  for (let i = 1; i < normalized.length; i++) {
    // drop index 0 (wrist, always [0, 0] post-translation)
    flat.push(normalized[i][0], normalized[i][1]);
  }
  return flat;
}
