// Helper Functions

import type { LineRefs, Range2D, RangeIndexes } from './types';

/**
 * Return a sorted [min, max] tuple of two non-negative numbers.
 ** Ensures both values are >= 0.
 */
export function minmax(a: number = 0, b: number = 0): [number, number] {
  const rawMin = Math.min(a, b);
  const rawMax = Math.max(a, b);
  return [rawMin < 0 ? 0 : rawMin, rawMax < 0 ? 0 : rawMax];
}

/**
 * Clamp all indexes in RangeIndexes to non-negative integers.
 */
export function clampIndexes(idx: RangeIndexes): Required<RangeIndexes> {
  return {
    line: Math.max(0, idx.line ?? 0),
    column: Math.max(0, idx.column ?? 0),
    offset: Math.max(0, idx.offset ?? 0),
  };
}

/**
 * Normalize a 2D range: clamp indexes, sort anchor/head for lines,
 * and if single-line, sort columns.
 */
export function normalizeRange(range: Range2D): Range2D {
  // Clamp indexes first
  const a = clampIndexes(range.anchor);
  const h = clampIndexes(range.head);

  // Determine ordered start and end positions
  let startLine = a.line;
  let startCol = a.column;
  let endLine = h.line;
  let endCol = h.column;

  // If anchor comes after head, swap
  if (startLine > endLine || (startLine === endLine && startCol > endCol)) {
    [startLine, endLine] = [endLine, startLine];
    [startCol, endCol] = [endCol, startCol];
  }

  return {
    anchor: { line: startLine, column: startCol },
    head: { line: endLine, column: endCol },
  };
}

/**
 * Ensure a map has a key, initializing via factory if absent.
 */
export function ensureMapKey<K, V>(map: Map<K, V>, key: K, factory: () => V): V {
  if (!map.has(key)) {
    map.set(key, factory());
  }
  return map.get(key)!;
}

/**
 * Filter a list of refs to those overlapping with the normalized range.
 */
export function filterRefsByRange(refs: LineRefs, range: Range2D): LineRefs {
  const { anchor, head } = normalizeRange(range);
  return refs.filter(([r]) => {
    const nr = normalizeRange(r);
    const [rStartLine, rEndLine] = minmax(nr.anchor.line, nr.head.line);
    return rStartLine <= (head.line ?? 0) && rEndLine >= (anchor.line ?? 0);
  });
}
