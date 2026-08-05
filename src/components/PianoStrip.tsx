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
export function PianoStrip({ stateRef, active, gameStateRef }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        if (!active)
            return;
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!container || !canvas || !ctx)
            return;
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
    return (<div ref={containerRef} className="piano-strip">
      <canvas ref={canvasRef} className="piano-strip-canvas"/>
    </div>);
}
