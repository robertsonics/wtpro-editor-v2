import { describe, it, expect } from 'vitest';
import { computeFill, DEFAULT_COPY_FIELDS } from '../model/fillLogic.js';
import { pushUndo, applyUndo } from '../model/undoStack.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = {
  channel:        0,
  actionType:     '01 - Play Note',
  startTrack:     48,
  trackIncrement: 1,
  startPitch:     0,
  pitchIncrement: 0,
  copyFields:     DEFAULT_COPY_FIELDS,
  conflictMode:   'add',
};

function makeRow(noteNum, channel, actionType, track) {
  return {
    sentinel: '#NOTE', midi_note: noteNum, midi_channel: channel,
    action_type: actionType, track_preset: track,
    pitch_offset: 0, attack_ms: 0, release_ms: 0,
    loop_flag: 0, lock_flag: 0, pitch_bend_flag: 0,
    min_velocity: 1, max_velocity: 127,
    min_vel_gain: -20, max_vel_gain: 0, balance: 64, comment: '',
  };
}

// ── Basic fill ────────────────────────────────────────────────────────────────

describe('fill – basic fill', () => {
  it('creates notes 48–52 with sequential tracks 48–52', () => {
    const { preview, newNoteActions } = computeFill(new Map(), {
      ...BASE, fromNote: 48, toNote: 52,
    });

    expect(preview).toHaveLength(5);
    expect(preview.every(p => !p.skipped)).toBe(true);

    for (let i = 0; i < 5; i++) {
      const rows = newNoteActions.get(`0:${48 + i}`);
      expect(rows).toHaveLength(1);
      expect(rows[0].track_preset).toBe(48 + i);
    }
  });

  it('handles toNote < fromNote (reversed range)', () => {
    const { preview } = computeFill(new Map(), {
      ...BASE, fromNote: 52, toNote: 48,
    });
    expect(preview).toHaveLength(5);
    expect(preview[0].noteNum).toBe(48);
    expect(preview[4].noteNum).toBe(52);
  });

  it('single note fill (fromNote === toNote)', () => {
    const { preview, newNoteActions } = computeFill(new Map(), {
      ...BASE, fromNote: 60, toNote: 60, startTrack: 100,
    });
    expect(preview).toHaveLength(1);
    expect(newNoteActions.get('0:60')[0].track_preset).toBe(100);
  });

  it('sets correct channel and action type on created rows', () => {
    const { newNoteActions } = computeFill(new Map(), {
      ...BASE, fromNote: 60, toNote: 60,
      channel: 5, actionType: '03 - Trigger Type 2',
    });
    const row = newNoteActions.get('5:60')[0];
    expect(row.midi_channel).toBe(5);
    expect(row.action_type).toBe('03 - Trigger Type 2');
  });

  it('zero track increment keeps all rows on the same track', () => {
    const { newNoteActions } = computeFill(new Map(), {
      ...BASE, fromNote: 60, toNote: 62,
      startTrack: 99, trackIncrement: 0,
    });
    for (let n = 60; n <= 62; n++) {
      expect(newNoteActions.get(`0:${n}`)[0].track_preset).toBe(99);
    }
  });
});

// ── Pitch increment ───────────────────────────────────────────────────────────

describe('fill – pitch increment', () => {
  it('applies pitch increment of 100 cents per step', () => {
    const { newNoteActions } = computeFill(new Map(), {
      ...BASE, fromNote: 60, toNote: 64,
      startPitch: 0, pitchIncrement: 100,
    });
    for (let i = 0; i < 5; i++) {
      expect(newNoteActions.get(`0:${60 + i}`)[0].pitch_offset).toBe(i * 100);
    }
  });

  it('negative pitch increment decrements each step', () => {
    const { newNoteActions } = computeFill(new Map(), {
      ...BASE, fromNote: 60, toNote: 62,
      startPitch: -100, pitchIncrement: -50,
    });
    expect(newNoteActions.get('0:60')[0].pitch_offset).toBe(-100);
    expect(newNoteActions.get('0:61')[0].pitch_offset).toBe(-150);
    expect(newNoteActions.get('0:62')[0].pitch_offset).toBe(-200);
  });

  it('zero pitch increment keeps all rows at the same pitch', () => {
    const { newNoteActions } = computeFill(new Map(), {
      ...BASE, fromNote: 60, toNote: 62,
      startPitch: 200, pitchIncrement: 0,
    });
    for (let n = 60; n <= 62; n++) {
      expect(newNoteActions.get(`0:${n}`)[0].pitch_offset).toBe(200);
    }
  });
});

// ── 8-action skip (add mode) ──────────────────────────────────────────────────

describe('fill – 8-action skip in add mode', () => {
  it('skips note with 8 actions, flags it in preview, creates others', () => {
    const fullGroup = Array.from({ length: 8 }, (_, i) => makeRow(50, 0, '01 - Play Note', i + 1));
    const noteActions = new Map([['0:50', fullGroup]]);

    const { preview, newNoteActions } = computeFill(noteActions, {
      ...BASE, fromNote: 48, toNote: 52, conflictMode: 'add',
    });

    expect(preview).toHaveLength(5);
    const skippedEntry = preview.find(p => p.noteNum === 50);
    expect(skippedEntry?.skipped).toBe(true);

    // 50 unchanged
    expect(newNoteActions.get('0:50')).toHaveLength(8);

    // Others created
    expect(newNoteActions.has('0:48')).toBe(true);
    expect(newNoteActions.has('0:49')).toBe(true);
    expect(newNoteActions.has('0:51')).toBe(true);
    expect(newNoteActions.has('0:52')).toBe(true);
  });

  it('note with 7 actions is NOT skipped in add mode', () => {
    const group7 = Array.from({ length: 7 }, (_, i) => makeRow(60, 0, '01 - Play Note', i + 1));
    const noteActions = new Map([['0:60', group7]]);

    const { preview, newNoteActions } = computeFill(noteActions, {
      ...BASE, fromNote: 60, toNote: 60, conflictMode: 'add',
    });

    expect(preview[0].skipped).toBe(false);
    expect(newNoteActions.get('0:60')).toHaveLength(8);
  });

  it('replace mode ignores the 8-action limit', () => {
    const fullGroup = Array.from({ length: 8 }, (_, i) => makeRow(60, 0, '01 - Play Note', i + 1));
    const noteActions = new Map([['0:60', fullGroup]]);

    const { preview, newNoteActions } = computeFill(noteActions, {
      ...BASE, fromNote: 60, toNote: 60,
      conflictMode: 'replace', startTrack: 500,
    });

    expect(preview[0].skipped).toBe(false);
    // All 8 existing play-note rows replaced by 1 new one
    expect(newNoteActions.get('0:60')).toHaveLength(1);
    expect(newNoteActions.get('0:60')[0].track_preset).toBe(500);
  });
});

// ── Replace mode ──────────────────────────────────────────────────────────────

describe('fill – replace mode', () => {
  it('replaces matching action type, preserves other types', () => {
    const existing = [
      makeRow(60, 0, '01 - Play Note',      99),
      makeRow(60, 0, '02 - Trigger Type 1', 55),
    ];
    const noteActions = new Map([['0:60', existing]]);

    const { newNoteActions } = computeFill(noteActions, {
      ...BASE, fromNote: 60, toNote: 60,
      actionType: '01 - Play Note', startTrack: 200,
      conflictMode: 'replace',
    });

    const rows = newNoteActions.get('0:60');
    expect(rows).toHaveLength(2);
    expect(rows.find(r => r.action_type === '01 - Play Note')?.track_preset).toBe(200);
    expect(rows.find(r => r.action_type === '02 - Trigger Type 1')?.track_preset).toBe(55);
  });

  it('add mode appends without removing existing of the same type', () => {
    const existing = [makeRow(60, 0, '01 - Play Note', 99)];
    const noteActions = new Map([['0:60', existing]]);

    const { newNoteActions } = computeFill(noteActions, {
      ...BASE, fromNote: 60, toNote: 60,
      actionType: '01 - Play Note', startTrack: 200,
      conflictMode: 'add',
    });

    expect(newNoteActions.get('0:60')).toHaveLength(2);
  });

  it('replace removes ALL matching rows (multiple) and adds one', () => {
    const existing = [
      makeRow(60, 0, '01 - Play Note', 10),
      makeRow(60, 0, '01 - Play Note', 20),
      makeRow(60, 0, '05 - Stop Track', 5),
    ];
    const noteActions = new Map([['0:60', existing]]);

    const { newNoteActions } = computeFill(noteActions, {
      ...BASE, fromNote: 60, toNote: 60,
      actionType: '01 - Play Note', startTrack: 99,
      conflictMode: 'replace',
    });

    const rows = newNoteActions.get('0:60');
    // 2 play-notes removed, 1 added + 1 stop-track preserved = 2
    expect(rows).toHaveLength(2);
    expect(rows.filter(r => r.action_type === '01 - Play Note')).toHaveLength(1);
    expect(rows.filter(r => r.action_type === '05 - Stop Track')).toHaveLength(1);
  });
});

// ── Copy fields ───────────────────────────────────────────────────────────────

describe('fill – copy fields', () => {
  it('copies attack, release, loop, velocity, gain, and balance from copyFields', () => {
    const customFields = {
      ...DEFAULT_COPY_FIELDS,
      attack_ms:    250,
      release_ms:   750,
      loop_flag:    1,
      min_velocity: 32,
      max_velocity: 96,
      min_vel_gain: -6,
      balance:      32,
    };

    const { newNoteActions } = computeFill(new Map(), {
      ...BASE, fromNote: 60, toNote: 60, copyFields: customFields,
    });

    const row = newNoteActions.get('0:60')[0];
    expect(row.attack_ms).toBe(250);
    expect(row.release_ms).toBe(750);
    expect(row.loop_flag).toBe(1);
    expect(row.min_velocity).toBe(32);
    expect(row.max_velocity).toBe(96);
    expect(row.min_vel_gain).toBe(-6);
    expect(row.balance).toBe(32);
  });

  it('falls back to DEFAULT_COPY_FIELDS when copyFields is null', () => {
    const { newNoteActions } = computeFill(new Map(), {
      ...BASE, fromNote: 60, toNote: 60, copyFields: null,
    });
    const row = newNoteActions.get('0:60')[0];
    expect(row.attack_ms).toBe(DEFAULT_COPY_FIELDS.attack_ms);
    expect(row.balance).toBe(DEFAULT_COPY_FIELDS.balance);
  });
});

// ── Undo ──────────────────────────────────────────────────────────────────────

describe('fill – undo', () => {
  it('undo reverses the entire fill in one step', () => {
    const beforeDoc = { presetNumber: 1, comments: [], noteActions: new Map() };
    const { undoStack, redoStack } = pushUndo([], [], beforeDoc, 'Fill notes 48–52 Ch 0');

    const { newNoteActions } = computeFill(beforeDoc.noteActions, {
      ...BASE, fromNote: 48, toNote: 52,
    });
    const afterDoc = { ...beforeDoc, noteActions: newNoteActions };

    expect(afterDoc.noteActions.size).toBe(5);

    const result = applyUndo(undoStack, redoStack, afterDoc);
    expect(result).not.toBeNull();
    expect(result.doc.noteActions.size).toBe(0);
  });

  it('undo label is formatted correctly', () => {
    const { undoStack } = pushUndo([], [], {}, 'Fill notes 48–52 Ch 0');
    expect(undoStack[undoStack.length - 1].description).toBe('Fill notes 48–52 Ch 0');
  });

  it('fill with partial existing notes — undo restores original state', () => {
    const existing = [makeRow(60, 0, '01 - Play Note', 999)];
    const beforeDoc = {
      presetNumber: 1, comments: [],
      noteActions: new Map([['0:60', existing]]),
    };
    const { undoStack, redoStack } = pushUndo([], [], beforeDoc, 'Fill notes 58–62');

    const { newNoteActions } = computeFill(beforeDoc.noteActions, {
      ...BASE, fromNote: 58, toNote: 62, conflictMode: 'add',
    });
    const afterDoc = { ...beforeDoc, noteActions: newNoteActions };

    // After fill: 5 notes, 0:60 has 2 rows (original + new)
    expect(afterDoc.noteActions.size).toBe(5);
    expect(afterDoc.noteActions.get('0:60')).toHaveLength(2);

    // After undo: restored to 1 note with 1 row
    const result = applyUndo(undoStack, redoStack, afterDoc);
    expect(result.doc.noteActions.size).toBe(1);
    expect(result.doc.noteActions.get('0:60')).toHaveLength(1);
    expect(result.doc.noteActions.get('0:60')[0].track_preset).toBe(999);
  });
});

// ── Preview shape ─────────────────────────────────────────────────────────────

describe('fill – preview shape', () => {
  it('preview entries have correct noteNum, track, pitch, skipped fields', () => {
    const { preview } = computeFill(new Map(), {
      ...BASE, fromNote: 60, toNote: 62,
      startTrack: 10, trackIncrement: 5,
      startPitch: 100, pitchIncrement: 50,
    });

    expect(preview[0]).toMatchObject({ noteNum: 60, track: 10,  pitch: 100, skipped: false });
    expect(preview[1]).toMatchObject({ noteNum: 61, track: 15,  pitch: 150, skipped: false });
    expect(preview[2]).toMatchObject({ noteNum: 62, track: 20,  pitch: 200, skipped: false });
  });

  it('skipped preview entry contains correct noteNum', () => {
    const fullGroup = Array.from({ length: 8 }, (_, i) => makeRow(61, 0, '01 - Play Note', i));
    const noteActions = new Map([['0:61', fullGroup]]);

    const { preview } = computeFill(noteActions, {
      ...BASE, fromNote: 60, toNote: 62, conflictMode: 'add',
    });

    expect(preview.find(p => p.noteNum === 61)?.skipped).toBe(true);
    expect(preview.find(p => p.noteNum === 60)?.skipped).toBe(false);
    expect(preview.find(p => p.noteNum === 62)?.skipped).toBe(false);
  });
});
