import { useState, useEffect } from 'react';
import AboutModal from './AboutModal.jsx';

/**
 * Props:
 *   presetNumber        number
 *   onPresetNumberChange (n: number) => void
 *   onNewPreset         () => void
 *   onOpenFile          () => void   (triggers hidden file input)
 *   onSave              () => void
 *   onUndo / onRedo     () => void
 *   canUndo / canRedo   boolean
 *   undoTip / redoTip   string | null
 *   errorCount          number
 *   isDirty             boolean
 */
export default function Toolbar({
  presetNumber,
  onPresetNumberChange,
  onNewPreset,
  onOpenFile,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoTip,
  redoTip,
  errorCount,
  isDirty,
}) {
  const [draft,      setDraft]      = useState(String(presetNumber));
  const [showAbout,  setShowAbout]  = useState(false);
  useEffect(() => { setDraft(String(presetNumber)); }, [presetNumber]);

  function commitPreset() {
    const n = parseInt(draft, 10);
    if (n >= 1 && n <= 9999) {
      onPresetNumberChange(n);
    } else {
      setDraft(String(presetNumber));
    }
  }

  return (
    <div className="toolbar">
      <span className="toolbar-app-name">WTPro Editor</span>

      <span className="toolbar-divider" />

      <button className="toolbar-btn" onClick={onNewPreset}>New Preset</button>
      <button className="toolbar-btn" onClick={onOpenFile}>Open CSV</button>
      <button
        className="toolbar-btn toolbar-btn-save"
        onClick={onSave}
        disabled={errorCount > 0}
        title={errorCount > 0 ? 'Fix validation errors before saving' : 'Save CSV'}
      >
        Save CSV{isDirty ? ' *' : ''}
      </button>

      <span className="toolbar-divider" />

      <button
        className="toolbar-btn"
        onClick={onUndo}
        disabled={!canUndo}
        title={undoTip ?? 'Nothing to undo'}
      >
        ↩ Undo
      </button>
      <button
        className="toolbar-btn"
        onClick={onRedo}
        disabled={!canRedo}
        title={redoTip ?? 'Nothing to redo'}
      >
        ↪ Redo
      </button>

      <span className="toolbar-spacer" />

      <span className="toolbar-preset-label">Preset:</span>
      <input
        type="number"
        className="toolbar-preset-input"
        min={1}
        max={9999}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commitPreset}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      />

      {errorCount > 0 && (
        <span className="toolbar-error-badge">
          {errorCount} row{errorCount !== 1 ? 's' : ''} with errors
        </span>
      )}

      <span className="toolbar-divider" />

      <button className="toolbar-btn" onClick={() => setShowAbout(true)}>
        About
      </button>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}
