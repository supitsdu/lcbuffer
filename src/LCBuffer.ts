import { Mutex } from 'async-mutex';
import { ensureMapKey, filterRefsByRange, minmax, normalizeRange } from './helpers';
import type { LineRefs, Range2D } from './types';

// Chunk model
export class LineChunk {
  constructor(
    public range: Range2D,
    public content: string,
  ) {}
}

// LCEventCallback should include chunks and refs too
export type LCEventCallback = (
  range: Range2D,
  meta: Record<string, any>,
  chunks: Map<number, LineChunk>,
  refs: Map<string, LineRefs>,
) => Promise<void>;

type LCEventMap = {
  'chunk-update': Set<LCEventCallback>;
  'ref-update': Set<LCEventCallback>;
  'buffer-clear': Set<LCEventCallback>;
  'find-match': Set<LCEventCallback>;
};

// Public Buffer API
export class LCBuffer {
  private chunks = new Map<number, LineChunk>();
  private references = new Map<string, LineRefs>();
  private listeners: LCEventMap = {
    'chunk-update': new Set<LCEventCallback>(),
    'ref-update': new Set<LCEventCallback>(),
    'buffer-clear': new Set<LCEventCallback>(),
    'find-match': new Set<LCEventCallback>(),
  };

  private mutex = new Mutex();

  /**
   * Set content for a range of lines. Handles multi-line splits.
   */
  async set(range: Range2D, content: string): Promise<void> {
    await this.mutex.runExclusive(() => {
      const { anchor, head } = normalizeRange(range);
      const [startLine, endLine] = minmax(anchor.line, head.line);
      const lines = content.split('\n');
      for (let i = startLine; i <= endLine; i++) {
        const text = lines[i - startLine] ?? '';
        this.chunks.set(
          i,
          new LineChunk(
            {
              anchor: { line: i, column: 0 },
              head: { line: i, column: text.length },
            },
            text,
          ),
        );
      }
      this.notifyListeners(
        'chunk-update',
        {
          anchor: { line: startLine, column: 0 },
          head: { line: endLine, column: lines[lines.length - 1]?.length ?? 0 },
        },
        {
          type: 'content',
          lines: Array.from({ length: endLine - startLine + 1 }, (_, idx) => startLine + idx),
        },
      );
    });
  }

  async find(term: string | RegExp, meta: Record<string, any> = {}): Promise<void> {
    await this.mutex.runExclusive(() => {
      for (const [line, chunk] of this.chunks.entries()) {
        const content = chunk.content;

        const emitMatch = (start: number, end: number) => {
          this.notifyListeners(
            'find-match',
            {
              anchor: { line, column: start },
              head: { line, column: end },
            },
            { type: 'match', term, ...meta },
          );
        };

        if (typeof term === 'string') {
          let index = content.indexOf(term);
          while (index !== -1) {
            emitMatch(index, index + term.length);
            index = content.indexOf(term, index + 1);
          }
        } else {
          for (const match of content.matchAll(term)) {
            if (match.index !== undefined) {
              emitMatch(match.index, match.index + match[0].length);
            }
          }
        }
      }
    });
  }

  /**
   * Retrieve a map of line number to text content.
   */
  async lines(): Promise<Map<number, string>> {
    return this.mutex.runExclusive(() => {
      const result = new Map<number, string>();
      for (const [line, chunk] of this.chunks.entries()) {
        result.set(line, chunk.content);
      }
      return result;
    });
  }

  /**
   * Retrieve all reference channels and their refs.
   */
  async refs(): Promise<Map<string, LineRefs>> {
    return this.mutex.runExclusive(() => {
      return new Map(this.references);
    });
  }

  /**
   * Add a reference entry under a channel.
   */
  async addRef(channel: string, range: Range2D, meta: Record<string, any> = {}): Promise<void> {
    await this.mutex.runExclusive(() => {
      const refs = ensureMapKey(this.references, channel, () => [] as LineRefs);
      const normRange = normalizeRange(range);
      refs.push([normRange, meta]);
      this.notifyListeners('ref-update', normRange, {
        type: 'ref:add',
        channel,
        ref: [normRange, meta],
      });
    });
  }

  /**
   * Get refs for a channel, optionally within a range.
   */
  async getRefs(channel: string, range?: Range2D): Promise<LineRefs> {
    return this.mutex.runExclusive(() => {
      const refs = this.references.get(channel) ?? [];
      return range ? filterRefsByRange(refs, range) : refs;
    });
  }

  /**
   * Remove refs matching the predicate in a channel.
   */
  async removeRefs(channel: string, predicate: (ref: [Range2D, Record<string, any>]) => boolean): Promise<void> {
    await this.mutex.runExclusive(() => {
      const refs = this.references.get(channel) ?? [];

      const removed: [Range2D, Record<string, any>][] = [];
      const kept: [Range2D, Record<string, any>][] = [];

      for (const ref of refs) {
        if (predicate(ref)) {
          removed.push(ref);
        } else {
          kept.push(ref);
        }
      }

      this.references.set(channel, kept);

      const rangeToEmit =
        removed.length > 0 ? removed[0][0] : { anchor: { line: 0, column: 0 }, head: { line: 0, column: 0 } };

      this.notifyListeners('ref-update', rangeToEmit, {
        type: 'ref:remove',
        channel,
        removed,
      });
    });
  }

  /**
   * Replace all refs in a channel.
   */
  async replaceRefs(channel: string, newRefs: LineRefs): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.references.set(channel, newRefs);
      this.notifyListeners(
        'ref-update',
        newRefs.length > 0 ? newRefs[0][0] : { anchor: { line: 0, column: 0 }, head: { line: 0, column: 0 } },
        { type: 'ref:replace', channel, refs: newRefs },
      );
    });
  }

  /**
   * Remove all content and references.
   */
  async clear(): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.chunks.clear();
      this.references.clear();
      this.notifyListeners(
        'buffer-clear',
        { anchor: { line: 0, column: 0 }, head: { line: 0, column: 0 } },
        { type: 'clear' },
      );
    });
  }

  /**
   * Register an event listener for a specific channel.
   */
  on(event: keyof LCEventMap, callback: LCEventCallback): void {
    if (!this.listeners[event]) {
      throw new Error(`Unknown event type: ${event}`);
    }
    this.listeners[event].add(callback);
  }

  /**
   * Unregister an event listener.
   */
  off(event: keyof LCEventMap, callback: LCEventCallback): void {
    if (!this.listeners[event]) {
      throw new Error(`Unknown event type: ${event}`);
    }
    this.listeners[event].delete(callback);
  }

  private async notifyListeners(event: keyof LCEventMap, range: Range2D, meta: Record<string, any>): Promise<void> {
    for (const listener of this.listeners[event]) {
      try {
        await listener(range, meta, this.chunks, this.references);
      } catch (error) {
        return Promise.reject(error);
      }
    }
  }
}
