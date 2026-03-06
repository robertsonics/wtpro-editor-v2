import { describe, it, expect } from 'vitest';
import { pushUndo, applyUndo, applyRedo, MAX_UNDO, undoLabel, redoLabel } from '../model/undoStack.js';
import { arrayMove } from '@dnd-kit/sortable';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDoc(trackPreset = 1, balance = 64) {
  return {
    presetNumber: 1,
    comments: [],
    noteActions: new Map([
      ['0:60', [{
        sentinel: '#NOTE', midi_note: 60, midi_channel: 0,
        action_type: '01 - Play Note', track_preset: trackPreset,
        pitch_offset: 0, attack_ms: 0, release_ms: 500,
        loop_flag: 0, lock_flag: 0, pitch_bend_flag: 0,
        min_velocity: 1, max_velocity: 127,
        min_vel_gain: -20, max_vel_gain: 0, balance, comment: '',
      }]],
    ]),
  };
}

function editCell(doc, noteKey, rowIndex, key, value) {
  const rows = doc.noteActions.get(noteKey);
  if (!rows || !rows[rowIndex]) return doc;
  const newRows = [...rows];
  newRows[rowIndex] = { ...rows[rowIndex], [key]: value };
  const newNoteActions = new Map(doc.noteActions);
  newNoteActions.set(noteKey, newRows);
  return { ...doc, noteActions: newNoteActions };
}

function reorderDoc(doc, noteKey, oldIndex, newIndex) {
  const rows = doc.noteActions.get(noteKey);
  if (!rows) return doc;
  const newNoteActions = new Map(doc.noteActions);
  newNoteActions.set(noteKey, arrayMove(rows, oldIndex, newIndex));
  return { ...doc, noteActions: newNoteActions };
}

// ── pushUndo ──────────────────────────────────────────────────────────────────

describe('undoStack – pushUndo', () => {
  it('adds a snapshot to an empty stack', () => {
    const doc = makeDoc();
    const { undoStack, redoStack } = pushUndo([], [], doc, 'Edit track');
    expect(undoStack).toHaveLength(1);
    expect(undoStack[0].description).toBe('Edit track');
    expect(redoStack).toHaveLength(0);
  });

  it('clears redo stack on new push', () => {
    const doc = makeDoc();
    const { undoStack: u1, redoStack: r1 } = pushUndo([], [], doc, 'Edit 1');
    const doc2 = editCell(doc, '0:60', 0, 'track_preset', 10);
    const u = applyUndo(u1, r1, doc2);
    expect(u.redoStack).toHaveLength(1);

    // New edit clears redo
    const { redoStack: r2 } = pushUndo(u.undoStack, u.redoStack, u.doc, 'Edit 2');
    expect(r2).toHaveLength(0);
  });

  it('caps stack at MAX_UNDO (50) entries', () => {
    let undoStack = [];
    let redoStack = [];
    let doc = makeDoc();

    for (let i = 0; i < 55; i++) {
      const push = pushUndo(undoStack, redoStack, doc, `Edit ${i}`);
      undoStack = push.undoStack;
      redoStack = push.redoStack;
      doc = editCell(doc, '0:60', 0, 'track_preset', i + 1);
    }

    expect(undoStack.length).toBe(MAX_UNDO);
    expect(undoStack.length).toBe(50);
  });

  it('oldest entry is evicted when cap is exceeded', () => {
    let undoStack = [];
    let redoStack = [];
    let doc = makeDoc();

    for (let i = 0; i < 51; i++) {
      const push = pushUndo(undoStack, redoStack, doc, `Edit ${i}`);
      undoStack = push.undoStack;
      redoStack = push.redoStack;
      doc = editCell(doc, '0:60', 0, 'track_preset', i + 2);
    }

    // After 51 pushes capped at 50, oldest entry (Edit 0) is gone
    expect(undoStack[0].description).toBe('Edit 1');
    expect(undoStack[undoStack.length - 1].description).toBe('Edit 50');
  });
});

// ── applyUndo ─────────────────────────────────────────────────────────────────

describe('undoStack – applyUndo', () => {
  it('returns null when stack is empty', () => {
    expect(applyUndo([], [], makeDoc())).toBeNull();
  });

  it('restores the previous document value', () => {
    const before = makeDoc(1);
    const { undoStack, redoStack } = pushUndo([], [], before, 'Edit track');
    const after = editCell(before, '0:60', 0, 'track_preset', 999);

    const result = applyUndo(undoStack, redoStack, after);
    expect(result).not.toBeNull();
    expect(result.doc.noteActions.get('0:60')[0].track_preset).toBe(1);
  });

  it('moves current state to redo stack', () => {
    const before = makeDoc(1);
    const { undoStack, redoStack } = pushUndo([], [], before, 'Edit track');
    const after = editCell(before, '0:60', 0, 'track_preset', 999);

    const result = applyUndo(undoStack, redoStack, after);
    expect(result.redoStack).toHaveLength(1);
    expect(result.redoStack[0].doc.noteActions.get('0:60')[0].track_preset).toBe(999);
  });

  it('removes the used entry from undo stack', () => {
    const before = makeDoc(1);
    const { undoStack, redoStack } = pushUndo([], [], before, 'Edit track');
    const after = editCell(before, '0:60', 0, 'track_preset', 999);
    const result = applyUndo(undoStack, redoStack, after);
    expect(result.undoStack).toHaveLength(0);
  });
});

// ── applyRedo ─────────────────────────────────────────────────────────────────

describe('undoStack – applyRedo', () => {
  it('returns null when redo stack is empty', () => {
    expect(applyRedo([], [], makeDoc())).toBeNull();
  });

  it('re-applies the edit after undo', () => {
    let doc = makeDoc(1);
    let undoStack = [];
    let redoStack = [];

    const push = pushUndo(undoStack, redoStack, doc, 'Edit track');
    undoStack = push.undoStack;
    redoStack = push.redoStack;
    doc = editCell(doc, '0:60', 0, 'track_preset', 999);

    const u = applyUndo(undoStack, redoStack, doc);
    doc = u.doc; undoStack = u.undoStack; redoStack = u.redoStack;
    expect(doc.noteActions.get('0:60')[0].track_preset).toBe(1);

    const r = applyRedo(undoStack, redoStack, doc);
    expect(r.doc.noteActions.get('0:60')[0].track_preset).toBe(999);
  });

  it('moves the redone state back onto the undo stack', () => {
    let doc = makeDoc(1);
    const push = pushUndo([], [], doc, 'Edit track');
    doc = editCell(doc, '0:60', 0, 'track_preset', 999);
    const u = applyUndo(push.undoStack, push.redoStack, doc);
    const r = applyRedo(u.undoStack, u.redoStack, u.doc);
    expect(r.undoStack).toHaveLength(1);
    expect(r.redoStack).toHaveLength(0);
  });
});

// ── Sequential operations ─────────────────────────────────────────────────────

describe('undoStack – sequential operations', () => {
  it('edit cell → undo → value restored', () => {
    let doc = makeDoc(1);
    let undoStack = [];
    let redoStack = [];

    const push = pushUndo(undoStack, redoStack, doc, 'Edit track');
    undoStack = push.undoStack; redoStack = push.redoStack;
    doc = editCell(doc, '0:60', 0, 'track_preset', 500);

    expect(doc.noteActions.get('0:60')[0].track_preset).toBe(500);

    const u = applyUndo(undoStack, redoStack, doc);
    doc = u.doc; undoStack = u.undoStack; redoStack = u.redoStack;

    expect(doc.noteActions.get('0:60')[0].track_preset).toBe(1);
  });

  it('two sequential edits each create separate undo steps', () => {
    let doc = makeDoc(1, 64);
    let undoStack = [];
    let redoStack = [];

    // Edit 1: track
    let push = pushUndo(undoStack, redoStack, doc, 'Edit track');
    undoStack = push.undoStack; redoStack = push.redoStack;
    doc = editCell(doc, '0:60', 0, 'track_preset', 100);

    // Edit 2: balance
    push = pushUndo(undoStack, redoStack, doc, 'Edit balance');
    undoStack = push.undoStack; redoStack = push.redoStack;
    doc = editCell(doc, '0:60', 0, 'balance', 100);

    expect(undoStack.length).toBe(2);

    // Undo edit 2 → balance reverts, track stays
    let u = applyUndo(undoStack, redoStack, doc);
    doc = u.doc; undoStack = u.undoStack; redoStack = u.redoStack;
    expect(doc.noteActions.get('0:60')[0].track_preset).toBe(100);
    expect(doc.noteActions.get('0:60')[0].balance).toBe(64);

    // Undo edit 1 → track reverts
    u = applyUndo(undoStack, redoStack, doc);
    doc = u.doc; undoStack = u.undoStack; redoStack = u.redoStack;
    expect(doc.noteActions.get('0:60')[0].track_preset).toBe(1);
    expect(doc.noteActions.get('0:60')[0].balance).toBe(64);
  });

  it('undo at depth 50 — oldest step not available', () => {
    let doc = makeDoc(1);
    let undoStack = [];
    let redoStack = [];

    for (let i = 0; i < 51; i++) {
      const push = pushUndo(undoStack, redoStack, doc, `Edit ${i}`);
      undoStack = push.undoStack; redoStack = push.redoStack;
      doc = editCell(doc, '0:60', 0, 'track_preset', i + 2);
    }

    expect(undoStack.length).toBe(MAX_UNDO);

    // Undo all 50 available steps
    for (let i = 0; i < MAX_UNDO; i++) {
      const u = applyUndo(undoStack, redoStack, doc);
      doc = u.doc; undoStack = u.undoStack; redoStack = u.redoStack;
    }

    expect(undoStack.length).toBe(0);
    expect(applyUndo(undoStack, redoStack, doc)).toBeNull();

    // The very first edit (i=0, track_preset→2) was evicted
    // So final doc has track_preset = 2 (from the evicted entry), not 1
    expect(doc.noteActions.get('0:60')[0].track_preset).toBe(2);
  });

  it('redo after undo → state re-applied', () => {
    let doc = makeDoc(1);
    let undoStack = [];
    let redoStack = [];

    const push = pushUndo(undoStack, redoStack, doc, 'Edit track');
    undoStack = push.undoStack; redoStack = push.redoStack;
    doc = editCell(doc, '0:60', 0, 'track_preset', 42);

    // Undo
    let u = applyUndo(undoStack, redoStack, doc);
    doc = u.doc; undoStack = u.undoStack; redoStack = u.redoStack;
    expect(doc.noteActions.get('0:60')[0].track_preset).toBe(1);

    // Redo
    const r = applyRedo(undoStack, redoStack, doc);
    doc = r.doc; undoStack = r.undoStack; redoStack = r.redoStack;
    expect(doc.noteActions.get('0:60')[0].track_preset).toBe(42);
  });

  it('reorder actions → undo → original order restored', () => {
    const rows = [
      { ...makeDoc().noteActions.get('0:60')[0], track_preset: 1 },
      { ...makeDoc().noteActions.get('0:60')[0], track_preset: 2 },
      { ...makeDoc().noteActions.get('0:60')[0], track_preset: 3 },
    ];
    let doc = { presetNumber: 1, comments: [], noteActions: new Map([['0:60', rows]]) };
    let undoStack = [];
    let redoStack = [];

    // Reorder: move index 0 to index 2 → [2, 3, 1]
    const push = pushUndo(undoStack, redoStack, doc, 'Reorder actions');
    undoStack = push.undoStack; redoStack = push.redoStack;
    doc = reorderDoc(doc, '0:60', 0, 2);
    expect(doc.noteActions.get('0:60').map(r => r.track_preset)).toEqual([2, 3, 1]);

    // Undo → original order
    const u = applyUndo(undoStack, redoStack, doc);
    expect(u.doc.noteActions.get('0:60').map(r => r.track_preset)).toEqual([1, 2, 3]);
  });
});

// ── Label helpers ─────────────────────────────────────────────────────────────

describe('undoStack – label helpers', () => {
  it('undoLabel returns null for empty stack', () => {
    expect(undoLabel([])).toBeNull();
  });

  it('undoLabel returns formatted string for non-empty stack', () => {
    const { undoStack } = pushUndo([], [], makeDoc(), 'Edit Note 60 Track');
    expect(undoLabel(undoStack)).toBe('Undo: Edit Note 60 Track');
  });

  it('redoLabel returns null for empty stack', () => {
    expect(redoLabel([])).toBeNull();
  });

  it('redoLabel returns formatted string', () => {
    const doc = makeDoc();
    const { undoStack, redoStack } = pushUndo([], [], doc, 'Edit balance');
    const after = editCell(doc, '0:60', 0, 'balance', 100);
    const u = applyUndo(undoStack, redoStack, after);
    expect(redoLabel(u.redoStack)).toBe('Redo: Edit balance');
  });
});
