import { useState, useEffect } from 'react';
import { ACTION_TYPES, ACTION_TYPE_COLORS } from '../schema/fieldSchema.js';

/**
 * Renders the correct input widget for a single action-row grid cell.
 *
 * Props:
 *   field    FIELDS entry { index, key, type, min, max, values, label }
 *   value    current committed value from the row
 *   active   boolean — is this column active for the current action type?
 *   onCommit (newValue) => void — called only when the value is valid
 *   isGain   boolean — render in amber colour (cols 13, 14)
 */
export default function CellEditor({ field, value, active, onCommit, isGain, compact = false }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);

  // Sync local draft when the committed value changes externally
  useEffect(() => {
    setDraft(value == null ? '' : String(value));
    setError(null);
  }, [value]);

  // ── Disabled / inactive cell ───────────────────────────────────────────────

  if (!active) {
    return <div className="cell-editor-disabled" />;
  }

  const gainStyle = isGain ? { color: '#ffb347' } : undefined;

  // ── Flag (checkbox) ────────────────────────────────────────────────────────

  if (field.type === 'flag') {
    return (
      <input
        type="checkbox"
        className="cell-editor-flag"
        checked={value === 1}
        onChange={e => onCommit(e.target.checked ? 1 : 0)}
        tabIndex={0}
        onClick={e => e.stopPropagation()}
      />
    );
  }

  // ── Enum (select) ──────────────────────────────────────────────────────────

  if (field.type === 'enum') {
    return (
      <select
        className="cell-editor-select"
        value={value ?? ''}
        onChange={e => onCommit(e.target.value)}
        tabIndex={0}
        style={{ ...gainStyle, color: ACTION_TYPE_COLORS[value] ?? 'inherit' }}
        onClick={e => e.stopPropagation()}
      >
        {ACTION_TYPES.map(t => (
          <option key={t} value={t}>{t.replace(/^\d{2} - /, '')}</option>
        ))}
      </select>
    );
  }

  // ── Balance (range + number) ───────────────────────────────────────────────

  if (field.type === 'balance') {
    const numVal = value ?? 64;
    if (compact) {
      return (
        <input
          type="number"
          className="cell-editor-number"
          min={0}
          max={127}
          step={1}
          value={numVal}
          onChange={e => {
            const n = parseInt(e.target.value, 10);
            if (isFinite(n) && n >= 0 && n <= 127) onCommit(n);
          }}
          tabIndex={0}
          style={gainStyle}
          onClick={e => e.stopPropagation()}
        />
      );
    }
    return (
      <div
        className="cell-editor-balance"
        style={gainStyle}
        onClick={e => e.stopPropagation()}
      >
        <span className="bal-label">L</span>
        <input
          type="range"
          className="cell-editor-range"
          min={0}
          max={127}
          value={numVal}
          onChange={e => onCommit(Number(e.target.value))}
          tabIndex={0}
        />
        <span className="bal-label">R</span>
        <input
          type="number"
          className="cell-editor-bal-num"
          min={0}
          max={127}
          value={numVal}
          onChange={e => {
            const n = parseInt(e.target.value, 10);
            if (isFinite(n) && n >= 0 && n <= 127) onCommit(n);
          }}
          tabIndex={0}
          onClick={e => e.stopPropagation()}
        />
      </div>
    );
  }

  // ── Text ───────────────────────────────────────────────────────────────────

  if (field.type === 'text') {
    return (
      <input
        type="text"
        className="cell-editor-text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        tabIndex={0}
        style={gainStyle}
        onClick={e => e.stopPropagation()}
      />
    );
  }

  // ── Int / Float (number input) ─────────────────────────────────────────────

  const step = field.type === 'float' ? 0.1 : 1;

  function validateDraft(raw) {
    const n = field.type === 'float' ? parseFloat(raw) : parseInt(raw, 10);
    if (!isFinite(n)) return `${field.label} must be a number`;
    if (field.min != null && n < field.min) return `${field.label} must be \u2265 ${field.min}`;
    if (field.max != null && n > field.max) return `${field.label} must be \u2264 ${field.max}`;
    return null;
  }

  function handleBlur() {
    const err = validateDraft(draft);
    if (err) {
      setError(err);
    } else {
      setError(null);
      const n = field.type === 'float' ? parseFloat(draft) : parseInt(draft, 10);
      onCommit(n);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setDraft(value == null ? '' : String(value));
      setError(null);
      e.currentTarget.blur();
    }
  }

  return (
    <input
      type="number"
      className={`cell-editor-number${error ? ' cell-editor-error' : ''}`}
      min={field.min}
      max={field.max}
      step={step}
      value={draft}
      onChange={e => { setDraft(e.target.value); setError(null); }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={gainStyle}
      title={error ?? undefined}
      onClick={e => e.stopPropagation()}
    />
  );
}
