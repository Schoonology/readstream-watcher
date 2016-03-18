'use strict';

var fs = require('fs');

function createReadStreamWatcher(filename) {
  if (!filename) {
    throw new TypeError('createReadStreamWatcher requires a string');
  }

  var stream = fs.createReadStream(filename);
  var watcher;

  try {
    watcher = fs.watch(filename, { persistent: true });
  } catch (err) {
    // Ignore the error here if it's of a class the stream will take care of.
    // Otherwise, emit ourselves once the user has had a chance to attach.
    if (['ENOENT'].indexOf(err.code) === -1) {
      setImmediate(function () {
        stream.emit('error', err);
      });
    }

    return stream;
  }

  stream.cleanup = function () {
    stream.close();
    watcher.close();
  };

  watcher.on('change', function (event) {
    stream.emit('change', event, filename);
  });

  watcher.on('error', function (err) {
    stream.emit('error', err);
  });

  return stream;
}

module.exports = createReadStreamWatcher;
