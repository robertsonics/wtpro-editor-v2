import { Fragment } from 'react';
import ChannelRow from './ChannelRow.jsx';
import NoteRow from './NoteRow.jsx';
import ActionRow from './ActionRow.jsx';

// Channel display order: Omni (16) first, then 0–15
const CHANNEL_ORDER = [16, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/**
 * The three-level Channel → Note → Action tree.
 *
 * Props:
 *   noteActions       Map<"chan:note", DataRow[]>
 *   expandedChannels  Set<number>
 *   expandedNotes     Set<string>
 *   selectedRowKey    string | null
 *   onToggleChannel   (ch: number) => void
 *   onToggleNote      (key: string) => void
 *   onSelectRow       (key: string | null) => void
 */
export default function NoteTree({
  noteActions,
  expandedChannels,
  expandedNotes,
  selectedRowKey,
  onToggleChannel,
  onToggleNote,
  onSelectRow,
}) {
  return (
    <div className="tree-scroller">
      <div className="tree-inner">

        {/* ── Grid column header ─────────────────────────────────────────── */}
        <div className="grid-header">
          <div className="cell col-drag" />
          <div className="cell col-chan  sticky-chan">Chan</div>
          <div className="cell col-note  sticky-note">Note</div>
          <div className="cell col-action sticky-action">Action</div>
          <div className="cell col-track">Track</div>
          <div className="cell col-pitch">Pitch</div>
          <div className="cell col-atk">Atk</div>
          <div className="cell col-rel">Rel</div>
          <div className="cell col-loop">Loop</div>
          <div className="cell col-lock">Lock</div>
          <div className="cell col-bend">Bend</div>
          <div className="cell col-minv">MinV</div>
          <div className="cell col-maxv">MaxV</div>
          <div className="cell col-ming">MinG</div>
          <div className="cell col-maxg">MaxG</div>
          <div className="cell col-bal">Bal</div>
          <div className="cell col-cmt">Cmt</div>
        </div>

        {/* ── Channel rows ───────────────────────────────────────────────── */}
        {CHANNEL_ORDER.map(ch => {
          // Collect and sort note keys for this channel
          const noteKeys = [];
          for (const key of noteActions.keys()) {
            const [chanStr] = key.split(':');
            if (Number(chanStr) === ch) noteKeys.push(key);
          }
          noteKeys.sort((a, b) => Number(a.split(':')[1]) - Number(b.split(':')[1]));

          const actionCount = noteKeys.reduce(
            (n, k) => n + (noteActions.get(k)?.length ?? 0), 0
          );

          // Unique action types across all notes in this channel
          const actionTypes = new Set();
          for (const k of noteKeys) {
            for (const row of noteActions.get(k)) {
              actionTypes.add(row.action_type);
            }
          }

          const isExpanded = expandedChannels.has(ch);

          return (
            <Fragment key={ch}>
              <ChannelRow
                channel={ch}
                noteCount={noteKeys.length}
                actionCount={actionCount}
                actionTypes={actionTypes}
                expanded={isExpanded}
                onToggle={() => onToggleChannel(ch)}
              />

              {isExpanded && noteKeys.map(noteKey => {
                const noteNum    = Number(noteKey.split(':')[1]);
                const rows       = noteActions.get(noteKey);
                const noteExpanded = expandedNotes.has(noteKey);

                return (
                  <Fragment key={noteKey}>
                    <NoteRow
                      noteKey={noteKey}
                      noteNum={noteNum}
                      rows={rows}
                      expanded={noteExpanded}
                      onToggle={() => onToggleNote(noteKey)}
                    />

                    {noteExpanded && rows.map((row, idx) => {
                      const rowKey = `${noteKey}:${idx}`;
                      return (
                        <ActionRow
                          key={rowKey}
                          row={row}
                          rowKey={rowKey}
                          selected={selectedRowKey === rowKey}
                          onSelect={() => onSelectRow(rowKey)}
                        />
                      );
                    })}
                  </Fragment>
                );
              })}
            </Fragment>
          );
        })}

      </div>
    </div>
  );
}
