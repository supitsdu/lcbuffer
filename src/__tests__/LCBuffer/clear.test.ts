import { describe, expect, it, vi } from 'vitest';
import { LCBuffer } from '../../LCBuffer'; // adjust path if needed

describe('LCBuffer - clear()', () => {
  it('should clear all chunks and references', async () => {
    const buffer = new LCBuffer();

    await buffer.set({ anchor: { line: 0, column: 0 }, head: { line: 1, column: 0 } }, 'Alpha\nBeta');

    await buffer.addRef(
      'syntax',
      { anchor: { line: 0, column: 0 }, head: { line: 0, column: 5 } },
      { type: 'keyword' },
    );

    await buffer.clear();

    const lines = await buffer.lines();
    const refs = await buffer.refs();

    expect(lines.size).toBe(0);
    expect(refs.size).toBe(0);
  });

  it("should emit 'buffer-clear' event", async () => {
    const buffer = new LCBuffer();

    const onClear = vi.fn();
    buffer.on('buffer-clear', async (range, meta) => {
      onClear({ range, meta });
    });

    await buffer.clear();

    expect(onClear).toHaveBeenCalledOnce();

    const call = onClear.mock.calls[0][0];

    expect(call.meta).toEqual({ type: 'clear' });
    expect(call.range).toEqual({
      anchor: { line: 0, column: 0 },
      head: { line: 0, column: 0 },
    });
  });
});
