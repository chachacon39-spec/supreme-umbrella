/* Regression tests for the Nov 16, 2026 walkthrough bugs (fix/walkthrough-bugs).
 *
 * Node part: brief parsing (word count, keywords, topic, audience), dates,
 * headlines and prose word counts — the two walkthrough briefs are used
 * throughout, so a regression shows up against the exact text that failed.
 * Browser part: placeholder typing + undo, the snapshot before an outline,
 * word-count agreement, the paraphraser with a bare caret, toasts, delete,
 * and the reference search seed. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var ROOT = path.join(__dirname, '..');
var APP_URL = 'file://' + path.join(ROOT, 'index.html');

function loadApp() {
  global.window = {};
  global.document = {
    createElement: function () {
      var node = {
        _html: '', style: {},
        set innerHTML(v) { node._html = String(v); },
        get innerHTML() { return node._html; },
        get textContent() { return node._html.replace(/<[^>]*>/g, ''); },
        childNodes: [],
        querySelectorAll: function () { return []; },
        querySelector: function () { return null; }
      };
      return node;
    }
  };

  [
    'assets/js/util.js',
    'assets/js/data/personas.js',
    'assets/js/data/lexicons.js',
    'assets/js/data/resources.js',
    'assets/js/core/brief.js',
    'assets/js/core/styles.js',
    'assets/js/core/analyzer.js',
    'assets/js/core/summarize.js',
    'assets/js/core/paraphrase.js',
    'assets/js/core/originality.js',
    'assets/js/core/citations.js',
    'assets/js/core/imagegen.js'
  ].forEach(function (f) {
    delete require.cache[require.resolve(path.join(ROOT, f))];
    require(path.join(ROOT, f));
  });

  return global.window.FW;
}

/* The two briefs from the Nov 16 walkthrough, verbatim. */
var ASTRONOMY = [
  'Topic: How to Spot the Planets with a Backyard Telescope this winter',
  'Audience: Amateur Stargazers and Hobby Astronomers',
  'Tone: friendly, curious',
  'Write a 900-word article for Astronomy Magazine. Deadline: December 12, 2026.',
  'Keywords: backyard telescopes, planets, winter sky. Reading level: grade 8.',
  'Include at least 3 subheadings and a conclusion.'
].join('\n');

var HERBS = [
  'Topic: keeping fresh herbs alive in a small kitchen',
  'Audience: home cooks with small kitchens',
  'Tone: warm, practical',
  'Write a 600-word article for Mother Earth Living. Deadline: December 5, 2026.',
  'Keywords: fresh herbs, small kitchen, herb garden. Reading level: grade 8.',
  'Include at least 3 subheadings and a conclusion.'
].join('\n');

function astronomyTask() {
  return { id: 'astro', title: 'How to Spot the Planets with a Backyard Telescope this winter', client: 'Astronomy Magazine', personaId: 'blog', brief: ASTRONOMY };
}
function herbsTask() {
  return { id: 'herbs', title: 'Keeping fresh herbs alive in a small kitchen', client: 'Mother Earth Living', personaId: 'blog', brief: HERBS };
}

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

async function editorState(page) {
  return page.evaluate(function () {
    var ed = document.querySelector('.editor');
    var placeholders = Array.prototype.filter.call(ed.querySelectorAll('p'), function (p) {
      return /draft this section/i.test(p.textContent);
    }).length;
    return {
      h2: ed.querySelectorAll('h2').length,
      placeholders: placeholders,
      html: ed.innerHTML
    };
  });
}

async function run() {
  var t = createSuite('walkthrough-bugs');
  /* The date bug only shows in a US timezone, so the Node part runs under
     America/Denver; the previous TZ is restored when the suite finishes, so
     the suites after this one are unaffected. */
  var ORIG_TZ = process.env.TZ;
  process.env.TZ = 'America/Denver';
  var FW = loadApp();

  await t.section('bug 2 — a bare YYYY-MM-DD is a calendar date, not UTC midnight', async function () {
    t.equal(FW.util.formatDate('2026-12-12'), 'Dec 12, 2026', 'Dec 12 stays Dec 12 in America/Denver');
    t.equal(FW.util.formatDate('2026-12-05'), 'Dec 5, 2026', 'Dec 5 stays Dec 5');
    t.equal(FW.util.formatDate('2026-01-01'), 'Jan 1, 2026', 'Jan 1 stays Jan 1');
    t.equal(FW.util.formatDate(''), '', 'empty stays empty');
  });

  await t.section('bug 3 — the keyword list ends where the next sentence begins', async function () {
    var astro = FW.brief.analyze(astronomyTask());
    t.equal(JSON.stringify(astro.meta.keywords.map(function (k) { return k.term; })),
      JSON.stringify(['backyard telescopes', 'planets', 'winter sky']),
      'no phantom "winter sky. Reading level: grade 8." keyword');
    var herbs = FW.brief.analyze(herbsTask());
    t.equal(JSON.stringify(herbs.meta.keywords.map(function (k) { return k.term; })),
      JSON.stringify(['fresh herbs', 'small kitchen', 'herb garden']),
      'and none on the herbs brief either');
  });

  await t.section('bug 4 — a hyphenated count is a word count', async function () {
    var astro = FW.brief.analyze(astronomyTask());
    t.ok(astro.meta.wordCount, 'the 900-word article has a word count');
    t.equal(astro.meta.wordCount.min, 855, '900-word reads as a band starting at 855');
    t.equal(astro.meta.wordCount.max, 990, 'and ending at 990');
    var herbs = FW.brief.analyze(herbsTask());
    t.ok(herbs.meta.wordCount, 'the 600-word article has a word count');
    t.equal(herbs.meta.wordCount.min, 570, '600-word reads as 570–660');
    t.equal(herbs.meta.wordCount.max, 660, '600-word reads as 570–660');
    t.notIncludes(astro.gaps.join(' | '), 'word count', 'no "No word count stated" gap on the astronomy brief');
    t.notIncludes(herbs.gaps.join(' | '), 'word count', 'and none on the herbs brief');
  });

  await t.section('bug 5 — headlines use the topic only, and are never cut mid-word', async function () {
    [astronomyTask(), herbsTask()].forEach(function (task) {
      var analysis = FW.brief.analyze(task);
      t.atMost(analysis.meta.topic.length, 70, 'the topic is short enough to headline (' + task.id + ')');
      t.notMatch(analysis.meta.topic, /write a \d/i, 'the topic is not the instruction (' + task.id + ')');
      t.notMatch(analysis.meta.topic, /Astronomy Magazine|Mother Earth Living/, 'nor the outlet (' + task.id + ')');
      t.atMost((analysis.meta.audience || '').length, 40, 'the audience is a label, not a clause (' + task.id + ')');
      var styles = FW.styles.generate(task, analysis);
      styles.variants.forEach(function (v) {
        t.equal(v.headlines.length, 3, v.label + ' still offers three headlines');
        v.headlines.forEach(function (h) {
          t.atMost(h.length, 90, v.label + ' headline fits in 90 chars: ' + JSON.stringify(h));
          t.notMatch(h, /\{[A-Z]+\}/, 'no unfilled token in: ' + JSON.stringify(h));
          t.notMatch(h, /\s$/, 'no trailing space in: ' + JSON.stringify(h));
        });
      });
    });
    /* A brief with no topic label states its subject in the first sentence. */
    var bare = FW.brief.analyze({
      title: 'Untitled assignment',
      brief: 'Write a 900-word article for Astronomy Magazine about how to spot the planets with a backyard telescope this winter.\nDeadline: December 12, 2026.'
    });
    t.equal(bare.meta.topic, 'how to spot the planets with a backyard telescope this winter',
      'the write-the-piece prefix and the outlet are stripped from a bare first sentence');
  });

  await t.section('bug 6 — placeholder lines are not words, anywhere they are counted', async function () {
    /* The scaffold joins its blocks with newlines, as the board does. */
    var scaffold = '<h1>Title here</h1>\n<h2>Hook</h2>\n<p><em>~100 words. Draft this section.</em></p>';
    t.equal(FW.util.proseWordCount(scaffold), 3, 'a scaffold with only headings and a placeholder counts 3 words');
    t.equal(FW.util.proseWordCount(scaffold + '\n<p>One two three four.</p>'), 7, 'real prose adds to it, the placeholder does not');
    t.equal(FW.util.proseWordCount('<p><em>Draft this section.</em></p>'), 0, 'a bare placeholder counts zero');
  });

  /* The Node part is done — restore the timezone before the browser part, so
     nothing after this suite inherits the Denver setting. */
  if (ORIG_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIG_TZ;

  var browser = await chromium.launch();
  try {
    var page = await openApp(browser);
    await loadSample(page);

    await t.section('bug 1 — typing over a placeholder writes clean prose', async function () {
      await startDraft(page);
      var before = await editorState(page);
      t.equal(before.placeholders, 10, 'the scaffold starts with 10 placeholders');
      t.equal(before.h2, 10, 'and 10 headings');

      var ph = page.locator('.editor p', { hasText: 'Draft this section' }).first();
      await ph.click();
      await page.waitForTimeout(200);
      await page.keyboard.type('The first thing to know is that solar panels pay back slowly.');
      await page.waitForTimeout(900);

      var after = await editorState(page);
      t.equal(after.h2, 10, 'typing keeps all 10 headings');
      t.equal(after.placeholders, 9, 'one placeholder is gone, replaced by prose');
      var typed = await page.evaluate(function () {
        var ed = document.querySelector('.editor');
        var nodes = Array.prototype.filter.call(ed.querySelectorAll('p'), function (p) {
          return /first thing to know/.test(p.textContent);
        });
        if (!nodes.length) return 'typed text not found';
        return nodes[0].innerHTML;
      });
      t.equal(typed, 'The first thing to know is that solar panels pay back slowly.',
        'the typed sentence sits in a clean paragraph, not inside the italics');
      var counted = await page.evaluate(function () {
        return window.FW.editor.api().getText().indexOf('first thing to know') !== -1;
      });
      t.ok(counted, 'and the checker sees it — it is counted, not swallowed by a placeholder');
    });

    await t.section('bug 1b — one Ctrl+Z undoes the whole burst; so does the Undo button', async function () {
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(500);
      var undone = await editorState(page);
      t.equal(undone.placeholders, 10, 'Ctrl+Z brings the placeholder back');
      t.notIncludes(undone.html, 'first thing to know', 'and the typed sentence is gone');

      var ph = page.locator('.editor p', { hasText: 'Draft this section' }).first();
      await ph.click();
      await page.waitForTimeout(200);
      await page.keyboard.type('Second attempt at typing here.');
      await page.waitForTimeout(500);
      t.equal((await editorState(page)).placeholders, 9, 'typing again swaps the placeholder out');
      await page.locator('.toolbar .tb-btn', { hasText: '↶' }).click();
      await page.waitForTimeout(500);
      var undone2 = await editorState(page);
      t.equal(undone2.placeholders, 10, 'the Undo button restores it too');
      t.notIncludes(undone2.html, 'Second attempt', 'and the second attempt is gone');
    });

    await t.section('bug 1 — a short draft is snapshotted before an outline replaces it', async function () {
      await page.locator('.viewnav button', { hasText: 'Board' }).click();
      await page.waitForTimeout(400);
      var taskId = await page.evaluate(function () {
        var S = window.FW.store;
        var task = S.addTask({ title: 'Short draft test', brief: 'Write a 300-word article about rivers.' });
        var doc = S.docForTask(task.id, true);
        S.saveDoc(doc.id, '<p>Hello world, this is short.</p>');
        window.FW.board.analyseTask(task.id);
        return task.id;
      });
      await page.waitForTimeout(400);
      await page.locator('.task-card', { hasText: 'Short draft test' }).click();
      await page.waitForTimeout(800);
      await page.locator('.style-card .btn', { hasText: 'Start draft' }).first().click();
      await page.waitForTimeout(900);
      var labels = await page.evaluate(function (id) {
        var doc = window.FW.store.state.docs[window.FW.store.getTask(id).docId];
        return (doc.history || []).map(function (e) { return e.label; });
      }, taskId);
      t.includes(labels.join(' | '), 'before the outline was replaced',
        'the 29-character draft has a restore point before the outline replaced it');
      /* Tidy up: the scratch assignment is not Chris's. */
      await page.evaluate(function (id) { window.FW.store.removeTask(id); }, taskId);
      await page.waitForTimeout(300);
    });

    await t.section('bug 6 — the status bar agrees with the checker', async function () {
      /* The scratch task was deleted at the end of the last section, which
         cleared the studio — re-open the sample assignment first. */
      await page.locator('.viewnav button', { hasText: 'Board' }).click();
      await page.waitForTimeout(400);
      await page.locator('.task-card').first().click();
      await page.waitForTimeout(400);
      await page.locator('.panel-head .btn', { hasText: 'Open in Studio' }).click();
      await page.waitForTimeout(600);
      var ph = page.locator('.editor p', { hasText: 'Draft this section' }).first();
      await ph.click();
      await page.waitForTimeout(200);
      await page.keyboard.type('The first thing to know is that solar panels pay back slowly.');
      await page.waitForTimeout(1800);
      var counts = await page.evaluate(function () {
        var status = document.querySelector('.statusbar').innerText;
        var words = window.FW.util.wordCount(window.FW.editor.api().getText());
        return { status: status, words: words };
      });
      var shown = Number((counts.status.match(/([\d,]+)\s*words/) || [])[1].replace(/,/g, '') || -1);
      t.equal(shown, counts.words, 'status bar (' + shown + ') matches the checked text (' + counts.words + ')');
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(400);
    });

    await t.section('bug 7 — the paraphraser works on the sentence at the caret', async function () {
      var ph = page.locator('.editor p', { hasText: 'Draft this section' }).first();
      await ph.click();
      await page.waitForTimeout(200);
      /* A passive sentence the rule-based paraphraser is known to rewrite. */
      await page.keyboard.type('The report was written by the marketing team and the results were checked twice.');
      await page.waitForTimeout(900);
      /* Caret in the middle of the sentence, nothing selected. */
      await page.locator('.editor p', { hasText: 'was written by the marketing team' }).click();
      await page.waitForTimeout(200);
      await page.locator('.pane-right .tab', { hasText: 'Tools' }).click();
      await page.waitForTimeout(300);
      await page.locator('.pane-right .btn', { hasText: 'Rewrite' }).click();
      await page.waitForTimeout(800);
      var pane = await page.locator('.pane-right').innerText();
      t.notIncludes(pane, 'Select a passage first', 'no refusal with a bare caret');
      t.includes(pane, 'rewritten', 'the sentence at the caret was rewritten');
      t.equal(await page.locator('.pane-right .btn', { hasText: 'Replace sentence' }).count(), 1,
        'and it offers to replace that sentence');
      var rewritten = await page.locator('.pane-right .tool-out:visible').first().innerText();
      await page.locator('.pane-right .btn', { hasText: 'Replace sentence' }).click();
      await page.waitForTimeout(600);
      var draft = await page.evaluate(function () { return document.querySelector('.editor').innerText; });
      t.includes(draft, rewritten.trim(), 'the replacement lands in the draft');
      t.notIncludes(draft, 'was written by the marketing team', 'and the passive original is gone');
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(400);
    });

    await t.section('bug 8 — a new toast replaces the old one', async function () {
      var toast = await page.evaluate(function () {
        window.FW.kit.toast('First message');
        window.FW.kit.toast('Second message');
        var nodes = document.querySelectorAll('#toasts .toast');
        return { count: nodes.length, text: nodes.length ? nodes[0].textContent : '' };
      });
      t.equal(toast.count, 1, 'only one toast is showing');
      t.equal(toast.text, 'Second message', 'and it is the latest one');
    });

    await t.section('bug 9 — deleting an assignment clears the detail panel', async function () {
      await page.locator('.viewnav button', { hasText: 'Board' }).click();
      await page.waitForTimeout(400);
      await page.locator('.task-card').first().click();
      await page.waitForTimeout(500);
      var panelBefore = await page.locator('.brief-panel, .panel-body').first().innerText();
      t.includes(panelBefore, 'Do home solar panels', 'the panel shows the assignment before deleting');
      await page.locator('.panel-head .btn', { hasText: 'Edit' }).click();
      await page.waitForTimeout(400);
      await page.locator('.modal-foot .btn-danger', { hasText: 'Delete' }).first().click();
      await page.waitForTimeout(400);
      /* The confirm is a second modal stacked on top of the edit dialog. */
      await page.locator('.modal-backdrop').last().locator('.modal-foot .btn', { hasText: 'Delete' }).click();
      await page.waitForTimeout(500);
      var panelAfter = await page.locator('.brief-panel, .panel-body').first().innerText();
      t.notIncludes(panelAfter, 'Do home solar panels', 'the deleted assignment is gone from the panel');
      t.includes(panelAfter, 'Select an assignment', 'and the empty state is showing');
      t.equal(await page.locator('.task-card').count(), 0, 'and no cards are left on the board');
    });

    await t.section('bug 10 — the reference search is seeded with a keyword, not the brief', async function () {
      await loadSample(page);
      await page.locator('.viewnav button', { hasText: 'Reference' }).click();
      await page.waitForTimeout(500);
      var seed = await page.locator('input[placeholder*="Search term to send"]').inputValue();
      t.atMost(seed.length, 40, 'the seed is short: ' + JSON.stringify(seed));
      t.notIncludes(seed, 'Deadline', 'and it is not the brief text');
    });

    t.equal(page.__errors.length, 0, 'no console errors during the whole run: ' + page.__errors.join(' | '));
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { run: run, name: 'walkthrough-bugs' };

if (require.main === module) {
  run().then(function (s) { process.exit(s.failed ? 1 : 0); });
}
