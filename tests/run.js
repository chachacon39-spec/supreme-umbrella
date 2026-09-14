/* Runs every suite and exits non-zero if anything failed.
 *
 * Engines run first: they are pure Node and finish in about a second, so a
 * broken parser is reported before spending a minute in a browser. */
'use strict';

var { GREEN, RED, BOLD, OFF } = require('./harness');

var SUITES = [
  require('./engines.test'),
  require('./app.test'),
  require('./client-brief.test'),
  require('./marketing-brief.test'),
  require('./flight-schools.test'),
  require('./local-seo.test'),
  require('./history.test'),
  require('./backup.test')
];

async function main() {
  var started = Date.now();
  var summaries = [];

  for (var i = 0; i < SUITES.length; i++) {
    var suite = SUITES[i];
    console.log('\n' + BOLD + '━━ ' + suite.name + ' ━━' + OFF);
    var suiteStarted = Date.now();
    try {
      var summary = await suite.run();
      summary.name = suite.name;
      summary.seconds = ((Date.now() - suiteStarted) / 1000).toFixed(1);
      summaries.push(summary);
    } catch (err) {
      console.log(RED + '  the suite crashed' + OFF + '\n  ' + (err && err.stack ? err.stack : err));
      summaries.push({
        name: suite.name, total: 0, failed: 1,
        failures: [{ label: 'suite crashed', detail: String(err && err.message ? err.message : err) }],
        seconds: ((Date.now() - suiteStarted) / 1000).toFixed(1)
      });
    }
  }

  var totalAssertions = 0, totalFailed = 0;
  console.log('\n' + BOLD + '━━ summary ━━' + OFF);
  summaries.forEach(function (s) {
    totalAssertions += s.total;
    totalFailed += s.failed;
    var mark = s.failed ? RED + 'FAIL' + OFF : GREEN + 'pass' + OFF;
    console.log('  ' + mark + '  ' + s.name.padEnd(17) +
      String(s.total - s.failed) + '/' + s.total + ' assertions   ' + s.seconds + 's');
  });

  if (totalFailed) {
    console.log('\n' + RED + BOLD + '  ' + totalFailed + ' failed:' + OFF);
    summaries.forEach(function (s) {
      (s.failures || []).forEach(function (f) {
        console.log('    ' + s.name + ': ' + f.label);
        if (f.detail) console.log('      ' + String(f.detail).split('\n')[0]);
      });
    });
  }

  console.log('\n  ' + totalAssertions + ' assertions in ' +
    ((Date.now() - started) / 1000).toFixed(1) + 's — ' +
    (totalFailed ? RED + totalFailed + ' failed' + OFF : GREEN + 'all passed' + OFF) + '\n');

  process.exit(totalFailed ? 1 : 0);
}

main();
