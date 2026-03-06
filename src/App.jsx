import { useReducer, useState, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { parseCsv } from './model/csvParser.js';
import { FIELDS } from './schema/fieldSchema.js';
import { pushUndo, applyUndo, applyRedo, undoLabel, redoLabel } from './model/undoStack.js';
import { SAMPLE_CSV, SAMPLE_PRESET_NUMBER } from './fixtures/sampleCsv.js';
import NoteTree from './components/NoteTree.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import './App.css';

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
      // Change midi_channel for a row — moves it to a different Map key
      const { noteKey, rowIndex, newChannel } = action;
      const rows = state.noteActions.get(noteKey);
      if (!rows || !rows[rowIndex]) return state;

      const row = rows[rowIndex];
      const newNoteKey = `${newChannel}:${row.midi_note}`;
      if (noteKey === newNoteKey) return state;

      const newNoteActions = new Map(state.noteActions);

      // Remove from old location
      const remaining = rows.filter((_, i) => i !== rowIndex);
      if (remaining.length === 0) {
        newNoteActions.delete(noteKey);
      } else {
        newNoteActions.set(noteKey, remaining);
      }

      // Add to new location (append)
      const updatedRow = { ...row, midi_channel: newChannel };
      const dest = newNoteActions.get(newNoteKey) ?? [];
      newNoteActions.set(newNoteKey, [...dest, updatedRow]);

      return { ...state, noteActions: newNoteActions };
    }

    default:
      return state;
  }
}

// Parse the sample CSV once at module load time as the initial document
const initialDoc = parseCsv(SAMPLE_CSV, SAMPLE_PRESET_NUMBER);

// ── App component ─────────────────────────────────────────────────────────────

export default function App() {
  // ── Document state ──
  const [doc, dispatch] = useReducer(docReducer, initialDoc);

  // Track current doc in a ref so dispatchWithUndo can capture it pre-action
  const docRef = useRef(doc);
  docRef.current = doc;

  // ── Undo / redo state ──
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // ── UI state ──
  const [expandedChannels, setExpandedChannels] = useState(new Set());
  const [expandedNotes,    setExpandedNotes]    = useState(new Set());
  const [selectedRowKey,   setSelectedRowKey]   = useState(null);

  // ── Dispatch with undo recording ──────────────────────────────────────────

  function dispatchWithUndo(action, description) {
    const snapshot = docRef.current;
    const { undoStack: newUndo, redoStack: newRedo } =
      pushUndo(undoStack, redoStack, snapshot, description);
    setUndoStack(newUndo);
    setRedoStack(newRedo);
    dispatch(action);
  }

  function handleUndo() {
    const result = applyUndo(undoStack, redoStack, docRef.current);
    if (!result) return;
    setUndoStack(result.undoStack);
    setRedoStack(result.redoStack);
    dispatch({ type: 'LOAD', doc: result.doc });
  }

  function handleRedo() {
    const result = applyRedo(undoStack, redoStack, docRef.current);
    if (!result) return;
    setUndoStack(result.undoStack);
    setRedoStack(result.redoStack);
    dispatch({ type: 'LOAD', doc: result.doc });
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' ||
          e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault(); handleRedo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoStack, redoStack]); // re-bind when stacks change

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
    dispatchWithUndo(
      { type: 'REORDER_ACTIONS', noteKey, oldIndex, newIndex },
      'Reorder actions'
    );
    setSelectedRowKey(null);
  }

  function editCell(noteKey, rowIndex, key, value) {
    const rows = docRef.current.noteActions.get(noteKey);
    const row  = rows?.[rowIndex];
    const fieldLabel = FIELDS.find(f => f.key === key)?.label ?? key;
    const noteNum    = row?.midi_note ?? '';
    dispatchWithUndo(
      { type: 'EDIT_CELL', noteKey, rowIndex, key, value },
      `Edit Note ${noteNum} ${fieldLabel}`
    );
  }

  function deleteActionRow(noteKey, rowIndex) {
    const rows = docRef.current.noteActions.get(noteKey);
    const row  = rows?.[rowIndex];
    if (!row) return;
    const ch = row.midi_channel === 16 ? 'Omni' : `Ch ${row.midi_channel}`;
    dispatchWithUndo(
      { type: 'DELETE_ACTION_ROW', noteKey, rowIndex },
      `Delete Action — Note ${row.midi_note} ${ch}`
    );
    // Update or clear selection
    if (selectedRowKey) {
      const parts = selectedRowKey.split(':');
      const selNoteKey = `${parts[0]}:${parts[1]}`;
      const selIdx     = Number(parts[2]);
      if (selNoteKey === noteKey) {
        if (selIdx === rowIndex) {
          setSelectedRowKey(null);
        } else if (selIdx > rowIndex) {
          setSelectedRowKey(`${noteKey}:${selIdx - 1}`);
        }
      }
    }
  }

  function moveRowChannel(noteKey, rowIndex, newChannel) {
    const rows = docRef.current.noteActions.get(noteKey);
    const row  = rows?.[rowIndex];
    if (!row) return;
    const newNoteKey   = `${newChannel}:${row.midi_note}`;
    if (noteKey === newNoteKey) return;
    const newRowIndex  = docRef.current.noteActions.get(newNoteKey)?.length ?? 0;
    dispatchWithUndo(
      { type: 'MOVE_ROW', noteKey, rowIndex, newChannel },
      `Move Note ${row.midi_note} to Ch ${newChannel === 16 ? 'Omni' : newChannel}`
    );
    setSelectedRowKey(`${newNoteKey}:${newRowIndex}`);
  }

  // ── Derive selected row ───────────────────────────────────────────────────

  let selectedRow      = null;
  let selectedNoteKey  = null;
  let selectedRowIndex = null;

  if (selectedRowKey) {
    const parts = selectedRowKey.split(':');
    selectedNoteKey  = `${parts[0]}:${parts[1]}`;
    selectedRowIndex = Number(parts[2]);
    const rows = doc.noteActions.get(selectedNoteKey);
    selectedRow = rows?.[selectedRowIndex] ?? null;
    if (!selectedRow) {
      // Row no longer exists (e.g. after undo of add)
      selectedNoteKey  = null;
      selectedRowIndex = null;
    }
  }

  function onDetailCommit(key, value) {
    if (key === 'midi_channel') {
      moveRowChannel(selectedNoteKey, selectedRowIndex, value);
    } else {
      editCell(selectedNoteKey, selectedRowIndex, key, value);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const presetLabel   = String(doc.presetNumber).padStart(4, '0');
  const undoTip       = undoLabel(undoStack);
  const redoTip       = redoLabel(redoStack);

  return (
    <div className="app">
      {/* Toolbar */}
      <div className="toolbar">
        WTPro Editor
        <span className="toolbar-preset">set_{presetLabel}.csv</span>
        <span className="toolbar-sep" />
        <button
          className="toolbar-btn"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          title={undoTip ?? 'Nothing to undo'}
        >
          ↩ Undo
        </button>
        <button
          className="toolbar-btn"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          title={redoTip ?? 'Nothing to redo'}
        >
          ↪ Redo
        </button>
      </div>

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
      />

      <DetailPanel
        row={selectedRow}
        onCommit={onDetailCommit}
      />
    </div>
  );
}
