import { NOTE_NAMES, OCTAVE_COUNT, BUFFER_POSE_COUNT } from './constants';
import { LEFT_HAND_POSE_TEMPLATES } from '../data/leftHandPoses';
import { RIGHT_HAND_OCTAVE_TEMPLATES } from '../data/rightHandOctaves';
import { LEFT_HAND_BUFFER_TEMPLATES } from '../data/leftHandBuffer';

/** [class][sample][40] — same shape as the baked data/*.ts templates. */
export type PoseTemplates = number[][][];

// main.py's HandPoseClassifier.save()/load() write/read a JSON file on
// disk — there's no filesystem to write to from a static, backend-less
// web app. localStorage is the direct browser equivalent: it's the
// per-origin, persists-across-sessions store the app CAN write to. An
// override here takes priority over the baked-in data/*.ts templates;
// clearing it (see clear*Override below) reverts to those defaults.
const LEFT_KEY = 'pose-synth:left-hand-poses:v1';
const RIGHT_KEY = 'pose-synth:right-hand-octaves:v1';
const BUFFER_KEY = 'pose-synth:left-hand-buffer:v1';

function isValidTemplates(data: unknown, expectedClasses: number): data is PoseTemplates {
  if (!Array.isArray(data) || data.length !== expectedClasses) return false;
  return data.every(
    (cls) =>
      Array.isArray(cls) &&
      cls.every(
        (sample) => Array.isArray(sample) && sample.length === 40 && sample.every((v) => typeof v === 'number'),
      ),
  );
}

function readOverride(key: string, expectedClasses: number): PoseTemplates | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidTemplates(parsed, expectedClasses) ? parsed : null;
  } catch {
    return null; // corrupt/inaccessible storage -> fall back to defaults, same spirit as main.py's load()
  }
}

export function loadLeftHandTemplates(): PoseTemplates {
  return readOverride(LEFT_KEY, NOTE_NAMES.length) ?? LEFT_HAND_POSE_TEMPLATES;
}

export function loadRightHandTemplates(): PoseTemplates {
  return readOverride(RIGHT_KEY, OCTAVE_COUNT) ?? RIGHT_HAND_OCTAVE_TEMPLATES;
}

export function loadLeftHandBufferTemplates(): PoseTemplates {
  return readOverride(BUFFER_KEY, BUFFER_POSE_COUNT) ?? LEFT_HAND_BUFFER_TEMPLATES;
}

export function saveLeftHandTemplates(data: PoseTemplates): void {
  localStorage.setItem(LEFT_KEY, JSON.stringify(data));
}

export function saveRightHandTemplates(data: PoseTemplates): void {
  localStorage.setItem(RIGHT_KEY, JSON.stringify(data));
}

export function saveLeftHandBufferTemplates(data: PoseTemplates): void {
  localStorage.setItem(BUFFER_KEY, JSON.stringify(data));
}

export function hasLeftHandOverride(): boolean {
  return localStorage.getItem(LEFT_KEY) !== null;
}

export function hasRightHandOverride(): boolean {
  return localStorage.getItem(RIGHT_KEY) !== null;
}

export function hasLeftHandBufferOverride(): boolean {
  return localStorage.getItem(BUFFER_KEY) !== null;
}

export function clearLeftHandOverride(): void {
  localStorage.removeItem(LEFT_KEY);
}

export function clearRightHandOverride(): void {
  localStorage.removeItem(RIGHT_KEY);
}

export function clearLeftHandBufferOverride(): void {
  localStorage.removeItem(BUFFER_KEY);
}

/** How many classes (notes/octaves) have at least one recorded sample — mirrors main.py's recorded_count(). */
export function recordedCount(templates: PoseTemplates): number {
  return templates.filter((samples) => samples.length > 0).length;
}