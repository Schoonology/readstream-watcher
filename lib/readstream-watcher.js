'use strict';

var fs = require('fs');
var PassThrough = require('stream').PassThrough;

function createAndMixinStream(rsw, filename, options) {
  var stream = fs.createReadStream(filename, options);

  rsw.path = stream.path;

  stream.pipe(rsw);

  stream.on('open', function (fd) {
    rsw.emit('open', fd);
  });

  stream.on('close', function (fd) {
    rsw.emit('close', fd);
  });

  stream.on('error', function (err) {
    rsw.emit('error', err);
  });
}

function createAndMixinWatcher(rsw, filename, options) {
  var watcher = fs.watch(filename, options);

  rsw.close = function close() {
    watcher.close();
  };

  watcher.on('change', function (event) {
    rsw.emit('change', event, filename);
  });

  watcher.on('error', function (err) {
    rsw.emit('error', err);
  });
}

function createReadStreamWatcher(filename, options) {
  if (!filename) {
    throw new TypeError('createReadStreamWatcher requires a string');
  }

  var rsw = new PassThrough(options);

  try {
    createAndMixinStream(rsw, filename, options);
    createAndMixinWatcher(rsw, filename, options);
  } catch (err) {
    // Ignore the error here if it's of a class the stream will take care of.
    // Otherwise, emit ourselves once the user has had a chance to attach.
    if (['ENOENT'].indexOf(err.code) === -1) {
      setImmediate(function () {
        rsw.emit('error', err);
      });
    }
  }

  return rsw;
}

module.exports = createReadStreamWatcher;
