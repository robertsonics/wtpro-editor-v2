export const ACTION_TYPES = [
  '01 - Play Note',
  '02 - Trigger Type 1',
  '03 - Trigger Type 2',
  '04 - Trigger Type 3',
  '05 - Stop Track',
  '06 - Stop All',
  '07 - Load Preset',
];

// Map from leading 2-digit code to full label string
export const ACTION_TYPE_BY_CODE = Object.fromEntries(
  ACTION_TYPES.map(t => [t.slice(0, 2), t])
);

export const ACTION_TYPE_COLORS = {
  '01 - Play Note':      '#4a9eff',
  '02 - Trigger Type 1': '#4adf7f',
  '03 - Trigger Type 2': '#4adfd0',
  '04 - Trigger Type 3': '#a04adf',
  '05 - Stop Track':     '#df8f4a',
  '06 - Stop All':       '#df4a4a',
  '07 - Load Preset':    '#dfdf4a',
};

// Which column indices are active (editable) for each action type.
// Col 0 (sentinel) never shown. Col 3 (action_type) always active but handled separately.
export const ACTIVE_COLS = {
  '01 - Play Note':      new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]),
  '02 - Trigger Type 1': new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]),
  '03 - Trigger Type 2': new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]),
  '04 - Trigger Type 3': new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]),
  '05 - Stop Track':     new Set([1,2,3,4,7]),
  '06 - Stop All':       new Set([1,2,3]),
  '07 - Load Preset':    new Set([1,2,3,4]),
};

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const noteName = n => NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);

// Column definitions (indices 0–16)
export const FIELDS = [
  { index: 0,  key: 'sentinel',         type: 'fixed',   label: '' },
  { index: 1,  key: 'midi_note',        type: 'int',     label: 'Note',       min: 0,      max: 127 },
  { index: 2,  key: 'midi_channel',     type: 'int',     label: 'Chan',       min: 0,      max: 16 },
  { index: 3,  key: 'action_type',      type: 'enum',    label: 'Action',     values: ACTION_TYPES },
  { index: 4,  key: 'track_preset',     type: 'int',     label: 'Track',      min: 1,      max: 9999 },
  { index: 5,  key: 'pitch_offset',     type: 'int',     label: 'Pitch',      min: -700,   max: 700 },
  { index: 6,  key: 'attack_ms',        type: 'int',     label: 'Atk',        min: 0,      max: 99999 },
  { index: 7,  key: 'release_ms',       type: 'int',     label: 'Rel',        min: 0,      max: 99999 },
  { index: 8,  key: 'loop_flag',        type: 'flag',    label: 'Loop' },
  { index: 9,  key: 'lock_flag',        type: 'flag',    label: 'Lock' },
  { index: 10, key: 'pitch_bend_flag',  type: 'flag',    label: 'Pitch Bend' },
  { index: 11, key: 'min_velocity',     type: 'int',     label: 'MinV',       min: 0,      max: 127 },
  { index: 12, key: 'max_velocity',     type: 'int',     label: 'MaxV',       min: 0,      max: 127 },
  { index: 13, key: 'min_vel_gain',     type: 'float',   label: 'MinG',       min: -100.0, max: 0.0 },
  { index: 14, key: 'max_vel_gain',     type: 'float',   label: 'MaxG',       min: -100.0, max: 0.0 },
  { index: 15, key: 'balance',          type: 'balance', label: 'Bal',        min: 0,      max: 127 },
  { index: 16, key: 'comment',          type: 'text',    label: 'Cmt' },
];

/**
 * Validate a data row. Returns an array of error message strings.
 * Only active columns (per action type) are validated.
 * @param {object} row
 * @returns {string[]}
 */
export function validateRow(row) {
  const errors = [];
  const actionType = row.action_type;
  const active = ACTIVE_COLS[actionType] ?? new Set();

  function check(colIdx, condition, message) {
    if (active.has(colIdx) && !condition) errors.push(message);
  }

  // col 1: midi_note 0–127
  const note = row.midi_note;
  check(1, Number.isInteger(note) && note >= 0 && note <= 127, 'Note must be 0\u2013127');

  // col 2: midi_channel 0–16
  const chan = row.midi_channel;
  check(2, Number.isInteger(chan) && chan >= 0 && chan <= 16, 'Channel must be 0\u201316');

  // col 4: track (1–4095) or preset (1–9999) depending on action type
  if (active.has(4)) {
    const t = row.track_preset;
    if (actionType === '07 - Load Preset') {
      if (!Number.isInteger(t) || t < 1 || t > 9999) errors.push('Preset must be 1\u20139999');
    } else {
      if (!Number.isInteger(t) || t < 1 || t > 4095) errors.push('Track must be 1\u20134095');
    }
  }

  // col 5: pitch_offset –700 to +700
  const pitch = row.pitch_offset;
  check(5, Number.isInteger(pitch) && pitch >= -700 && pitch <= 700, 'Pitch must be \u2212700 to +700');

  // col 6: attack_ms 0–99999
  const atk = row.attack_ms;
  check(6, Number.isInteger(atk) && atk >= 0 && atk <= 99999, 'Attack must be 0\u201399999');

  // col 7: release_ms 0–99999
  const rel = row.release_ms;
  check(7, Number.isInteger(rel) && rel >= 0 && rel <= 99999, 'Release must be 0\u201399999');

  // cols 8–10: flags 0 or 1
  check(8,  row.loop_flag === 0 || row.loop_flag === 1, 'Loop flag must be 0 or 1');
  check(9,  row.lock_flag === 0 || row.lock_flag === 1, 'Lock flag must be 0 or 1');
  check(10, row.pitch_bend_flag === 0 || row.pitch_bend_flag === 1, 'Pitch Bend flag must be 0 or 1');

  // col 11: min_velocity 0–127
  const minVel = row.min_velocity;
  check(11, Number.isInteger(minVel) && minVel >= 0 && minVel <= 127, 'Min velocity must be 0\u2013127');

  // col 12: max_velocity 0–127
  const maxVel = row.max_velocity;
  check(12, Number.isInteger(maxVel) && maxVel >= 0 && maxVel <= 127, 'Max velocity must be 0\u2013127');

  // cross: min_velocity <= max_velocity
  if (active.has(11) && active.has(12) &&
      Number.isInteger(minVel) && Number.isInteger(maxVel) &&
      minVel > maxVel) {
    errors.push('Min velocity must be \u2264 max velocity');
  }

  // col 13: min_vel_gain –100 to 0
  const minGain = row.min_vel_gain;
  check(13, typeof minGain === 'number' && minGain >= -100 && minGain <= 0, 'Min gain must be \u2212100 to 0 dB');

  // col 14: max_vel_gain –100 to 0
  const maxGain = row.max_vel_gain;
  check(14, typeof maxGain === 'number' && maxGain >= -100 && maxGain <= 0, 'Max gain must be \u2212100 to 0 dB');

  // cross: min_vel_gain <= max_vel_gain (equal values valid)
  if (active.has(13) && active.has(14) &&
      typeof minGain === 'number' && typeof maxGain === 'number' &&
      minGain > maxGain) {
    errors.push('Min gain must be \u2264 max gain');
  }

  // col 15: balance 0–127
  const bal = row.balance;
  check(15, Number.isInteger(bal) && bal >= 0 && bal <= 127, 'Balance must be 0\u2013127');

  return errors;
}
