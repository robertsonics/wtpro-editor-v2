import { useState } from 'react';
import { noteName } from '../schema/fieldSchema.js';

/**
 * Props:
 *   noteActions   Map<string, DataRow[]>
 *   onAddNote     (channel: number, note: number) => void
 */
export default function AddNoteControl({ noteActions, onAddNote }) {
  const [channel, setChannel] = useState(16); // default: Omni
  const [note,    setNote]    = useState(60);

  const noteNum    = Math.max(0, Math.min(127, note));
  const noteKey    = `${channel}:${noteNum}`;
  const isDuplicate = noteActions.has(noteKey);
  const isValid    = Number.isInteger(note) && note >= 0 && note <= 127;
  const canAdd     = isValid && !isDuplicate;

  function handleAdd() {
    if (!canAdd) return;
    onAddNote(channel, noteNum);
  }

  return (
    <div className="add-note-control">
      <span className="add-note-label">Add Note</span>

      <label className="add-note-field-label">Chan</label>
      <select
        className="add-note-select"
        value={channel}
        onChange={e => setChannel(Number(e.target.value))}
      >
        {Array.from({ length: 17 }, (_, i) => (
          <option key={i} value={i}>{i === 16 ? 'Omni' : i}</option>
        ))}
      </select>

      <label className="add-note-field-label">Note</label>
      <input
        type="number"
        className="add-note-input"
        min={0}
        max={127}
        value={note}
        onChange={e => setNote(Number(e.target.value))}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
      />
      <span className="add-note-name">
        {isValid ? noteName(noteNum) : '—'}
      </span>

      <button
        className="toolbar-btn"
        onClick={handleAdd}
        disabled={!canAdd}
        title={isDuplicate ? `${noteKey} already exists` : undefined}
      >
        + Add Note
      </button>

      {isDuplicate && (
        <span className="add-note-warn">already exists</span>
      )}
    </div>
  );
}
