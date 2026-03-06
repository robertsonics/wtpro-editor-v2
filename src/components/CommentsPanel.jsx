import { useState, useEffect } from 'react';

/**
 * Collapsible panel containing a textarea for the comment rows.
 *
 * Props:
 *   comments   string[]   one entry per comment line
 *   onCommit   (string[]) => void   called on blur if content changed
 */
export default function CommentsPanel({ comments, onCommit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft,  setDraft]  = useState(comments.join('\n'));

  // Sync when comments change externally (e.g. after undo/load)
  useEffect(() => {
    setDraft(comments.join('\n'));
  }, [comments]);

  function handleBlur() {
    const newComments = draft.split('\n');
    // Only dispatch if something actually changed
    if (newComments.join('\n') !== comments.join('\n')) {
      onCommit(newComments);
    }
  }

  const lineCount = comments.length;

  return (
    <div className="comments-panel">
      <div
        className="comments-header"
        onClick={() => setIsOpen(o => !o)}
      >
        <span className={`chevron${isOpen ? ' open' : ''}`}>▶</span>
        Comments
        <span className="badge">{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
      </div>

      {isOpen && (
        <textarea
          className="comments-textarea"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleBlur}
          spellCheck={false}
        />
      )}
    </div>
  );
}
