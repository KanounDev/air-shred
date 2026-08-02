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

/**
 * Pure layout/markup — all the actual camera/detection logic lives in
 * useHandTracking. This component just renders the hidden <video> source,
 * the canvas the hook draws into, the CV-HUD corner brackets/scanline
 * decoration, and the idle "click to start" gate (camera + audio both
 * require a user gesture to unlock in the browser).
 */
export function CameraCanvas({ videoRef, canvasRef, status, error, onStart }: Props) {
  return (
    <div className="stage" style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} className="hidden-video" muted playsInline />
      <canvas ref={canvasRef} className="camera-canvas" width={FRAME_W} height={FRAME_H} />

      <div className="scanlines" aria-hidden="true" />
      <span className="corner corner--tl" aria-hidden="true" />
      <span className="corner corner--tr" aria-hidden="true" />
      <span className="corner corner--bl" aria-hidden="true" />
      <span className="corner corner--br" aria-hidden="true" />

      {status !== 'ready' && (
        <div className="stage-gate">
          {status === 'idle' && (
            <button className="btn-start" onClick={onStart}>
              &gt; INITIALIZE_RIG
            </button>
          )}
          {status === 'loading' && <p className="gate-msg">loading model + camera&hellip;</p>}
          {status === 'error' && (
            <>
              <p className="gate-msg gate-msg--error">camera/model error: {error}</p>
              <button className="btn-start" onClick={onStart}>
                &gt; RETRY
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
