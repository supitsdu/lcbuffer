import { describe, expect, it, vi } from 'vitest';
import { LCBuffer } from '../../LCBuffer';
import type { Range2D } from '../../types';

describe('LCBuffer - set()', () => {
  it('should correctly set content into chunks', async () => {
    const buffer = new LCBuffer();

    const range: Range2D = {
      anchor: { line: 0, column: 0 },
      head: { line: 1, column: 0 },
    };

    await buffer.set(range, 'First line\nSecond line');

    const lines = await buffer.lines();

    expect(lines.get(0)).toBe('First line');
    expect(lines.get(1)).toBe('Second line');
    expect(lines.size).toBe(2);
  });

  it("should emit 'chunk-update' event with correct meta", async () => {
    const buffer = new LCBuffer();

    const onChunkUpdate = vi.fn();
    buffer.on('chunk-update', async (range, meta) => {
      onChunkUpdate({ range, meta });
    });

    await buffer.set({ anchor: { line: 0, column: 0 }, head: { line: 1, column: 0 } }, 'Hello\nWorld');

    expect(onChunkUpdate).toHaveBeenCalledOnce();
    const call = onChunkUpdate.mock.calls[0][0];

    expect(call.meta).toMatchObject({
      type: 'content',
      lines: [0, 1],
    });

    expect(call.range).toMatchObject({
      anchor: { line: 0, column: 0 },
      head: { line: 1, column: 5 },
    });
  });
});
