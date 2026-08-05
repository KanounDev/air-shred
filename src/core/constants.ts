export const FRAME_W = 960;
export const FRAME_H = 540;
export const REQUEST_FPS = 60;
export const MP_MIN_HAND_DETECTION_CONFIDENCE = 0.6;
export const MP_MIN_HAND_PRESENCE_CONFIDENCE = 0.5;
export const MP_MIN_TRACKING_CONFIDENCE = 0.5;
export const MP_MAX_HANDS = 2;
export const POSE_MAX_MATCH_DISTANCE = 0.9;
export const POSE_MARGIN_RATIO = 0.97;
export const POSE_CONFIRM_FRAMES = 4;
export const POSE_SMOOTHING_ALPHA = 0.4;
export const POSE_CAPTURE_FRAMES = 20;
export const BUFFER_POSE_COUNT = 1;
export const BUFFER_LABELS = ['Neutral / open hand'];
export const BUFFER_MAX_MATCH_DISTANCE = 0.9;
export const BUFFER_MARGIN_RATIO = 0.97;
export const BUFFER_CONFIRM_FRAMES = 3;
export const NOTE_NAMES = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;
export const OCTAVE_BASE = 3;
export const A4_FREQ = 440.0;
export const OCTAVE_COUNT = 4;
export const OCTAVE_LABELS = ['Octave 1', 'Octave 2', 'Octave 3', 'Octave 4'];
export const WRIST = 0;
export const MIDDLE_MCP = 9;
export const INDEX_FINGER_TIP = 8;
export const MENU_DWELL_MS = 650;
export const MENU_LOCKED_FLASH_MS = 350;
export const PIANO_WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
export const PIANO_BLACK_SEMITONES = [1, 3, 6, 8, 10];
export const PIANO_BLACK_AFTER_WHITE_IDX: Record<number, number> = {
    1: 0,
    3: 1,
    6: 3,
    8: 4,
    10: 5,
};
export const PIANO_BLACK_KEY_WIDTH_RATIO = 0.6;
export const PIANO_BLACK_KEY_HEIGHT_RATIO = 0.62;
export const PIANO_MIN_WHITE_KEY_PX = 30;
