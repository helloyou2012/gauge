### v2.2.1

* Fix image in readme

### v2.2.0

* All new themes API– reference themes by name and pass in custom themes and
  themesets (themesets get platform support autodetection done on them to
  select the best theme).  Theme mixins let you add features to all existing
  themes.
* Much, much improved test coverage.

### v2.1.0

* Got rid of ░ in the default platform, noUnicode, hasColor theme.  Thanks
  to @yongtw123 for pointing out this had snuck in.
* Fiddled with the demo output to make it easier to see the spinner spin. Also
  added prints before each platforms test output.
* I forgot to include `signal-exit` in our deps.  <.< Thank you @KenanY for
  finding this. Then I was lazy and made a new commit instead of using his
  PR. Again, thank you for your patience @KenenY.
* Drastically speed up travis testing.
* Add a small javascript demo (demo.js) for showing off the various themes
  (and testing them on diff platforms).
* Change: The subsection separator from ⁄ and / (different chars) to >.
* Fix crasher: A show or pulse without a label would cause the template renderer
  to complain about a missing value.
* New feature: Add the ability to disable the clean-up-on-exit behavior.
  Not something I expect to be widely desirable, but important if you have
  multiple distinct gauge instances in your app.
* Use our own color support detection.
  The `has-color` module proved too magic for my needs, making assumptions
  as to which stream we write to and reading command line arguments.

### v2.0.0

This is a major rewrite of the internals.  Externally there are fewer
changes:

* On node>0.8 gauge object now prints updates at a fixed rate.  This means
  that when you call `show` it may wate up to `updateInterval` ms before it
  actually prints an update.  You override this behavior with the
  `fixedFramerate` option.
* The gauge object now keeps the cursor hidden as long as it's enabled and
  shown.
* The constructor's arguments have changed, now it takes a mandatory output
  stream and an optional options object.  The stream no longer needs to be
  an `ansi`ified stream, although it can be if you want (but we won't make
  use of its special features).
* Previously the gauge was disabled by default if `process.stdout` wasn't a
  tty.  Now it always defaults to enabled.  If you want the previous
  behavior set the `enabled` option to `process.stdout.isTTY`.
* The constructor's options have changed– see the docs for details.
* Themes are entirely different.  If you were using a custom theme, or
  referring to one directly (eg via `Gauge.unicode` or `Gauge.ascii`) then
  you'll need to change your code.  You can get the equivalent of the latter
  with:
  ```
  var themes = require('gauge/themes')
  var unicodeTheme = themes(true, true) // returns the color unicode theme for your platform
  ```
  The default themes no longer use any ambiguous width characters, so even
  if you choose to display those as wide your progress bar should still
  display correctly.
* Templates are entirely different and if you were using a custom one, you
  should consult the documentation to learn how to recreate it.  If you were
  using the default, be aware that it has changed and the result looks quite
  a bit different.
