'use strict';

var fs = require('fs');
var stream = require('stream');
var getRawBody = require('raw-body');
var test = require('tape');
var tmp = require('tmp');
var createReadStreamWatcher = require('../');

/**
 * Creates a new, temporary file with the provided `contents`, returning the
 * file's path.
 */
function createTempFile(contents) {
  var file = tmp.fileSync();

  fs.writeFileSync(file.name, contents, 'utf8');

  return file.name;
}

/**
 * If `watcher` has a `close` method, that will be called once `tape` has
 * finished running all tests. Returns the passed-in watcher.
 */
function closeLater(watcher) {
  if (watcher && typeof watcher.close === 'function') {
    test.onFinish(function () {
      watcher.close();
    });
  }

  return watcher;
}

test('Module exports a function', function (t) {
  t.equal(typeof createReadStreamWatcher, 'function');

  t.end();
});

test('Function returns an object', function (t) {
  var subject = closeLater(createReadStreamWatcher(createTempFile()));

  t.equal(typeof subject, 'object');

  t.end();
});

test('Function requires a filename argument', function (t) {
  t.plan(2);

  try {
    createReadStreamWatcher();
  } catch (err) {
    t.equal(err.name, 'TypeError');
    t.equal(err.message, 'createReadStreamWatcher requires a string');
  }

  t.end();
});

test('Function returns a ReadStream-compatible object', function (t) {
  var filename = createTempFile();
  var subject = closeLater(createReadStreamWatcher(filename));

  t.equal(subject.path, filename);
  t.equal(typeof subject.read, 'function');
  t.equal(typeof subject.pipe, 'function');
  t.equal(typeof subject.on, 'function');

  t.end();
});

test('Function returns a Watcher-compatible object', function (t) {
  var subject = closeLater(createReadStreamWatcher(createTempFile()));

  t.equal(typeof subject.close, 'function');

  t.end();
});

test('ReadableWatcher is readable', function (t) {
  var content = 'test file content';
  var subject = closeLater(createReadStreamWatcher(createTempFile(content)));

  getRawBody(subject, {
    encoding: 'utf8'
  }, function (err, body) {
    t.notOk(err);
    t.equal(content, body);

    t.end();
  });
});

test('ReadableWatcher emits "open" event', function (t) {
  var subject = closeLater(createReadStreamWatcher(createTempFile()));

  subject.on('open', function (fd) {
    t.equal(typeof fd, 'number');
    t.ok(fd > 0);

    t.end();
  });
});

test('ReadableWatcher emits "close" event', function (t) {
  var subject = closeLater(createReadStreamWatcher(createTempFile()));

  subject.resume();
  subject.on('close', function () {
    t.end();
  });
});

test('ReadableWatcher emits "error" event when the file does not exist', function (t) {
  closeLater(createReadStreamWatcher('bogus-filename'))
    .on('error', function (err) {
      t.equal(err.code, 'ENOENT');
      t.end();
    });
});

test('ReadableWatcher emits "change" event', function (t) {
  var filename = createTempFile();
  var subject = closeLater(createReadStreamWatcher(filename));

  subject
    .on('change', function (event, changedFile) {
      t.equal(event, 'change');
      t.equal(changedFile, filename);

      t.end();
    });

  fs.writeFile(filename, 'new test file content', 'utf8');
});

test('ReadableWatcher chaining example works', function (t) {
  var firstBody = 'first expected content';
  var secondBody = 'second expected content';
  var filename = createTempFile(firstBody);
  var target = new stream.PassThrough();

  getRawBody(target, {
    encoding: 'utf8'
  }, function (err, body) {
    t.equal(body, firstBody + secondBody);

    t.end();
  });

  function first() {
    var stream = closeLater(createReadStreamWatcher(filename));

    stream
      .once('change', second)
      .once('end', function () {
        fs.writeFile(filename, secondBody, 'utf8');
      })
      .pipe(target, { end: false });
  }

  function second() {
    var stream = closeLater(createReadStreamWatcher(filename));

    stream
      .pipe(target);
  }

  first();
});

test('ReadableWatcher encoding option', function (t) {
  var subject = closeLater(createReadStreamWatcher(createTempFile('test file content'), { encoding: 'utf8' }));

  t.equal(subject.read(), null);

  subject.once('readable', function () {
    t.equal(subject.read(), 'test file content');

    t.end();
  });
});

test('ReadableWatcher persistent option', function (t) {
  // Don't have to call `close` if it's not persistent.
  var subject = createReadStreamWatcher(createTempFile(), { persistent: false });

  t.end();
});
