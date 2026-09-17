/* The input paths nothing ever tested.
 *
 * Every other suite loads a draft with `editor.innerHTML = html`, which walks
 * straight past the paste handler, the drop handler and the clipboard writer.
 * Nine hundred assertions and not one of them pressed Ctrl+V. What that hid:
 * a paste that cancelled the event and then relied on an execCommand it never
 * checked, so on any engine without insertHTML the text vanished silently; a
 * copy that always reported success; a drop path with no sanitising at all;
 * and, downstream of a writer forced onto drag-and-drop, a client's guidelines
 * arriving as the headline of their own article and an outline exporting as a
 * finished document. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var GUIDELINES = [
  'Task #500 Content Guidelines',
  'Technology Blog Content',
  '',
  '* These tasks are content for a blog related to the technology sector',
  '* Each piece of content should be no longer than 300 words',
  '* Content should insert any keywords mentioned at a density of 2% throughout the content',
  '* Content should be submitted in .docx format, font size 14, font family Calibri'
].join('\n');

async function openApp(browser) {
  var page = await browser.newPage({ viewport: { width: 1500, height: 960 }, acceptDownloads: true });
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

/* Put the caret at the end of the editor's first block and fire a real event. */
async function fireInput(page, kind, data, opts) {
  return page.evaluate(function (args) {
    var ed = document.querySelector('.editor');
    ed.innerHTML = args.seed;
    ed.focus();
    var range = document.createRange();
    range.selectNodeContents(ed.firstElementChild || ed);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    var real = document.execCommand;
    if (args.breakInsertHtml) {
      document.execCommand = function (cmd) {
        if (cmd === 'insertHTML') return false;
        return real.apply(document, arguments);
      };
    }

    var transfer = new DataTransfer();
    Object.keys(args.data).forEach(function (type) { transfer.setData(type, args.data[type]); });
    var event = args.kind === 'drop'
      ? new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true, clientX: 0, clientY: 0 })
      : new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true });

    var notCancelled = ed.dispatchEvent(event);
    document.execCommand = real;
    return { cancelled: !notCancelled, html: ed.innerHTML, text: ed.innerText };
  }, { kind: kind, data: data, seed: (opts && opts.seed) || '<p>Opening line. </p>', breakInsertHtml: !!(opts && opts.breakInsertHtml) });
}

async function run() {
  var t = createSuite('clipboard');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('pasting text into the draft', async function () {
      var r = await fireInput(page, 'paste', { 'text/plain': 'pasted words' });
      t.ok(r.cancelled, 'the handler takes the paste over');
      t.includes(r.text, 'pasted words', 'and the words arrive');
      /* insertHTML wraps its insertion in the caret's letter-spacing. */
      t.notMatch(r.html, /letter-spacing/, 'without the span execCommand leaves behind');
      t.equal(r.html.indexOf('<p>Opening line.'), 0, 'inline, not as a new paragraph of its own');

      var multi = await fireInput(page, 'paste', { 'text/plain': 'first para\n\nsecond para' });
      t.includes(multi.text, 'first para', 'a blank line still starts a paragraph');
      t.match(multi.html, /<p>second para<\/p>/, 'and the second one is its own block');
    });

    await t.section('a paste the engine cannot complete', async function () {
      /* The reported bug. preventDefault() ran first and the insertHTML that
         followed was never checked, so where the command is unsupported the
         text was cancelled out of existence — no insertion, no error, nothing
         to retry. Drag-and-drop still worked, which is what gave it away. */
      var r = await fireInput(page, 'paste', { 'text/plain': 'must not vanish' }, { breakInsertHtml: true });
      t.includes(r.text, 'must not vanish', 'the text lands through the Range fallback instead');

      /* And when we cannot place it at all, the browser must keep its own. */
      var empty = await fireInput(page, 'paste', {});
      t.ok(!empty.cancelled, 'an unreadable payload is left to the browser to paste');
    });

    await t.section('markup arriving from outside', async function () {
      var dirty = '<p class="x" id="y" style="color:red" onclick="alert(1)">clean text</p>' +
                  '<script>alert(2)<\/script><b>bold survives</b>';

      var pasted = await fireInput(page, 'paste', { 'text/html': dirty });
      t.includes(pasted.text, 'clean text', 'pasted markup keeps its words');
      t.match(pasted.html, /<b>bold survives<\/b>/, 'and its meaningful formatting');
      t.notMatch(pasted.html, /onclick|<script|class="x"|id="y"|color:red/, 'but not scripts, handlers, ids, classes or colours');

      /* Drop had no handler at all, so a drag out of a web page carried the
         lot into the draft and on into the delivered file. */
      var dropped = await fireInput(page, 'drop', { 'text/html': dirty });
      t.ok(dropped.cancelled, 'a drop is handled rather than left raw');
      t.includes(dropped.text, 'clean text', 'the words arrive');
      t.notMatch(dropped.html, /onclick|<script|class="x"|id="y"|color:red/, 'and it is sanitised the same way a paste is');
    });

    await t.section('reporting whether a copy happened', async function () {
      var out = await page.evaluate(function () {
        var realNav = navigator.clipboard;
        var realCmd = document.execCommand;
        function withClipboard(present, cmdResult) {
          try { Object.defineProperty(navigator, 'clipboard', { value: present ? realNav : undefined, configurable: true }); } catch (e) {}
          document.execCommand = function (cmd) {
            if (cmd === 'copy') return cmdResult;
            return realCmd.apply(document, arguments);
          };
        }
        withClipboard(false, false);
        return FW.util.copyText('nope').then(function (refused) {
          withClipboard(false, true);
          return FW.util.copyText('yes').then(function (worked) {
            document.execCommand = realCmd;
            try { Object.defineProperty(navigator, 'clipboard', { value: realNav, configurable: true }); } catch (e) {}
            return { refused: refused, worked: worked };
          });
        });
      });
      /* It always resolved true, so a refused copy still raised a "Copied to
         clipboard" toast and the writer pasted nothing into the portal. */
      t.equal(out.refused, false, 'a copy the browser refuses reports failure');
      t.equal(out.worked, true, 'and one that succeeds reports success');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('a brief dropped into the title field', async function () {
      await page.locator('.board-bar .btn-primary', { hasText: 'New assignment' }).click();
      await page.waitForTimeout(300);
      var title = page.locator('.modal input[type="text"]').nth(0);
      await title.fill(GUIDELINES);
      await page.waitForTimeout(250);

      var note = await page.evaluate(function () {
        var n = document.querySelector('.modal .chip-warning');
        return n && n.parentElement ? n.parentElement.innerText : '';
      });
      /* A single-line input flattens the whole blob, and every headline
         downstream is then built out of the client's own instructions. */
      t.match(note, /Looks like a brief/, 'the field says so rather than accepting it silently');
      t.includes(note, 'brief box below', 'and points at where it belongs');

      await page.locator('.modal .btn', { hasText: 'Move it to the brief' }).click();
      await page.waitForTimeout(300);
      var moved = await page.evaluate(function () {
        return {
          title: document.querySelector('.modal input[type="text"]').value,
          brief: document.querySelector('.modal textarea').value,
          warned: !!document.querySelector('.modal .chip-warning')
        };
      });
      t.equal(moved.title, '', 'one click empties the title');
      t.includes(moved.brief, 'density of 2%', 'the guidelines land in the brief');
      t.ok(!moved.warned, 'and the warning clears');
    });

    await t.section('what the client would have received', async function () {
      await page.locator('.modal input[type="text"]').nth(0).fill('Task #500-A — technology blog post');
      await page.locator('.modal input[type="text"]').nth(1).fill('Portal client');
      await page.waitForTimeout(400);
      await page.locator('.modal-foot .btn-primary', { hasText: 'Create & analyse' }).click();
      await page.waitForTimeout(1000);
      await page.locator('.style-card .btn', { hasText: 'Start draft' }).first().click();
      await page.waitForTimeout(1000);
      var confirm = page.locator('.modal-foot .btn', { hasText: 'Replace draft' });
      if (await confirm.count()) { await confirm.click(); await page.waitForTimeout(600); }

      var h1 = await page.evaluate(function () {
        var h = document.querySelector('.editor h1');
        return h ? h.textContent : '';
      });
      t.atMost(h1.length, 120, 'the scaffolded headline is a headline, not a pasted brief');

      await page.locator('.pane-right .tab', { hasText: 'Export' }).click();
      await page.waitForTimeout(400);
      await page.locator('.pane-right .btn', { hasText: 'Word (.docx)' }).first().click();
      await page.waitForTimeout(500);

      /* The outline exports as clean, complete-looking paragraphs. Only a human
         can tell that "Draft this section." is not the article. */
      var asked = await page.evaluate(function () {
        var m = document.querySelector('.modal-backdrop');
        return m ? m.innerText : '';
      });
      t.match(asked, /still the outline/, 'exporting an unwritten outline stops to ask');
      t.match(asked, /Draft this section/, 'naming what it found');

      await page.locator('.modal-foot .btn', { hasText: 'Export anyway' }).click();
      await page.waitForTimeout(400);

      /* Once it is written, it must not nag. */
      await page.evaluate(function () {
        var ed = document.querySelector('.editor');
        ed.innerHTML = '<h1>Real headline</h1>' +
          '<p>An actual opening paragraph that says something about the subject at hand.</p>' +
          '<p>A second paragraph carrying the argument forward with specifics.</p>';
        ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
      });
      await page.waitForTimeout(900);
      var download = (await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        page.locator('.pane-right .btn', { hasText: 'Word (.docx)' }).first().click()
      ]))[0];
      var chunks = [];
      var stream = await download.createReadStream();
      await new Promise(function (resolve) {
        stream.on('data', function (c) { chunks.push(c); });
        stream.on('end', resolve);
      });
      var bytes = Buffer.concat(chunks).toString('latin1');
      t.includes(bytes, 'An actual opening paragraph', 'a written draft exports without being questioned');
      t.notIncludes(bytes, 'Draft this section', 'and carries none of the scaffold');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'clipboard', run: run };
