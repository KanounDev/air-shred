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
export function SongSelectOverlay({ navStateRef, active, previewingId, previewPaused }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        if (!active)
            return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx)
            return;
        let raf: number;
        const loop = () => {
            drawSongSelect(ctx, canvas.width, canvas.height, navStateRef.current, previewingId ?? null, !!previewPaused);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [active, navStateRef, previewingId, previewPaused]);
    return <canvas ref={canvasRef} className="overlay-canvas" width={FRAME_W} height={FRAME_H}/>;
}
