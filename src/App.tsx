import { useCallback } from 'react';
import { CameraCanvas } from './components/CameraCanvas';
import { PianoOverlay } from './components/PianoOverlay';
import { StatusBar } from './components/StatusBar';
import { useHandTracking } from './hooks/useHandTracking';
import { useGestureSound } from './hooks/useGestureSound';

export default function App() {
  const { stateRef, processFrame, audioEngine } = useGestureSound();
  const { videoRef, canvasRef, start, status, error } = useHandTracking(processFrame);

  const handleStart = useCallback(async () => {
    // Both the camera and Tone.js's AudioContext need a user gesture to
    // unlock in the browser — this click is that gesture for both.
    await audioEngine.ensureStarted();
    await start();
  }, [audioEngine, start]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          TWO-HANDED VIRTUAL SYNTH <span className="app-title-cursor">_</span>
        </h1>
        <p className="app-subtitle">
          left hand → note &nbsp;·&nbsp; right hand → octave &nbsp;·&nbsp; no calibration, poses are fixed
        </p>
      </header>

      <main className="stage-wrap">
        <CameraCanvas
          videoRef={videoRef}
          canvasRef={canvasRef}
          status={status}
          error={error}
          onStart={handleStart}
        />
        {status === 'ready' && (
          <>
            <PianoOverlay stateRef={stateRef} active={status === 'ready'} />
            <StatusBar stateRef={stateRef} />
          </>
        )}
      </main>

      <footer className="app-footer">
        <span>camera frames never leave this browser tab</span>
      </footer>
    </div>
  );
}
