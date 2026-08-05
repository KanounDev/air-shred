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
import { useSongGame } from './hooks/useSongGame';
import { useTickState } from './hooks/useTickState';
import { findSong } from './core/songLibrary';
import { loadSongChart } from './core/midiChart';
import { NOTE_NAMES, OCTAVE_BASE } from './core/constants';

// 'tutorial' is not a separate screen — it's a popup shown on top of the
// menu (see `tutorialOpen` below), not a route change. 'songSelect' is the
// screen PLAY leads to: pick a song from the list, see its stats, Start.
type Screen = 'menu' | 'training' | 'songSelect' | 'play';

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

  const {
    stateRef: gameStateRef,
    loadSong,
    endGame,
    registerPlayedNote,
    tick: tickGame,
    resetGame,
  } = useSongGame();
  const lastNoteTimeRef = useRef(0);

  const handleStartSong = useCallback(
    async (songId: string) => {
      const song = findSong(songId);
      if (!song) return;

      try {
        const chart = await loadSongChart(song.chartUrl);
        loadSong(song, chart);
        screenRef.current = 'play';
        setScreen('play');
      } catch (err) {
        console.error('Failed to load song chart:', err);
      }
    },
    [loadSong],
  );

  const previewStateRef = useRef<{
    songId: string | null;
    chart: any[] | null;
    startPerf: number;
    pausedElapsed: number;
    paused: boolean;
    scheduled: number[];
  }>({ songId: null, chart: null, startPerf: 0, pausedElapsed: 0, paused: false, scheduled: [] });

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewPaused, setPreviewPaused] = useState(false);

  const clearPreviewTimeouts = (ids: number[]) => ids.forEach((id) => clearTimeout(id));

  const stopPreview = useCallback(() => {
    const s = previewStateRef.current;
    if (s.scheduled.length) {
      clearPreviewTimeouts(s.scheduled);
      s.scheduled = [];
    }
    s.songId = null;
    s.chart = null;
    s.startPerf = 0;
    s.pausedElapsed = 0;
    s.paused = false;
    setPreviewingId(null);
    setPreviewPaused(false);
  }, []);

  const scheduleRemaining = useCallback((baseElapsed: number) => {
    const s = previewStateRef.current;
    if (!s.chart) return;
    const scheduled: number[] = [];
    for (let i = 0; i < s.chart.length; i++) {
      const note = s.chart[i];
      if (note.time <= baseElapsed) continue;
      const delay = Math.max(0, note.time - baseElapsed);
      const id = window.setTimeout(() => {
        audioEngine.playNote(note.noteIndex, note.octave);
      }, delay);
      scheduled.push(id as unknown as number);
    }
    // stop after last scheduled note
    const lastPlayable = s.chart[s.chart.length - 1];
    if (lastPlayable) {
      const stopId = window.setTimeout(() => {
        stopPreview();
      }, Math.max(0, lastPlayable.time - baseElapsed) + 500);
      scheduled.push(stopId as unknown as number);
    }
    s.scheduled = scheduled;
  }, [audioEngine, stopPreview]);

  const startPreview = useCallback(
    async (songId: string) => {
      if (!audioEngine) return;
      stopPreview();
      const song = findSong(songId);
      if (!song) return;
      try {
        const chart = await loadSongChart(song.chartUrl);
        previewStateRef.current = {
          songId,
          chart,
          startPerf: performance.now(),
          pausedElapsed: 0,
          paused: false,
          scheduled: [],
        };
        setPreviewingId(songId);
        setPreviewPaused(false);
        scheduleRemaining(0);
      } catch (err) {
        // ignore
      }
    },
    [audioEngine, scheduleRemaining, stopPreview],
  );

  const pausePreview = useCallback(() => {
    const s = previewStateRef.current;
    if (!s.songId || s.paused) return;
    // compute elapsed and cancel scheduled
    const elapsed = performance.now() - s.startPerf;
    if (s.scheduled.length) clearPreviewTimeouts(s.scheduled);
    s.scheduled = [];
    s.pausedElapsed = elapsed;
    s.paused = true;
    setPreviewPaused(true);
  }, []);

  const resumePreview = useCallback(() => {
    const s = previewStateRef.current;
    if (!s.songId || !s.paused || !s.chart) return;
    s.startPerf = performance.now() - s.pausedElapsed;
    s.paused = false;
    setPreviewPaused(false);
    scheduleRemaining(s.pausedElapsed);
  }, [scheduleRemaining]);

  const handlePreview = useCallback(
    (actionId: string) => {
      if (actionId === 'pause') {
        pausePreview();
        return;
      }
      if (actionId === 'resume') {
        resumePreview();
        return;
      }

      startPreview(actionId);
    },
    [pausePreview, resumePreview, startPreview],
  );

  const {
    stateRef: songSelectNavStateRef,
    processFrame: processSongSelectFrame,
    reset: resetSongSelectNav,
  } = useSongSelectNavigation(handleStartSong, handlePreview);

  const playedGesture = useTickState(gestureStateRef, 40);

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
    if (screenRef.current === 'play') {
      endGame();
      resetGame();
    }

    const blockedId =
      screenRef.current === 'training' ? 'training' : screenRef.current === 'songSelect' ? 'play' : null;
    if (screenRef.current === 'songSelect') resetSongSelectNav();
    resetMenuNav(blockedId);
    screenRef.current = 'menu';
    setScreen('menu');
  }, [endGame, resetGame, resetMenuNav, resetSongSelectNav]);

  useEffect(() => {
    const lastTime = lastNoteTimeRef.current;
    if (screenRef.current === 'play' && playedGesture.lastNotePlayed && playedGesture.lastNoteTime > lastTime) {
      const match = playedGesture.lastNotePlayed.match(/^([A-G]#?)(\d+)$/);
      if (match) {
        const [, noteName, octaveText] = match;
        const noteIndex = NOTE_NAMES.findIndex((n) => n === noteName);
        const octaveActual = Number(octaveText);
        if (noteIndex !== -1) {
          const octaveSelect = octaveActual - OCTAVE_BASE + 1;
          registerPlayedNote(noteIndex, octaveSelect);
        }
      }
      lastNoteTimeRef.current = playedGesture.lastNoteTime;
    }
  }, [playedGesture, registerPlayedNote]);

  useEffect(() => {
    if (screen !== 'play') return;
    let raf: number;
    const loop = () => {
      tickGame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, tickGame]);

  const handleFrame = useCallback(
    (frame: HandFrameResult) => {
      const s = screenRef.current;
      if (s === 'menu') {
        // Freeze menu hover/dwell while the tutorial popup covers the
        // buttons — otherwise a hand pointing "through" the popup at a
        // hidden button could still select it.
        if (!tutorialOpenRef.current) processMenuFrame(frame);
      } else if (s === 'training' || s === 'play') {
        processGestureFrame(frame);
      } else if (s === 'songSelect') {
        processSongSelectFrame(frame);
      }
    },
    [processMenuFrame, processGestureFrame, processSongSelectFrame],
  );

  const drawPlayOverlay = useCallback((ctx: CanvasRenderingContext2D, width: number, _height: number) => {
    if (screenRef.current !== 'play') return;
    const state = gameStateRef.current;
    if (!state.activeSong) return;

    ctx.save();
    const pad = 12;
    const boxW = Math.min(width * 0.6, 560);
    const boxH = 72;
    // background box
    ctx.fillStyle = 'rgba(4,4,3,0.6)';
    ctx.fillRect(pad, pad, boxW, boxH);

    ctx.fillStyle = '#ece8df';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(state.activeSong.title, pad + 12, pad + 8);

    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(236,232,223,0.9)';
    ctx.fillText(state.activeSong.artist, pad + 12, pad + 32);

    const metrics = `SCORE: ${state.score}  TIME: ${state.timeLabel}`;
    ctx.fillStyle = '#ffb020';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    const metricsW = ctx.measureText(metrics).width;
    ctx.fillText(metrics, pad + boxW - 14 - metricsW, pad + 16);

    if (state.finished) {
      ctx.fillStyle = 'rgba(57,255,143,0.95)';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      const done = 'SONG COMPLETE';
      const doneW = ctx.measureText(done).width;
      ctx.fillText(done, pad + boxW - 14 - doneW, pad + 36);
    }

    ctx.restore();
  }, []);

  const { videoRef, canvasRef, start, status, error } = useHandTracking(handleFrame, drawPlayOverlay);

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
      } else if (
        screenRef.current === 'training' ||
        screenRef.current === 'songSelect' ||
        screenRef.current === 'play'
      ) {
        backToMenu();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeTutorial, backToMenu]);

  const trackingReady = status === 'ready';

  useEffect(() => {
    if (screen !== 'songSelect') stopPreview();
    return () => {
      // cleanup on unmount
      stopPreview();
    };
  }, [screen, stopPreview]);

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
          <SongSelectOverlay navStateRef={songSelectNavStateRef} active previewingId={previewingId} previewPaused={previewPaused} />
        )}
        {tutorialOpen && <TutorialModal onClose={closeTutorial} />}
      </main>

      {trackingReady && (screen === 'training' || screen === 'play') && (
        <section className="piano-wrap">
          <PianoStrip stateRef={gestureStateRef} gameStateRef={screen === 'play' ? gameStateRef : undefined} active />
          <p className="training-hint">Esc to return to the menu</p>
        </section>
      )}

      <footer className="app-footer">
        <span>camera frames never leave this browser tab</span>
      </footer>
    </div>
  );
}