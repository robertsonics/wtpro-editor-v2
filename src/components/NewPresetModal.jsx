import { useState } from 'react';

/**
 * Props:
 *   onConfirm  (presetNumber: number) => void
 *   onCancel   () => void
 */
export default function NewPresetModal({ onConfirm, onCancel }) {
  const [value, setValue] = useState('1');

  const num   = parseInt(value, 10);
  const valid = num >= 1 && num <= 9999;

  function handleConfirm() {
    if (valid) onConfirm(num);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">New Preset</div>
        <div className="modal-body">
          <label className="modal-label">
            Preset number (1–9999)
          </label>
          <input
            type="number"
            className="modal-input"
            min={1}
            max={9999}
            value={value}
            autoFocus
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleConfirm();
              if (e.key === 'Escape') onCancel();
            }}
          />
          {!valid && value !== '' && (
            <p className="modal-error">Must be between 1 and 9999</p>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="toolbar-btn"
            onClick={handleConfirm}
            disabled={!valid}
          >
            Create
          </button>
          <button className="toolbar-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
