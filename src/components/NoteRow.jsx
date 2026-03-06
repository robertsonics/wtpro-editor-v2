import { ACTION_TYPE_COLORS, noteName } from '../schema/fieldSchema.js';

/**
 * Level-2 tree row: note expand/collapse header.
 * Shows note label, action count badge, colour dots, and Add/Delete buttons.
 */
export default function NoteRow({ noteKey, noteNum, rows, expanded, onToggle, onAddAction, onDeleteNote }) {
  const MAX_ACTIONS = 8;
  const canAdd = rows.length < MAX_ACTIONS;

  return (
    <div className="note-row" onClick={onToggle}>
      <span className={`chevron${expanded ? ' open' : ''}`}>▶</span>

      <span className="note-label">
        {noteNum}&nbsp;&nbsp;{noteName(noteNum)}
      </span>

      <span className="badge">
        {rows.length} {rows.length === 1 ? 'action' : 'actions'}
      </span>

      {/* One colour dot per action row */}
      <span className="dot-row" onClick={e => e.stopPropagation()}>
        {rows.map((row, i) => (
          <span
            key={i}
            className="dot"
            style={{ background: ACTION_TYPE_COLORS[row.action_type] ?? '#888' }}
            title={row.action_type}
          />
        ))}
      </span>

      <span style={{ flex: 1 }} />

      <button
        className="btn-sm"
        disabled={!canAdd}
        title={canAdd ? 'Add action' : 'Maximum 8 actions per note'}
        onClick={e => { e.stopPropagation(); onAddAction(); }}
      >
        + Add Action
      </button>

      <button
        className="btn-sm btn-delete"
        title="Delete this note and all its actions"
        onClick={e => { e.stopPropagation(); onDeleteNote(); }}
      >
        × Delete Note
      </button>
    </div>
  );
}
