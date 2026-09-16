/* The suites embed each client brief as a fixture. Two bugs lived in the
 * coverage reader for fifteen rounds because one of those fixtures quietly
 * did not match the brief the client sent: it stopped a sentence early, and
 * the sentence it dropped was the one both bugs came from.
 *
 * Mutation testing cannot find that. Those assertions had teeth — they were
 * biting the wrong input. The only thing that catches it is comparing the
 * fixture against the brief as received, which is what this does.
 *
 * tests/briefs holds the briefs as they arrived. When a fixture and its brief
 * disagree, the brief is right. */
'use strict';

var fs = require('fs');
var path = require('path');
var { createSuite } = require('./harness');

var BRIEF_DIR = path.join(__dirname, 'briefs');

var PAIRS = [
  ['brief455a.txt', 'finance-brief.test.js', 'CLIENT_BRIEF'],
  ['brief462b.txt', 'client-brief.test.js', 'CLIENT_BRIEF'],
  ['brief465a.txt', 'argument-brief.test.js', 'CLIENT_BRIEF'],
  ['brief472a.txt', 'marketing-brief.test.js', 'CLIENT_BRIEF'],
  ['brief474d.txt', 'benchmark-brief.test.js', 'CLIENT_BRIEF'],
  ['brief477f.txt', 'local-seo.test.js', 'CLIENT_BRIEF'],
  ['brief478b.txt', 'flight-schools.test.js', 'CLIENT_BRIEF'],
  ['brief480a.txt', 'legal-brief.test.js', 'CLIENT_BRIEF'],
  ['brief482a.txt', 'grant-brief.test.js', 'CLIENT_BRIEF'],
  ['brief489b.txt', 'tax-brief.test.js', 'CLIENT_BRIEF'],
  ['brief491a.txt', 'hha-brief.test.js', 'CLIENT_BRIEF'],
  ['brief491c.txt', 'hha-brief.test.js', 'TEXAS_BRIEF'],
  ['brief491e.txt', 'hha-brief.test.js', 'ILLINOIS_BRIEF'],
  ['brief497a.txt', 'ip-brief.test.js', 'CLIENT_BRIEF'],
  ['brief503a.txt', 'longform-brief.test.js', 'CLIENT_BRIEF']
];

/* The fixtures are array literals of strings joined with newlines. Reading
   them out of the source keeps this check honest: it compares what the suite
   actually runs against, not a copy that could drift in its own right. */
function readFixture(testFile, varName) {
  var src = fs.readFileSync(path.join(__dirname, testFile), 'utf8');
  var opener = 'var ' + varName + ' = [';
  var start = src.indexOf(opener);
  if (start < 0) return null;
  var end = src.indexOf("].join('\\n');", start);
  if (end < 0) return null;
  try {
    /* eslint-disable no-eval */
    return eval(src.slice(start + ('var ' + varName + ' = ').length, end + 1)).join('\n');
  } catch (e) {
    return null;
  }
}

function lines(text) {
  return String(text).replace(/\r/g, '').split('\n')
    .map(function (l) { return l.trim().replace(/\s+/g, ' '); })
    .filter(function (l) { return l.length; });
}

async function run() {
  var t = createSuite('fixtures');

  await t.section('every fixture is the brief the client sent', async function () {
    PAIRS.forEach(function (pair) {
      var briefFile = pair[0], testFile = pair[1], varName = pair[2];
      var saved = lines(fs.readFileSync(path.join(BRIEF_DIR, briefFile), 'utf8'));
      var fixture = readFixture(testFile, varName);
      if (fixture === null) {
        t.fail(briefFile + ': could not read ' + varName + ' out of ' + testFile);
        return;
      }
      var got = lines(fixture);
      var missing = saved.filter(function (l) { return got.indexOf(l) === -1; });
      var extra = got.filter(function (l) { return saved.indexOf(l) === -1; });
      var detail = missing.map(function (l) { return 'brief only: ' + l; })
        .concat(extra.map(function (l) { return 'fixture only: ' + l; }))
        .join(' || ');
      t.ok(!missing.length && !extra.length,
        briefFile + ' matches ' + varName + ' in ' + testFile,
        detail || 'no difference');
    });
  });

  await t.section('the briefs on disk are intact', async function () {
    PAIRS.forEach(function (pair) {
      var text = fs.readFileSync(path.join(BRIEF_DIR, pair[0]), 'utf8');
      /* A brief is its standing guidelines plus the task line that carries this
         piece's own requirements. A file missing either is not a brief. */
      t.ok(/^Task #\d+ Content Guidelines/m.test(text) && /^Task #\d+-[A-Z]\b/m.test(text),
        pair[0] + ' has both its guidelines header and its task line');
    });
  });

  return t.summary();
}

module.exports = { name: 'fixtures', run: run };
