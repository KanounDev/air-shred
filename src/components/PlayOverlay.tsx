import type { MutableRefObject } from 'react';
import type { GameState } from '../hooks/useSongGame';
interface Props {
    gameStateRef: MutableRefObject<GameState>;
    active: boolean;
}
export function PlayOverlay({ gameStateRef, active }: Props) {
    const state = gameStateRef.current;
    if (!active || !state.activeSong)
        return null;
    return (<div className="play-overlay">
      <div className="play-header">
        <div>
          <div className="play-title">{state.activeSong.title}</div>
          <div className="play-subtitle">{state.activeSong.artist}</div>
        </div>
        <div className="play-metrics">
          <span className="play-score">SCORE: {state.score}</span>
          <span className="play-time">TIME: {state.timeLabel}</span>
        </div>
      </div>
      <div className="play-target">
        {state.currentTarget ? (<>
            <span className="play-target-label">NEXT NOTE</span>
            <span className={`play-target-note ${state.currentTargetMatched ? 'matched' : ''}`}>
              {`${state.currentTarget ? `${state.currentTarget.noteIndex}` : ''}`}
            </span>
            <span className="play-target-hint">Match the highlighted key to score</span>
          </>) : state.finished ? (<span className="play-target-label">SONG COMPLETE</span>) : (<span className="play-target-label">LOADING SONG...</span>)}
      </div>
    </div>);
}
