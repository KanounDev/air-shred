export interface SongDef {
  id: string;
  title: string;
  /**
   * Placeholder stats. Real values will eventually come from tracked
   * gameplay:
   *   - highestScore = (notes played correctly) - (notes played wrong),
   *     clamped to 0 if that goes negative. Not computed yet — every song
   *     just shows 0 for now.
   *   - timeSpentSec = elapsed time from starting the song until either
   *     the final note is played or the user quits back to the menu
   *     (Esc). Not tracked yet — every song shows 0:00 for now.
   */
  highestScore: number;
  timeSpentSec: number;
}

// TODO(song playback): this is a static placeholder catalog so the
// song-select screen has something to list and interact with. Clicking a
// song only selects it right now — it doesn't load or play any audio.
// Once real songs exist, replace this list with the actual catalog (title,
// audio/note-chart source, etc.) and wire SongSelectOverlay's "Start" dwell
// to actually load and play the selected one instead of no-op'ing.
export const SONGS: SongDef[] = [
  { id: 'song-1', title: 'Song 1', highestScore: 0, timeSpentSec: 0 },
  { id: 'song-2', title: 'Song 2', highestScore: 0, timeSpentSec: 0 },
  { id: 'song-3', title: 'Song 3', highestScore: 0, timeSpentSec: 0 },
  { id: 'song-4', title: 'Song 4', highestScore: 0, timeSpentSec: 0 },
  { id: 'song-5', title: 'Song 5', highestScore: 0, timeSpentSec: 0 },
  { id: 'song-6', title: 'Song 6', highestScore: 0, timeSpentSec: 0 },
  { id: 'song-7', title: 'Song 7', highestScore: 0, timeSpentSec: 0 },
  { id: 'song-8', title: 'Song 8', highestScore: 0, timeSpentSec: 0 },
  { id: 'song-9', title: 'Song 9', highestScore: 0, timeSpentSec: 0 },
  { id: 'song-10', title: 'Song 10', highestScore: 0, timeSpentSec: 0 },
];

export function findSong(id: string | null): SongDef | null {
  if (id === null) return null;
  return SONGS.find((s) => s.id === id) ?? null;
}

export function getGlobalHighestScore(): number {
  if (SONGS.length === 0) return 0;
  return Math.max(...SONGS.map((s) => s.highestScore));
}

export function getGlobalLowestTimeSpent(): number {
  if (SONGS.length === 0) return 0;
  return Math.min(...SONGS.map((s) => s.timeSpentSec));
}

/** mm:ss, for the "Time Spent" stat box. */
export function formatTimeSpent(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}