import { useEffect, useRef, useState } from 'react';

/**
 * Copies `ref.current` into React state on a throttled interval instead of
 * every frame. The gesture state machine (useGestureSound) mutates its ref
 * at full camera frame rate; DOM-based UI (StatusBar) doesn't need to
 * re-render that often — ~12fps is plenty for text that changes a few
 * times a second, and keeps React out of the camera loop's hot path.
 */
export function useTickState<T>(ref: React.MutableRefObject<T>, everyMs = 80): T {
  const [snapshot, setSnapshot] = useState<T>(ref.current);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    const step = (t: number) => {
      if (t - lastRef.current >= everyMs) {
        lastRef.current = t;
        // shallow copy so React sees a new reference and re-renders
        setSnapshot({ ...ref.current });
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [everyMs]);

  return snapshot;
}
