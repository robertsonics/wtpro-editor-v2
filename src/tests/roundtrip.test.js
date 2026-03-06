import { describe, it, expect } from 'vitest';
import { parseCsv, parsePresetNumber } from '../model/csvParser.js';
import { serializeCsv } from '../model/csvSerializer.js';
import { ACTIVE_COLS } from '../schema/fieldSchema.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

// Build a CSV string with CRLF from an array of line strings
const crlf = lines => lines.join('\r\n') + '\r\n';

// Minimal clean fixture: inactive columns are already '' in input
const CLEAN_CSV = crlf([
  'WAV Trigger Pro Preset file,,,,,,,,,,,,,,,,',
  'My preset comment,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,',
  '#NOTE,60,0,01 - Play Note,60,0,0,500,0,0,0,1,127,-20,0,64,',
  '#NOTE,61,0,01 - Play Note,61,100,10,500,1,0,1,10,120,-15,0,80,',
  '#NOTE,60,16,01 - Play Note,60,0,0,500,0,0,0,1,127,-20,0,64,',
  '#NOTE,59,16,06 - Stop All,,,,,,,,,,,,,,,',
  '#NOTE,41,16,07 - Load Preset,1,,,,,,,,,,,,',
]);

// Keyboards1_set_0001.csv from the spec (abridged to key rows)
const CSV_KEYBOARDS1 = crlf([
  'WAV Trigger Pro Preset file,,,,,,,,,,,,,,,,',
  '12/18/2024,,,,,,,,,,,,,,,,',
  'Comments:,Piano on any MIDI Channel,,,,,,,,,,,,,,,',
  ',Piano range extended two notes in each direction using pitch offset,,,,,,,,,,,,,,,',
  ',Four notes assigned to change presets,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,',
  ',,,Do not edit this block,,,,,,,,,,,,,',
  ',,,01 - Play Note,"Standard MIDI Note-On, Note-Off, velocity sensitive",,,,,,,,,,,,',
  ',,,02 - Trigger Type 1,One-shot; Ignores Note-Off; Layers multiple,,,,,,,,,,,,',
  ',,,03 - Trigger Type 2,One-shot; Ignores Note-Off; Cuts off previous,,,,,,,,,,,,',
  ',,,04 - Trigger Type 3,One-shot; Ignores Note-Off; Ignored if already playing,,,,,,,,,,,,',
  ',,,05 - Stop Track,Stops specified track,,,,,,,,,,,,',
  ',,,06 - Stop All,Stops all  tracks,,,,,,,,,,,,',
  ',,,07 - Load Preset,Loads a new preset,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,',
  'Command,Note,Chan,Action,Track/Preset,Pitch Offset (Cents),Attack (ms),Release (ms),Loop Flag,Lock Flag,Pitch Bend Flag,Min Vel,Max Vel,Min Vel Gain(dB),Max Vel Gain(dB),Balance,Comment',
  ',,,,,,,,,,,,,,,,',
  'The following note assignments are for the stereo piano on any MIDI channel,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,',
  '#NOTE,46,16,01 - Play Note,48,-200,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,47,16,01 - Play Note,48,-100,0,750,0,0,0,1,127,-20,0,64,',
  ',,,,,,,,,,,,,,,,',
  '#NOTE,48,16,01 - Play Note,48,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,49,16,01 - Play Note,49,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,50,16,01 - Play Note,50,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,51,16,01 - Play Note,51,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,52,16,01 - Play Note,52,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,53,16,01 - Play Note,53,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,54,16,01 - Play Note,54,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,55,16,01 - Play Note,55,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,56,16,01 - Play Note,56,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,57,16,01 - Play Note,57,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,58,16,01 - Play Note,58,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,59,16,01 - Play Note,59,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,60,16,01 - Play Note,60,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,61,16,01 - Play Note,61,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,62,16,01 - Play Note,62,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,63,16,01 - Play Note,63,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,64,16,01 - Play Note,64,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,65,16,01 - Play Note,65,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,66,16,01 - Play Note,66,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,67,16,01 - Play Note,67,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,68,16,01 - Play Note,68,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,69,16,01 - Play Note,69,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,70,16,01 - Play Note,70,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,71,16,01 - Play Note,71,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,72,16,01 - Play Note,72,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,73,16,01 - Play Note,73,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,74,16,01 - Play Note,74,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,75,16,01 - Play Note,75,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,76,16,01 - Play Note,76,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,77,16,01 - Play Note,77,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,78,16,01 - Play Note,78,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,79,16,01 - Play Note,79,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,80,16,01 - Play Note,80,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,81,16,01 - Play Note,81,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,82,16,01 - Play Note,82,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,83,16,01 - Play Note,83,0,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,84,16,01 - Play Note,84,0,0,750,0,0,0,1,127,-20,0,64,',
  ',,,,,,,,,,,,,,,,',
  '#NOTE,85,16,01 - Play Note,84,100,0,750,0,0,0,1,127,-20,0,64,',
  '#NOTE,86,16,01 - Play Note,84,200,0,750,0,0,0,1,127,-20,0,64,',
  ',,,,,,,,,,,,,,,,',
  'The following note assignments allow for changing among all 4 presets from the keyboard,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,',
  '#NOTE,41,16,07 - Load Preset,1,0,0,0,0,0,0,1,127,-20,0,64,',
  '#NOTE,42,16,07 - Load Preset,2,0,0,0,0,0,0,1,127,-20,0,64,',
  '#NOTE,43,16,07 - Load Preset,3,0,0,0,0,0,0,1,127,-20,0,64,',
  '#NOTE,44,16,07 - Load Preset,4,0,0,0,0,0,0,1,127,-20,0,64,',
]);

// Multi-channel fixture for sort-order testing (ch 0, ch 5, ch 16)
const CSV_MULTICHAN = crlf([
  'Test preset,,,,,,,,,,,,,,,,',
  '#NOTE,60,16,01 - Play Note,60,0,0,500,0,0,0,1,127,-20,0,64,',
  '#NOTE,60,0,01 - Play Note,60,0,0,500,0,0,0,1,127,-20,0,64,',
  '#NOTE,62,0,01 - Play Note,62,0,0,500,0,0,0,1,127,-20,0,64,',
  '#NOTE,61,5,01 - Play Note,61,0,0,500,0,0,0,1,127,-20,0,64,',
  '#NOTE,59,0,01 - Play Note,59,0,0,500,0,0,0,1,127,-20,0,64,',
]);

// ─── parsePresetNumber ────────────────────────────────────────────────────────

describe('parsePresetNumber', () => {
  it('extracts preset number from standard filename', () => {
    expect(parsePresetNumber('set_0001.csv')).toBe(1);
    expect(parsePresetNumber('set_9999.csv')).toBe(9999);
    expect(parsePresetNumber('set_0042.csv')).toBe(42);
    expect(parsePresetNumber('Keyboards1_set_0004.csv')).toBe(4);
  });

  it('returns 1 for unrecognised filenames', () => {
    expect(parsePresetNumber('myfile.csv')).toBe(1);
    expect(parsePresetNumber('')).toBe(1);
  });
});

// ─── parseCsv – comment/data splitting ───────────────────────────────────────

describe('parseCsv – comment and data row splitting', () => {
  it('splits Keyboards1 into correct comment and data row counts', () => {
    const { comments, noteActions } = parseCsv(CSV_KEYBOARDS1, 1);
    // 19 header lines + 5 interleaved blank/text lines = 24 comment rows
    expect(comments).toHaveLength(24);
    // 45 unique channel:note pairs (all on ch 16)
    expect(noteActions.size).toBe(45);
  });

  it('parses presetNumber passthrough', () => {
    const { presetNumber } = parseCsv(CSV_KEYBOARDS1, 42);
    expect(presetNumber).toBe(42);
  });

  it('handles LF line endings as well as CRLF', () => {
    const lf = CSV_KEYBOARDS1.replace(/\r\n/g, '\n');
    const { noteActions } = parseCsv(lf, 1);
    expect(noteActions.size).toBe(45);
  });
});

// ─── parseCsv – field values ──────────────────────────────────────────────────

describe('parseCsv – field values', () => {
  it('parses integer fields correctly', () => {
    const { noteActions } = parseCsv(CSV_KEYBOARDS1);
    const row = noteActions.get('16:60')[0];
    expect(row.midi_note).toBe(60);
    expect(row.midi_channel).toBe(16);
    expect(row.action_type).toBe('01 - Play Note');
    expect(row.track_preset).toBe(60);
    expect(row.pitch_offset).toBe(0);
    expect(row.attack_ms).toBe(0);
    expect(row.release_ms).toBe(750);
    expect(row.loop_flag).toBe(0);
    expect(row.lock_flag).toBe(0);
    expect(row.pitch_bend_flag).toBe(0);
    expect(row.min_velocity).toBe(1);
    expect(row.max_velocity).toBe(127);
    expect(row.balance).toBe(64);
  });

  it('parses float fields correctly', () => {
    const { noteActions } = parseCsv(CSV_KEYBOARDS1);
    const row = noteActions.get('16:60')[0];
    expect(row.min_vel_gain).toBe(-20);
    expect(row.max_vel_gain).toBe(0);
  });

  it('parses pitch offset fields correctly (note 46, -200 cents)', () => {
    const { noteActions } = parseCsv(CSV_KEYBOARDS1);
    const row = noteActions.get('16:46')[0];
    expect(row.pitch_offset).toBe(-200);
    expect(row.track_preset).toBe(48);
  });

  it('maps action type from leading 2-digit code', () => {
    const { noteActions } = parseCsv(CSV_KEYBOARDS1);
    const loadRow = noteActions.get('16:41')[0];
    expect(loadRow.action_type).toBe('07 - Load Preset');
    expect(loadRow.track_preset).toBe(1);
  });

  it('groups multiple actions under same channel:note key', () => {
    const csv = crlf([
      '#NOTE,59,16,02 - Trigger Type 1,1,0,0,0,0,0,0,1,16,0,0,8,',
      '#NOTE,59,16,02 - Trigger Type 1,2,0,0,0,0,0,0,17,32,0,0,24,',
      '#NOTE,59,16,02 - Trigger Type 1,3,0,0,0,0,0,0,33,48,0,0,40,',
    ]);
    const { noteActions } = parseCsv(csv);
    expect(noteActions.get('16:59')).toHaveLength(3);
    expect(noteActions.get('16:59')[0].track_preset).toBe(1);
    expect(noteActions.get('16:59')[2].track_preset).toBe(3);
  });

  it('handles quoted fields in comment rows', () => {
    const csv = crlf([
      '"Note 59 is velocity mapped to tracks, panned left to right",,,,,,,,,,,,,,,,',
      '#NOTE,59,16,02 - Trigger Type 1,1,0,0,0,0,0,0,1,16,0,0,8,',
    ]);
    const { comments, noteActions } = parseCsv(csv);
    expect(comments).toHaveLength(1);
    expect(noteActions.size).toBe(1);
    expect(comments[0]).toContain('Note 59 is velocity mapped to tracks');
  });
});

// ─── serializeCsv – output format ────────────────────────────────────────────

describe('serializeCsv – output format', () => {
  it('uses CRLF line endings throughout', () => {
    const { comments, noteActions } = parseCsv(CLEAN_CSV);
    const out = serializeCsv({ comments, noteActions });
    const lines = out.split('\r\n');
    // All splits via CRLF; last element is '' due to trailing CRLF
    expect(lines[lines.length - 1]).toBe('');
    // No bare LF (each \n must be preceded by \r)
    expect(out.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('produces exactly 17 fields per data row', () => {
    const { comments, noteActions } = parseCsv(CLEAN_CSV);
    const out = serializeCsv({ comments, noteActions });
    const dataLines = out.split('\r\n').filter(l => l.startsWith('#NOTE'));
    for (const line of dataLines) {
      const fields = line.split(',');
      expect(fields).toHaveLength(17);
    }
  });

  it('writes blank separator between comments and data', () => {
    const { comments, noteActions } = parseCsv(CLEAN_CSV);
    const out = serializeCsv({ comments, noteActions });
    const lines = out.split('\r\n').filter(l => l !== '');
    // Find the blank separator (16 commas) that immediately precedes the first #NOTE
    const firstData = lines.findIndex(l => l.startsWith('#NOTE'));
    expect(lines[firstData - 1]).toBe(',,,,,,,,,,,,,,,,');
  });

  it('outputs inactive columns as empty string', () => {
    const { noteActions } = parseCsv(CLEAN_CSV);
    const out = serializeCsv({ comments: [], noteActions });
    const stopAllLine = out.split('\r\n').find(l => l.includes('06 - Stop All'));
    expect(stopAllLine).toBeDefined();
    const fields = stopAllLine.split(',');
    // Fields 4–16 should all be empty for Stop All
    for (let i = 4; i <= 16; i++) {
      expect(fields[i]).toBe('');
    }
  });

  it('outputs Load Preset row with only cols 1–4 non-empty', () => {
    const { noteActions } = parseCsv(CLEAN_CSV);
    const out = serializeCsv({ comments: [], noteActions });
    const lpLine = out.split('\r\n').find(l => l.includes('07 - Load Preset'));
    expect(lpLine).toBeDefined();
    const fields = lpLine.split(',');
    expect(fields[4]).toBe('1'); // track_preset active
    for (let i = 5; i <= 16; i++) {
      expect(fields[i]).toBe('');
    }
  });
});

// ─── serializeCsv – sort order ────────────────────────────────────────────────

describe('serializeCsv – sort order', () => {
  it('sorts channels 0–15 before channel 16 (Omni)', () => {
    const { comments, noteActions } = parseCsv(CSV_MULTICHAN);
    const out = serializeCsv({ comments, noteActions });
    const dataLines = out.split('\r\n').filter(l => l.startsWith('#NOTE'));
    const channels = dataLines.map(l => parseInt(l.split(',')[2], 10));
    // ch 0 rows come before ch 5, ch 5 before ch 16
    const firstCh0 = channels.indexOf(0);
    const firstCh5 = channels.indexOf(5);
    const firstCh16 = channels.indexOf(16);
    expect(firstCh0).toBeLessThan(firstCh5);
    expect(firstCh5).toBeLessThan(firstCh16);
  });

  it('sorts notes ascending within each channel', () => {
    const { comments, noteActions } = parseCsv(CSV_MULTICHAN);
    const out = serializeCsv({ comments, noteActions });
    const dataLines = out.split('\r\n').filter(l => l.startsWith('#NOTE'));
    const ch0Lines = dataLines.filter(l => l.split(',')[2] === '0');
    const notes = ch0Lines.map(l => parseInt(l.split(',')[1], 10));
    expect(notes).toEqual([...notes].sort((a, b) => a - b));
  });
});

// ─── Full data roundtrip ──────────────────────────────────────────────────────

describe('data roundtrip (parse → serialize → parse)', () => {
  it('preserves all noteActions keys through a roundtrip', () => {
    const doc1 = parseCsv(CLEAN_CSV, 7);
    const serialized = serializeCsv(doc1);
    const doc2 = parseCsv(serialized, 7);

    expect(doc2.noteActions.size).toBe(doc1.noteActions.size);
    for (const key of doc1.noteActions.keys()) {
      expect(doc2.noteActions.has(key)).toBe(true);
      expect(doc2.noteActions.get(key)).toHaveLength(
        doc1.noteActions.get(key).length
      );
    }
  });

  it('preserves active-column field values through a roundtrip', () => {
    const doc1 = parseCsv(CLEAN_CSV);
    const serialized = serializeCsv(doc1);
    const doc2 = parseCsv(serialized);

    for (const [key, rows1] of doc1.noteActions) {
      const rows2 = doc2.noteActions.get(key);
      for (let i = 0; i < rows1.length; i++) {
        const r1 = rows1[i];
        const r2 = rows2[i];
        const active = ACTIVE_COLS[r1.action_type];
        if (active.has(1))  expect(r2.midi_note).toBe(r1.midi_note);
        if (active.has(2))  expect(r2.midi_channel).toBe(r1.midi_channel);
        if (active.has(4))  expect(r2.track_preset).toBe(r1.track_preset);
        if (active.has(5))  expect(r2.pitch_offset).toBe(r1.pitch_offset);
        if (active.has(6))  expect(r2.attack_ms).toBe(r1.attack_ms);
        if (active.has(7))  expect(r2.release_ms).toBe(r1.release_ms);
        if (active.has(8))  expect(r2.loop_flag).toBe(r1.loop_flag);
        if (active.has(13)) expect(r2.min_vel_gain).toBe(r1.min_vel_gain);
        if (active.has(14)) expect(r2.max_vel_gain).toBe(r1.max_vel_gain);
        if (active.has(15)) expect(r2.balance).toBe(r1.balance);
      }
    }
  });

  it('comment count after roundtrip is original + 1 (blank separator absorbed)', () => {
    // Serialize adds 1 blank separator which becomes a comment on re-parse
    const doc1 = parseCsv(CLEAN_CSV);
    const serialized = serializeCsv(doc1);
    const doc2 = parseCsv(serialized);
    expect(doc2.comments).toHaveLength(doc1.comments.length + 1);
  });

  it('Keyboards1 data rows all preserved through roundtrip', () => {
    const doc1 = parseCsv(CSV_KEYBOARDS1, 1);
    const serialized = serializeCsv(doc1);
    const doc2 = parseCsv(serialized, 1);
    expect(doc2.noteActions.size).toBe(45);
    // Verify a load-preset row (only cols 1–4 are active)
    const lpRow2 = doc2.noteActions.get('16:41')[0];
    expect(lpRow2.action_type).toBe('07 - Load Preset');
    expect(lpRow2.track_preset).toBe(1);
  });
});
