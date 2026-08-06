import type { RefObject } from 'react';
import type { TrackingStatus } from '../hooks/useHandTracking';
import { FRAME_H, FRAME_W } from '../core/constants';
interface Props {
    videoRef: RefObject<HTMLVideoElement | null>;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    status: TrackingStatus;
    error: string | null;
    onStart: () => void;
}
export function CameraCanvas({ videoRef, canvasRef, status, error, onStart }: Props) {
    // The overlay is intentionally split from the video element so the camera can stay hidden while the canvas draws the UI.
    return (<div className="stage" style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}>
      <video ref={videoRef} className="hidden-video" muted playsInline/>
      <canvas ref={canvasRef} className="camera-canvas" width={FRAME_W} height={FRAME_H}/>

      <div className="scanlines" aria-hidden="true"/>
      <span className="corner corner--tl" aria-hidden="true"/>
      <span className="corner corner--tr" aria-hidden="true"/>
      <span className="corner corner--bl" aria-hidden="true"/>
      <span className="corner corner--br" aria-hidden="true"/>

      {status !== 'ready' && (<div className="stage-gate">
          {status === 'idle' && (<button className="btn-start" onClick={onStart}>
              &gt; INITIALIZE_RIG
            </button>)}
          {status === 'loading' && <p className="gate-msg">loading model + camera&hellip;</p>}
          {status === 'error' && (<>
              <p className="gate-msg gate-msg--error">camera/model error: {error}</p>
              <button className="btn-start" onClick={onStart}>
                &gt; RETRY
              </button>
            </>)}
        </div>)}
    </div>);
}
