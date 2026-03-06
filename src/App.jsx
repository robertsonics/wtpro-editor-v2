import { useReducer, useState, useEffect, useRef, useMemo } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { parseCsv, parsePresetNumber } from './model/csvParser.js';
import { serializeCsv } from './model/csvSerializer.js';
import { FIELDS, validateRow } from './schema/fieldSchema.js';
import { pushUndo, applyUndo, applyRedo, undoLabel, redoLabel } from './model/undoStack.js';
import Toolbar       from './components/Toolbar.jsx';
import CommentsPanel from './components/CommentsPanel.jsx';
import AddNoteControl from './components/AddNoteControl.jsx';
import NoteTree      from './components/NoteTree.jsx';
import DetailPanel   from './components/DetailPanel.jsx';
import NewPresetModal from './components/NewPresetModal.jsx';
import './App.css';

// ── Default action row for a newly added note ─────────────────────────────────

function makeDefaultRow(channel, note) {
  return {
    sentinel:       '#NOTE',
    midi_note:      note,
    midi_channel:   channel,
    action_type:    '01 - Play Note',
    track_preset:   1,
    pitch_offset:   0,
    attack_ms:      0,
    release_ms:     0,
    loop_flag:      0,
    lock_flag:      0,
    pitch_bend_flag: 0,
    min_velocity:   1,
    max_velocity:   127,
    min_vel_gain:   -20,
    max_vel_gain:   0,
    balance:        64,
    comment:        '',
  };
}

// ── Document reducer ──────────────────────────────────────────────────────────

function docReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return action.doc;

    case 'REORDER_ACTIONS': {
      const { noteKey, oldIndex, newIndex } = action;
      const rows = state.noteActions.get(noteKey);
      if (!rows) return state;
      const newNoteActions = new Map(state.noteActions);
      newNoteActions.set(noteKey, arrayMove(rows, oldIndex, newIndex));
      return { ...state, noteActions: newNoteActions };
    }

    case 'EDIT_CELL': {
      const { noteKey, rowIndex, key, value } = action;
      const rows = state.noteActions.get(noteKey);
      if (!rows || !rows[rowIndex]) return state;
      const newRows = [...rows];
      newRows[rowIndex] = { ...rows[rowIndex], [key]: value };
      const newNoteActions = new Map(state.noteActions);
      newNoteActions.set(noteKey, newRows);
      return { ...state, noteActions: newNoteActions };
    }

    case 'DELETE_ACTION_ROW': {
      const { noteKey, rowIndex } = action;
      const rows = state.noteActions.get(noteKey);
      if (!rows || !rows[rowIndex]) return state;
      const newRows = rows.filter((_, i) => i !== rowIndex);
      const newNoteActions = new Map(state.noteActions);
      if (newRows.length === 0) {
        newNoteActions.delete(noteKey);
      } else {
        newNoteActions.set(noteKey, newRows);
      }
      return { ...state, noteActions: newNoteActions };
    }

    case 'MOVE_ROW': {
      const { noteKey, rowIndex, newChannel } = action;
      const rows = state.noteActions.get(noteKey);
      if (!rows || !rows[rowIndex]) return state;
      const row = rows[rowIndex];
      const newNoteKey = `${newChannel}:${row.midi_note}`;
      if (noteKey === newNoteKey) return state;
      const newNoteActions = new Map(state.noteActions);
      const remaining = rows.filter((_, i) => i !== rowIndex);
      if (remaining.length === 0) {
        newNoteActions.delete(noteKey);
      } else {
        newNoteActions.set(noteKey, remaining);
      }
      const updatedRow = { ...row, midi_channel: newChannel };
      const dest = newNoteActions.get(newNoteKey) ?? [];
      newNoteActions.set(newNoteKey, [...dest, updatedRow]);
      return { ...state, noteActions: newNoteActions };
    }

    case 'ADD_NOTE': {
      const { channel, note } = action;
      const noteKey = `${channel}:${note}`;
      if (state.noteActions.has(noteKey)) return state;
      const newNoteActions = new Map(state.noteActions);
      newNoteActions.set(noteKey, [makeDefaultRow(channel, note)]);
      return { ...state, noteActions: newNoteActions };
    }

    case 'ADD_ACTION': {
      const { noteKey } = action;
      const rows = state.noteActions.get(noteKey);
      if (!rows || rows.length >= 8) return state;
      const [ch, n] = noteKey.split(':').map(Number);
      const newNoteActions = new Map(state.noteActions);
      newNoteActions.set(noteKey, [...rows, makeDefaultRow(ch, n)]);
      return { ...state, noteActions: newNoteActions };
    }

    case 'DELETE_NOTE': {
      const { noteKey } = action;
      const newNoteActions = new Map(state.noteActions);
      newNoteActions.delete(noteKey);
      return { ...state, noteActions: newNoteActions };
    }

    case 'EDIT_COMMENTS': {
      return { ...state, comments: action.comments };
    }

    case 'EDIT_PRESET_NUMBER': {
      return { ...state, presetNumber: action.value };
    }

    default:
      return state;
  }
}

const initialDoc = { presetNumber: 1, comments: [], noteActions: new Map() };

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Document state ──
  const [doc, dispatch] = useReducer(docReducer, initialDoc);
  const docRef = useRef(doc);
  docRef.current = doc;

  // ── Undo / redo ──
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // ── UI state ──
  const [isDirty,            setIsDirty]            = useState(false);
  const [showNewPresetModal, setShowNewPresetModal]  = useState(false);
  const [expandedChannels,   setExpandedChannels]   = useState(new Set());
  const [expandedNotes,      setExpandedNotes]      = useState(new Set());
  const [selectedRowKey,     setSelectedRowKey]     = useState(null);

  // Hidden file input ref for Open CSV
  const fileInputRef = useRef(null);

  // ── Error count (rows with validation errors) ─────────────────────────────

  const errorCount = useMemo(() => {
    let n = 0;
    for (const rows of doc.noteActions.values()) {
      for (const row of rows) {
        if (validateRow(row).length > 0) n++;
      }
    }
    return n;
  }, [doc.noteActions]);

  // ── Window title ──────────────────────────────────────────────────────────

  useEffect(() => {
    document.title = isDirty ? 'WTPro Editor *' : 'WTPro Editor';
  }, [isDirty]);

  // ── Warn before closing with unsaved changes ──────────────────────────────

  useEffect(() => {
    function onBeforeUnload(e) {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // ── Drag-and-drop file loading ────────────────────────────────────────────

  useEffect(() => {
    function onDragOver(e) { e.preventDefault(); }
    function onDrop(e) {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.csv')) loadFile(file);
    }
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault(); handleRedo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoStack, redoStack]);

  // ── Core dispatch helpers ─────────────────────────────────────────────────

  function dispatchWithUndo(action, description) {
    const snapshot = docRef.current;
    const { undoStack: u, redoStack: r } = pushUndo(undoStack, redoStack, snapshot, description);
    setUndoStack(u);
    setRedoStack(r);
    setIsDirty(true);
    dispatch(action);
  }

  function handleUndo() {
    const result = applyUndo(undoStack, redoStack, docRef.current);
    if (!result) return;
    setUndoStack(result.undoStack);
    setRedoStack(result.redoStack);
    setIsDirty(true);
    dispatch({ type: 'LOAD', doc: result.doc });
  }

  function handleRedo() {
    const result = applyRedo(undoStack, redoStack, docRef.current);
    if (!result) return;
    setUndoStack(result.undoStack);
    setRedoStack(result.redoStack);
    setIsDirty(true);
    dispatch({ type: 'LOAD', doc: result.doc });
  }

  // ── Expand / collapse ─────────────────────────────────────────────────────

  function toggleChannel(ch) {
    setExpandedChannels(prev => {
      const next = new Set(prev);
      next.has(ch) ? next.delete(ch) : next.add(ch);
      return next;
    });
  }

  function toggleNote(key) {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectRow(key) {
    setSelectedRowKey(prev => (prev === key ? null : key));
  }

  // ── Document mutations ────────────────────────────────────────────────────

  function reorderActions(noteKey, oldIndex, newIndex) {
    dispatchWithUndo({ type: 'REORDER_ACTIONS', noteKey, oldIndex, newIndex }, 'Reorder actions');
    setSelectedRowKey(null);
  }

  function editCell(noteKey, rowIndex, key, value) {
    const row  = docRef.current.noteActions.get(noteKey)?.[rowIndex];
    const label = FIELDS.find(f => f.key === key)?.label ?? key;
    dispatchWithUndo(
      { type: 'EDIT_CELL', noteKey, rowIndex, key, value },
      `Edit Note ${row?.midi_note ?? ''} ${label}`
    );
  }

  function deleteActionRow(noteKey, rowIndex) {
    const row = docRef.current.noteActions.get(noteKey)?.[rowIndex];
    if (!row) return;
    const ch = row.midi_channel === 16 ? 'Omni' : `Ch ${row.midi_channel}`;
    dispatchWithUndo(
      { type: 'DELETE_ACTION_ROW', noteKey, rowIndex },
      `Delete Action — Note ${row.midi_note} ${ch}`
    );
    if (selectedRowKey) {
      const parts = selectedRowKey.split(':');
      const selNoteKey = `${parts[0]}:${parts[1]}`;
      const selIdx = Number(parts[2]);
      if (selNoteKey === noteKey) {
        if (selIdx === rowIndex) setSelectedRowKey(null);
        else if (selIdx > rowIndex) setSelectedRowKey(`${noteKey}:${selIdx - 1}`);
      }
    }
  }

  function addAction(noteKey) {
    const rows = docRef.current.noteActions.get(noteKey);
    if (!rows || rows.length >= 8) return;
    const [ch, n] = noteKey.split(':').map(Number);
    const chLabel = ch === 16 ? 'Omni' : `Ch ${ch}`;
    dispatchWithUndo(
      { type: 'ADD_ACTION', noteKey },
      `Add Action — Note ${n} ${chLabel}`
    );
  }

  function deleteNote(noteKey) {
    const [ch, n] = noteKey.split(':').map(Number);
    const chLabel = ch === 16 ? 'Omni' : `Ch ${ch}`;
    if (!window.confirm(`Delete Note ${n} ${chLabel} and all its actions?`)) return;
    dispatchWithUndo(
      { type: 'DELETE_NOTE', noteKey },
      `Delete Note ${n} ${chLabel}`
    );
    if (selectedRowKey?.startsWith(`${noteKey}:`)) setSelectedRowKey(null);
  }

  function moveRowChannel(noteKey, rowIndex, newChannel) {
    const row = docRef.current.noteActions.get(noteKey)?.[rowIndex];
    if (!row) return;
    const newNoteKey = `${newChannel}:${row.midi_note}`;
    if (noteKey === newNoteKey) return;
    const newRowIndex = docRef.current.noteActions.get(newNoteKey)?.length ?? 0;
    dispatchWithUndo(
      { type: 'MOVE_ROW', noteKey, rowIndex, newChannel },
      `Move Note ${row.midi_note} to Ch ${newChannel === 16 ? 'Omni' : newChannel}`
    );
    setSelectedRowKey(`${newNoteKey}:${newRowIndex}`);
  }

  function addNote(channel, note) {
    const noteKey = `${channel}:${note}`;
    dispatchWithUndo(
      { type: 'ADD_NOTE', channel, note },
      `Add Note ${note} Ch ${channel === 16 ? 'Omni' : channel}`
    );
    // Auto-expand to show the new note
    setExpandedChannels(prev => { const s = new Set(prev); s.add(channel); return s; });
    setExpandedNotes(prev => { const s = new Set(prev); s.add(noteKey); return s; });
    setSelectedRowKey(`${noteKey}:0`);
  }

  function editComments(newComments) {
    if (newComments.join('\n') === docRef.current.comments.join('\n')) return;
    dispatchWithUndo({ type: 'EDIT_COMMENTS', comments: newComments }, 'Edit comments');
  }

  function editPresetNumber(n) {
    dispatch({ type: 'EDIT_PRESET_NUMBER', value: n });
    setIsDirty(true);
  }

  // ── File I/O ──────────────────────────────────────────────────────────────

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const presetNum = parsePresetNumber(file.name);
      const newDoc = parseCsv(text, presetNum);
      dispatch({ type: 'LOAD', doc: newDoc });
      setUndoStack([]);
      setRedoStack([]);
      setIsDirty(false);
      setSelectedRowKey(null);
      setExpandedChannels(new Set());
      setExpandedNotes(new Set());
    };
    reader.readAsText(file);
  }

  function saveFile() {
    const csv = serializeCsv({ comments: doc.comments, noteActions: doc.noteActions });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `set_${String(doc.presetNumber).padStart(4, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDirty(false);
  }

  function handleNewPreset(presetNumber) {
    dispatch({ type: 'LOAD', doc: { presetNumber, comments: [], noteActions: new Map() } });
    setUndoStack([]);
    setRedoStack([]);
    setIsDirty(false);
    setSelectedRowKey(null);
    setExpandedChannels(new Set());
    setExpandedNotes(new Set());
    setShowNewPresetModal(false);
  }

  function requestNewPreset() {
    if (isDirty && !window.confirm('You have unsaved changes. Create new preset anyway?')) return;
    setShowNewPresetModal(true);
  }

  // ── Derive selected row ───────────────────────────────────────────────────

  let selectedRow      = null;
  let selectedNoteKey  = null;
  let selectedRowIndex = null;

  if (selectedRowKey) {
    const parts = selectedRowKey.split(':');
    selectedNoteKey  = `${parts[0]}:${parts[1]}`;
    selectedRowIndex = Number(parts[2]);
    selectedRow = doc.noteActions.get(selectedNoteKey)?.[selectedRowIndex] ?? null;
    if (!selectedRow) { selectedNoteKey = null; selectedRowIndex = null; }
  }

  function onDetailCommit(key, value) {
    if (key === 'midi_channel') {
      moveRowChannel(selectedNoteKey, selectedRowIndex, value);
    } else {
      editCell(selectedNoteKey, selectedRowIndex, key, value);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      <Toolbar
        presetNumber={doc.presetNumber}
        onPresetNumberChange={editPresetNumber}
        onNewPreset={requestNewPreset}
        onOpenFile={() => fileInputRef.current.click()}
        onSave={saveFile}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        undoTip={undoLabel(undoStack)}
        redoTip={redoLabel(redoStack)}
        errorCount={errorCount}
        isDirty={isDirty}
      />

      {/* Hidden file input for Open CSV */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) { loadFile(file); e.target.value = ''; }
        }}
      />

      <CommentsPanel
        comments={doc.comments}
        onCommit={editComments}
      />

      <AddNoteControl
        noteActions={doc.noteActions}
        onAddNote={addNote}
      />

      <NoteTree
        noteActions={doc.noteActions}
        expandedChannels={expandedChannels}
        expandedNotes={expandedNotes}
        selectedRowKey={selectedRowKey}
        onToggleChannel={toggleChannel}
        onToggleNote={toggleNote}
        onSelectRow={selectRow}
        onReorderActions={reorderActions}
        onEditCell={editCell}
        onDeleteActionRow={deleteActionRow}
        onAddAction={addAction}
        onDeleteNote={deleteNote}
      />

      {selectedRow && (
        <DetailPanel
          row={selectedRow}
          onCommit={onDetailCommit}
          onClose={() => setSelectedRowKey(null)}
        />
      )}

      {showNewPresetModal && (
        <NewPresetModal
          onConfirm={handleNewPreset}
          onCancel={() => setShowNewPresetModal(false)}
        />
      )}
    </div>
  );
}
