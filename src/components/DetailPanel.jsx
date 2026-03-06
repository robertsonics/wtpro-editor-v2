import { useState, useEffect } from 'react';
import { ACTION_TYPES, ACTIVE_COLS, noteName } from '../schema/fieldSchema.js';

// ── Small reusable field widgets ─────────────────────────────────────────────

function NumField({ label, value, min, max, step = 1, onCommit, style, disabled }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  useEffect(() => { setDraft(String(value ?? '')); }, [value]);

  if (disabled) {
    return (
      <div className="dp-field">
        <span className="dp-label">{label}</span>
        <div className="dp-input dp-disabled">{String(value ?? '')}</div>
      </div>
    );
  }

  function handleBlur() {
    const n = step < 1 ? parseFloat(draft) : parseInt(draft, 10);
    if (isFinite(n) && (min == null || n >= min) && (max == null || n <= max)) {
      onCommit(n);
    } else {
      setDraft(String(value ?? ''));
    }
  }

  return (
    <div className="dp-field">
      <span className="dp-label">{label}</span>
      <input
        type="number"
        className="dp-input"
        min={min}
        max={max}
        step={step}
        value={draft}
        style={style}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      />
    </div>
  );
}

function CheckField({ label, value, onCommit }) {
  return (
    <label className="dp-check-label">
      <input
        type="checkbox"
        className="dp-check"
        checked={value === 1}
        onChange={e => onCommit(e.target.checked ? 1 : 0)}
      />
      {label}
    </label>
  );
}

// ── DetailPanel ──────────────────────────────────────────────────────────────

/**
 * Full-form editor for the currently selected action row.
 *
 * Props:
 *   row      DataRow | null
 *   onCommit (key, value) => void
 */
export default function DetailPanel({ row, onCommit, onClose }) {
  if (!row) {
    return (
      <div className="detail-panel">
        <p className="detail-placeholder">Select an action row to edit its details</p>
      </div>
    );
  }

  const active = ACTIVE_COLS[row.action_type] ?? new Set();
  const is = idx => active.has(idx);

  const showTrackRow  = is(4) || is(5);
  const showAtkRow    = is(6);
  const showRelRow    = is(7);
  const showAtkRelRow = showAtkRow || showRelRow;
  const showFlagsRow  = is(8) || is(9) || is(10);
  const showVelRow    = is(11) || is(12);
  const showGainRow   = is(13) || is(14);
  const showBalRow    = is(15);

  const trackLabel = row.action_type === '07 - Load Preset' ? 'Preset' : 'Track';
  const trackMax   = row.action_type === '07 - Load Preset' ? 9999 : 4095;

  // Velocity range slider local state
  const [velMin, setVelMin] = useState(row.min_velocity);
  const [velMax, setVelMax] = useState(row.max_velocity);
  useEffect(() => { setVelMin(row.min_velocity); }, [row.min_velocity]);
  useEffect(() => { setVelMax(row.max_velocity); }, [row.max_velocity]);

  // Balance local state
  const [bal, setBal] = useState(row.balance ?? 64);
  useEffect(() => { setBal(row.balance ?? 64); }, [row.balance]);

  const chanLabel = row.midi_channel === 16 ? 'Omni' : `Ch ${row.midi_channel}`;
  const noteLabel = `${row.midi_note}\u00a0\u00a0${noteName(row.midi_note)}`;

  return (
    <div className="detail-panel">
      {/* ── Header: channel/note identity + close button ─────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 'bold', letterSpacing: '0.03em' }}>
          {chanLabel}&nbsp;&nbsp;&nbsp;{noteLabel}
        </span>
        <button className="btn-close-detail" title="Close panel" onClick={onClose}
          style={{ position: 'static', fontSize: '16px', lineHeight: 1, padding: '2px 5px', background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', borderRadius: '3px' }}>
          ×
        </button>
      </div>
      <div className="detail-form">

        {/* ── Row 1: Action ────────────────────────────────────────── */}
        <div className="dp-row">
          <div className="dp-field dp-field-wide">
            <span className="dp-label">Action</span>
            <select
              className="dp-input dp-select dp-select-wide"
              value={row.action_type}
              onChange={e => onCommit('action_type', e.target.value)}
            >
              {ACTION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Row 2: Track + Pitch ─────────────────────────────────── */}
        {showTrackRow && (
          <div className="dp-row">
            {is(4) && (
              <NumField
                label={trackLabel}
                value={row.track_preset}
                min={1}
                max={trackMax}
                onCommit={v => onCommit('track_preset', v)}
              />
            )}
            {is(5) && (
              <NumField
                label="Pitch (cents)"
                value={row.pitch_offset}
                min={-700}
                max={700}
                onCommit={v => onCommit('pitch_offset', v)}
              />
            )}
          </div>
        )}

        {/* ── Row 3: Attack + Release ──────────────────────────────── */}
        {showAtkRelRow && (
          <div className="dp-row">
            {showAtkRow && (
              <NumField
                label="Attack (ms)"
                value={row.attack_ms}
                min={0}
                max={99999}
                onCommit={v => onCommit('attack_ms', v)}
              />
            )}
            {showRelRow && (
              <NumField
                label="Release (ms)"
                value={row.release_ms}
                min={0}
                max={99999}
                onCommit={v => onCommit('release_ms', v)}
              />
            )}
          </div>
        )}

        {/* ── Row 4: Flags ─────────────────────────────────────────── */}
        {showFlagsRow && (
          <div className="dp-row">
            {is(8)  && <CheckField label="Loop"       value={row.loop_flag}       onCommit={v => onCommit('loop_flag',       v)} />}
            {is(9)  && <CheckField label="Lock"       value={row.lock_flag}       onCommit={v => onCommit('lock_flag',       v)} />}
            {is(10) && <CheckField label="Pitch Bend" value={row.pitch_bend_flag} onCommit={v => onCommit('pitch_bend_flag', v)} />}
          </div>
        )}

        {/* ── Row 5: Velocity ──────────────────────────────────────── */}
        {showVelRow && (
          <div className="dp-row dp-row-vel">
            <span className="dp-label">Velocity</span>
            <span className="dp-sublabel">Min</span>
            <input
              type="number"
              className="dp-input dp-input-sm"
              min={0}
              max={127}
              value={velMin}
              onChange={e => setVelMin(Number(e.target.value))}
              onBlur={() => {
                if (velMin >= 0 && velMin <= 127 && velMin <= velMax) {
                  onCommit('min_velocity', velMin);
                } else {
                  setVelMin(row.min_velocity);
                }
              }}
            />
            <input
              type="range"
              className="dp-vel-range"
              min={0}
              max={127}
              value={velMin}
              onChange={e => { setVelMin(Number(e.target.value)); onCommit('min_velocity', Number(e.target.value)); }}
            />
            <input
              type="range"
              className="dp-vel-range"
              min={0}
              max={127}
              value={velMax}
              onChange={e => { setVelMax(Number(e.target.value)); onCommit('max_velocity', Number(e.target.value)); }}
            />
            <span className="dp-sublabel">Max</span>
            <input
              type="number"
              className="dp-input dp-input-sm"
              min={0}
              max={127}
              value={velMax}
              onChange={e => setVelMax(Number(e.target.value))}
              onBlur={() => {
                if (velMax >= 0 && velMax <= 127 && velMin <= velMax) {
                  onCommit('max_velocity', velMax);
                } else {
                  setVelMax(row.max_velocity);
                }
              }}
            />
          </div>
        )}

        {/* ── Row 6: Gain ──────────────────────────────────────────── */}
        {showGainRow && (
          <div className="dp-row">
            <NumField
              label="Min Gain (dB)"
              value={row.min_vel_gain}
              min={-100}
              max={0}
              step={0.1}
              onCommit={v => onCommit('min_vel_gain', v)}
              style={{ color: '#ffb347' }}
            />
            <NumField
              label="Max Gain (dB)"
              value={row.max_vel_gain}
              min={-100}
              max={0}
              step={0.1}
              onCommit={v => onCommit('max_vel_gain', v)}
              style={{ color: '#ffb347' }}
            />
          </div>
        )}

        {/* ── Row 7: Balance ───────────────────────────────────────── */}
        {showBalRow && (
          <div className="dp-row dp-row-bal">
            <span className="dp-label">Balance</span>
            <span className="dp-sublabel">L</span>
            <input
              type="range"
              className="dp-bal-range"
              min={0}
              max={127}
              value={bal}
              onChange={e => { setBal(Number(e.target.value)); onCommit('balance', Number(e.target.value)); }}
            />
            <span className="dp-sublabel">R</span>
            <input
              type="number"
              className="dp-input dp-input-sm"
              min={0}
              max={127}
              value={bal}
              onChange={e => setBal(Number(e.target.value))}
              onBlur={() => {
                if (bal >= 0 && bal <= 127) {
                  onCommit('balance', bal);
                } else {
                  setBal(row.balance ?? 64);
                }
              }}
            />
          </div>
        )}

        {/* ── Row 8: Comment ───────────────────────────────────────── */}
        <CommentField value={row.comment} onCommit={v => onCommit('comment', v)} />

      </div>
    </div>
  );
}

function CommentField({ value, onCommit }) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => { setDraft(value ?? ''); }, [value]);
  return (
    <div className="dp-row">
      <div className="dp-field dp-field-full">
        <span className="dp-label">Comment</span>
        <input
          type="text"
          className="dp-input dp-input-full"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => onCommit(draft)}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        />
      </div>
    </div>
  );
}
