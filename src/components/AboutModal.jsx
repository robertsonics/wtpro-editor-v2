import { useEffect } from 'react';

const VERSION = 'v0.50';

/**
 * Props:
 *   onClose  () => void
 */
export default function AboutModal({ onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ minWidth: '320px', maxWidth: '420px' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>About</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '16px', lineHeight: 1, padding: '2px 4px', cursor: 'pointer', borderRadius: '3px' }}
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body" style={{ gap: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-text)' }}>
            Robertsonics WAV Trigger Pro Preset Editor
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            Version: {VERSION}
          </div>
          <div style={{ marginTop: '4px' }}>
            <a
              href="https://www.robertsonics.com/wtpro-overview"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: 'var(--action-01)', textDecoration: 'none' }}
              onMouseOver={e => { e.target.style.textDecoration = 'underline'; }}
              onMouseOut={e => { e.target.style.textDecoration = 'none'; }}
            >
              WAV Trigger Pro Overview ↗
            </a>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button className="toolbar-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
