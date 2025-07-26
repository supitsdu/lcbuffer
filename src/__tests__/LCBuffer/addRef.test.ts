import { describe, expect, it, vi } from 'vitest';
import { LCBuffer } from '../../LCBuffer'; // adjust path if needed

describe('LCBuffer - addRef()', () => {
  it('should add a new reference under the given channel', async () => {
    const buffer = new LCBuffer();

    const range = {
      anchor: { line: 1, column: 2 },
      head: { line: 1, column: 5 },
    };

    const meta = { type: 'bold' };

    await buffer.addRef('markup', range, meta);

    const refs = await buffer.getRefs('markup');

    expect(refs.length).toBe(1);
    expect(refs[0][0]).toEqual(range);
    expect(refs[0][1]).toEqual(meta);
  });

  it('should normalize range and preserve metadata', async () => {
    const buffer = new LCBuffer();

    // Reversed anchor/head should normalize
    const range = {
      anchor: { line: 2, column: 5 },
      head: { line: 2, column: 1 },
    };

    const meta = { type: 'italic' };

    await buffer.addRef('markup', range, meta);

    const refs = await buffer.getRefs('markup');

    expect(refs[0][0]).toEqual({
      anchor: { line: 2, column: 1 },
      head: { line: 2, column: 5 },
    });
    expect(refs[0][1]).toEqual(meta);
  });

  it("should emit 'ref-update' event on ref addition", async () => {
    const buffer = new LCBuffer();

    const onUpdate = vi.fn();

    buffer.on('ref-update', async (range, meta) => {
      onUpdate({ range, meta });
    });

    const range = {
      anchor: { line: 0, column: 0 },
      head: { line: 0, column: 4 },
    };

    const meta = { type: 'comment' };

    await buffer.addRef('note', range, meta);

    expect(onUpdate).toHaveBeenCalledOnce();

    const call = onUpdate.mock.calls[0][0];

    expect(call.meta.type).toBe('ref:add');
    expect(call.meta.channel).toBe('note');
    expect(call.meta.ref[1]).toEqual(meta);
    expect(call.range).toEqual(range);
  });
});
