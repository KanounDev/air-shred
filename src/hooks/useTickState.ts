import { useEffect, useRef, useState } from 'react';
export function useTickState<T>(ref: React.MutableRefObject<T>, everyMs = 80): T {
    const [snapshot, setSnapshot] = useState<T>(ref.current);
    const rafRef = useRef<number | null>(null);
    const lastRef = useRef(0);
    useEffect(() => {
        const step = (t: number) => {
            // This throttles UI snapshots so the overlay does not re-render on every animation frame.
            if (t - lastRef.current >= everyMs) {
                lastRef.current = t;
                setSnapshot({ ...ref.current });
            }
            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current !== null)
                cancelAnimationFrame(rafRef.current);
        };
    }, [everyMs]);
    return snapshot;
}
