import { describe, expect, it, vi } from 'vitest';
import { LCBuffer } from '../../LCBuffer';
import { LineRefs } from '../../types';

describe('LCBuffer - replaceRefs()', () => {
  it('should replace all references under the specified channel', async () => {
    const buffer = new LCBuffer();

    const original = {
      anchor: { line: 0, column: 0 },
      head: { line: 0, column: 5 },
    };

    await buffer.addRef('syntax', original, { type: 'keyword' });

    const newRefs: LineRefs = [
      [{ anchor: { line: 1, column: 0 }, head: { line: 1, column: 4 } }, { type: 'comment' }],
      [{ anchor: { line: 2, column: 1 }, head: { line: 2, column: 3 } }, { type: 'type' }],
    ];

    await buffer.replaceRefs('syntax', newRefs);

    const refs = await buffer.getRefs('syntax');

    expect(refs.length).toBe(2);
    expect(refs).toEqual(newRefs);
  });

  it("should emit 'ref-update' event on replacement", async () => {
    const buffer = new LCBuffer();

    const listener = vi.fn();
    buffer.on('ref-update', async (range, meta) => {
      listener({ range, meta });
    });

    const newRefs: LineRefs = [
      [{ anchor: { line: 3, column: 0 }, head: { line: 3, column: 10 } }, { type: 'annotation' }],
    ];

    await buffer.replaceRefs('markup', newRefs);

    expect(listener).toHaveBeenCalledOnce();

    const call = listener.mock.calls[0][0];
    expect(call.meta.type).toBe('ref:replace');
    expect(call.meta.channel).toBe('markup');
    expect(call.meta.refs).toEqual(newRefs);
    expect(call.range).toEqual(newRefs[0][0]);
  });

  it('should emit zeroed range if no refs are given', async () => {
    const buffer = new LCBuffer();

    const listener = vi.fn();
    buffer.on('ref-update', async (range, meta) => {
      listener({ range, meta });
    });

    await buffer.replaceRefs('markup', []);

    const call = listener.mock.calls[0][0];
    expect(call.range).toEqual({
      anchor: { line: 0, column: 0 },
      head: { line: 0, column: 0 },
    });
  });
});
