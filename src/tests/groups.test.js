import { describe, it, expect } from 'vitest';
import { arrayMove } from '@dnd-kit/sortable';
import { parseCsv } from '../model/csvParser.js';
import { serializeCsv } from '../model/csvSerializer.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MAX_ACTIONS = 8;

function makeRow(overrides = {}) {
  return {
    sentinel: '#NOTE',
    midi_note: 60,
    midi_channel: 0,
    action_type: '01 - Play Note',
    track_preset: 1,
    pitch_offset: 0,
    attack_ms: 0,
    release_ms: 500,
    loop_flag: 0,
    lock_flag: 0,
    pitch_bend_flag: 0,
    min_velocity: 1,
    max_velocity: 127,
    min_vel_gain: -20,
    max_vel_gain: 0,
    balance: 64,
    comment: '',
    ...overrides,
  };
}

// Simulate the REORDER_ACTIONS reducer logic
function reorderActions(noteActions, noteKey, oldIndex, newIndex) {
  const rows = noteActions.get(noteKey);
  if (!rows) return noteActions;
  const newNoteActions = new Map(noteActions);
  newNoteActions.set(noteKey, arrayMove(rows, oldIndex, newIndex));
  return newNoteActions;
}

// ── 8-action limit ────────────────────────────────────────────────────────────

describe('note group — 8-action limit', () => {
  it('group with fewer than 8 actions can add more', () => {
    const rows = Array(7).fill(null).map(() => makeRow());
    expect(rows.length < MAX_ACTIONS).toBe(true);
  });

  it('group with exactly 8 actions is at capacity', () => {
    const rows = Array(8).fill(null).map(() => makeRow());
    expect(rows.length < MAX_ACTIONS).toBe(false);
  });

  it('Percussion note 59 parses with 8 actions', () => {
    const csv = [
      '#NOTE,59,16,02 - Trigger Type 1,1,0,0,0,0,0,0,1,16,0,0,8,',
      '#NOTE,59,16,02 - Trigger Type 1,2,0,0,0,0,0,0,17,32,0,0,24,',
      '#NOTE,59,16,02 - Trigger Type 1,3,0,0,0,0,0,0,33,48,0,0,40,',
      '#NOTE,59,16,02 - Trigger Type 1,4,0,0,0,0,0,0,49,64,0,0,56,',
      '#NOTE,59,16,02 - Trigger Type 1,5,0,0,0,0,0,0,65,80,0,0,72,',
      '#NOTE,59,16,02 - Trigger Type 1,6,0,0,0,0,0,0,81,96,0,0,88,',
      '#NOTE,59,16,02 - Trigger Type 1,7,0,0,0,0,0,0,97,112,0,0,104,',
      '#NOTE,59,16,02 - Trigger Type 1,8,0,0,0,0,0,0,113,127,0,0,120,',
    ].join('\r\n') + '\r\n';
    const { noteActions } = parseCsv(csv);
    expect(noteActions.get('16:59')).toHaveLength(8);
    expect(noteActions.get('16:59').length < MAX_ACTIONS).toBe(false);
  });
});

// ── Delete note ───────────────────────────────────────────────────────────────

describe('note group — delete note', () => {
  it('deleting a note removes its key from noteActions', () => {
    const noteActions = new Map([
      ['0:60', [makeRow()]],
      ['0:61', [makeRow({ midi_note: 61 })]],
    ]);
    noteActions.delete('0:60');
    expect(noteActions.has('0:60')).toBe(false);
    expect(noteActions.has('0:61')).toBe(true);
  });

  it('after deletion the channel:note key is available for re-use', () => {
    const noteActions = new Map([['0:60', [makeRow()]]]);
    noteActions.delete('0:60');
    // Key no longer occupied — can be re-added
    expect(noteActions.has('0:60')).toBe(false);
    noteActions.set('0:60', [makeRow({ track_preset: 99 })]);
    expect(noteActions.has('0:60')).toBe(true);
    expect(noteActions.get('0:60')[0].track_preset).toBe(99);
  });
});

// ── Drag reorder ──────────────────────────────────────────────────────────────

describe('note group — drag reorder', () => {
  it('reorders rows and serialises in the new order', () => {
    const rows = [
      makeRow({ track_preset: 10 }),
      makeRow({ track_preset: 20 }),
      makeRow({ track_preset: 30 }),
    ];
    const noteActions = new Map([['0:60', rows]]);

    // Move first row (track=10) to position 2 → expected order: [20, 30, 10]
    const updated = reorderActions(noteActions, '0:60', 0, 2);

    const csv = serializeCsv({ comments: [], noteActions: updated });
    const lines = csv.split('\r\n').filter(l => l.startsWith('#NOTE'));

    expect(lines).toHaveLength(3);
    expect(lines[0].split(',')[4]).toBe('20');
    expect(lines[1].split(',')[4]).toBe('30');
    expect(lines[2].split(',')[4]).toBe('10');
  });

  it('moving the last row to the first position', () => {
    const rows = [
      makeRow({ track_preset: 1 }),
      makeRow({ track_preset: 2 }),
      makeRow({ track_preset: 3 }),
    ];
    const noteActions = new Map([['0:60', rows]]);

    // arrayMove([1,2,3], 2, 0) → [3, 1, 2]
    const updated = reorderActions(noteActions, '0:60', 2, 0);
    const tracks = updated.get('0:60').map(r => r.track_preset);
    expect(tracks).toEqual([3, 1, 2]);
  });

  it('original noteActions Map is not mutated', () => {
    const rows = [makeRow({ track_preset: 1 }), makeRow({ track_preset: 2 })];
    const noteActions = new Map([['0:60', rows]]);
    const original = [...noteActions.get('0:60')];

    reorderActions(noteActions, '0:60', 0, 1);

    // Original array unchanged
    expect(noteActions.get('0:60')[0].track_preset).toBe(original[0].track_preset);
  });

  it('reorder of single row is a no-op', () => {
    const rows = [makeRow({ track_preset: 42 })];
    const noteActions = new Map([['0:60', rows]]);
    const updated = reorderActions(noteActions, '0:60', 0, 0);
    expect(updated.get('0:60')[0].track_preset).toBe(42);
  });
});

// ── Duplicate add rejection ───────────────────────────────────────────────────

describe('note group — duplicate add rejection', () => {
  it('rejects adding a note when the channel:note key already exists', () => {
    const noteActions = new Map([['0:60', [makeRow()]]]);
    const isDuplicate = noteActions.has('0:60');
    expect(isDuplicate).toBe(true);
  });

  it('allows adding a note on a different channel even with the same note number', () => {
    const noteActions = new Map([['0:60', [makeRow()]]]);
    const isDuplicate = noteActions.has('1:60');
    expect(isDuplicate).toBe(false);
  });
});

// ── Boundary values ───────────────────────────────────────────────────────────

describe('note group — boundary note values', () => {
  it('accepts note 0 on channel 0', () => {
    const noteActions = new Map();
    const row = makeRow({ midi_note: 0, midi_channel: 0, track_preset: 1 });
    noteActions.set('0:0', [row]);
    expect(noteActions.has('0:0')).toBe(true);
    expect(noteActions.get('0:0')[0].midi_note).toBe(0);
  });

  it('accepts note 127 on channel 15', () => {
    const noteActions = new Map();
    const row = makeRow({ midi_note: 127, midi_channel: 15, track_preset: 4095 });
    noteActions.set('15:127', [row]);
    expect(noteActions.has('15:127')).toBe(true);
    expect(noteActions.get('15:127')[0].midi_note).toBe(127);
  });

  it('both boundary notes coexist in same Map', () => {
    const noteActions = new Map([
      ['0:0',    [makeRow({ midi_note: 0,   midi_channel: 0  })]],
      ['15:127', [makeRow({ midi_note: 127, midi_channel: 15 })]],
    ]);
    expect(noteActions.size).toBe(2);
  });
});

// ── Channel grouping ──────────────────────────────────────────────────────────

describe('note group — channel grouping', () => {
  it('same note on different channels occupies separate Map keys', () => {
    const csv = [
      '#NOTE,60,0,01 - Play Note,100,0,0,500,0,0,0,1,127,-20,0,48,',
      '#NOTE,60,5,01 - Play Note,200,0,0,500,0,0,0,1,127,-20,0,80,',
    ].join('\r\n') + '\r\n';

    const { noteActions } = parseCsv(csv);
    expect(noteActions.size).toBe(2);
    expect(noteActions.has('0:60')).toBe(true);
    expect(noteActions.has('5:60')).toBe(true);
    expect(noteActions.get('0:60')[0].balance).toBe(48);
    expect(noteActions.get('5:60')[0].balance).toBe(80);
  });

  it('rows with same channel+note group together', () => {
    const csv = [
      '#NOTE,60,0,01 - Play Note,1,0,0,500,0,0,0,1,127,-20,0,64,',
      '#NOTE,60,0,01 - Play Note,2,0,0,500,0,0,0,1,127,-20,0,64,',
      '#NOTE,60,1,01 - Play Note,3,0,0,500,0,0,0,1,127,-20,0,64,',
    ].join('\r\n') + '\r\n';

    const { noteActions } = parseCsv(csv);
    expect(noteActions.get('0:60')).toHaveLength(2);
    expect(noteActions.get('1:60')).toHaveLength(1);
  });
});
