import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import {
  FRAME_H,
  FRAME_W,
  MP_MAX_HANDS,
  MP_MIN_HAND_DETECTION_CONFIDENCE,
  MP_MIN_HAND_PRESENCE_CONFIDENCE,
  MP_MIN_TRACKING_CONFIDENCE,
  REQUEST_FPS,
} from '../core/constants';
import { drawMirroredFrame, drawSkeletons } from '../render/skeletonRenderer';
import type { LandmarkLike } from '../core/poseFeatures';

export interface HandFrameResult {
  left: LandmarkLike[] | null;
  right: LandmarkLike[] | null;
  frameMs: number;
}

export type TrackingStatus = 'idle' | 'loading' | 'ready' | 'error';

// Hosted on Google's CDN rather than bundled — this is the same lite/
// float16 model tier main.py picked via MP_MODEL_COMPLEXITY=0, and fetching
// it at runtime keeps a ~10MB model file out of the repo while still
// satisfying "fully client-side" (the browser caches it after first load;
// no frame or landmark data is ever sent anywhere).
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

function toFrameResult(result: HandLandmarkerResult, frameMs: number): HandFrameResult {
  let left: LandmarkLike[] | null = null;
  let right: LandmarkLike[] | null = null;

  result.landmarks?.forEach((landmarks, i) => {
    // "Left"/"Right" here already accounts for the mirrored (selfie-view)
    // input we feed it below — see drawMirroredFrame — so this label maps
    // directly onto the user's actual left/right hand, same as main.py's
    // `label = handedness.classification[0].label` after its own
    // cv2.flip(frame, 1).
    const label = result.handedness?.[i]?.[0]?.categoryName;
    if (label === 'Left') left = landmarks;
    else if (label === 'Right') right = landmarks;
  });

  return { left, right, frameMs };
}

/**
 * Owns the camera stream, the MediaPipe HandLandmarker instance, and the
 * per-frame detect+draw loop. Every frame it:
 *   1. draws the mirrored video frame onto `canvasRef` (matching main.py's
 *      cv2.flip(frame, 1) BEFORE processing, so handedness labels line up),
 *   2. runs hand detection on that same canvas,
 *   3. draws the glowing skeleton overlay on top,
 *   4. hands the raw per-hand landmarks to `onFrame` for the gesture/sound
 *      state machine to consume (see hooks/useGestureSound.ts).
 *
 * Deliberately does NOT hold gesture/note state itself — this hook's job
 * ends at "camera pixels in, landmarks + a drawn frame out".
 */
export function useHandTracking(onFrame: (result: HandFrameResult) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // onFrame is called every animation frame; keep the latest closure in a
  // ref instead of restarting the detect loop whenever the caller re-renders.
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const [status, setStatus] = useState<TrackingStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const tick = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    const landmarker = landmarkerRef.current;
    if (!ctx || !landmarker) return;

    const step = () => {
      const t0 = performance.now();

      if (video.readyState >= 2) {
        drawMirroredFrame(ctx, video, canvas.width, canvas.height);

        const result = landmarker.detectForVideo(canvas, t0);
        const frame = toFrameResult(result, performance.now() - t0);
        drawSkeletons(ctx, frame.left, frame.right, canvas.width, canvas.height);

        onFrameRef.current(frame);
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  const start = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);

      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: MP_MAX_HANDS,
        minHandDetectionConfidence: MP_MIN_HAND_DETECTION_CONFIDENCE,
        minHandPresenceConfidence: MP_MIN_HAND_PRESENCE_CONFIDENCE,
        minTrackingConfidence: MP_MIN_TRACKING_CONFIDENCE,
      });
      landmarkerRef.current = landmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: FRAME_W },
          height: { ideal: FRAME_H },
          frameRate: { ideal: REQUEST_FPS },
          facingMode: 'user',
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error('Camera/canvas element not mounted');

      video.srcObject = stream;
      await video.play();

      canvas.width = FRAME_W;
      canvas.height = FRAME_H;

      setStatus('ready');
      tick(video, canvas);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [tick]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { videoRef, canvasRef, start, status, error };
}
