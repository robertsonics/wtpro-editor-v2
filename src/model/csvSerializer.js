import { ACTIVE_COLS } from '../schema/fieldSchema.js';

// 16 commas = 17 empty fields (blank separator row)
const BLANK_ROW = ',,,,,,,,,,,,,,,,';

/**
 * Serialize a single value to a CSV field string.
 */
function serializeVal(v) {
  if (v === '' || v === null || v === undefined) return '';
  return String(v);
}

/**
 * Serialize a DataRow object to a CSV line (no line ending).
 * Inactive columns (per action type) are written as empty string.
 * @param {object} row
 * @returns {string}
 */
function serializeDataRow(row) {
  const active = ACTIVE_COLS[row.action_type] ?? new Set();
  const f = (colIdx, val) => active.has(colIdx) ? serializeVal(val) : '';

  const fields = [
    '#NOTE',
    f(1,  row.midi_note),
    f(2,  row.midi_channel),
    serializeVal(row.action_type), // col 3 always written
    f(4,  row.track_preset),
    f(5,  row.pitch_offset),
    f(6,  row.attack_ms),
    f(7,  row.release_ms),
    f(8,  row.loop_flag),
    f(9,  row.lock_flag),
    f(10, row.pitch_bend_flag),
    f(11, row.min_velocity),
    f(12, row.max_velocity),
    f(13, row.min_vel_gain),
    f(14, row.max_vel_gain),
    f(15, row.balance),
    f(16, row.comment),
  ];

  return fields.join(',');
}

/**
 * Serialize a comment line.
 * Blank/all-comma lines → standard blank row.
 * All other lines → verbatim (raw CSV line as stored).
 * @param {string} line
 * @returns {string}
 */
function serializeCommentLine(line) {
  if (line === '' || /^,*$/.test(line)) return BLANK_ROW;
  return line;
}

/**
 * Return noteActions entries sorted for output:
 *   Primary:   channel ascending, Omni (16) last
 *   Secondary: note ascending
 *   Tertiary:  original (user drag-and-drop) order within each note group
 * @param {Map<string, object[]>} noteActions
 * @returns {Array<[string, object[]]>}
 */
function getSortedEntries(noteActions) {
  const entries = [...noteActions.entries()];
  entries.sort(([keyA], [keyB]) => {
    const [chanA, noteA] = keyA.split(':').map(Number);
    const [chanB, noteB] = keyB.split(':').map(Number);
    // Treat channel 16 (Omni) as 17 so it sorts last
    const sortA = chanA === 16 ? 17 : chanA;
    const sortB = chanB === 16 ? 17 : chanB;
    if (sortA !== sortB) return sortA - sortB;
    return noteA - noteB;
  });
  return entries;
}

/**
 * Serialize document state to a CSV string with CRLF line endings.
 *
 * Output order:
 *   1. All comment lines (in display order)
 *   2. One blank separator row
 *   3. All #NOTE rows sorted by channel (Omni last), then note, then user order
 *
 * @param {{ comments: string[], noteActions: Map<string, object[]> }} doc
 * @returns {string}  CSV text with CRLF line endings and trailing CRLF
 */
export function serializeCsv({ comments, noteActions }) {
  const lines = [];

  // 1. Comment section (verbatim lines)
  for (const line of comments) {
    lines.push(serializeCommentLine(line));
  }

  // 2. Blank separator
  lines.push(BLANK_ROW);

  // 3. Sorted data rows
  for (const [, rows] of getSortedEntries(noteActions)) {
    for (const row of rows) {
      lines.push(serializeDataRow(row));
    }
  }

  return lines.join('\r\n') + '\r\n';
}
