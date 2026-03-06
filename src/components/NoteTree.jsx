import { Fragment } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ChannelRow from './ChannelRow.jsx';
import NoteRow from './NoteRow.jsx';
import ActionRow from './ActionRow.jsx';

// Channel display order: Omni (16) first, then 0–15
const CHANNEL_ORDER = [16, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/**
 * The three-level Channel → Note → Action tree with drag-and-drop reorder.
 *
 * Props:
 *   noteActions        Map<"chan:note", DataRow[]>
 *   expandedChannels   Set<number>
 *   expandedNotes      Set<string>
 *   selectedRowKey     string | null
 *   onToggleChannel    (ch: number) => void
 *   onToggleNote       (key: string) => void
 *   onSelectRow        (key: string | null) => void
 *   onReorderActions   (noteKey: string, oldIndex: number, newIndex: number) => void
 */
export default function NoteTree({
  noteActions,
  expandedChannels,
  expandedNotes,
  selectedRowKey,
  onToggleChannel,
  onToggleNote,
  onSelectRow,
  onReorderActions,
  onEditCell,
  onDeleteActionRow,
}) {
  // Activate drag only after 5px movement so row-clicks still select rows
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;

    // Row IDs are "chan:note:idx" — split to get noteKey and indices
    const aParts = String(active.id).split(':');
    const oParts = String(over.id).split(':');
    const activeNoteKey = `${aParts[0]}:${aParts[1]}`;
    const overNoteKey   = `${oParts[0]}:${oParts[1]}`;

    // Reject cross-note-group drags
    if (activeNoteKey !== overNoteKey) return;

    onReorderActions(activeNoteKey, Number(aParts[2]), Number(oParts[2]));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="tree-scroller">
        <div className="tree-inner">

          {/* ── Grid column header ───────────────────────────────────────── */}
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
            <div className="cell col-cmt" style={{ flex: 1, minWidth: '100px' }}>Cmt</div>
          </div>

          {/* ── Channel rows ─────────────────────────────────────────────── */}
          {CHANNEL_ORDER.map(ch => {
            // Collect and sort note keys for this channel
            const noteKeys = [];
            for (const key of noteActions.keys()) {
              if (Number(key.split(':')[0]) === ch) noteKeys.push(key);
            }
            noteKeys.sort((a, b) => Number(a.split(':')[1]) - Number(b.split(':')[1]));

            const actionCount = noteKeys.reduce(
              (n, k) => n + (noteActions.get(k)?.length ?? 0), 0
            );

            const actionTypes = new Set();
            for (const k of noteKeys) {
              for (const row of noteActions.get(k)) actionTypes.add(row.action_type);
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
                  const noteNum     = Number(noteKey.split(':')[1]);
                  const rows        = noteActions.get(noteKey);
                  const noteExpanded = expandedNotes.has(noteKey);
                  // IDs for this note group: "chan:note:0", "chan:note:1", …
                  const sortableIds = rows.map((_, i) => `${noteKey}:${i}`);

                  return (
                    <Fragment key={noteKey}>
                      <NoteRow
                        noteKey={noteKey}
                        noteNum={noteNum}
                        rows={rows}
                        expanded={noteExpanded}
                        onToggle={() => onToggleNote(noteKey)}
                      />

                      {noteExpanded && (
                        <SortableContext
                          items={sortableIds}
                          strategy={verticalListSortingStrategy}
                        >
                          {rows.map((row, idx) => {
                            const rowKey = `${noteKey}:${idx}`;
                            return (
                              <ActionRow
                                key={rowKey}
                                id={rowKey}
                                row={row}
                                rowKey={rowKey}
                                selected={selectedRowKey === rowKey}
                                onSelect={() => onSelectRow(rowKey)}
                                onCommit={(key, value) => onEditCell(noteKey, idx, key, value)}
                                onDelete={() => onDeleteActionRow(noteKey, idx)}
                              />
                            );
                          })}
                        </SortableContext>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}

        </div>
      </div>
    </DndContext>
  );
}
