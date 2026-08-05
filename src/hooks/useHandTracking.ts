import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { FRAME_H, FRAME_W, MP_MAX_HANDS, MP_MIN_HAND_DETECTION_CONFIDENCE, MP_MIN_HAND_PRESENCE_CONFIDENCE, MP_MIN_TRACKING_CONFIDENCE, REQUEST_FPS, } from '../core/constants';
import { drawMirroredFrame, drawSkeletons } from '../render/skeletonRenderer';
import type { LandmarkLike } from '../core/poseFeatures';
export interface HandFrameResult {
    left: LandmarkLike[] | null;
    right: LandmarkLike[] | null;
    frameMs: number;
}
export type TrackingStatus = 'idle' | 'loading' | 'ready' | 'error';
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
function toFrameResult(result: HandLandmarkerResult, frameMs: number): HandFrameResult {
    let left: LandmarkLike[] | null = null;
    let right: LandmarkLike[] | null = null;
    result.landmarks?.forEach((landmarks, i) => {
        const modelLabel = result.handedness?.[i]?.[0]?.categoryName;
        const label = modelLabel === 'Left' ? 'Right' : modelLabel === 'Right' ? 'Left' : modelLabel;
        if (label === 'Left')
            left = landmarks;
        else if (label === 'Right')
            right = landmarks;
    });
    return { left, right, frameMs };
}
export function useHandTracking(onFrame: (result: HandFrameResult) => void, drawOverlay?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const landmarkerRef = useRef<HandLandmarker | null>(null);
    const rafRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const onFrameRef = useRef(onFrame);
    onFrameRef.current = onFrame;
    const [status, setStatus] = useState<TrackingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const tick = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        const landmarker = landmarkerRef.current;
        if (!ctx || !landmarker)
            return;
        const step = () => {
            const t0 = performance.now();
            const offscreen = offscreenRef.current;
            const offCtx = offscreen?.getContext('2d');
            if (video.readyState >= 2 && offscreen && offCtx) {
                drawMirroredFrame(offCtx, video, offscreen.width, offscreen.height);
                const result = landmarker.detectForVideo(offscreen, t0);
                const frame = toFrameResult(result, performance.now() - t0);
                ctx.fillStyle = '#0b0a09';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawSkeletons(ctx, frame.left, frame.right, canvas.width, canvas.height);
                if (drawOverlay) {
                    try {
                        drawOverlay(ctx, canvas.width, canvas.height);
                    }
                    catch (e) {
                    }
                }
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
            if (!video || !canvas)
                throw new Error('Camera/canvas element not mounted');
            video.srcObject = stream;
            await video.play();
            canvas.width = FRAME_W;
            canvas.height = FRAME_H;
            if (!offscreenRef.current) {
                offscreenRef.current = document.createElement('canvas');
                offscreenRef.current.width = FRAME_W;
                offscreenRef.current.height = FRAME_H;
            }
            setStatus('ready');
            tick(video, canvas);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setStatus('error');
        }
    }, [tick]);
    useEffect(() => () => {
        if (rafRef.current !== null)
            cancelAnimationFrame(rafRef.current);
        landmarkerRef.current?.close();
        streamRef.current?.getTracks().forEach((t) => t.stop());
    }, []);
    return { videoRef, canvasRef, start, status, error };
}
