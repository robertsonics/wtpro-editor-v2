/**
 * Pure fill-sequential logic — no React dependencies, fully testable.
 */

export const DEFAULT_COPY_FIELDS = {
  attack_ms:       0,
  release_ms:      0,
  loop_flag:       0,
  lock_flag:       0,
  pitch_bend_flag: 0,
  min_velocity:    1,
  max_velocity:    127,
  min_vel_gain:    -20,
  max_vel_gain:    0,
  balance:         64,
};

/**
 * Compute a fill-sequential operation without applying it to React state.
 *
 * @param {Map<string, object[]>} noteActions  Current document noteActions.
 * @param {object} params
 *   fromNote         number   0–127
 *   toNote           number   0–127
 *   channel          number   0–16
 *   actionType       string
 *   startTrack       number   1–4095
 *   trackIncrement   number   >= 0
 *   startPitch       number   –700 to +700
 *   pitchIncrement   number
 *   copyFields       object   { attack_ms, release_ms, loop_flag, lock_flag,
 *                               pitch_bend_flag, min_velocity, max_velocity,
 *                               min_vel_gain, max_vel_gain, balance }
 *   conflictMode     'add' | 'replace'
 *
 * @returns {{ preview: object[], newNoteActions: Map }}
 *   preview[i] = { noteNum, channel, actionType, track, pitch, skipped }
 */
export function computeFill(noteActions, params) {
  const {
    fromNote, toNote, channel, actionType,
    startTrack, trackIncrement, startPitch, pitchIncrement,
    copyFields, conflictMode,
  } = params;

  const preview        = [];
  const newNoteActions = new Map(noteActions);
  const base           = copyFields ?? DEFAULT_COPY_FIELDS;

  const lo = Math.min(fromNote, toNote);
  const hi = Math.max(fromNote, toNote);

  for (let i = 0; i <= hi - lo; i++) {
    const noteNum = lo + i;
    const noteKey = `${channel}:${noteNum}`;
    const track   = startTrack + i * trackIncrement;
    const pitch   = startPitch + i * pitchIncrement;

    const existing = newNoteActions.get(noteKey) ?? [];

    if (conflictMode === 'add' && existing.length >= 8) {
      preview.push({ noteNum, channel, actionType, track, pitch, skipped: true });
      continue;
    }

    const newRow = {
      sentinel:        '#NOTE',
      midi_note:       noteNum,
      midi_channel:    channel,
      action_type:     actionType,
      track_preset:    track,
      pitch_offset:    pitch,
      attack_ms:       base.attack_ms,
      release_ms:      base.release_ms,
      loop_flag:       base.loop_flag,
      lock_flag:       base.lock_flag,
      pitch_bend_flag: base.pitch_bend_flag,
      min_velocity:    base.min_velocity,
      max_velocity:    base.max_velocity,
      min_vel_gain:    base.min_vel_gain,
      max_vel_gain:    base.max_vel_gain,
      balance:         base.balance,
      comment:         '',
    };

    const updatedRows = conflictMode === 'replace'
      ? [...existing.filter(r => r.action_type !== actionType), newRow]
      : [...existing, newRow];

    newNoteActions.set(noteKey, updatedRows);
    preview.push({ noteNum, channel, actionType, track, pitch, skipped: false });
  }

  return { preview, newNoteActions };
}
