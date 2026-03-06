import { ACTION_TYPE_COLORS } from '../schema/fieldSchema.js';

/**
 * Level-1 tree row: channel expand/collapse header.
 * Shows channel label, note/action count badge, and unique action-type dots.
 */
export default function ChannelRow({ channel, noteCount, actionCount, actionTypes, expanded, onToggle }) {
  const label = channel === 16 ? 'Omni' : `Ch ${channel}`;
  const isEmpty = noteCount === 0;

  return (
    <div className="channel-row" onClick={onToggle}>
      <span className={`chevron${expanded ? ' open' : ''}`}>▶</span>

      <span className="channel-label">{label}</span>

      <span className={`badge${isEmpty ? ' empty' : ''}`}>
        {isEmpty
          ? 'empty'
          : `${noteCount} ${noteCount === 1 ? 'note' : 'notes'}, ${actionCount} ${actionCount === 1 ? 'action' : 'actions'}`
        }
      </span>

      {/* One dot per unique action type in this channel */}
      {!isEmpty && (
        <span className="dot-row">
          {[...actionTypes].map(type => (
            <span
              key={type}
              className="dot"
              style={{ background: ACTION_TYPE_COLORS[type] ?? '#888' }}
              title={type}
            />
          ))}
        </span>
      )}
    </div>
  );
}
