import { useCallback, useRef } from 'react';
import { formatDuration, getSongStats, saveSongStats } from '../core/songLibrary';
import type { SongDef } from '../core/songLibrary';
import type { ChartNote } from '../core/midiChart';
export interface GameState {
    activeSong: SongDef | null;
    chart: ChartNote[];
    activeNoteIndex: number;
    currentTarget: ChartNote | null;
    currentTargetMatched: boolean;
    currentTargetFailed: boolean;
    score: number;
    elapsedMs: number;
    running: boolean;
    finished: boolean;
    timeLabel: string;
}
function initialGameState(): GameState {
    return {
        activeSong: null,
        chart: [],
        activeNoteIndex: 0,
        currentTarget: null,
        currentTargetMatched: false,
        currentTargetFailed: false,
        score: 0,
        elapsedMs: 0,
        running: false,
        finished: false,
        timeLabel: '00:00:00',
    };
}
export function useSongGame() {
    const stateRef = useRef<GameState>(initialGameState());
    const lastFrameRef = useRef<number | null>(null);
    const loadSong = useCallback((song: SongDef, chart: ChartNote[]) => {
        const now = performance.now();
        stateRef.current = {
            activeSong: song,
            chart,
            activeNoteIndex: 0,
            currentTarget: chart.length > 0 ? chart[0] : null,
            currentTargetMatched: false,
            currentTargetFailed: false,
            score: 0,
            elapsedMs: 0,
            running: true,
            finished: false,
            timeLabel: '00:00:00',
        };
        lastFrameRef.current = now;
    }, []);
    const endGame = useCallback(() => {
        const state = stateRef.current;
        if (!state.activeSong) {
            stateRef.current = initialGameState();
            return;
        }
        const stats = getSongStats(state.activeSong.id);
        const updated = {
            highestScore: Math.max(stats.highestScore, state.score),
            timeSpentSec: stats.timeSpentSec + Math.floor(state.elapsedMs / 1000),
        };
        saveSongStats(state.activeSong.id, updated);
        stateRef.current = initialGameState();
    }, []);
    const registerPlayedNote = useCallback((noteIndex: number, octave: number) => {
        const state = stateRef.current;
        if (!state.running || !state.currentTarget || state.finished)
            return;
        const expected = state.currentTarget;
        const matches = noteIndex === expected.noteIndex && octave === expected.octave;
        if (matches && !state.currentTargetMatched) {
            state.score += 1;
            state.currentTargetMatched = true;
            state.currentTargetFailed = false;
        }
        else if (!matches && !state.currentTargetMatched && !state.currentTargetFailed) {
            state.score = Math.max(0, state.score - 1);
            state.currentTargetFailed = true;
        }
    }, []);
    const tick = useCallback(() => {
        const state = stateRef.current;
        if (!state.running || !state.activeSong)
            return;
        const now = performance.now();
        const last = lastFrameRef.current ?? now;
        const delta = now - last;
        lastFrameRef.current = now;
        state.elapsedMs += delta;
        state.timeLabel = formatDuration(Math.floor(state.elapsedMs / 1000));
        if (state.currentTarget === null) {
            if (state.activeNoteIndex >= state.chart.length) {
                state.running = false;
                state.finished = true;
            }
            return;
        }
        const targetEnd = state.currentTarget.time + state.currentTarget.duration + 200;
        if (state.elapsedMs >= targetEnd) {
            if (state.currentTargetMatched) {
                state.activeNoteIndex += 1;
                if (state.activeNoteIndex >= state.chart.length) {
                    state.currentTarget = null;
                    state.running = false;
                    state.finished = true;
                }
                else {
                    state.currentTarget = state.chart[state.activeNoteIndex];
                    state.currentTargetMatched = false;
                    state.currentTargetFailed = false;
                }
            }
        }
    }, []);
    const resetGame = useCallback(() => {
        stateRef.current = initialGameState();
        lastFrameRef.current = null;
    }, []);
    const getState = useCallback(() => stateRef.current, []);
    return { stateRef, loadSong, endGame, registerPlayedNote, tick, resetGame, getState };
}
