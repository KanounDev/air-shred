import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraCanvas } from './components/CameraCanvas';
import { MenuOverlay } from './components/MenuOverlay';
import { PianoStrip } from './components/PianoStrip';
import { StatusBar } from './components/StatusBar';
import { TutorialPage } from './components/TutorialPage';
import { useHandTracking, type HandFrameResult } from './hooks/useHandTracking';
import { useGestureSound } from './hooks/useGestureSound';
import { useMenuNavigation } from './hooks/useMenuNavigation';

type Screen = 'menu' | 'training' | 'tutorial';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  // Mirrors `screen` for the per-frame dispatcher below, which runs inside
  // useHandTracking's rAF loop and can't rely on the `screen` closure
  // staying fresh without re-subscribing the whole tracking loop.
  const screenRef = useRef<Screen>('menu');

  const { stateRef: gestureStateRef, processFrame: processGestureFrame, audioEngine, reloadTemplates } =
    useGestureSound();

  const enterTraining = useCallback(() => {
    reloadTemplates();
    screenRef.current = 'training';
    setScreen('training');
  }, [reloadTemplates]);

  const enterTutorial = useCallback(() => {
    screenRef.current = 'tutorial';
    setScreen('tutorial');
  }, []);

  const { stateRef: menuNavStateRef, processFrame: processMenuFrame, reset: resetMenuNav } = useMenuNavigation(
    (id) => {
      if (id === 'training') enterTraining();
      else if (id === 'tutorial') enterTutorial();
      // 'play' is surfaced as a real, pointable button, but isn't wired to
      // anything yet; selecting it can't reach this branch since it's
      // flagged `enabled: false`.
    },
  );

  const backToMenu = useCallback(() => {
    resetMenuNav();
    screenRef.current = 'menu';
    setScreen('menu');
  }, [resetMenuNav]);

  const handleFrame = useCallback(
    (frame: HandFrameResult) => {
      const s = screenRef.current;
      if (s === 'menu') processMenuFrame(frame);
      else if (s === 'training') processGestureFrame(frame);
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

  // Esc returns to the menu from Training or Settings — a plain keyboard
  // fallback rather than another gesture, so it can't misfire mid-
  // performance and doesn't compete with anything the hands are doing.
  // Leaving Settings this way also discards any uncommitted recording
  // session, same as main.py's ESC-cancels-recording behavior.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (screenRef.current === 'training' || screenRef.current === 'tutorial') {
        backToMenu();
        resetMenuNav();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [backToMenu, resetMenuNav]);

  const trackingReady = status === 'ready';

  return (
    <div className="app">
      {screen !== 'tutorial' ? (
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
      ) : (
        <main className="tutorial-wrap">
          <TutorialPage />
        </main>
      )}

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