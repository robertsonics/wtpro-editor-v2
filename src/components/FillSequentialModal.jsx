import { useState } from 'react';
import { ACTION_TYPES, noteName } from '../schema/fieldSchema.js';
import { computeFill, DEFAULT_COPY_FIELDS } from '../model/fillLogic.js';

const CHANNEL_ORDER = [16, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function chanLabel(ch) {
  return ch === 16 ? 'Omni' : `Ch ${ch}`;
}

function actionLabel(t) {
  return t.replace(/^\d{2} - /, '');
}

function noteLabel(n) {
  return (n >= 0 && n <= 127) ? noteName(n) : '—';
}

/**
 * Fill Sequential Modal.
 *
 * Props:
 *   noteActions   Map<string, DataRow[]>
 *   onApply       (newNoteActions, fromNote, toNote, channel) => void
 *   onCancel      () => void
 */
export default function FillSequentialModal({ noteActions, onApply, onCancel }) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [fromNote,       setFromNote]       = useState(0);
  const [toNote,         setToNote]         = useState(0);
  const [channel,        setChannel]        = useState(16);
  const [actionType,     setActionType]     = useState('01 - Play Note');
  const [startTrack,     setStartTrack]     = useState(1);
  const [trackIncrement, setTrackIncrement] = useState(1);
  const [startPitch,     setStartPitch]     = useState(0);
  const [pitchIncrement, setPitchIncrement] = useState(0);
  const [copyFromChan,   setCopyFromChan]   = useState(16);
  const [copyFromNote,   setCopyFromNote]   = useState(0);
  const [conflictMode,   setConflictMode]   = useState('add');

  // ── Preview state ───────────────────────────────────────────────────────────
  const [preview,      setPreview]      = useState(null); // { preview: row[], newNoteActions: Map }
  const [previewStale, setPreviewStale] = useState(true);

  function markStale() {
    if (!previewStale) setPreviewStale(true);
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const fromValid     = Number.isInteger(fromNote)     && fromNote >= 0     && fromNote <= 127;
  const toValid       = Number.isInteger(toNote)       && toNote >= 0       && toNote <= 127;
  const trackValid    = Number.isInteger(startTrack)   && startTrack >= 1   && startTrack <= 4095;
  const trackIncValid = Number.isInteger(trackIncrement) && trackIncrement >= 0;
  const pitchValid    = Number.isInteger(startPitch)   && startPitch >= -700 && startPitch <= 700;
  const canPreview    = fromValid && toValid && trackValid && trackIncValid && pitchValid;
  const canApply      = preview !== null && !previewStale;

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handlePreview() {
    const copyKey = `${copyFromChan}:${copyFromNote}`;
    const refRow  = noteActions.get(copyKey)?.[0];
    const copyFields = refRow ? {
      attack_ms:       refRow.attack_ms,
      release_ms:      refRow.release_ms,
      loop_flag:       refRow.loop_flag,
      lock_flag:       refRow.lock_flag,
      pitch_bend_flag: refRow.pitch_bend_flag,
      min_velocity:    refRow.min_velocity,
      max_velocity:    refRow.max_velocity,
      min_vel_gain:    refRow.min_vel_gain,
      max_vel_gain:    refRow.max_vel_gain,
      balance:         refRow.balance,
    } : DEFAULT_COPY_FIELDS;

    const result = computeFill(noteActions, {
      fromNote, toNote, channel, actionType,
      startTrack, trackIncrement,
      startPitch, pitchIncrement,
      copyFields, conflictMode,
    });
    setPreview(result);
    setPreviewStale(false);
  }

  function handleApply() {
    if (!preview || previewStale) return;
    const lo = Math.min(fromNote, toNote);
    const hi = Math.max(fromNote, toNote);
    onApply(preview.newNoteActions, lo, hi, channel);
  }

  // ── Number input helper ─────────────────────────────────────────────────────
  function numInput(value, setter, min, max, extra = {}) {
    return (
      <input
        type="number"
        className="fill-input-sm"
        value={value}
        min={min}
        max={max}
        {...extra}
        onChange={e => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) { setter(v); markStale(); }
        }}
      />
    );
  }

  const copyFromExists = noteActions.has(`${copyFromChan}:${copyFromNote}`);

  // ── Preview summary ─────────────────────────────────────────────────────────
  const previewRows    = preview?.preview ?? [];
  const skippedCount   = previewRows.filter(p => p.skipped).length;
  const affectedCount  = previewRows.length - skippedCount;

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal modal-fill">
        <div className="modal-header">Fill Sequential Notes</div>

        <div className="modal-body fill-modal-body">

          {/* ── Note range ──────────────────────────────────────── */}
          <div className="fill-row">
            <span className="fill-label">From note</span>
            {numInput(fromNote, setFromNote, 0, 127)}
            <span className="fill-note-name">{noteLabel(fromNote)}</span>
            <span className="fill-label fill-label-gap">To note</span>
            {numInput(toNote, setToNote, 0, 127)}
            <span className="fill-note-name">{noteLabel(toNote)}</span>
          </div>

          {/* ── Channel + Action ────────────────────────────────── */}
          <div className="fill-row">
            <span className="fill-label">Channel</span>
            <select
              className="fill-select"
              value={channel}
              onChange={e => { setChannel(Number(e.target.value)); markStale(); }}
            >
              {CHANNEL_ORDER.map(ch => (
                <option key={ch} value={ch}>{chanLabel(ch)}</option>
              ))}
            </select>
            <span className="fill-label fill-label-gap">Action</span>
            <select
              className="fill-select fill-select-wide"
              value={actionType}
              onChange={e => { setActionType(e.target.value); markStale(); }}
            >
              {ACTION_TYPES.map(t => (
                <option key={t} value={t}>{actionLabel(t)}</option>
              ))}
            </select>
          </div>

          {/* ── Track ───────────────────────────────────────────── */}
          <div className="fill-row">
            <span className="fill-label">Start track</span>
            {numInput(startTrack, setStartTrack, 1, 4095)}
            <span className="fill-label fill-label-gap">Increment by</span>
            {numInput(trackIncrement, setTrackIncrement, 0, null)}
          </div>

          {/* ── Pitch ───────────────────────────────────────────── */}
          <div className="fill-row">
            <span className="fill-label">Start pitch (cents)</span>
            {numInput(startPitch, setStartPitch, -700, 700)}
            <span className="fill-label fill-label-gap">Increment by</span>
            {numInput(pitchIncrement, setPitchIncrement, null, null)}
          </div>

          {/* ── Copy from ───────────────────────────────────────── */}
          <div className="fill-section-label">Copy other settings from</div>
          <div className="fill-row">
            <span className="fill-label">Channel</span>
            <select
              className="fill-select"
              value={copyFromChan}
              onChange={e => { setCopyFromChan(Number(e.target.value)); markStale(); }}
            >
              {CHANNEL_ORDER.map(ch => (
                <option key={ch} value={ch}>{chanLabel(ch)}</option>
              ))}
            </select>
            <span className="fill-label fill-label-gap">Note</span>
            {numInput(copyFromNote, setCopyFromNote, 0, 127)}
            <span className="fill-note-name">{noteLabel(copyFromNote)}</span>
            {!copyFromExists && (
              <span className="fill-copy-warn">(not found — using defaults)</span>
            )}
          </div>

          {/* ── Conflict mode ───────────────────────────────────── */}
          <div className="fill-section-label">Conflict handling</div>
          <div className="fill-row fill-row-col">
            <label className="fill-radio-label">
              <input
                type="radio"
                name="fill-conflict"
                value="add"
                checked={conflictMode === 'add'}
                onChange={() => { setConflictMode('add'); markStale(); }}
              />
              Add as new action alongside existing
            </label>
            <label className="fill-radio-label">
              <input
                type="radio"
                name="fill-conflict"
                value="replace"
                checked={conflictMode === 'replace'}
                onChange={() => { setConflictMode('replace'); markStale(); }}
              />
              Replace existing actions of this type for these notes
            </label>
          </div>

          {/* ── Preview button + stale warning ──────────────────── */}
          <div className="fill-row" style={{ marginTop: '6px' }}>
            <button
              className="toolbar-btn"
              onClick={handlePreview}
              disabled={!canPreview}
              title={canPreview ? 'Generate preview' : 'Fix invalid inputs first'}
            >
              Preview
            </button>
            {!canPreview && (
              <span className="fill-warn">Check inputs: note 0–127, track 1–4095, pitch −700–+700, increment ≥ 0</span>
            )}
            {canPreview && previewStale && preview !== null && (
              <span className="fill-stale-warn">Parameters changed — re-run Preview before applying</span>
            )}
          </div>

          {/* ── Preview list ────────────────────────────────────── */}
          {preview !== null && !previewStale && (
            <div className="fill-preview">
              <div className="fill-preview-header">
                <span>{affectedCount} note{affectedCount !== 1 ? 's' : ''} will be created/modified</span>
                {skippedCount > 0 && (
                  <span className="fill-preview-skip-count">
                    {' · '}
                    <span style={{ color: 'var(--color-error)' }}>{skippedCount} skipped (8-action limit)</span>
                  </span>
                )}
              </div>
              <div className="fill-preview-list">
                {previewRows.map((p, i) => (
                  <div
                    key={i}
                    className={`fill-preview-item${p.skipped ? ' fill-preview-item--skipped' : ''}`}
                  >
                    {p.skipped ? '⊘ SKIPPED' : '✓'}
                    {'  '}
                    <span className="fill-preview-note">{p.noteNum}  {noteName(p.noteNum)}</span>
                    {'  ·  '}
                    <span>{chanLabel(p.channel)}</span>
                    {'  ·  '}
                    <span>{actionLabel(p.actionType)}</span>
                    {'  ·  track '}
                    <span>{p.track}</span>
                    {p.pitch !== 0 && <span>  ·  pitch {p.pitch}</span>}
                    {p.skipped && (
                      <span className="fill-preview-skip-reason">  — already has 8 actions</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button className="toolbar-btn" onClick={onCancel}>Cancel</button>
          <button
            className="toolbar-btn toolbar-btn-save"
            onClick={handleApply}
            disabled={!canApply}
            title={!canApply ? 'Run Preview first' : 'Apply fill operation'}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
