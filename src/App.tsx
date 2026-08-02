import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraCanvas } from './components/CameraCanvas';
import { MenuOverlay } from './components/MenuOverlay';
import { PianoStrip } from './components/PianoStrip';
import { StatusBar } from './components/StatusBar';
import { useHandTracking, type HandFrameResult } from './hooks/useHandTracking';
import { useGestureSound } from './hooks/useGestureSound';
import { useMenuNavigation } from './hooks/useMenuNavigation';

type Screen = 'menu' | 'training';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  // Mirrors `screen` for the per-frame dispatcher below, which runs inside
  // useHandTracking's rAF loop and can't rely on the `screen` closure
  // staying fresh without re-subscribing the whole tracking loop.
  const screenRef = useRef<Screen>('menu');

  const { stateRef: gestureStateRef, processFrame: processGestureFrame, audioEngine } = useGestureSound();

  const enterTraining = useCallback(() => {
    screenRef.current = 'training';
    setScreen('training');
  }, []);

  const { stateRef: menuNavStateRef, processFrame: processMenuFrame, reset: resetMenuNav } = useMenuNavigation(
    (id) => {
      if (id === 'training') enterTraining();
      // 'play' / 'tutorial' are surfaced as real, pointable buttons (see
      // core/menuLayout.ts) but aren't wired to anything yet — selecting
      // them can't reach this branch since they're flagged `enabled: false`.
    },
  );

  const handleFrame = useCallback(
    (frame: HandFrameResult) => {
      if (screenRef.current === 'menu') processMenuFrame(frame);
      else processGestureFrame(frame);
    },
    [processMenuFrame, processGestureFrame],
  );

  const { videoRef, canvasRef, start, status, error } = useHandTracking(handleFrame);

  const handleStart = useCallback(async () => {
    // Both the camera and Tone.js's AudioContext need a user gesture to
    // unlock in the browser — this click is that gesture for both, and
    // it's the only click the app ever asks for. Everything after this
    // (including navigating the menu that appears next) is hand gestures.
    await audioEngine.ensureStarted();
    await start();
  }, [audioEngine, start]);

  // Esc returns to the menu from Training — a plain keyboard fallback
  // rather than another gesture, so it can't misfire mid-performance and
  // doesn't compete with anything the hands are doing.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && screenRef.current === 'training') {
        screenRef.current = 'menu';
        setScreen('menu');
        resetMenuNav();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetMenuNav]);

  const trackingReady = status === 'ready';

  return (
    <div className="app">
      <main className="stage-wrap">
        <CameraCanvas
          videoRef={videoRef}
          canvasRef={canvasRef}
          status={status}
          error={error}
          onStart={handleStart}
        />
        {trackingReady && screen === 'menu' && (
          <MenuOverlay navStateRef={menuNavStateRef} trackingReady={trackingReady} active />
        )}
        {trackingReady && screen === 'training' && <StatusBar stateRef={gestureStateRef} />}
      </main>

      {trackingReady && screen === 'training' && (
        <section className="piano-wrap">
          <PianoStrip stateRef={gestureStateRef} active />
          <p className="training-hint">Esc to return to the menu</p>
        </section>
      )}

      <footer className="app-footer">
        <span>camera frames never leave this browser tab</span>
      </footer>
    </div>
  );
}
