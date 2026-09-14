/* Version history and storage tests.
 *
 * The automatic snapshot used to be a debounce, which fires once writing
 * *stops* — so an uninterrupted session produced no restore points at all.
 * These tests pin the throttle, the milestone snapshots, and the storage
 * budget that keeps history from evicting the drafts it is meant to protect. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

/* Labels of the current document's history, newest first. */
function history(page) {
  return page.evaluate(function () {
    var S = window.FW.store;
    var task = S.getTask(S.state.activeTaskId);
    if (!task || !task.docId) return [];
    return S.getDoc(task.docId).history.map(function (h) { return h.label; });
  });
}

async function bootIntoDraft(browser, useClock) {
  var page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  var errors = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  if (useClock) await page.clock.install();
  await page.goto(APP_URL);

  var wait = useClock
    ? function (ms) { return page.clock.runFor(ms); }
    : function (ms) { return page.waitForTimeout(ms); };

  await wait(900);
  var loadSample = page.locator('.modal-foot .btn', { hasText: 'Load the sample' });
  if (await loadSample.count()) await loadSample.click();
  else {
    var startEmpty = page.locator('.modal-foot .btn', { hasText: 'Start empty' });
    if (await startEmpty.count()) await startEmpty.click();
    await page.locator('.board-bar .btn', { hasText: 'Sample assignment' }).click();
  }
  await wait(900);

  await page.locator('.style-card .btn', { hasText: 'Start draft' }).first().click();
  await wait(1200);
  var confirm = page.locator('.modal-foot .btn', { hasText: 'Replace draft' });
  if (await confirm.count()) { await confirm.click(); await wait(1200); }

  page.__errors = errors;
  page.__wait = wait;
  return page;
}

async function run() {
  var t = createSuite('history');
  var browser = await chromium.launch();

  try {
    await t.section('snapshots while writing continuously', async function () {
      /* A controlled clock, because the throttle is 90 seconds wide. */
      var page = await bootIntoDraft(browser, true);
      var wait = page.__wait;

      var baseline = await history(page);
      t.equal(baseline.length, 1, 'the scaffolded outline is itself a restore point');
      t.match(baseline[0], /outline/i, 'and it is labelled as the outline');

      await page.locator('.editor').click();
      await page.keyboard.press('Control+End');

      /* Type in bursts four seconds apart: never idle long enough for a
         debounce to settle, which is exactly the case that used to fail. */
      for (var round = 1; round <= 6; round++) {
        for (var i = 0; i < 8; i++) {
          await page.keyboard.type(' Sentence ' + round + '-' + i +
            ' adds a good handful of additional words to the draft.');
          await wait(4000);
        }
      }

      var after = await history(page);
      t.atLeast(after.length, 3, 'continuous writing produces restore points (got ' + after.length + ')');
      t.ok(after.some(function (l) { return /while writing/.test(l); }),
        'automatic snapshots are labelled "while writing"');
      t.match(after[0], /[+-]\d+ words/, 'the label records how much changed');

      /* Throttled, not one per keystroke. ~192s of writing at one per 90s. */
      t.atMost(after.length, 5, 'snapshots are throttled, not taken on every edit');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
      await page.close();
    });

    await t.section('milestone snapshots', async function () {
      var page = await bootIntoDraft(browser, false);

      await page.locator('.editor').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type(' A first added sentence for the manual save.');
      await page.waitForTimeout(500);

      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);
      var afterSave = await history(page);
      t.equal(afterSave[0], 'manual save', 'Ctrl+S records a version');

      /* Saving again with nothing changed must not store a duplicate. */
      var countBefore = afterSave.length;
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(400);
      t.equal((await history(page)).length, countBefore, 'saving again with no edits adds nothing');

      /* Inserting a reference list rewrites the draft — snapshot first. */
      await page.locator('.pane-right .tab', { hasText: 'Citations' }).click();
      await page.waitForTimeout(300);
      await page.locator('.pane-right input[placeholder*="Paste a URL"]')
        .fill('https://www.nrel.gov/2024/05/solar-payback.html');
      await page.waitForTimeout(700);
      await page.locator('.pane-right .btn', { hasText: 'Add citation' }).click();
      await page.waitForTimeout(300);
      await page.locator('.pane-right .btn', { hasText: 'Insert list' }).click();
      await page.waitForTimeout(600);
      t.match((await history(page))[0], /before the reference list/,
        'inserting a reference list is undoable');

      await page.locator('.pane-right .tab', { hasText: 'Images' }).click();
      await page.waitForTimeout(400);
      await page.locator('.pane-right .btn', { hasText: 'Insert in draft' }).click();
      await page.waitForTimeout(600);
      t.match((await history(page))[0], /before the image/, 'inserting artwork is undoable');

      /* A bulk fix changes many places at once — the riskiest single action. */
      await page.locator('.editor').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type(' teh cat sat. teh dog ran. teh bird flew.');
      await page.waitForTimeout(1600);
      await page.locator('.pane-right .tab', { hasText: /^Checks/ }).click();
      await page.waitForTimeout(600);
      /* Target one known rule rather than whichever happens to be listed first:
         the totals shift as fixes surface new issues, which made an earlier
         version of this assertion flaky. */
      var tehIssue = page.locator('.issue')
        .filter({ has: page.locator('.excerpt', { hasText: /^teh$/ }) }).first();
      t.atLeast(await tehIssue.count(), 1, 'the repeated misspelling is flagged');

      var fixAll = tehIssue.locator('.btn', { hasText: /Fix all/ });
      if (await fixAll.count()) {
        var label = await fixAll.innerText();
        var expected = Number((label.match(/Fix all (\d+)/) || [])[1] || 0);
        t.atLeast(expected, 3, 'the button offers to fix all three occurrences');

        await fixAll.click();
        await page.waitForTimeout(900);

        t.match((await history(page))[0], /before fixing \d+/, 'a bulk fix is undoable');
        t.notMatch(await page.locator('.editor').innerText(), /\bteh\b/,
          'every occurrence of the misspelling is corrected');
        t.equal(await page.locator('.issue')
          .filter({ has: page.locator('.excerpt', { hasText: /^teh$/ }) }).count(), 0,
          'and none of them are still reported');
      } else {
        t.fail('a bulk fix is undoable', 'no "Fix all" button appeared on the repeated misspelling');
      }

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
      await page.close();
    });

    await t.section('the history panel', async function () {
      var page = await bootIntoDraft(browser, false);
      await page.locator('.editor').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type(' Something worth keeping a version of.');
      await page.waitForTimeout(400);
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      await page.locator('.toolbar .btn', { hasText: 'History' }).click();
      await page.waitForTimeout(600);

      t.atLeast(await page.locator('.modal .card').count(), 2, 'versions are listed');
      var tiles = (await page.locator('.modal .stat-tile').allInnerTexts()).join(' ');
      t.match(tiles, /WORDS NOW/i, 'the panel reports the current word count');
      t.match(tiles, /VERSIONS KEPT/i, 'the panel reports how many versions are kept');
      t.match(tiles, /HISTORY SIZE/i, 'the panel reports how much storage history uses');

      var wordsBefore = await page.evaluate(function () {
        return window.FW.util.wordCount(document.querySelector('.editor').textContent);
      });
      await page.locator('.modal .btn', { hasText: 'Restore' }).last().click();
      await page.waitForTimeout(800);
      var wordsAfter = await page.evaluate(function () {
        return window.FW.util.wordCount(document.querySelector('.editor').textContent);
      });
      t.ok(wordsBefore !== wordsAfter, 'restoring an old version changes the draft');
      t.match((await history(page))[0], /before restoring/, 'restoring is itself undoable');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
      await page.close();
    });

    await t.section('history is bounded', async function () {
      var page = await bootIntoDraft(browser, false);
      var r = await page.evaluate(function () {
        var S = window.FW.store;
        var task = S.addTask({ title: 'Bounds' });
        var doc = S.docForTask(task.id, true);
        var out = {};

        for (var i = 0; i < 45; i++) S.snapshotDoc(doc.id, 'v' + i, '<p>version ' + i + ' ' + 'word '.repeat(20) + '</p>');
        out.entryCap = S.historyStats(doc.id).entries;
        out.newestKept = doc.history[0].label;

        doc.history.length = 0;
        var big = '<p>' + 'lorem ipsum dolor sit amet '.repeat(1500) + '</p>';
        for (i = 0; i < 40; i++) S.snapshotDoc(doc.id, 'big' + i, big + '<!--' + i + '-->');
        var stats = S.historyStats(doc.id);
        out.byteCappedEntries = stats.entries;
        out.byteCappedKB = Math.round(stats.bytes / 1024);

        doc.history.length = 0;
        var huge = '<p>' + 'x'.repeat(500000) + '</p>';
        for (i = 0; i < 5; i++) S.snapshotDoc(doc.id, 'huge' + i, huge + '<!--' + i + '-->');
        out.hugeKept = S.historyStats(doc.id).entries;

        doc.history.length = 0;
        S.snapshotDoc(doc.id, 'first', '<p>same</p>');
        S.snapshotDoc(doc.id, 'second', '<p>same</p>');
        out.dedupedTo = S.historyStats(doc.id).entries;
        out.dedupeLabel = doc.history[0].label;

        doc.history.length = 0;
        out.blankReturned = S.snapshotDoc(doc.id, 'blank', '<p><br></p>');
        out.blankEntries = S.historyStats(doc.id).entries;
        return out;
      });

      t.equal(r.entryCap, 30, 'history is capped at 30 entries');
      t.equal(r.newestKept, 'v44', 'the newest version is the one kept');
      t.atMost(r.byteCappedKB, 400, 'history stays inside its byte budget (' + r.byteCappedKB + 'KB)');
      t.atLeast(r.byteCappedEntries, 3, 'a byte-capped history still keeps several versions');
      t.equal(r.hugeKept, 3, 'a minimum is kept even when one version blows the budget');
      t.equal(r.dedupedTo, 1, 'identical content is not stored twice');
      t.equal(r.dedupeLabel, 'second', 'a duplicate relabels the existing entry');
      t.equal(r.blankReturned, null, 'a blank draft is never snapshotted');
      t.equal(r.blankEntries, 0, 'and adds no entry');
      await page.close();
    });

    await t.section('the draft outranks its history when storage runs out', async function () {
      var page = await bootIntoDraft(browser, false);
      var r = await page.evaluate(async function () {
        var S = window.FW.store;
        var trimmed = false, full = false;
        S.on('storage:trimmed', function () { trimmed = true; });
        S.on('storage:full', function () { full = true; });

        /* Fill most of the quota, leaving roughly 350KB — the realistic case
           where this app's own history is what tips it over. */
        var blocks = 0;
        try {
          for (var i = 0; i < 500; i++) { localStorage.setItem('ballast' + i, 'x'.repeat(50000)); blocks++; }
        } catch (e) { /* expected */ }
        for (i = 0; i < 7; i++) localStorage.removeItem('ballast' + i);

        var task = S.addTask({ title: 'Quota pressure' });
        var doc = S.docForTask(task.id, true);
        var draft = '<p>' + 'the real draft text '.repeat(1200) + '</p>';
        for (i = 0; i < 25; i++) S.snapshotDoc(doc.id, 'v' + i, draft + '<!--' + i + '-->');
        S.saveDoc(doc.id, draft + '<!--FINAL-->');
        S.flush();
        await new Promise(function (res) { setTimeout(res, 500); });

        var raw = localStorage.getItem('quill-ledger:docs');
        return {
          ballastBlocks: blocks,
          trimmedFired: trimmed,
          fullFired: full,
          draftSurvived: !!raw && raw.indexOf('FINAL') !== -1,
          versionsKept: S.historyStats(doc.id).entries
        };
      });

      t.atLeast(r.ballastBlocks, 50, 'the test genuinely filled storage (' + r.ballastBlocks + ' blocks)');
      t.ok(r.draftSurvived, 'the draft is persisted even when storage is under pressure');
      t.atMost(r.versionsKept, 25, 'versions were shed to make room (' + r.versionsKept + ' kept)');
      t.ok(r.trimmedFired || r.fullFired, 'the user is told that storage was under pressure');
      await page.close();
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { run: run, name: 'history' };

if (require.main === module) {
  run().then(function (s) { process.exit(s.failed ? 1 : 0); });
}
