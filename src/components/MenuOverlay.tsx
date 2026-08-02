import { useEffect, useRef } from 'react';
import { FRAME_H, FRAME_W } from '../core/constants';
import { drawMenu } from '../render/menuRenderer';
import type { MenuNavState } from '../hooks/useMenuNavigation';

interface Props {
  navStateRef: React.MutableRefObject<MenuNavState>;
  trackingReady: boolean;
  active: boolean;
}

/**
 * Transparent canvas layered on top of CameraCanvas, same FRAME_W x
 * FRAME_H coordinate space as the skeleton beneath it so the fingertip
 * cursor lines up with the actual hand landmarks pixel-for-pixel. Redrawn
 * on its own rAF loop reading useMenuNavigation's ref — no React
 * re-renders on the hot path, same pattern as PianoStrip.
 */
export function MenuOverlay({ navStateRef, trackingReady, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let raf: number;
    const loop = () => {
      drawMenu(ctx, canvas.width, canvas.height, navStateRef.current, trackingReady, performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, navStateRef, trackingReady]);

  return <canvas ref={canvasRef} className="overlay-canvas" width={FRAME_W} height={FRAME_H} />;
}
