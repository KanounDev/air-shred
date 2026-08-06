export interface SongDef {
    id: string;
    title: string;
    artist: string;
    chartUrl: string;
    highestScore: number;
    timeSpentSec: number;
}
interface PersistentSongStats {
    highestScore: number;
    timeSpentSec: number;
}
const SONG_STATS_KEY = 'airshred_song_stats';
const BASE_SONGS: SongDef[] = [
    {
        id: 'ode-to-joy',
        title: 'Ode to Joy',
        artist: 'Ludwig van Beethoven',
        chartUrl: '/songs/ode-to-joy/ode-to-joy.mid',
        highestScore: 0,
        timeSpentSec: 0,
    },
    {
        id: 'fur-elise',
        title: 'Fur Elise',
        artist: 'Ludwig van Beethoven',
        chartUrl: '/songs/fur-elise/Fur Elise.mid',
        highestScore: 0,
        timeSpentSec: 0,
    },
];
function loadPersistentStats(): Record<string, PersistentSongStats> {
    try {
        const raw = localStorage.getItem(SONG_STATS_KEY);
        return raw ? (JSON.parse(raw) as Record<string, PersistentSongStats>) : {};
    }
    catch {
        return {};
    }
}
function savePersistentStats(stats: Record<string, PersistentSongStats>): void {
    localStorage.setItem(SONG_STATS_KEY, JSON.stringify(stats));
}
export function getSongStats(songId: string): PersistentSongStats {
    const stats = loadPersistentStats();
    return stats[songId] ?? { highestScore: 0, timeSpentSec: 0 };
}
export function saveSongStats(songId: string, newStats: PersistentSongStats): void {
    const stats = loadPersistentStats();
    stats[songId] = newStats;
    savePersistentStats(stats);
}
export function getSongs(): SongDef[] {
    const stats = loadPersistentStats();
    return BASE_SONGS.map((song) => ({
        ...song,
        ...stats[song.id],
    }));
}
export function findSong(id: string | null): SongDef | null {
    if (id === null)
        return null;
    return getSongs().find((s) => s.id === id) ?? null;
}
export function formatDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function formatTimeSpent(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
