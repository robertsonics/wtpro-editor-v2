import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ACTIVE_COLS, ACTION_TYPE_COLORS, FIELDS, noteName } from '../schema/fieldSchema.js';
import CellEditor from './CellEditor.jsx';

// Pre-index FIELDS by column index for fast lookup
const FIELD_BY_INDEX = Object.fromEntries(FIELDS.map(f => [f.index, f]));

// track_preset field adjusted for action type
function trackField(actionType) {
  const base = FIELD_BY_INDEX[4];
  return actionType === '07 - Load Preset'
    ? { ...base, max: 9999 }
    : { ...base, max: 4095 };
}

/**
 * A single action grid row with a drag handle for reordering within its note group.
 *
 * Props:
 *   id        string   Sortable ID: "chan:note:idx" (e.g. "16:59:0")
 *   row       DataRow
 *   rowKey    string   Same as id
 *   selected  boolean
 *   onSelect  () => void
 *   onCommit  (key, value) => void
 */
export default function ActionRow({ id, row, rowKey, selected, onSelect, onCommit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const active = ACTIVE_COLS[row.action_type] ?? new Set();
  const color  = ACTION_TYPE_COLORS[row.action_type] ?? '#888888';

  const style = {
    borderLeft:  `3px solid ${color}`,
    transform:   CSS.Transform.toString(transform),
    transition,
    opacity:     isDragging ? 0.4 : undefined,
    zIndex:      isDragging ? 10 : undefined,
    position:    isDragging ? 'relative' : undefined,
  };

  const isActive = idx => active.has(idx);

  // Chan and Note are read-only in the grid (they define the group key)
  const chanDisplay = row.midi_channel === 16 ? 'Omni' : String(row.midi_channel);
  const noteDisplay = `${row.midi_note}  ${noteName(row.midi_note)}`;

  function commit(key, value) {
    if (onCommit) onCommit(key, value);
  }

  return (
    <div
      ref={setNodeRef}
      className={`action-row${selected ? ' selected' : ''}`}
      style={style}
      {...attributes}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div
        ref={setActivatorNodeRef}
        className="cell col-drag drag-handle"
        {...listeners}
      >
        ⠿
      </div>

      {/* Sticky read-only columns — chan and note define the group key */}
      <div className="cell col-chan sticky-chan">{chanDisplay}</div>
      <div className="cell col-note sticky-note">{noteDisplay}</div>

      {/* Action type — editable enum, sticky */}
      <div className="cell col-action sticky-action cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[3]}
          value={row.action_type}
          active={isActive(3)}
          onCommit={v => commit('action_type', v)}
        />
      </div>

      {/* Scrolling columns */}
      <div className="cell col-track cell-editable">
        <CellEditor
          field={trackField(row.action_type)}
          value={row.track_preset}
          active={isActive(4)}
          onCommit={v => commit('track_preset', v)}
        />
      </div>
      <div className="cell col-pitch cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[5]}
          value={row.pitch_offset}
          active={isActive(5)}
          onCommit={v => commit('pitch_offset', v)}
        />
      </div>
      <div className="cell col-atk cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[6]}
          value={row.attack_ms}
          active={isActive(6)}
          onCommit={v => commit('attack_ms', v)}
        />
      </div>
      <div className="cell col-rel cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[7]}
          value={row.release_ms}
          active={isActive(7)}
          onCommit={v => commit('release_ms', v)}
        />
      </div>
      <div className="cell col-loop cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[8]}
          value={row.loop_flag}
          active={isActive(8)}
          onCommit={v => commit('loop_flag', v)}
        />
      </div>
      <div className="cell col-lock cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[9]}
          value={row.lock_flag}
          active={isActive(9)}
          onCommit={v => commit('lock_flag', v)}
        />
      </div>
      <div className="cell col-bend cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[10]}
          value={row.pitch_bend_flag}
          active={isActive(10)}
          onCommit={v => commit('pitch_bend_flag', v)}
        />
      </div>
      <div className="cell col-minv cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[11]}
          value={row.min_velocity}
          active={isActive(11)}
          onCommit={v => commit('min_velocity', v)}
        />
      </div>
      <div className="cell col-maxv cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[12]}
          value={row.max_velocity}
          active={isActive(12)}
          onCommit={v => commit('max_velocity', v)}
        />
      </div>
      <div className="cell col-ming cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[13]}
          value={row.min_vel_gain}
          active={isActive(13)}
          onCommit={v => commit('min_vel_gain', v)}
          isGain
        />
      </div>
      <div className="cell col-maxg cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[14]}
          value={row.max_vel_gain}
          active={isActive(14)}
          onCommit={v => commit('max_vel_gain', v)}
          isGain
        />
      </div>
      <div className="cell col-bal cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[15]}
          value={row.balance}
          active={isActive(15)}
          onCommit={v => commit('balance', v)}
        />
      </div>
      <div className="cell col-cmt cell-editable">
        <CellEditor
          field={FIELD_BY_INDEX[16]}
          value={row.comment}
          active={isActive(16)}
          onCommit={v => commit('comment', v)}
        />
      </div>
    </div>
  );
}
