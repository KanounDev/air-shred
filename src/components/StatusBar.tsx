import { NOTE_NAMES } from '../core/constants';
import { useTickState } from '../hooks/useTickState';
import type { GestureState } from '../hooks/useGestureSound';

interface Props {
  stateRef: React.MutableRefObject<GestureState>;
}

/**
 * The terminal/metal-skinned equivalent of main.py's _draw_overlay() status
 * panel: active octave, whichever note is live/just fired, and frame time.
 * Reads gesture state via useTickState (throttled snapshot) instead of on
 * every camera frame — status text doesn't need 60fps re-renders.
 */
export function StatusBar({ stateRef }: Props) {
  const s = useTickState(stateRef, 80);
  const showFired = s.lastNotePlayed !== null && performance.now() - s.lastNoteTime < 600;

  return (
    <div className="status-bar">
      <span className="status-item status-item--octave">
        OCTAVE <strong>{s.activeOctave}</strong>
      </span>

      {s.liveMatchOctave !== null && s.liveMatchOctaveDist !== null && (
        <span className="status-item status-item--dim">
          ~Oct{s.liveMatchOctave + 1} (d={s.liveMatchOctaveDist.toFixed(2)})
        </span>
      )}

      {showFired ? (
        <span className="status-item status-item--note-fired">NOTE {s.lastNotePlayed}</span>
      ) : (
        s.liveMatchNote !== null &&
        s.liveMatchDist !== null && (
          <span className="status-item status-item--dim">
            ~{NOTE_NAMES[s.liveMatchNote]} (d={s.liveMatchDist.toFixed(2)})
          </span>
        )
      )}

      <span className="status-item status-item--frametime">{s.frameMs.toFixed(1)} ms/frame</span>
    </div>
  );
}
