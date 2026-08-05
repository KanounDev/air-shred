import { useEffect, useRef } from 'react';
import { drawPiano } from '../render/pianoRenderer';
import type { GestureState } from '../hooks/useGestureSound';
import type { MutableRefObject } from 'react';
import type { GameState } from '../hooks/useSongGame';

interface Props {
  stateRef: React.MutableRefObject<GestureState>;
  active: boolean;
  gameStateRef?: MutableRefObject<GameState> | null;
}

/**
 * The piano reference strip, rendered BELOW the camera canvas rather than
 * layered on top of it (see the note in core/constants.ts). On a wide
 * screen it shows the full OCTAVE_COUNT range at once; on a narrow one,
 * render/pianoRenderer.ts shrinks the visible octave window (never the
 * key size) and centers it on whichever octave is currently latched —
 * this component doesn't know or care which mode is active, it just
 * hands drawPiano its actual pixel width every frame.
 *
 * It needs its own responsive sizing instead of sharing the fixed
 * FRAME_W x FRAME_H pixel space the camera canvases use — a
 * ResizeObserver keeps the canvas's internal pixel buffer matched to its
 * on-screen size (accounting for devicePixelRatio) so key edges/text
 * stay crisp at any width. Drawing itself is driven by its own rAF loop
 * reading gesture state straight from the ref useGestureSound mutates —
 * no React re-renders on the hot path.
 */
export function PianoStrip({ stateRef, active, gameStateRef }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!container || !canvas || !ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let raf: number;
    const loop = () => {
      const target = gameStateRef ? gameStateRef.current.currentTarget : null;
      drawPiano(ctx, canvas.width, canvas.height, stateRef.current, target, performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [active, stateRef, gameStateRef]);

  return (
    <div ref={containerRef} className="piano-strip">
      <canvas ref={canvasRef} className="piano-strip-canvas" />
    </div>
  );
}
