import { describe, it, expect } from 'vitest';
import { validateRow } from '../schema/fieldSchema.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// A fully valid "01 - Play Note" row (all active columns in range)
const validPlayRow = {
  midi_note:       60,
  midi_channel:    0,
  action_type:     '01 - Play Note',
  track_preset:    60,
  pitch_offset:    0,
  attack_ms:       0,
  release_ms:      500,
  loop_flag:       0,
  lock_flag:       0,
  pitch_bend_flag: 0,
  min_velocity:    1,
  max_velocity:    127,
  min_vel_gain:    -20,
  max_vel_gain:    0,
  balance:         64,
  comment:         '',
};

// ─── Valid rows produce no errors ─────────────────────────────────────────────

describe('validateRow – valid rows', () => {
  it('returns no errors for a valid Play Note row', () => {
    expect(validateRow(validPlayRow)).toHaveLength(0);
  });

  it('returns no errors for boundary values (note 0, channel 0)', () => {
    expect(validateRow({ ...validPlayRow, midi_note: 0, midi_channel: 0 })).toHaveLength(0);
  });

  it('returns no errors for boundary values (note 127, channel 16)', () => {
    expect(validateRow({ ...validPlayRow, midi_note: 127, midi_channel: 16 })).toHaveLength(0);
  });

  it('returns no errors when min_vel_gain === max_vel_gain (fixed volume)', () => {
    expect(validateRow({ ...validPlayRow, min_vel_gain: -10, max_vel_gain: -10 })).toHaveLength(0);
  });

  it('returns no errors for a valid Stop Track row', () => {
    const row = {
      midi_note: 60, midi_channel: 0,
      action_type: '05 - Stop Track',
      track_preset: 1,
      release_ms: 0,
      // inactive cols:
      pitch_offset: '', attack_ms: '', loop_flag: '', lock_flag: '',
      pitch_bend_flag: '', min_velocity: '', max_velocity: '',
      min_vel_gain: '', max_vel_gain: '', balance: '', comment: '',
    };
    expect(validateRow(row)).toHaveLength(0);
  });

  it('returns no errors for a valid Stop All row', () => {
    const row = {
      midi_note: 89, midi_channel: 16,
      action_type: '06 - Stop All',
      // all other cols inactive
      track_preset: '', pitch_offset: '', attack_ms: '', release_ms: '',
      loop_flag: '', lock_flag: '', pitch_bend_flag: '',
      min_velocity: '', max_velocity: '', min_vel_gain: '', max_vel_gain: '',
      balance: '', comment: '',
    };
    expect(validateRow(row)).toHaveLength(0);
  });

  it('returns no errors for a valid Load Preset row', () => {
    const row = {
      midi_note: 41, midi_channel: 16,
      action_type: '07 - Load Preset',
      track_preset: 9999,
      // inactive cols:
      pitch_offset: '', attack_ms: '', release_ms: '', loop_flag: '',
      lock_flag: '', pitch_bend_flag: '', min_velocity: '', max_velocity: '',
      min_vel_gain: '', max_vel_gain: '', balance: '', comment: '',
    };
    expect(validateRow(row)).toHaveLength(0);
  });
});

// ─── Per-column bounds ────────────────────────────────────────────────────────

describe('validateRow – per-column bounds', () => {
  it('rejects midi_note < 0', () => {
    expect(validateRow({ ...validPlayRow, midi_note: -1 }).length).toBeGreaterThan(0);
  });

  it('rejects midi_note > 127', () => {
    expect(validateRow({ ...validPlayRow, midi_note: 128 }).length).toBeGreaterThan(0);
  });

  it('rejects midi_channel > 16', () => {
    expect(validateRow({ ...validPlayRow, midi_channel: 17 }).length).toBeGreaterThan(0);
  });

  it('rejects midi_channel < 0', () => {
    expect(validateRow({ ...validPlayRow, midi_channel: -1 }).length).toBeGreaterThan(0);
  });

  it('rejects pitch_offset < -700', () => {
    expect(validateRow({ ...validPlayRow, pitch_offset: -701 }).length).toBeGreaterThan(0);
  });

  it('rejects pitch_offset > 700', () => {
    expect(validateRow({ ...validPlayRow, pitch_offset: 701 }).length).toBeGreaterThan(0);
  });

  it('accepts pitch_offset at boundaries ±700', () => {
    expect(validateRow({ ...validPlayRow, pitch_offset: -700 })).toHaveLength(0);
    expect(validateRow({ ...validPlayRow, pitch_offset: 700 })).toHaveLength(0);
  });

  it('rejects attack_ms < 0', () => {
    expect(validateRow({ ...validPlayRow, attack_ms: -1 }).length).toBeGreaterThan(0);
  });

  it('rejects attack_ms > 99999', () => {
    expect(validateRow({ ...validPlayRow, attack_ms: 100000 }).length).toBeGreaterThan(0);
  });

  it('rejects release_ms > 99999', () => {
    expect(validateRow({ ...validPlayRow, release_ms: 100000 }).length).toBeGreaterThan(0);
  });

  it('rejects loop_flag value other than 0 or 1', () => {
    expect(validateRow({ ...validPlayRow, loop_flag: 2 }).length).toBeGreaterThan(0);
  });

  it('rejects min_velocity < 0', () => {
    expect(validateRow({ ...validPlayRow, min_velocity: -1 }).length).toBeGreaterThan(0);
  });

  it('rejects max_velocity > 127', () => {
    expect(validateRow({ ...validPlayRow, max_velocity: 128 }).length).toBeGreaterThan(0);
  });

  it('rejects min_vel_gain > 0', () => {
    expect(validateRow({ ...validPlayRow, min_vel_gain: 1 }).length).toBeGreaterThan(0);
  });

  it('rejects min_vel_gain < -100', () => {
    expect(validateRow({ ...validPlayRow, min_vel_gain: -101 }).length).toBeGreaterThan(0);
  });

  it('rejects max_vel_gain > 0', () => {
    expect(validateRow({ ...validPlayRow, max_vel_gain: 0.1 }).length).toBeGreaterThan(0);
  });

  it('rejects balance > 127', () => {
    expect(validateRow({ ...validPlayRow, balance: 128 }).length).toBeGreaterThan(0);
  });

  it('rejects balance < 0', () => {
    expect(validateRow({ ...validPlayRow, balance: -1 }).length).toBeGreaterThan(0);
  });
});

// ─── track_preset ranges by action type ──────────────────────────────────────

describe('validateRow – track_preset ranges', () => {
  it('rejects track_preset 0 for Play Note (min 1)', () => {
    expect(validateRow({ ...validPlayRow, track_preset: 0 }).length).toBeGreaterThan(0);
  });

  it('rejects track_preset > 4095 for actions 01–05', () => {
    expect(validateRow({ ...validPlayRow, track_preset: 4096 }).length).toBeGreaterThan(0);
  });

  it('accepts track_preset 4095 for actions 01–05', () => {
    expect(validateRow({ ...validPlayRow, track_preset: 4095 })).toHaveLength(0);
  });

  it('accepts track_preset 9999 for Load Preset', () => {
    const row = {
      midi_note: 41, midi_channel: 16,
      action_type: '07 - Load Preset',
      track_preset: 9999,
      pitch_offset: '', attack_ms: '', release_ms: '', loop_flag: '',
      lock_flag: '', pitch_bend_flag: '', min_velocity: '', max_velocity: '',
      min_vel_gain: '', max_vel_gain: '', balance: '', comment: '',
    };
    expect(validateRow(row)).toHaveLength(0);
  });

  it('rejects track_preset > 9999 for Load Preset', () => {
    const row = {
      midi_note: 41, midi_channel: 16,
      action_type: '07 - Load Preset',
      track_preset: 10000,
      pitch_offset: '', attack_ms: '', release_ms: '', loop_flag: '',
      lock_flag: '', pitch_bend_flag: '', min_velocity: '', max_velocity: '',
      min_vel_gain: '', max_vel_gain: '', balance: '', comment: '',
    };
    expect(validateRow(row).length).toBeGreaterThan(0);
  });
});

// ─── Inactive columns are not validated ──────────────────────────────────────

describe('validateRow – inactive columns not validated', () => {
  it('does not validate pitch_offset for Stop Track (col 5 inactive)', () => {
    const row = {
      midi_note: 60, midi_channel: 0,
      action_type: '05 - Stop Track',
      track_preset: 1,
      release_ms: 0,
      pitch_offset: -9999, // invalid value but inactive → no error
      attack_ms: -9999,
      loop_flag: 99, lock_flag: 99, pitch_bend_flag: 99,
      min_velocity: -99, max_velocity: -99,
      min_vel_gain: 999, max_vel_gain: -999,
      balance: -99, comment: '',
    };
    expect(validateRow(row)).toHaveLength(0);
  });

  it('does not validate any data fields for Stop All (only note/chan/action active)', () => {
    const row = {
      midi_note: 60, midi_channel: 0,
      action_type: '06 - Stop All',
      track_preset: -9999,
      pitch_offset: -9999, attack_ms: -9999, release_ms: -9999,
      loop_flag: 99, lock_flag: 99, pitch_bend_flag: 99,
      min_velocity: -99, max_velocity: 999,
      min_vel_gain: 999, max_vel_gain: -999,
      balance: -99, comment: '',
    };
    expect(validateRow(row)).toHaveLength(0);
  });
});

// ─── Cross-field validation ───────────────────────────────────────────────────

describe('validateRow – cross-field validation', () => {
  it('errors when min_velocity > max_velocity', () => {
    const errors = validateRow({ ...validPlayRow, min_velocity: 100, max_velocity: 50 });
    expect(errors.some(e => e.includes('velocity'))).toBe(true);
  });

  it('accepts min_velocity === max_velocity', () => {
    expect(validateRow({ ...validPlayRow, min_velocity: 64, max_velocity: 64 })).toHaveLength(0);
  });

  it('errors when min_vel_gain > max_vel_gain', () => {
    const errors = validateRow({ ...validPlayRow, min_vel_gain: -5, max_vel_gain: -10 });
    expect(errors.some(e => e.includes('gain'))).toBe(true);
  });

  it('accepts min_vel_gain === max_vel_gain (fixed volume)', () => {
    expect(validateRow({ ...validPlayRow, min_vel_gain: -10, max_vel_gain: -10 })).toHaveLength(0);
  });

  it('does not cross-validate velocity for Stop All (cols 11–12 inactive)', () => {
    const row = {
      midi_note: 60, midi_channel: 0,
      action_type: '06 - Stop All',
      min_velocity: 127, max_velocity: 0, // would be invalid if active
      track_preset: '', pitch_offset: '', attack_ms: '', release_ms: '',
      loop_flag: '', lock_flag: '', pitch_bend_flag: '',
      min_vel_gain: '', max_vel_gain: '', balance: '', comment: '',
    };
    expect(validateRow(row)).toHaveLength(0);
  });
});

