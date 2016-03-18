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

test('Module exports a function', function (t) {
  t.equal(typeof createReadStreamWatcher, 'function');

  t.end();
});

test('Function returns an object', function (t) {
  var subject = createReadStreamWatcher(createTempFile());

  t.equal(typeof subject, 'object');

  t.end();

  subject.cleanup();
});

test('Function requires an argument', function (t) {
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
  var subject = createReadStreamWatcher(filename);

  t.equal(subject.path, filename);
  t.equal(typeof subject.read, 'function');
  t.equal(typeof subject.on, 'function');

  t.end();

  subject.cleanup();
});

test('Function returns a Watcher-compatible object', function (t) {
  var subject = createReadStreamWatcher(createTempFile());

  t.equal(typeof subject.close, 'function');

  t.end();

  subject.cleanup();
});

test('ReadableWatcher is readable', function (t) {
  var content = 'test file content';
  var subject = createReadStreamWatcher(createTempFile(content));

  getRawBody(subject, {
    encoding: 'utf8'
  }, function (err, body) {
    t.notOk(err);
    t.equal(content, body);

    t.end();

    subject.cleanup();
  });
});

test('ReadableWatcher emits "open" event', function (t) {
  var subject = createReadStreamWatcher(createTempFile());

  subject.on('open', function (fd) {
    t.equal(typeof fd, 'number');
    t.ok(fd > 0);

    t.end();

    subject.cleanup();
  });
});

test('ReadableWatcher emits "error" event when the file does not exist', function (t) {
  createReadStreamWatcher('bogus-filename')
    .on('error', function (err) {
      t.equal(err.code, 'ENOENT');
      t.end();
    });
});

test('ReadableWatcher emits "change" event', function (t) {
  var filename = createTempFile();
  var subject = createReadStreamWatcher(filename);

  subject
    .on('change', function (event, changedFile) {
      t.equal(event, 'change');
      t.equal(changedFile, filename);

      t.end();

      subject.cleanup();
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

    first.stream.cleanup();
    second.stream.cleanup();
  });

  function first() {
    first.stream = createReadStreamWatcher(filename);

    first.stream
      .once('change', second)
      .once('end', function () {
        fs.writeFile(filename, secondBody, 'utf8');
      })
      .pipe(target, { end: false });
  }

  function second() {
    second.stream = createReadStreamWatcher(filename);

    second.stream
      .pipe(target);
  }

  first();
});
