/* Backup safety tests.
 *
 * The whole workspace lives in one browser's localStorage, so the backup path
 * is the only thing standing between a cleared cache and lost client work.
 * These tests pin when the app nudges, when it stays quiet, and — the part
 * that actually matters — that a backup restores into an empty browser. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

async function openApp(context) {
  var page = await context.newPage({ viewport: { width: 1400, height: 900 } });
  var errors = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(APP_URL);
  await page.waitForTimeout(600);
  var startEmpty = page.locator('.modal-foot .btn', { hasText: 'Start empty' });
  if (await startEmpty.count()) await startEmpty.click();
  await page.waitForTimeout(200);
  page.__errors = errors;
  return page;
}

function status(page) {
  return page.evaluate(function () { return window.FW.store.backupStatus(); });
}

/* Add a task carrying a given number of words. */
function addWords(page, title, words) {
  return page.evaluate(function (args) {
    var S = window.FW.store;
    var task = S.addTask({ title: args.title });
    var doc = S.docForTask(task.id, true);
    S.saveDoc(doc.id, '<p>' + new Array(args.words + 1).join('word ') + '</p>');
    return S.totalWords();
  }, { title: title, words: words });
}

async function run() {
  var t = createSuite('backup');
  var browser = await chromium.launch();
  var backupFile = path.join(require('os').tmpdir(), 'ql-backup-test.json');

  try {
    var context = await browser.newContext();
    var page = await openApp(context);

    await t.section('the nudge stays quiet until there is something to lose', async function () {
      var s = await status(page);
      t.equal(s.state, 'empty', 'an empty workspace has nothing to back up');
      t.equal(await page.locator('.backup-banner').count(), 0, 'and shows no banner');
      t.match(await page.locator('.backup-btn').getAttribute('class'), /tone-idle/,
        'the indicator sits idle');

      await addWords(page, 'A short note', 120);
      await page.waitForTimeout(500);
      s = await status(page);
      t.ok(!s.atRisk, '120 words is not worth interrupting anyone over');
      t.equal(await page.locator('.backup-banner').count(), 0, 'still no banner');
    });

    await t.section('it speaks up once real work exists', async function () {
      await addWords(page, 'Real client work', 900);
      await page.waitForTimeout(600);
      var s = await status(page);
      t.equal(s.state, 'never', 'a thousand unbacked words is flagged');
      t.ok(s.atRisk, 'and is treated as at risk');
      t.equal(await page.locator('.backup-banner').count(), 1, 'the banner appears');
      t.match(await page.locator('.backup-btn').getAttribute('class'), /tone-risk/,
        'the indicator turns red');

      var text = await page.locator('.backup-banner').innerText();
      /* The warning has to say what is actually at stake, not just "back up". */
      t.includes(text, 'never been backed up', 'it says plainly that nothing is backed up');
      t.match(text, /1,0\d\d words/, 'it quantifies what would be lost');
      t.includes(text, 'only in this browser', 'it explains why that matters');
    });

    await t.section('backing up clears the warning', async function () {
      var download = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        page.locator('.backup-banner .btn', { hasText: 'Back up now' }).click()
      ]);
      await download[0].saveAs(backupFile);
      await page.waitForTimeout(600);

      t.match(download[0].suggestedFilename(), /^quill-ledger-backup-\d{4}-\d{2}-\d{2}\.json$/,
        'the backup is a dated JSON file');
      var s = await status(page);
      t.equal(s.state, 'ok', 'the workspace counts as backed up');
      t.equal(s.wordsSince, 0, 'nothing is outstanding straight afterwards');
      t.equal(await page.locator('.backup-banner').count(), 0, 'the banner goes away');
      t.match(await page.locator('.backup-btn').getAttribute('class'), /tone-ok/,
        'the indicator turns green');
    });

    await t.section('it stays quiet for small additions, and returns for large ones', async function () {
      await addWords(page, 'A small addition', 180);
      await page.waitForTimeout(500);
      t.ok(!(await status(page)).atRisk, '180 more words does not trigger a fresh warning');
      t.equal(await page.locator('.backup-banner').count(), 0, 'no banner for a small addition');

      await addWords(page, 'A long session', 1400);
      await page.waitForTimeout(600);
      var s = await status(page);
      t.ok(s.atRisk, 'a long writing session triggers a warning the same day');
      t.equal(s.state, 'stale', 'and is reported as stale');
      t.equal(await page.locator('.backup-banner').count(), 1, 'the banner returns');
    });

    await t.section('snoozing and switching it off', async function () {
      await page.locator('.backup-banner .btn', { hasText: 'Remind me in 3 days' }).click();
      await page.waitForTimeout(500);
      var s = await status(page);
      t.ok(s.snoozed, 'the reminder is snoozed');
      t.ok(!s.atRisk, 'and the warning stands down');
      t.equal(await page.locator('.backup-banner').count(), 0, 'the banner is dismissed');

      await page.reload();
      await page.waitForTimeout(800);
      t.ok((await status(page)).snoozed, 'the snooze survives a reload');
      t.equal(await page.locator('.backup-banner').count(), 0, 'and it stays dismissed');

      /* An overdue backup with new work should warn once the snooze expires. */
      await page.evaluate(function () {
        var S = window.FW.store;
        S.setSetting('backupSnoozedUntil', 0);
        S.setSetting('lastBackupAt', Date.now() - 10 * 86400000);
      });
      await page.waitForTimeout(600);
      var stale = await status(page);
      t.equal(stale.daysSince, 10, 'the age of the last backup is tracked');
      t.ok(stale.atRisk, 'a ten-day-old backup with new work warns again');
      t.includes(await page.locator('.backup-banner').innerText(), '10 days',
        'and the banner says how long it has been');

      await page.locator('.backup-banner .btn', { hasText: 'Turn off' }).click();
      await page.waitForTimeout(500);
      t.ok((await status(page)).remindersOff, 'reminders can be switched off entirely');
      t.equal(await page.locator('.backup-banner').count(), 0, 'and then it never interrupts');

      /* Switching off must not hide the button — that is the way back. */
      t.equal(await page.locator('.backup-btn').count(), 1, 'the backup button is still there');
      await page.locator('.backup-btn').click();
      await page.waitForTimeout(400);
      t.atLeast(await page.locator('.modal .stat-tile').count(), 3, 'the panel still reports status');
      await page.locator('.modal-foot .btn', { hasText: 'Close' }).click();
      await page.waitForTimeout(200);
    });

    t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    await context.close();

    await t.section('a backup restores into an empty browser', async function () {
      /* A genuinely fresh profile: clearing localStorage in the same page is
         not a real wipe, because the save-on-pagehide handler writes it
         straight back. */
      var freshContext = await browser.newContext();
      var fresh = await openApp(freshContext);

      var empty = await fresh.evaluate(function () {
        return {
          tasks: window.FW.store.state.tasks.length,
          keys: Object.keys(localStorage).filter(function (k) { return k.indexOf('quill') === 0; }).length
        };
      });
      t.equal(empty.tasks, 0, 'the fresh profile has no assignments');
      t.equal(empty.keys, 0, 'and no stored data at all');

      await fresh.locator('.backup-btn').click();
      await fresh.waitForTimeout(400);
      var chooser = fresh.waitForEvent('filechooser');
      await fresh.locator('.modal-foot .btn', { hasText: 'Import a backup' }).click();
      await (await chooser).setFiles(backupFile);
      await fresh.waitForTimeout(700);
      var replace = fresh.locator('.modal-foot .btn', { hasText: 'Replace' });
      if (await replace.count()) { await replace.click(); await fresh.waitForTimeout(900); }

      var restored = await fresh.evaluate(function () {
        var S = window.FW.store;
        return {
          tasks: S.state.tasks.length,
          docs: Object.keys(S.state.docs).length,
          words: S.totalWords(),
          history: Object.keys(S.state.docs).reduce(function (n, id) {
            return n + S.state.docs[id].history.length;
          }, 0),
          backupState: S.backupStatus().state
        };
      });

      t.atLeast(restored.tasks, 2, 'assignments come back');
      t.atLeast(restored.docs, 2, 'drafts come back');
      t.atLeast(restored.words, 1000, 'the words come back (' + restored.words + ')');
      t.equal(restored.backupState, 'ok', 'the restored workspace counts as backed up');
      t.atLeast(await fresh.locator('.task-card').count(), 2, 'and the board shows them');
      t.equal(fresh.__errors.length, 0, 'no console errors: ' + fresh.__errors.join(' | '));
      await freshContext.close();
    });
  } finally {
    await browser.close();
    try { require('fs').unlinkSync(backupFile); } catch (e) { /* already gone */ }
  }

  return t.summary();
}

module.exports = { run: run, name: 'backup' };

if (require.main === module) {
  run().then(function (s) { process.exit(s.failed ? 1 : 0); });
}
