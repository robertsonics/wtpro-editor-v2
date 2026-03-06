import { ACTION_TYPE_BY_CODE } from '../schema/fieldSchema.js';

/**
 * Split a single CSV line into fields, respecting double-quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

/**
 * Parse a #NOTE CSV row's fields into a DataRow object.
 * Empty strings are preserved as '' for inactive columns.
 * @param {string[]} fields  17-element array
 * @returns {object}
 */
function parseDataRow(fields) {
  const raw3 = String(fields[3] ?? '');
  const code = raw3.slice(0, 2);
  const actionType = ACTION_TYPE_BY_CODE[code] ?? raw3;

  const toInt = v => (v === '' || v == null) ? '' : parseInt(v, 10);
  const toFloat = v => (v === '' || v == null) ? '' : parseFloat(v);

  return {
    sentinel:        '#NOTE',
    midi_note:       parseInt(fields[1], 10),
    midi_channel:    parseInt(fields[2], 10),
    action_type:     actionType,
    track_preset:    toInt(fields[4]),
    pitch_offset:    toInt(fields[5]),
    attack_ms:       toInt(fields[6]),
    release_ms:      toInt(fields[7]),
    loop_flag:       toInt(fields[8]),
    lock_flag:       toInt(fields[9]),
    pitch_bend_flag: toInt(fields[10]),
    min_velocity:    toInt(fields[11]),
    max_velocity:    toInt(fields[12]),
    min_vel_gain:    toFloat(fields[13]),
    max_vel_gain:    toFloat(fields[14]),
    balance:         toInt(fields[15]),
    comment:         fields[16] ?? '',
  };
}

/**
 * Parse CSV file content into document state.
 *
 * COMMENT rows (col 0 ≠ '#NOTE'): stored verbatim in comments[].
 * DATA rows (col 0 = '#NOTE'): parsed and grouped into noteActions Map.
 *
 * @param {string} csvText   Raw CSV text (CRLF or LF line endings)
 * @param {number} [presetNumber=1]
 * @returns {{ presetNumber: number, comments: string[], noteActions: Map<string, object[]> }}
 */
export function parseCsv(csvText, presetNumber = 1) {
  const lines = csvText.split(/\r?\n/);

  // Strip trailing empty line produced by a final newline
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const comments = [];
  // Map key: "channel:noteNum", e.g. "16:60"
  const noteActions = new Map();

  for (const line of lines) {
    // Fast path: data rows start with '#NOTE'
    if (line.startsWith('#NOTE')) {
      const fields = splitCsvLine(line);
      if (fields[0] === '#NOTE') {
        const row = parseDataRow(fields);
        const key = `${row.midi_channel}:${row.midi_note}`;
        if (!noteActions.has(key)) {
          noteActions.set(key, []);
        }
        noteActions.get(key).push(row);
        continue;
      }
    }
    comments.push(line);
  }

  return { presetNumber, comments, noteActions };
}

/**
 * Extract a 1–9999 preset number from a filename like "set_0001.csv".
 * Returns 1 if no match.
 * @param {string} filename
 * @returns {number}
 */
export function parsePresetNumber(filename) {
  const m = String(filename).match(/set_(\d{4})\.csv$/i);
  return m ? parseInt(m[1], 10) : 1;
}
