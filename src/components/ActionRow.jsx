import { ACTIVE_COLS, ACTION_TYPE_COLORS, noteName } from '../schema/fieldSchema.js';

/**
 * Renders a single read-only action row in the grid.
 * Left border is coloured by action type.
 */
export default function ActionRow({ row, rowKey, selected, onSelect }) {
  const active = ACTIVE_COLS[row.action_type] ?? new Set();
  const color  = ACTION_TYPE_COLORS[row.action_type] ?? '#888888';

  // Returns the string value for an active column, '' for inactive
  const val = (colIdx, raw) => {
    if (!active.has(colIdx)) return '';
    if (raw === '' || raw == null) return '';
    return String(raw);
  };

  // Flag columns: show ☑/☐ when active
  const flag = (colIdx, raw) => {
    if (!active.has(colIdx)) return '';
    return raw === 1 ? '☑' : '☐';
  };

  // Extra class for inactive cells
  const cls = (colIdx) => active.has(colIdx) ? '' : 'cell-disabled';

  const chanDisplay = active.has(2)
    ? (row.midi_channel === 16 ? 'Omni' : String(row.midi_channel))
    : '';

  const noteDisplay = active.has(1)
    ? `${row.midi_note}  ${noteName(row.midi_note)}`
    : '';

  return (
    <div
      className={`action-row${selected ? ' selected' : ''}`}
      style={{ borderLeft: `3px solid ${color}` }}
      onClick={onSelect}
    >
      {/* Drag handle (not interactive yet) */}
      <div className="cell col-drag drag-handle">⠿</div>

      {/* Sticky columns */}
      <div className={`cell col-chan sticky-chan ${cls(2)}`}>{chanDisplay}</div>
      <div className={`cell col-note sticky-note ${cls(1)}`}>{noteDisplay}</div>
      <div className={`cell col-action sticky-action ${cls(3)}`}>{row.action_type}</div>

      {/* Scrolling columns */}
      <div className={`cell col-track  ${cls(4)}`}>{val(4, row.track_preset)}</div>
      <div className={`cell col-pitch  ${cls(5)}`}>{val(5, row.pitch_offset)}</div>
      <div className={`cell col-atk    ${cls(6)}`}>{val(6, row.attack_ms)}</div>
      <div className={`cell col-rel    ${cls(7)}`}>{val(7, row.release_ms)}</div>
      <div className={`cell col-loop   ${cls(8)}`}>{flag(8, row.loop_flag)}</div>
      <div className={`cell col-lock   ${cls(9)}`}>{flag(9, row.lock_flag)}</div>
      <div className={`cell col-bend   ${cls(10)}`}>{flag(10, row.pitch_bend_flag)}</div>
      <div className={`cell col-minv   ${cls(11)}`}>{val(11, row.min_velocity)}</div>
      <div className={`cell col-maxv   ${cls(12)}`}>{val(12, row.max_velocity)}</div>
      <div className={`cell col-ming   ${cls(13)}`}>{val(13, row.min_vel_gain)}</div>
      <div className={`cell col-maxg   ${cls(14)}`}>{val(14, row.max_vel_gain)}</div>
      <div className={`cell col-bal    ${cls(15)}`}>{val(15, row.balance)}</div>
      <div className={`cell col-cmt    ${cls(16)}`}>{val(16, row.comment)}</div>
    </div>
  );
}
