import { NOTE_NAMES, OCTAVE_COUNT, BUFFER_POSE_COUNT } from './constants';
import { LEFT_HAND_POSE_TEMPLATES } from '../data/leftHandPoses';
// Local overrides are accepted only when they match the expected feature shape, so bad persisted data cannot silently break the classifier.
import { RIGHT_HAND_OCTAVE_TEMPLATES } from '../data/rightHandOctaves';
import { LEFT_HAND_BUFFER_TEMPLATES } from '../data/leftHandBuffer';
export type PoseTemplates = number[][][];
const LEFT_KEY = 'pose-synth:left-hand-poses:v1';
const RIGHT_KEY = 'pose-synth:right-hand-octaves:v1';
const BUFFER_KEY = 'pose-synth:left-hand-buffer:v1';
function isValidTemplates(data: unknown, expectedClasses: number): data is PoseTemplates {
    if (!Array.isArray(data) || data.length !== expectedClasses)
        return false;
    return data.every((cls) => Array.isArray(cls) &&
        cls.every((sample) => Array.isArray(sample) && sample.length === 40 && sample.every((v) => typeof v === 'number')));
}
function readOverride(key: string, expectedClasses: number): PoseTemplates | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw)
            return null;
        const parsed: unknown = JSON.parse(raw);
        return isValidTemplates(parsed, expectedClasses) ? parsed : null;
    }
    catch {
        return null;
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
export function recordedCount(templates: PoseTemplates): number {
    return templates.filter((samples) => samples.length > 0).length;
}
