import { describe, expect, it, vi } from 'vitest';
import { LCBuffer } from '../../LCBuffer';
import { Range2D } from '../../types';

describe('LCBuffer - removeRefs()', () => {
  it('should remove refs matching the predicate', async () => {
    const buffer = new LCBuffer();

    const ref1: [Range2D, Record<string, any>] = [
      { anchor: { line: 0, column: 0 }, head: { line: 0, column: 5 } },
      { type: 'keyword' },
    ];
    const ref2: [Range2D, Record<string, any>] = [
      { anchor: { line: 1, column: 0 }, head: { line: 1, column: 3 } },
      { type: 'string' },
    ];

    await buffer.addRef('syntax', ref1[0], ref1[1]);
    await buffer.addRef('syntax', ref2[0], ref2[1]);

    // Remove only keyword type
    await buffer.removeRefs('syntax', ([_, meta]) => meta.type === 'keyword');

    const refs = await buffer.getRefs('syntax');
    expect(refs).toHaveLength(1);
    expect(refs[0][1].type).toBe('string');
  });

  it("should emit 'ref-update' with correct range on removal", async () => {
    const buffer = new LCBuffer();

    const ref: [Range2D, Record<string, any>] = [
      { anchor: { line: 2, column: 1 }, head: { line: 2, column: 4 } },
      { type: 'tag' },
    ];

    await buffer.addRef('markup', ref[0], ref[1]);

    const listener = vi.fn();
    buffer.on('ref-update', async (range, meta) => {
      listener({ range, meta });
    });

    await buffer.removeRefs('markup', () => true); // remove all

    expect(listener).toHaveBeenCalledOnce();
    const call = listener.mock.calls[0][0];
    expect(call.meta.type).toBe('ref:remove');
    expect(call.meta.channel).toBe('markup');
    expect(call.range).toEqual(ref[0]);
  });

  it('should use zeroed range if no refs were removed', async () => {
    const buffer = new LCBuffer();

    const listener = vi.fn();
    buffer.on('ref-update', async (range, meta) => {
      listener({ range, meta });
    });

    // Nothing to remove
    await buffer.removeRefs('unknown', () => true);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].range).toEqual({
      anchor: { line: 0, column: 0 },
      head: { line: 0, column: 0 },
    });
  });
});
