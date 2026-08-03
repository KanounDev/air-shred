import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraCanvas } from './components/CameraCanvas';
import { MenuOverlay } from './components/MenuOverlay';
import { PianoStrip } from './components/PianoStrip';
import { SongSelectOverlay } from './components/SongSelectOverlay';
import { StatusBar } from './components/StatusBar';
import { TutorialModal } from './components/TutorialModal';
import { useHandTracking, type HandFrameResult } from './hooks/useHandTracking';
import { useGestureSound } from './hooks/useGestureSound';
import { useMenuNavigation } from './hooks/useMenuNavigation';
import { useSongSelectNavigation } from './hooks/useSongSelectNavigation';

// 'tutorial' is not a separate screen — it's a popup shown on top of the
// menu (see `tutorialOpen` below), not a route change. 'songSelect' is the
// screen PLAY leads to: pick a song from the list, see its stats, Start.
type Screen = 'menu' | 'training' | 'songSelect';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  // Mirrors `screen` for the per-frame dispatcher below, which runs inside
  // useHandTracking's rAF loop and can't rely on the `screen` closure
  // staying fresh without re-subscribing the whole tracking loop.
  const screenRef = useRef<Screen>('menu');

  // Whether the tutorial popup is showing. Same "ref mirrors state for the
  // rAF closure" pattern as screenRef — handleFrame reads tutorialOpenRef so
  // it doesn't need to be recreated (and useHandTracking re-subscribed)
  // every time the popup opens/closes.
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const tutorialOpenRef = useRef(false);

  const { stateRef: gestureStateRef, processFrame: processGestureFrame, audioEngine, reloadTemplates } =
    useGestureSound();

  const enterTraining = useCallback(() => {
    reloadTemplates();
    screenRef.current = 'training';
    setScreen('training');
  }, [reloadTemplates]);

  const enterSongSelect = useCallback(() => {
    screenRef.current = 'songSelect';
    setScreen('songSelect');
  }, []);

  const openTutorial = useCallback(() => {
    tutorialOpenRef.current = true;
    setTutorialOpen(true);
  }, []);

  const { stateRef: menuNavStateRef, processFrame: processMenuFrame, reset: resetMenuNav } = useMenuNavigation(
    (id) => {
      if (id === 'training') enterTraining();
      else if (id === 'tutorial') openTutorial();
      else if (id === 'play') enterSongSelect();
    },
  );

  const handleStartSong = useCallback((songId: string) => {
    // TODO(song playback): no real songs exist yet (see core/songLibrary.ts)
    // — once they do, this should load/play `songId` and move into an
    // actual playing screen. Intentionally a no-op for now: per the current
    // frontend-only scope, Start is wired up and dwell-selectable but
    // doesn't do anything yet.
    void songId;
  }, []);

  const {
    stateRef: songSelectNavStateRef,
    processFrame: processSongSelectFrame,
    reset: resetSongSelectNav,
  } = useSongSelectNavigation(handleStartSong);

  const closeTutorial = useCallback(() => {
    tutorialOpenRef.current = false;
    setTutorialOpen(false);
    // The finger is very likely still resting on the TUTORIAL button right
    // after closing (that's what opened it). Block just that button's
    // hover/dwell until the hand actually moves off it, so the popup can't
    // instantly reopen — same fix as backToMenu below, reused here.
    resetMenuNav('tutorial');
  }, [resetMenuNav]);

  const backToMenu = useCallback(() => {
    // The hand may still be resting on the button that led here (TRAINING
    // or PLAY) right after Esc — block just that one until it moves off,
    // so it can't instantly re-fire.
    const blockedId =
      screenRef.current === 'training' ? 'training' : screenRef.current === 'songSelect' ? 'play' : null;
    if (screenRef.current === 'songSelect') resetSongSelectNav();
    resetMenuNav(blockedId);
    screenRef.current = 'menu';
    setScreen('menu');
  }, [resetMenuNav, resetSongSelectNav]);

  const handleFrame = useCallback(
    (frame: HandFrameResult) => {
      const s = screenRef.current;
      if (s === 'menu') {
        // Freeze menu hover/dwell while the tutorial popup covers the
        // buttons — otherwise a hand pointing "through" the popup at a
        // hidden button could still select it.
        if (!tutorialOpenRef.current) processMenuFrame(frame);
      } else if (s === 'training') {
        processGestureFrame(frame);
      } else if (s === 'songSelect') {
        processSongSelectFrame(frame);
      }
    },
    [processMenuFrame, processGestureFrame, processSongSelectFrame],
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

  // Esc closes the tutorial popup, or returns to the menu from Training/
  // song-select — a plain keyboard fallback rather than another gesture,
  // so it can't misfire mid-performance and doesn't compete with anything
  // the hands are doing. It's the only keyboard interaction anywhere in
  // the app; every other control is a hand gesture.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (tutorialOpenRef.current) {
        closeTutorial();
      } else if (screenRef.current === 'training' || screenRef.current === 'songSelect') {
        backToMenu();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeTutorial, backToMenu]);

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
        {trackingReady && screen === 'menu' && !tutorialOpen && (
          <MenuOverlay navStateRef={menuNavStateRef} trackingReady={trackingReady} active />
        )}
        {trackingReady && screen === 'training' && <StatusBar stateRef={gestureStateRef} />}
        {trackingReady && screen === 'songSelect' && (
          <SongSelectOverlay navStateRef={songSelectNavStateRef} active />
        )}
        {tutorialOpen && <TutorialModal onClose={closeTutorial} />}
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