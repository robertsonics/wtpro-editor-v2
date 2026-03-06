/**
 * Pure undo/redo stack helpers.
 *
 * Each stack entry is { doc, description } where doc is a full document
 * snapshot and description is a human-readable label for the tooltip.
 */

export const MAX_UNDO = 50;

/**
 * Push a snapshot onto the undo stack before performing an action.
 * Clears the redo stack (new edit invalidates redo history).
 * Returns new { undoStack, redoStack }.
 */
export function pushUndo(undoStack, redoStack, doc, description) {
  return {
    undoStack: [...undoStack, { doc, description }].slice(-MAX_UNDO),
    redoStack: [],
  };
}

/**
 * Apply undo: pop from undoStack, push current state onto redoStack.
 * Returns { doc, undoStack, redoStack } or null if nothing to undo.
 */
export function applyUndo(undoStack, redoStack, currentDoc) {
  if (undoStack.length === 0) return null;
  const { doc, description } = undoStack[undoStack.length - 1];
  return {
    doc,
    undoStack: undoStack.slice(0, -1),
    redoStack: [{ doc: currentDoc, description }, ...redoStack],
  };
}

/**
 * Apply redo: pop from redoStack, push current state onto undoStack.
 * Returns { doc, undoStack, redoStack } or null if nothing to redo.
 */
export function applyRedo(undoStack, redoStack, currentDoc) {
  if (redoStack.length === 0) return null;
  const { doc, description } = redoStack[0];
  return {
    doc,
    undoStack: [...undoStack, { doc: currentDoc, description }].slice(-MAX_UNDO),
    redoStack: redoStack.slice(1),
  };
}

/** Label shown in Undo button tooltip. */
export function undoLabel(undoStack) {
  if (undoStack.length === 0) return null;
  return `Undo: ${undoStack[undoStack.length - 1].description}`;
}

/** Label shown in Redo button tooltip. */
export function redoLabel(redoStack) {
  if (redoStack.length === 0) return null;
  return `Redo: ${redoStack[0].description}`;
}
