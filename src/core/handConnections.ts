/**
 * The 21-landmark hand skeleton topology, equivalent to
 * mp.solutions.hands.HAND_CONNECTIONS used by main.py's drawing_utils call.
 * Kept as plain data here so the skeleton renderer doesn't need to pull in
 * any extra MediaPipe drawing-utils package just for this list.
 */
export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // middle
  [9, 10], [10, 11], [11, 12],
  // ring
  [13, 14], [14, 15], [15, 16],
  // pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // palm
  [5, 9], [9, 13], [13, 17],
];
