// Utility types
export type RangeIndexes = { line?: number; column?: number; offset?: number };
export type Range2D = { anchor: RangeIndexes; head: RangeIndexes };

// Types for refs
export type LineRefs = Array<[Range2D, Record<string, any>]>;
