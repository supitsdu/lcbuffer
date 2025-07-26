# lcbuffer

A lightweight, efficient, and flexible buffer management library for JavaScript and TypeScript. `lcbuffer` provides a simple API for managing line-based content and references, supporting operations such as adding, removing, finding, and replacing references in a buffer, as well as event-driven updates.

## Features

- Line-based content buffer with efficient range operations
- Add, remove, and replace references (with channels and metadata)
- Find content by string or RegExp
- Event-driven API for buffer, chunk, and reference updates
- TypeScript support with type definitions
- Thread-safe (uses mutex for async operations)
- Lightweight and dependency-free (except for `async-mutex`)

## Installation

```sh
npm install lcbuffer
# or
pnpm add lcbuffer
```

## Usage

```ts
import { LCBuffer } from 'lcbuffer';

const buffer = new LCBuffer();

// Set content for a range of lines
await buffer.set({ anchor: { line: 0, column: 0 }, head: { line: 2, column: 0 } }, 'foo\nbar\nbaz');

// Add a reference to a channel
await buffer.addRef(
  'myChannel',
  { anchor: { line: 1, column: 0 }, head: { line: 1, column: 3 } },
  { tag: 'highlight' },
);

// Find a string or RegExp in the buffer
await buffer.find('bar');
await buffer.find(/ba./g);

// Get all lines as a Map<number, string>
const lines = await buffer.lines();

// Get all references for a channel
const refs = await buffer.getRefs('myChannel');

// Remove references by predicate
await buffer.removeRefs('myChannel', ([range, meta]) => meta.tag === 'highlight');

// Replace all references in a channel
await buffer.replaceRefs('myChannel', [
  [{ anchor: { line: 0, column: 0 }, head: { line: 0, column: 3 } }, { tag: 'new' }],
]);

// Clear the buffer
await buffer.clear();

// Listen for events
buffer.on('chunk-update', async (range, meta, chunks, refs) => {
  // handle chunk update
});
buffer.off('chunk-update', yourCallback);
```

## API

### `LCBuffer`

A class for managing line-based content and references, with event-driven updates.

#### Methods

- `set(range: Range2D, content: string): Promise<void>`
  Set content for a range of lines. Handles multi-line splits.

- `find(term: string | RegExp, meta?: Record<string, any>): Promise<void>`
  Find all matches of a string or RegExp in the buffer. Emits 'find-match' events.

- `lines(): Promise<Map<number, string>>`
  Retrieve a map of line number to text content.

- `refs(): Promise<Map<string, LineRefs>>`
  Retrieve all reference channels and their refs.

- `addRef(channel: string, range: Range2D, meta?: Record<string, any>): Promise<void>`
  Add a reference entry under a channel.

- `getRefs(channel: string, range?: Range2D): Promise<LineRefs>`
  Get refs for a channel, optionally within a range.

- `removeRefs(channel: string, predicate: (ref: [Range2D, Record<string, any>]) => boolean): Promise<void>`
  Remove refs matching the predicate in a channel.

- `replaceRefs(channel: string, newRefs: LineRefs): Promise<void>`
  Replace all refs in a channel.

- `clear(): Promise<void>`
  Remove all content and references.

- `on(event: 'chunk-update' | 'ref-update' | 'buffer-clear' | 'find-match', callback: LCEventCallback): void`
  Register an event listener for a specific event.

- `off(event: 'chunk-update' | 'ref-update' | 'buffer-clear' | 'find-match', callback: LCEventCallback): void`
  Unregister an event listener.

#### Types

- `Range2D`:

  ```ts
  { anchor: { line: number, column: number }, head: { line: number, column: number } }
  ```

- `LineRefs`:

  ```ts
  Array<[Range2D, Record<string, any>]>;
  ```

- `LCEventCallback`:

  ```ts
  (range: Range2D, meta: Record<string, any>, chunks: Map<number, LineChunk>, refs: Map<string, LineRefs>) =>
    Promise<void>;
  ```

## Events

- `'chunk-update'`: Emitted when content chunks are updated.
- `'ref-update'`: Emitted when references are added, removed, or replaced.
- `'buffer-clear'`: Emitted when the buffer is cleared.
- `'find-match'`: Emitted for each match found by `find()`.

## TypeScript

Type definitions are included. You can use `LCBuffer` with full type safety.

## Testing

This package includes tests using [Vitest](https://vitest.dev/). To run tests:

```sh
pnpm test
```

## License

MIT
