import { useReducer, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { parseCsv } from './model/csvParser.js';
import { SAMPLE_CSV, SAMPLE_PRESET_NUMBER } from './fixtures/sampleCsv.js';
import NoteTree from './components/NoteTree.jsx';
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

    default:
      return state;
  }
}

// Parse the sample CSV once at module load time as the initial document
const initialDoc = parseCsv(SAMPLE_CSV, SAMPLE_PRESET_NUMBER);

// ── App component ─────────────────────────────────────────────────────────────

export default function App() {
  // ── Document state (useReducer) ──
  const [doc, dispatch] = useReducer(docReducer, initialDoc);

  // ── UI state (useState) ──
  // MANDATORY: always replace Set; never mutate in place
  const [expandedChannels, setExpandedChannels] = useState(new Set());
  const [expandedNotes,    setExpandedNotes]    = useState(new Set());
  const [selectedRowKey,   setSelectedRowKey]   = useState(null);

  // ── Expand/collapse handlers using the mandatory Set-replacement pattern ──

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

  function reorderActions(noteKey, oldIndex, newIndex) {
    dispatch({ type: 'REORDER_ACTIONS', noteKey, oldIndex, newIndex });
  }

  function editCell(noteKey, rowIndex, key, value) {
    dispatch({ type: 'EDIT_CELL', noteKey, rowIndex, key, value });
  }

  const presetLabel = String(doc.presetNumber).padStart(4, '0');

  return (
    <div className="app">
      {/* Minimal toolbar */}
      <div className="toolbar">
        WTPro Editor
        <span className="toolbar-preset">set_{presetLabel}.csv</span>
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
      />
    </div>
  );
}
