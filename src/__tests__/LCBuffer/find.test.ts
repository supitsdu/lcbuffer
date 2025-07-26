// src/__tests__/LCBuffer/find.test.ts
import { describe, expect, it } from 'vitest';
import { LCBuffer } from '../../LCBuffer';
import type { Range2D } from '../../types';

describe('LCBuffer - find()', () => {
  it("should emit 'find-match' events for all matches", async () => {
    const buffer = new LCBuffer();
    const term = 'foo';

    await buffer.set({ anchor: { line: 0, column: 0 }, head: { line: 1, column: 0 } }, 'foo bar\nbaz foo');

    const calls: {
      range: Range2D;
      meta: Record<string, any>;
    }[] = [];

    buffer.on('find-match', async (range, meta) => {
      calls.push({ range, meta });
    });

    await buffer.find(term);

    expect(calls.length).toBe(2);
    expect(calls[0].range).toEqual({
      anchor: { line: 0, column: 0 },
      head: { line: 0, column: 3 },
    });
    expect(calls[1].range).toEqual({
      anchor: { line: 1, column: 4 },
      head: { line: 1, column: 7 },
    });

    expect(calls.every((call) => call.meta.type === 'match')).toBe(true);
    expect(calls.every((call) => call.meta.term === 'foo')).toBe(true);
  });
});
