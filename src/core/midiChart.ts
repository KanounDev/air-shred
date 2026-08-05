export interface ChartNote {
  time: number; // milliseconds from song start
  duration: number; // milliseconds
  noteIndex: number; // 0..11
  octave: number; // 1..4, matches the app's octave-select system
}

function readUint32(data: DataView, offset: number): number {
  return (data.getUint8(offset) << 24) | (data.getUint8(offset + 1) << 16) | (data.getUint8(offset + 2) << 8) | data.getUint8(offset + 3);
}

function readUint16(data: DataView, offset: number): number {
  return (data.getUint8(offset) << 8) | data.getUint8(offset + 1);
}

function readVarInt(data: DataView, offset: number): { value: number; length: number } {
  let value = 0;
  let i = 0;
  while (true) {
    const byte = data.getUint8(offset + i);
    value = (value << 7) | (byte & 0x7f);
    i += 1;
    if ((byte & 0x80) === 0) break;
    if (i >= 4) break;
  }
  return { value, length: i };
}

function clampOctaveSelect(octave: number): number {
  if (octave <= 1) return 1;
  if (octave >= 4) return 4;
  return octave;
}

function midiNoteToChartNote(midiNote: number): { noteIndex: number; octave: number } {
  const noteIndex = midiNote % 12;
  const actualOctave = Math.floor(midiNote / 12) - 1;
  const octaveSelect = clampOctaveSelect(actualOctave - 3 + 1);
  return { noteIndex, octave: octaveSelect };
}

export async function loadSongChart(url: string): Promise<ChartNote[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load song chart: ${url}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (url.toLowerCase().endsWith('.json') || contentType.includes('application/json')) {
    return (await response.json()) as ChartNote[];
  }
  const arrayBuffer = await response.arrayBuffer();
  return parseMidiChart(arrayBuffer);
}

export function parseMidiChart(arrayBuffer: ArrayBuffer): ChartNote[] {
  const data = new DataView(arrayBuffer);
  if (String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4)) !== 'MThd') {
    throw new Error('Invalid MIDI header');
  }

  const headerLen = readUint32(data, 4);
  readUint16(data, 8);
  const trackCount = readUint16(data, 10);
  const division = readUint16(data, 12);
  const ticksPerQuarter = division & 0x7fff;
  let position = 8 + headerLen;

  const notes: { note: number; time: number; duration: number }[] = [];
  const activeNotes = new Map<number, number>();
  let tempo = 500000; // default microseconds per quarter note (120 BPM)

  for (let track = 0; track < trackCount; track += 1) {
    if (String.fromCharCode(...new Uint8Array(arrayBuffer, position, 4)) !== 'MTrk') {
      throw new Error('Expected MTrk chunk');
    }
    const trackLength = readUint32(data, position + 4);
    let trackPos = position + 8;
    const trackEnd = trackPos + trackLength;
    let deltaTime = 0;
    let lastStatus = 0;

    while (trackPos < trackEnd) {
      const delta = readVarInt(data, trackPos);
      deltaTime += delta.value;
      trackPos += delta.length;
      let status = data.getUint8(trackPos);
      if (status < 0x80) {
        status = lastStatus;
      } else {
        trackPos += 1;
        lastStatus = status;
      }

      if (status === 0xff) {
        const metaType = data.getUint8(trackPos);
        trackPos += 1;
        const lengthInfo = readVarInt(data, trackPos);
        trackPos += lengthInfo.length;
        const metaLength = lengthInfo.value;
        if (metaType === 0x51 && metaLength === 3) {
          tempo = (data.getUint8(trackPos) << 16) | (data.getUint8(trackPos + 1) << 8) | data.getUint8(trackPos + 2);
        }
        trackPos += metaLength;
        continue;
      }

      const eventType = status & 0xf0;
      if (eventType === 0x80 || eventType === 0x90) {
        const noteNumber = data.getUint8(trackPos);
        const velocity = data.getUint8(trackPos + 1);
        trackPos += 2;
        const timeSeconds = (deltaTime * tempo) / ticksPerQuarter / 1000000;
        const timeMs = Math.round(timeSeconds * 1000);
        if (eventType === 0x90 && velocity > 0) {
          activeNotes.set(noteNumber, timeMs);
        } else {
          const startTime = activeNotes.get(noteNumber);
          if (startTime !== undefined) {
            notes.push({ note: noteNumber, time: startTime, duration: Math.max(1, timeMs - startTime) });
            activeNotes.delete(noteNumber);
          }
        }
        continue;
      }

      if (eventType === 0xa0 || eventType === 0xb0 || eventType === 0xe0) {
        trackPos += 2;
        continue;
      }

      if (eventType === 0xc0 || eventType === 0xd0) {
        trackPos += 1;
        continue;
      }

      const lengthInfo = readVarInt(data, trackPos);
      trackPos += lengthInfo.length + lengthInfo.value;
    }
    position = trackEnd;
  }

  const chart: ChartNote[] = notes
    .sort((a, b) => a.time - b.time)
    .map((note) => {
      const { noteIndex, octave } = midiNoteToChartNote(note.note);
      return {
        time: note.time,
        duration: note.duration,
        noteIndex,
        octave,
      };
    })
    .filter((note) => note.duration > 0);

  return chart;
}
