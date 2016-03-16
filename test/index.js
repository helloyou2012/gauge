'use strict'
var test = require('tap').test
var Gauge = require('../index')
var stream = require('readable-stream')
var util = require('util')
var EventEmitter = require('events').EventEmitter

function Sink () {
  stream.Writable.call(this, arguments)
}
util.inherits(Sink, stream.Writable)
Sink.prototype._write = function (data, enc, cb) { cb() }

var results = new EventEmitter()
function MockPlumbing (theme, template, columns) {
  results.theme = theme
  results.template = template
  results.columns = columns
  results.emit('new', theme, template, columns)
}
MockPlumbing.prototype = {}

function RecordCall (name) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    results.emit('called', [name, args])
    results.emit('called:' + name, args)
    return ''
  }
}

;['setTheme', 'setTemplate', 'setWidth', 'hide', 'show', 'hideCursor', 'showCursor'].forEach(function (fn) {
  MockPlumbing.prototype[fn] = RecordCall(fn)
})

test('defaults', function (t) {
  var gauge = new Gauge(process.stdout)
  t.is(gauge.disabled, false, 'disabled')
  t.is(gauge.updateInterval, 50, 'updateInterval')
  if (process.stdout.isTTY) {
    t.is(gauge.tty, process.stdout, 'tty')
    gauge.disable()
    gauge = new Gauge(process.stderr)
    t.is(gauge.tty, process.stdout, 'tty is stdout when writeTo is stderr')
  }
  gauge.disable()
  gauge = new Gauge(new Sink())
  t.is(gauge.tty, undefined, 'non-tty stream is not tty')
  gauge.disable()
  t.end()
})

test('construct', function (t) {
  var output = new Sink()
  output.isTTY = true
  output.columns = 16
  var gauge = new Gauge(output, {
    Plumbing: MockPlumbing,
    theme: 'THEME',
    template: 'TEMPLATE',
    enabled: false,
    updateInterval: 0,
    fixedFramerate: false
  })
  t.ok(gauge)
  t.is(results.columns, 15, 'width passed through')
  t.is(results.theme, 'THEME', 'theme passed through')
  t.is(results.template, 'TEMPLATE', 'template passed through')

  t.done()
})

test('show & pulse: fixedframerate', function (t) {
  t.plan(3)
  // this helps us abort if something never emits an event
  // it also keeps things alive long enough to actually get output =D
  var testtimeout = setTimeout(function () {
    t.end()
  }, 1000)
  var output = new Sink()
  output.isTTY = true
  output.columns = 16
  var gauge = new Gauge(output, {
    Plumbing: MockPlumbing,
    updateInterval: 10,
    fixedFramerate: true
  })
  gauge.show('NAME', 0.1)
  results.once('called:show', checkBasicShow)
  function checkBasicShow (args) {
    t.isDeeply(args, [{ spun: 0, section: 'NAME', subsection: '', completed: 0.1 }], 'check basic show')

    gauge.show('S')
    gauge.pulse()
    results.once('called:show', checkPulse)
  }
  function checkPulse (args) {
    t.isDeeply(args, [
      { spun: 1, section: 'S', subsection: '', completed: 0.1 }
    ], 'check pulse')

    gauge.pulse('P')
    results.once('called:show', checkPulseWithArg)
  }
  function checkPulseWithArg (args) {
    t.isDeeply(args, [
      { spun: 2, section: 'S', subsection: 'P', completed: 0.1 }
    ], 'check pulse w/ arg')

    gauge.disable()
    clearTimeout(testtimeout)
    t.done()
  }
})

test('window resizing', function (t) {
  var testtimeout = setTimeout(function () {
    t.end()
  }, 1000)
  var output = new Sink()
  output.isTTY = true
  output.columns = 32

  var gauge = new Gauge(output, {
    Plumbing: MockPlumbing,
    updateInterval: 0,
    fixedFramerate: true
  })
  gauge.show('NAME', 0.1)

  results.once('called:show', function (args) {
    t.isDeeply(args, [{
      section: 'NAME',
      subsection: '',
      completed: 0.1,
      spun: 0
    }])

    results.once('called:setWidth', lookForResize)

    output.columns = 16
    output.emit('resize')
    gauge.show('NAME', 0.5)
  })
  function lookForResize (args) {
    t.isDeeply(args, [15])
    results.once('called:show', lookForShow)
  }
  function lookForShow (args) {
    t.isDeeply(args, [{
      section: 'NAME',
      subsection: '',
      completed: 0.5,
      spun: 0
    }])
    gauge.disable()
    clearTimeout(testtimeout)
    t.done()
  }
})

function collectResults (time, cb) {
  var collected = []
  function collect (called) {
    collected.push(called)
  }
  results.on('called', collect)
  setTimeout(function () {
    results.removeListener('called', collect)
    cb(collected)
  }, time)
}

test('hideCursor:true', function (t) {
  var output = new Sink()
  output.isTTY = true
  output.columns = 16
  var gauge = new Gauge(output, {
    Plumbing: MockPlumbing,
    theme: 'THEME',
    template: 'TEMPLATE',
    enabled: true,
    updateInterval: 10,
    fixedFramerate: true,
    hideCursor: true
  })
  collectResults(11, andCursorHidden)
  gauge.show('NAME', 0.5)
  function andCursorHidden (got) {
    var expected = [
      ['hideCursor', []],
      ['show', [{
        spun: 0,
        section: 'NAME',
        subsection: '',
        completed: 0.5
      }]]
    ]
    t.isDeeply(got, expected, 'hideCursor')
    gauge.disable()
    t.end()
  }
})

test('hideCursor:false', function (t) {
  var output = new Sink()
  output.isTTY = true
  output.columns = 16
  var gauge = new Gauge(output, {
    Plumbing: MockPlumbing,
    theme: 'THEME',
    template: 'TEMPLATE',
    enabled: true,
    updateInterval: 10,
    fixedFramerate: true,
    hideCursor: false
  })
  collectResults(11, andCursorHidden)
  gauge.show('NAME', 0.5)
  function andCursorHidden (got) {
    var expected = [
      ['show', [{
        spun: 0,
        section: 'NAME',
        subsection: '',
        completed: 0.5
      }]]
    ]
    t.isDeeply(got, expected, 'do not hideCursor')
    gauge.disable()
    t.end()
  }
})

/* todo missing:

constructor

  writeTo: process.stderr & process.stdout IS A TTY (or isn't)
  cleanupOnExit: explicitly set to true

disable while showing then enable

enable while fixedFramerate is false

enable while fixedFramerate is true & redrawTracker.unref is false (0.8)

disable while fixedFramerate is false

hide()

show() while disabled

show() with object args

show() with neither string nor object (undefined? number?)

show() with fixedFramerate == false

pulse() while disabled
pulse while _showing == false
pulse where fixedFramerate == false

implicit:
  _doRedraw will get called with fixedFramerate = false if we test the above
  trigger a show + redraw with hideCursor = true
  trigger a hide + redraw with hideCursor = true

trigger a _doRedraw when _needsRedraw is false

TEST BACKPRESSURE

*/
