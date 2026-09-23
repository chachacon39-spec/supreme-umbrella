/* Application tests — the whole app driven in a real browser.
 *
 * Covers the path a writer actually takes: create an assignment, read the
 * analysis, pick an approach, draft, get checked, use the tools, export. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

async function openApp(browser, viewport) {
  var page = await browser.newPage({ viewport: viewport || { width: 1500, height: 940 } });
  var errors = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(APP_URL);
  await page.waitForTimeout(500);
  var startEmpty = page.locator('.modal-foot .btn', { hasText: 'Start empty' });
  if (await startEmpty.count()) await startEmpty.click();
  await page.waitForTimeout(150);
  page.__errors = errors;
  return page;
}

async function loadSample(page) {
  await page.locator('.board-bar .btn', { hasText: 'Sample assignment' }).click();
  await page.waitForTimeout(500);
}

async function startDraft(page) {
  await page.locator('.style-card .btn', { hasText: 'Start draft' }).first().click();
  await page.waitForTimeout(800);
  var confirm = page.locator('.modal-foot .btn', { hasText: 'Replace draft' });
  if (await confirm.count()) { await confirm.click(); await page.waitForTimeout(600); }
}

async function run() {
  var t = createSuite('app');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('board and brief analysis', async function () {
      await loadSample(page);
      t.equal(await page.locator('.task-card').count(), 1, 'the sample assignment appears on the board');
      t.equal(await page.locator('.style-card').count(), 3, 'three approaches are offered');
      t.atLeast(await page.locator('.brief-panel .chip').count(), 20, 'the analysis surfaces requirements as chips');

      var panel = await page.locator('.brief-panel').innerText();
      t.includes(panel, '1200', 'the word-count requirement is shown');
      t.includes(panel, 'APA', 'the citation style is shown');
      t.includes(panel, 'game changer', 'the banned phrase is shown');

      /* The sample brief says "keep the reading level around grade 8" — a
         phrasing that used to be missed entirely. */
      t.includes(panel, 'Grade 8', 'the reading level is read from natural phrasing');
    });

    await t.section('drag and drop', async function () {
      var card = page.locator('.task-card').first();
      var target = page.locator('.column[data-column="drafting"] .column-body');
      var cb = await card.boundingBox(), tb = await target.boundingBox();
      await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
      await page.mouse.down();
      await page.mouse.move(tb.x + tb.width / 2, tb.y + 40, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      t.equal(await page.locator('.column[data-column="drafting"] .task-card').count(), 1,
        'a card dragged to another column lands there');
    });

    await t.section('drafting from an approach', async function () {
      await startDraft(page);
      t.atLeast(await page.locator('#view-studio.is-active').count(), 1, 'choosing an approach opens the studio');
      t.atLeast(await page.locator('.editor h2').count(), 5, 'the outline is scaffolded as headings');
    });

    await t.section('live checking', async function () {
      await page.locator('.editor').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await page.waitForTimeout(200);

      t.equal(await page.evaluate(function () { return document.querySelector('.editor').innerHTML; }),
        '<p><br></p>', 'clearing everything leaves a paragraph, not an empty heading');

      /* Long enough to clear the originality checker's 30-word minimum. */
      await page.keyboard.type('Their is alot of reasons homeowners dont bother. ' +
        'The report was written by the team and the report was reviewed by the team. ' +
        'However the results where clear. At the end of the day you should definately ' +
        'try and think outside the box before you commit to any of these options.');
      await page.waitForTimeout(1400);

      t.atLeast(await page.locator('.issue').count(), 6, 'problems are listed');
      t.atLeast(await page.evaluate(function () { return CSS.highlights ? CSS.highlights.size : 0; }), 1,
        'problems are highlighted in the text');

      var status = await page.locator('.statusbar').innerText();
      t.match(status, /words/, 'the status bar reports a word count');
      t.match(status, /grade/, 'the status bar reports a reading grade');

      /* Applying a fix must change the text and keep capitalisation. */
      var fix = page.locator('.issue .btn-primary').first();
      await fix.click();
      await page.waitForTimeout(800);
      var text = await page.locator('.editor').innerText();
      t.match(text, /^There is/, 'applying a fix corrects the text and keeps the capital');
      t.notMatch(text, /^Their is/, 'the original error is gone');
    });

    await t.section('brief compliance', async function () {
      var rows = await page.locator('.pane-left .check-item').count();
      t.atLeast(rows, 10, 'the draft is scored against the brief');
      var left = await page.locator('.pane-left').innerText();
      t.includes(left, 'Word count', 'word count is tracked against the brief');
      t.match(left, /short|over/, 'the shortfall against the target is reported');
    });

    await t.section('tools', async function () {
      await page.locator('.pane-right .tab', { hasText: 'Tools' }).click();
      await page.waitForTimeout(300);

      await page.locator('.pane-right .btn', { hasText: 'Summarise' }).click();
      await page.waitForTimeout(500);
      t.atLeast(await page.locator('.pane-right .tool-out').count(), 1, 'the summariser produces output');

      await page.locator('.pane-right .btn', { hasText: 'Rewrite' }).click();
      await page.waitForTimeout(500);
      t.atLeast(await page.locator('.pane-right .tool-out').count(), 2, 'the paraphraser produces output');

      /* A heading is passed over rather than rewritten, so a selection can now
         hold no prose at all. The panel used to answer that with "nothing
         applied in these 0 sentences \u2014 try a different mode", which is untrue
         twice: there is nothing to apply anything to, and no mode changes it. */
      var headingOnly = await page.evaluate(function () {
        var ed = document.querySelector('.editor');
        var before = ed.innerHTML;
        ed.innerHTML = '<p>Remote and picturesque Mahale Mountains in western Tanzania</p>';
        ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
        return before;
      });
      await page.waitForTimeout(700);
      await page.locator('.pane-right .btn', { hasText: 'Rewrite' }).click();
      await page.waitForTimeout(500);
      var emptyPanel = await page.locator('.pane-right').innerText();
      t.includes(emptyPanel, 'No sentences to rewrite here',
        'a line with no finished sentence says so plainly');
      t.notIncludes(emptyPanel, '0 sentences', 'and does not report a count of zero');
      t.notIncludes(emptyPanel, 'Try another mode', 'and offers no mode that would change it');

      await page.evaluate(function (html) {
        var ed = document.querySelector('.editor');
        ed.innerHTML = html;
        ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }, headingOnly);
      await page.waitForTimeout(700);

      await page.locator('.pane-right .btn', { hasText: 'Run check' }).click();
      await page.waitForTimeout(700);
      t.includes(await page.locator('.pane-right').innerText(), 'overlap',
        'the originality check reports an overlap figure');
    });

    await t.section('citations', async function () {
      await page.locator('.pane-right .tab', { hasText: 'Citations' }).click();
      await page.waitForTimeout(300);
      await page.locator('.pane-right input[placeholder*="Paste a URL"]')
        .fill('https://www.nrel.gov/2024/05/solar-payback-report.html');
      await page.waitForTimeout(700);
      await page.locator('.pane-right .btn', { hasText: 'Add citation' }).click();
      await page.waitForTimeout(400);
      t.atLeast(await page.locator('.pane-right .card').count(), 1, 'a citation is saved');

      await page.locator('.pane-right .btn', { hasText: 'Insert in-text' }).first().click();
      await page.waitForTimeout(500);
      var html = await page.evaluate(function () { return document.querySelector('.editor').innerHTML; });
      /* execCommand used to rewrite <mark> into a styled span. */
      t.includes(html, 'cite-marker', 'the in-text citation keeps its markup when inserted');

      await page.locator('.pane-right .btn', { hasText: 'Insert list' }).click();
      await page.waitForTimeout(500);
      t.includes(await page.evaluate(function () { return document.querySelector('.editor').innerHTML; }),
        'References', 'the reference list is inserted');
    });

    await t.section('image generator', async function () {
      await page.locator('.pane-right .tab', { hasText: 'Images' }).click();
      await page.waitForTimeout(400);
      t.equal(await page.locator('.img-preview svg').count(), 1, 'artwork is generated and previewed');
      await page.locator('.pane-right .btn', { hasText: 'Insert in draft' }).click();
      await page.waitForTimeout(500);
      t.atLeast(await page.locator('.editor img').count(), 1, 'the artwork is inserted into the draft');
    });

    await t.section('exports', async function () {
      await page.locator('.pane-right .tab', { hasText: 'Export' }).click();
      await page.waitForTimeout(300);

      var formats = [['Word (.docx)', /\.docx$/], ['Markdown', /\.md$/], ['Plain text', /\.txt$/], ['HTML', /\.html$/]];
      for (var i = 0; i < formats.length; i++) {
        var label = formats[i][0], pattern = formats[i][1];
        var download = await Promise.all([
          page.waitForEvent('download', { timeout: 10000 }),
          page.locator('.pane-right .btn', { hasText: label }).first().click()
        ]);
        var file = download[0];
        t.match(file.suggestedFilename(), pattern, label + ' downloads with the right extension');
        var stream = await file.createReadStream();
        var size = 0;
        await new Promise(function (resolve) {
          stream.on('data', function (c) { size += c.length; });
          stream.on('end', resolve);
        });
        t.atLeast(size, 100, label + ' is not empty (' + size + ' bytes)');
      }
    });

    await t.section('reference desk', async function () {
      await page.locator('.viewnav button', { hasText: 'Reference' }).click();
      await page.waitForTimeout(400);
      t.atLeast(await page.locator('.res-card').count(), 8, 'research libraries are listed');

      var tabs = ['Craft & word bank', 'Languages', 'Style guides', 'Type library', 'Saved snippets'];
      for (var i = 0; i < tabs.length; i++) {
        await page.locator('.resources-view .tab', { hasText: tabs[i] }).click();
        await page.waitForTimeout(200);
        t.atLeast((await page.locator('.resources-view').innerText()).length, 80,
          'the "' + tabs[i] + '" tab renders content');
      }
    });

    await t.section('persistence', async function () {
      await page.locator('.viewnav button', { hasText: 'Studio' }).click();
      await page.waitForTimeout(300);
      await page.locator('.editor').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type(' A sentence typed immediately before reload.');
      await page.locator('#theme-btn').click();
      /* Reload with no pause: saves must flush on pagehide, not 300ms later. */
      await page.reload();
      await page.waitForTimeout(700);

      t.equal(await page.evaluate(function () { return document.documentElement.dataset.theme; }), 'dark',
        'a theme change survives an immediate reload');
      t.equal(await page.locator('.task-card').count(), 1, 'assignments survive a reload');

      await page.locator('.viewnav button', { hasText: 'Studio' }).click();
      await page.waitForTimeout(500);
      t.includes(await page.locator('.editor').innerText(), 'immediately before reload',
        'a draft typed immediately before reload survives it');
    });

    await t.section('narrow viewport', async function () {
      var phone = await openApp(browser, { width: 400, height: 820 });
      await loadSample(phone);
      var board = await phone.evaluate(function () {
        return { doc: document.documentElement.scrollWidth, win: window.innerWidth };
      });
      t.equal(board.doc, board.win, 'the board does not scroll horizontally at 400px');

      await startDraft(phone);
      var studio = await phone.evaluate(function () {
        return { doc: document.documentElement.scrollWidth, win: window.innerWidth };
      });
      t.equal(studio.doc, studio.win, 'the studio does not scroll horizontally at 400px');
      t.equal(phone.__errors.length, 0, 'no console errors at 400px: ' + phone.__errors.join(' | '));
      await phone.close();
    });

    t.equal(page.__errors.length, 0, 'no console errors during the whole run: ' + page.__errors.join(' | '));
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { run: run, name: 'app' };

if (require.main === module) {
  run().then(function (s) { process.exit(s.failed ? 1 : 0); });
}
