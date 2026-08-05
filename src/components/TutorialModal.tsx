import C_img from '../images/C.png';
import CSharp_img from '../images/CSharp.png';
import D_img from '../images/D.png';
import DSharp_img from '../images/DSharp.png';
import E_img from '../images/E.png';
import F_img from '../images/F.png';
import FSharp_img from '../images/FSharp.png';
import G_img from '../images/G.png';
import GSharp_img from '../images/GSharp.png';
import A_img from '../images/A.png';
import ASharp_img from '../images/ASharp.png';
import B_img from '../images/B.png';
import octave1_img from '../images/otcave1.png';
import octave2_img from '../images/octave2.png';
import octave3_img from '../images/octave3.png';
import octave4_img from '../images/octave4.png';
interface PoseTile {
    label: string;
    imageSrc?: string;
}
const LEFT_POSES: PoseTile[] = [
    { label: 'C', imageSrc: C_img },
    { label: 'C#', imageSrc: CSharp_img },
    { label: 'D', imageSrc: D_img },
    { label: 'D#', imageSrc: DSharp_img },
    { label: 'E', imageSrc: E_img },
    { label: 'F', imageSrc: F_img },
    { label: 'F#', imageSrc: FSharp_img },
    { label: 'G', imageSrc: G_img },
    { label: 'G#', imageSrc: GSharp_img },
    { label: 'A', imageSrc: A_img },
    { label: 'A#', imageSrc: ASharp_img },
    { label: 'B', imageSrc: B_img },
];
const RIGHT_POSES: PoseTile[] = [
    { label: 'octave 1', imageSrc: octave1_img },
    { label: 'octave 2', imageSrc: octave2_img },
    { label: 'octave 3', imageSrc: octave3_img },
    { label: 'octave 4', imageSrc: octave4_img },
];
interface Props {
    onClose: () => void;
}
export function TutorialModal({ onClose }: Props) {
    return (<div className="tutorial-modal-backdrop" onClick={onClose} role="presentation">
      <section className="tutorial-modal" role="dialog" aria-modal="true" aria-label="Hand pose tutorial" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-panels">
          <section className="tutorial-hand-panel">
            <div className="tutorial-panel-header">
              <h3>Left hand</h3>
              <span>12 notes</span>
            </div>
            <div className="tutorial-pose-grid left-hand">
              {LEFT_POSES.map((pose, i) => (<article key={`${pose.label}-${i}`} className="tutorial-pose-card">
                  <div className="tutorial-pose-frame">
                    {pose.imageSrc ? (<img className="tutorial-pose-image" src={pose.imageSrc} alt={`Left hand pose ${pose.label}`}/>) : (<div className="tutorial-pose-placeholder" aria-hidden="true"/>)}
                  </div>
                  <p className="tutorial-pose-label">{pose.label}</p>
                </article>))}
            </div>
          </section>

          <section className="tutorial-hand-panel">
            <div className="tutorial-panel-header">
              <h3>Right hand</h3>
              <span>4 octaves</span>
            </div>
            <div className="tutorial-pose-grid right-hand">
              {RIGHT_POSES.map((pose, i) => (<article key={`${pose.label}-${i}`} className="tutorial-pose-card">
                  <div className="tutorial-pose-frame">
                    {pose.imageSrc ? (<img className="tutorial-pose-image" src={pose.imageSrc} alt={`Right hand pose ${pose.label}`}/>) : (<div className="tutorial-pose-placeholder" aria-hidden="true"/>)}
                  </div>
                  <p className="tutorial-pose-label">{pose.label}</p>
                </article>))}
            </div>
          </section>
        </div>
      </section>
    </div>);
}
