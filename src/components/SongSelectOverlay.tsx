import { useEffect, useRef } from 'react';
import { FRAME_H, FRAME_W } from '../core/constants';
import { drawSongSelect } from '../render/songSelectRenderer';
import type { SongSelectNavState } from '../hooks/useSongSelectNavigation';

interface Props {
  navStateRef: React.MutableRefObject<SongSelectNavState>;
  active: boolean;
  previewingId?: string | null;
  previewPaused?: boolean;
}

/**
 * Transparent canvas layered on top of CameraCanvas — same shape and role
 * as MenuOverlay, just drawing the song list/stat boxes/Start button
 * instead of the main menu. Same FRAME_W x FRAME_H coordinate space as the
 * skeleton beneath it so the fingertip cursor lines up with the actual
 * hand landmarks pixel-for-pixel. Redrawn on its own rAF loop reading
 * useSongSelectNavigation's ref — no React re-renders on the hot path.
 */
export function SongSelectOverlay({ navStateRef, active, previewingId, previewPaused }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let raf: number;
    const loop = () => {
      drawSongSelect(ctx, canvas.width, canvas.height, navStateRef.current, previewingId ?? null, !!previewPaused);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, [active, navStateRef, previewingId, previewPaused]);

  return <canvas ref={canvasRef} className="overlay-canvas" width={FRAME_W} height={FRAME_H} />;
}