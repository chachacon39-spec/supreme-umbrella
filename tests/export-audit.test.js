/* The compliance panel measures the editor. The client receives the export.
 * Nothing was checking that those two agree, and the long-form round found a
 * requirement the panel counted as met which the .docx did not contain.
 *
 * This suite is that check, standing: one draft holding every element the
 * editor can produce, exported, and compared part by part. It found four more
 * divergences — images gone without trace, a nested list item welded to its
 * parent, an h5 pointing at a style the package never defined, and a code
 * block folded onto one line. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  '* Content should include a table',
  '* Content should include bulleted lists',
  '* Content should include quotes from an expert',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 1200 x 630 px)',
  '* Please include at least 2 internal links to other posts on the client blog',
  '* Content should be submitted in .docx or .doc format, font size 12, font family Arial'
].join('\n');

/* A real 8x6 PNG, written here so the fixture cannot drift from the test. */
var PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAYElEQVR4nBXMMRVEIQwAwSihRgQiUqNklFBHBCJSo+j+bTvvbUQYYYUdhBNueCFiGtOa9mQ6053e/CCNtNJO0kk3vfyAwWL7d7i87xpllFV2UU655dUHbbTVdtNOu+21H11/PPF87Or0AAAAAElFTkSuQmCC";

var DRAFT = [
  "<h1>Every Element The Editor Can Hold</h1>",
  "<p><strong>A bold lead paragraph</strong> followed by ordinary text.</p>",
  "<h2>A second-level heading</h2>",
  "<p>Inline marks: <strong>bold</strong>, <em>italic</em>, <u>underlined</u>, <s>struck</s>, <code>monospace</code> and <mark>highlighted</mark>.</p>",
  "<p>Links: <a href=\"https://example.gov/report\">an external one</a>, <a href=\"/blog/internal-post\">an internal one</a>, and <a href=\"mailto:editor@example.com\">an email one</a>.</p>",
  "<h3>A third-level heading</h3>",
  "<ul><li>First bullet</li><li>Second bullet<ul><li>A nested bullet</li></ul></li><li>Third bullet</li></ul>",
  "<ol><li>First numbered</li><li>Second numbered</li></ol>",
  "<blockquote>A pulled quote that the client asked for, long enough to be recognised as a quote by the checker.</blockquote>",
  "<table><tr><th>Driver</th><th>Tactic</th></tr><tr><td>Onboarding</td><td>Activation event</td></tr><tr><td>Champion</td><td>Second contact</td></tr></table>",
  "<hr>",
  "<h4>A fourth-level heading</h4>",
  '<pre>preformatted line one' + '\n' + 'preformatted line two</pre>',
  "<p>A line<br>broken by a break tag.</p>",
  "<img src=\"https://example.com/feature.png\" alt=\"The feature image\">",
  '<img src="data:image/png;base64,' + PNG_BASE64 + '" alt="An embedded chart" width="320" height="240">',
  "<h5>A fifth-level heading</h5>",
  "<p>Closing paragraph after the fifth-level heading.</p>"
].join('\n');

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

async function run() {
  var t = createSuite('export audit');
  var browser = await chromium.launch();

  try {
    var ctx = await browser.newContext({ viewport: { width: 1500, height: 960 }, acceptDownloads: true });
    var page = await ctx.newPage();
    var errors = [];
    page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
    page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(APP_URL);
    await page.waitForTimeout(500);
    var startEmpty = page.locator('.modal-foot .btn', { hasText: 'Start empty' });
    if (await startEmpty.count()) await startEmpty.click();
    await page.waitForTimeout(150);

    await page.locator('.board-bar .btn-primary', { hasText: 'New assignment' }).click();
    await page.waitForTimeout(300);
    var inputs = page.locator('.modal input[type="text"]');
    await inputs.nth(0).fill('Element audit');
    await inputs.nth(1).fill('Portal client');
    await page.locator('.modal textarea').fill(CLIENT_BRIEF);
    await page.waitForTimeout(500);
    await page.locator('.modal-foot .btn-primary', { hasText: 'Create & analyse' }).click();
    await page.waitForTimeout(900);
    await page.locator('.style-card .btn', { hasText: 'Start draft' }).first().click();
    await page.waitForTimeout(900);
    var confirm = page.locator('.modal-foot .btn', { hasText: 'Replace draft' });
    if (await confirm.count()) { await confirm.click(); await page.waitForTimeout(600); }

    await page.evaluate(function (html) {
      var ed = document.querySelector('.editor');
      ed.innerHTML = html;
      ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }, DRAFT);
    await page.waitForTimeout(2000);

    var dom = await page.evaluate(function () {
      var ed = document.querySelector('.editor');
      var q = function (sel) { return ed.querySelectorAll(sel).length; };
      var hrefs = Array.prototype.map.call(ed.querySelectorAll('a[href]'), function (a) { return a.getAttribute('href'); });
      return {
        h1: q('h1'), h2: q('h2'), h3: q('h3'), h4: q('h4'), h5: q('h5'),
        li: q('li'), blockquote: q('blockquote'), table: q('table'),
        rows: q('tr'), cells: q('th') + q('td'), hr: q('hr'), img: q('img'), pre: q('pre'),
        anchors: hrefs.length,
        external: hrefs.filter(function (h) { return /^https?:/i.test(h); }).length,
        internal: hrefs.filter(function (h) { return !/^(?:https?:|mailto:)/i.test(h); }).length,
        mailto: hrefs.filter(function (h) { return /^mailto:/i.test(h); }).length
      };
    });

    await t.section('the panel says what the export will do', async function () {
      var compliance = await page.evaluate(function () {
        var first = document.querySelector('.check-item');
        return first && first.parentElement ? first.parentElement.innerText : '';
      });
      /* The writer should not have to open the .docx to learn that half their
         images are only mentioned in it. */
      t.match(compliance, /2 in the draft: 1 travel inside the \.docx, 1 listed by name and URL/,
        'the images check reports what becomes of each one');
    });

    var bytes;
    await t.section('export the whole page', async function () {
      await page.locator('.pane-right .tab', { hasText: 'Export' }).click();
      await page.waitForTimeout(400);
      var download = (await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        page.locator('.pane-right .btn', { hasText: 'Word (.docx)' }).first().click()
      ]))[0];
      var chunks = [];
      var stream = await download.createReadStream();
      await new Promise(function (resolve) {
        stream.on('data', function (c) { chunks.push(c); });
        stream.on('end', resolve);
      });
      bytes = Buffer.concat(chunks).toString('latin1');
      t.atLeast(bytes.length, 5000, 'a package came back');
      /* The draft points at an image that deliberately does not resolve, so the
         browser logs a load failure. That is the fixture, not the app. */
      var real = errors.filter(function (e) { return !/Failed to load resource/.test(e); });
      t.equal(real.length, 0, 'no console errors: ' + real.join(' | '));
    });

    await t.section('every heading level survives', async function () {
      t.equal(count(bytes, '<w:pStyle w:val="Heading1"/>'), dom.h1, 'h1');
      t.equal(count(bytes, '<w:pStyle w:val="Heading2"/>'), dom.h2, 'h2');
      t.equal(count(bytes, '<w:pStyle w:val="Heading3"/>'), dom.h3, 'h3');
      t.equal(count(bytes, '<w:pStyle w:val="Heading4"/>'), dom.h4, 'h4');
      t.equal(count(bytes, '<w:pStyle w:val="Heading5"/>'), dom.h5, 'h5 reaches the body');
      /* walk() emits Heading1..6, and styles.xml stopped at 4, so an h5 named
         a style the package never defined and arrived as body text. */
      t.includes(bytes, 'w:styleId="Heading5"', 'and the style it names exists');
      t.includes(bytes, 'w:styleId="Heading6"', 'as does the sixth');
    });

    await t.section('a nested list keeps its items', async function () {
      var listParas = count(bytes, '<w:pStyle w:val="ListBullet"/>') + count(bytes, '<w:pStyle w:val="ListNumber"/>');
      /* Six list items in the editor produced five paragraphs, with the nested
         one run onto the end of its parent as "Second bulletA nested bullet". */
      t.equal(listParas, dom.li, 'one paragraph per list item, nested ones included');
      t.includes(bytes, 'w:ilvl w:val="1"', 'the nested item is indented a level');
      t.notIncludes(bytes, 'Second bulletA nested bullet', 'and is not welded to its parent');
    });

    await t.section('images leave the building', async function () {
      /* An <img> matched nothing in the walk and fell through to a paragraph of
         the text an image does not have. Both kinds vanished without trace. */
      t.equal(count(bytes, '<w:drawing>'), 1, 'the pasted image is embedded as a picture');
      t.includes(bytes, 'relationships/image" Target="media/', 'with a package relationship');
      t.includes(bytes, 'Extension="png"', 'and a content type');
      t.includes(bytes, '<wp:extent cx="3048000" cy="2286000"', 'at the size it was given');
      /* A remote image cannot be fetched from a file:// page, so it is named
         rather than dropped. */
      t.includes(bytes, '[Image: The feature image]', 'the linked one is named');
      t.includes(bytes, 'example.com/feature.png', 'with the source the client needs');
    });

    await t.section('the rest of the page', async function () {
      t.equal(count(bytes, '<w:tbl>'), dom.table, 'the table');
      t.equal(count(bytes, '<w:tr>'), dom.rows, 'every row');
      t.equal(count(bytes, '<w:tc>'), dom.cells, 'every cell');
      t.equal(count(bytes, '<w:pStyle w:val="Quote"/>'), dom.blockquote, 'the blockquote');
      t.equal(count(bytes, '<w:pBdr>'), dom.hr, 'the horizontal rule');
      t.equal(count(bytes, '<w:hyperlink r:id='), dom.anchors, 'every anchor is a real hyperlink');
      t.equal(count(bytes, 'Target="https://'), dom.external, 'the external target');
      t.equal(count(bytes, 'Target="/blog/'), dom.internal, 'the internal target');
      t.equal(count(bytes, 'Target="mailto:'), dom.mailto, 'and the mailto target');
      /* Both lines of a code block collapsed onto one. */
      t.includes(bytes, 'preformatted line one', 'the code block text');
      /* A literal backslash-n in the fixture would leave one line and nothing
         to collapse, so check the break is really there rather than only that
         the collapsed form is absent. */
      t.includes(bytes, 'preformatted line one</w:t></w:r><w:r><w:br/></w:r>', 'keeps the break between its lines');
      t.notIncludes(bytes, 'preformatted line one preformatted line two', 'and does not run them together');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'export audit', run: run };
