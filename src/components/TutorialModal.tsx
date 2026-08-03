import C from '../images/C.png';
import CSharp from '../images/CSharp.png';
import D from '../images/D.png';
import DSharp from '../images/DSharp.png';
import E from '../images/E.png';
import F from '../images/F.png';
import FSharp from '../images/FSharp.png';
import G from '../images/G.png';
import GSharp from '../images/GSharp.png';
import A from '../images/A.png';
import ASharp from '../images/ASharp.png';
import B from '../images/B.png';
import Octave1 from '../images/otcave1.png';
import Octave2 from '../images/octave2.png';
import Octave3 from '../images/octave3.png';
import Octave4 from '../images/octave4.png';

interface PoseTile {
  label: string;
  imageSrc?: string;
}

const LEFT_POSES: PoseTile[] = [
  { label: 'C', imageSrc: C },
  { label: 'C#', imageSrc: CSharp },
  { label: 'D', imageSrc: D },
  { label: 'D#', imageSrc: DSharp },
  { label: 'E', imageSrc: E },
  { label: 'F', imageSrc: F },
  { label: 'F#', imageSrc: FSharp },
  { label: 'G', imageSrc: G },
  { label: 'G#', imageSrc: GSharp },
  { label: 'A', imageSrc: A },
  { label: 'A#', imageSrc: ASharp },
  { label: 'B', imageSrc: B },
];

const RIGHT_POSES: PoseTile[] = [
  { label: 'octave 1', imageSrc: Octave1 },
  { label: 'octave 2', imageSrc: Octave2 },
  { label: 'octave 3', imageSrc: Octave3 },
  { label: 'octave 4', imageSrc: Octave4 },
];

interface Props {
  onClose: () => void;
}

/**
 * Popup shown on top of the camera stage instead of a separate route/screen.
 * Rendered as a sibling of CameraCanvas inside .stage-wrap (see App.tsx), so
 * the camera feed and its HUD keep running underneath it — only the menu
 * buttons are hidden while this is open (App.tsx skips rendering
 * MenuOverlay whenever this is open).
 *
 * Closing is keyboard-only (Esc, handled centrally in App.tsx) to match the
 * rest of the app's "hands drive the UI, keyboard is the escape hatch"
 * pattern — clicking the backdrop or the ✕ are just convenience extras for
 * anyone using a mouse.
 */
export function TutorialModal({ onClose }: Props) {
  return (
    <div
      className="tutorial-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="tutorial-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Hand pose tutorial"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tutorial-panels">
          <section className="tutorial-hand-panel">
            <div className="tutorial-panel-header">
              <h3>Left hand</h3>
              <span>12 notes</span>
            </div>
            <div className="tutorial-pose-grid left-hand">
              {LEFT_POSES.map((pose, i) => (
                <article key={`${pose.label}-${i}`} className="tutorial-pose-card">
                  <div className="tutorial-pose-frame">
                    {pose.imageSrc ? (
                      <img
                        className="tutorial-pose-image"
                        src={pose.imageSrc}
                        alt={`Left hand pose ${pose.label}`}
                      />
                    ) : (
                      <div className="tutorial-pose-placeholder" aria-hidden="true" />
                    )}
                  </div>
                  <p className="tutorial-pose-label">{pose.label}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="tutorial-hand-panel">
            <div className="tutorial-panel-header">
              <h3>Right hand</h3>
              <span>4 octaves</span>
            </div>
            <div className="tutorial-pose-grid right-hand">
              {RIGHT_POSES.map((pose, i) => (
                <article key={`${pose.label}-${i}`} className="tutorial-pose-card">
                  <div className="tutorial-pose-frame">
                    {pose.imageSrc ? (
                      <img
                        className="tutorial-pose-image"
                        src={pose.imageSrc}
                        alt={`Right hand pose ${pose.label}`}
                      />
                    ) : (
                      <div className="tutorial-pose-placeholder" aria-hidden="true" />
                    )}
                  </div>
                  <p className="tutorial-pose-label">{pose.label}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}