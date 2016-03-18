# ReadStream-Watcher

We got that `fs.ReadStream`, we got that `FSWatcher`, we got that combination
`fs.ReadStream` and `FSWatcher`. (If the joke is lost on you, see
[this video][video].)

## Installation

```
npm install [--save] readstream-watcher
```

## Usage

A simple example, which prints the file's contents (entirely, unlike `tail -f`
or similar) once every time the file changes.

```
var createReadStreamWatcher = require('readstream-watcher');

function printWaitLoop() {
  createReadStreamWatcher('./some-file')
    .once('change', function () {
      this.close();
      this.unpipe(process.stdout);
      printWaitLoop();
    })
    .pipe(process.stdout);
}

printWaitLoop();
```

## ReadStreamWatcher interface

As it turns out, there are a lot of undocumented methods on `ReadStream` and
`FSWatcher` instances. As a result, and to avoid confusing collisions, only a
subset of their API is supported:

| *Property* | *Origin* | *Description* |
|------------|----------|---------------|
| `path` | `ReadStream` | The path to the file the stream is reading from. |
| `pipe(destination, [options])` | `ReadStream` | Writes all the data to the supplied destination. |
| `close()` | `FSWatcher` | Stop watching for changes on the given `FSWatcher`. No changes are made to the stream. |
| `read([size])` | `FSWatcher` | Returns `size` bytes of available data, returning `null` otherwise. |

| *Event* | *Origin* | *Description* |
|---------|----------|---------------|
| `open` | `ReadStream` | Emitted when the ReadStream's file is opened with the now-open file descriptor. |
| `close` | `ReadStream` | Emitted when the stream and any of its underlying resources have been closed. |
| `data` | `ReadStream` | Emitted when data is available, setting the stream into [flowing mode][flowing]. |
| `end` | `ReadStream` | Emitted when there will be no more data to read. |
| `readable` | `ReadStream` | Emitted when a chunk of data can be read from the stream. |
| `change` | `FSWatcher` | Emitted when something changes in the watched file. |
| `error` | `ReadStream/FSWatcher` | Emitted when an error occurs, passing along that `Error` instance. |

Finally, the constructor itself, returned when `require`-ing the module,
accepts two arguments: the `filename` to watch, and `options` to pass into
_both_ the `ReadStream` and the `FSWatcher`. The supported options, then, are
the sum of those two constructors. The most common options are:

| *Option* | *Origin* | *Description* |
|----------|----------|---------------|
| `encoding` | `ReadStream` | If specified, data read will be in the specified format in lieu of Buffers. Defaults to `null`. |
| `persistent` | `FSWatcher` | If `true`, the process should continue to run as long as files are being watched. Defaults to `true`. |

## Relevant Links

- [Documentation for fs.ReadStream][readstream]
- [Documentation for fs.FSWatcher][watcher]

[video]: https://www.youtube.com/watch?v=EQ8ViYIeH04
[readstream]: https://nodejs.org/api/fs.html#fs_class_fs_readstream
[watcher]: https://nodejs.org/api/fs.html#fs_class_fs_fswatcher
[flowing]: https://nodejs.org/api/stream.html#stream_class_stream_readable
