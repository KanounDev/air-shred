import { useEffect, useRef } from 'react';
import { FRAME_H, FRAME_W } from '../core/constants';
import { drawPiano } from '../render/pianoRenderer';
import type { ChartNote } from '../core/midiChart';
import type { GestureState } from '../hooks/useGestureSound';

interface Props {
  stateRef: React.MutableRefObject<GestureState>;
  gameStateRef: React.MutableRefObject<{ currentTarget: ChartNote | null }>;
  active: boolean;
}

/**
 * Transparent canvas layered on top of CameraCanvas, redrawn on its own
 * requestAnimationFrame loop. Reads gesture state straight from the ref
 * useGestureSound mutates every frame — no React re-renders involved, this
 * is pure "read a ref, draw a canvas" so the piano's flash-on-fire timing
 * stays as tight as possible.
 */
export function PianoOverlay({ stateRef, gameStateRef, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let raf: number;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPiano(ctx, canvas.width, canvas.height, stateRef.current, gameStateRef.current.currentTarget, performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, stateRef, gameStateRef]);

  return <canvas ref={canvasRef} className="piano-canvas" width={FRAME_W} height={FRAME_H} />;
}
