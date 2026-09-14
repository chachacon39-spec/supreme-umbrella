/* Minimal assertion harness. No framework — one dev dependency (Playwright) is
 * enough for a project whose whole point is having no runtime dependencies.
 *
 * Every assertion reports the value it actually saw, so a failure in CI is
 * diagnosable without re-running locally. */
'use strict';

var GREEN = '[32m', RED = '[31m', BOLD = '[1m', OFF = '[0m';

function createSuite(name) {
  var results = [];

  function record(ok, label, detail) {
    results.push({ ok: ok, label: label, detail: detail });
    var mark = ok ? GREEN + '  ✓' + OFF : RED + '  ✗' + OFF;
    console.log(mark + ' ' + label + (ok || detail === undefined ? '' : '\n      ' + detail));
  }

  var api = {
    name: name,
    results: results,

    ok: function (condition, label, detail) {
      record(!!condition, label, detail === undefined ? 'expected truthy, got ' + JSON.stringify(condition) : detail);
      return !!condition;
    },

    equal: function (actual, expected, label) {
      var ok = actual === expected;
      record(ok, label, 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
      return ok;
    },

    /* Numeric comparisons, so a failure says what the number actually was. */
    atLeast: function (actual, min, label) {
      var ok = typeof actual === 'number' && actual >= min;
      record(ok, label, 'expected >= ' + min + ', got ' + JSON.stringify(actual));
      return ok;
    },

    atMost: function (actual, max, label) {
      var ok = typeof actual === 'number' && actual <= max;
      record(ok, label, 'expected <= ' + max + ', got ' + JSON.stringify(actual));
      return ok;
    },

    between: function (actual, min, max, label) {
      var ok = typeof actual === 'number' && actual >= min && actual <= max;
      record(ok, label, 'expected ' + min + '-' + max + ', got ' + JSON.stringify(actual));
      return ok;
    },

    match: function (value, regex, label) {
      var ok = regex.test(String(value));
      record(ok, label, 'expected to match ' + regex + ', got ' + JSON.stringify(String(value).slice(0, 200)));
      return ok;
    },

    notMatch: function (value, regex, label) {
      var ok = !regex.test(String(value));
      record(ok, label, 'expected NOT to match ' + regex + ', got ' + JSON.stringify(String(value).slice(0, 200)));
      return ok;
    },

    includes: function (haystack, needle, label) {
      var ok = String(haystack).indexOf(needle) !== -1;
      record(ok, label, 'expected to contain ' + JSON.stringify(needle) +
        ', got ' + JSON.stringify(String(haystack).slice(0, 200)));
      return ok;
    },

    fail: function (label, detail) { record(false, label, detail); return false; },

    /* Wrap a block so a throw becomes one failed assertion rather than a dead run. */
    section: async function (label, fn) {
      console.log('\n  ' + BOLD + label + OFF);
      try {
        await fn();
      } catch (err) {
        record(false, label + ' — threw',
          err && err.stack ? err.stack.split('\n').slice(0, 4).join('\n      ') : String(err));
      }
    },

    summary: function () {
      var failed = results.filter(function (r) { return !r.ok; });
      return { total: results.length, failed: failed.length, failures: failed };
    }
  };
  return api;
}

module.exports = { createSuite: createSuite, GREEN: GREEN, RED: RED, BOLD: BOLD, OFF: OFF };
