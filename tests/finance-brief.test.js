/* The last brief on the board: a financial piece with slashes in its keywords,
 * no citation or link requirement, and the longest word count of the set.
 *
 * It also has the most subheadings, which is what exposed the remaining
 * heading-blind rules: a subhead is a transition and a section break, and two
 * sentences with one between them are not "in a row". */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #455 Content Guidelines',
  'Financial Website Content',
  '',
  '* These tasks are content for a blog related to the financial sector',
  '* Each piece of content should be no longer than 400 words',
  '* Each piece should include an SEO-friendly engaging title',
  '* Content should insert any keywords mentioned at a density of 1-2% throughout the content',
  '* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)',
  '* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 400 x 600 px) as well as two smaller royalty-free images inserted throughout the text',
  '* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources',
  '* The tone of this content should be professional yet engaging, speaking directly to the reader',
  '* Content should be submitted in .docx or .doc format, font size 14, font family Calibri',
  '',
  'Task #455-A - (400 words) Website content covering projections for EUR/USD pair in FOREX trading for Q1 2026. Keywords: EUR/USD pair projections 2026, EUR/USD pair Forex 2026'
].join('\n');

var TASK_TITLE = 'Task #455-A — (400 words) EUR/USD outlook for Q1 2026';

var DRAFT = [
  '<h1>What Actually Moves EUR/USD Heading Into Q1</h1>',
  '<p><strong>Start with the spread, not the forecast</strong></p>',
  '<p><em>Bracketed figures are placeholders. Fill them from a live source on the day you file, and check the central bank calendar dates.</em></p>',
  '<p>Most EUR/USD pair projections 2026 open with a number and work backwards. That is the wrong order. The pair has spent years tracking the gap between two-year German and US yields, and if you know where that spread is going you have most of the answer.</p>',
  '<p><strong>The rate differential does the heavy lifting</strong></p>',
  '<p>The question is not whether the Federal Reserve or the European Central Bank cuts. It is which one the market has already priced for. A euro rally needs the Fed to ease faster than currently expected, or the ECB to hold firmer than expected. Anything sitting in the forward curve is not news, and it will not move the pair on the day.</p>',
  '<p>Watch the [current 2-year Bund–Treasury spread] and how it shifts around each meeting, rather than the headline decision.</p>',
  '<p><strong>Growth and the energy bill</strong></p>',
  '<p>The euro area is a net energy importer, so its terms of trade move with gas and oil prices in a way the dollar\'s do not. A cold quarter or a supply disruption weakens the euro through the current account before it shows up in any rate decision.</p>',
  '<p>Relative growth matters for the same reason: capital chases the faster economy, and Q1 purchasing managers\' indices tend to set that tone early.</p>',
  '<p><strong>Positioning tells you how crowded the trade is</strong></p>',
  '<p>The weekly Commitments of Traders report shows how one-sided speculative positioning has become. Stretched positioning does not reverse a trend, but it does decide how violently the pair snaps back when a surprise lands.</p>',
  '<p><strong>How to use any projection</strong></p>',
  '<p>Treat a forecast as a conditional statement, not a prediction. Anyone publishing EUR/USD pair Forex 2026 targets is really saying: if the rate path, growth gap and energy picture hold, the pair drifts here.</p>',
  '<p>Write down the condition alongside the number. When the condition breaks, the target is void, and you will know that before the market reprices it.</p>',
  '<p>This is market commentary, not investment advice.</p>'
].join('\n');

async function openApp(browser) {
  var page = await browser.newPage({ viewport: { width: 1500, height: 960 } });
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

async function run() {
  var t = createSuite('finance brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('a financial brief reads as one', async function () {
      var a = await page.evaluate(function (args) {
        var r = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ meta: r.meta, gaps: r.gaps }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      /* A slash is not a separator. "EUR/USD pair projections 2026" is one phrase. */
      t.equal(a.meta.keywords.length, 2, 'two keywords, not four');
      t.equal(a.meta.keywords[0].term, 'EUR/USD pair projections 2026', 'the slash survives the first');
      t.equal(a.meta.keywords[1].term, 'EUR/USD pair Forex 2026', 'and the second');

      t.equal(a.meta.format, 'website content', 'the stated deliverable is recognised');
      t.notMatch(a.gaps.join(' | '), /format is ambiguous/, 'so nothing asks the client what it is');
      t.equal(a.meta.suggestedPersonas[0].id, 'financial', 'a currency-pair brief suggests the financial writer');

      /* This group asks for neither, and neither may be invented. */
      t.equal(a.meta.citationStyle, null, 'no citation style is invented for a brief that asks for none');
      t.equal(a.meta.structure.externalLinks, undefined, 'nor an outbound-link rule');
      t.equal(a.meta.wordCount.max, 400, 'the longest ceiling on the board is read');
    });

    await t.section('checking a piece built from subheadings', async function () {
      await page.locator('.board-bar .btn-primary', { hasText: 'New assignment' }).click();
      await page.waitForTimeout(300);
      var inputs = page.locator('.modal input[type="text"]');
      await inputs.nth(0).fill(TASK_TITLE);
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

      var compliance = await page.evaluate(function () {
        var first = document.querySelector('.check-item');
        return first && first.parentElement ? first.parentElement.innerText : '';
      });
      t.match(compliance, /EUR\/USD pair projections 2026/, 'the whole keyword is what gets checked');
      t.notMatch(compliance, /\(thin\)|\(stuffed\)/, 'both sit inside the 1–2% band');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });
      /* The brief requires bold subheadings, so a piece that complies has one
         every few paragraphs. Neither rule may treat that as a fault. */
      t.notMatch(issueText, /reading as a list/i, 'subheadings count as transitions');
      t.notMatch(issueText, /Two sentences in a row open with/i, 'and as section breaks between sentences');
      /* "if you know where the spread is going" is a verb and its object. */
      t.notMatch(issueText, /“you know” usually weakens/, 'a verb phrase is not conversational filler');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('the guards still have teeth', async function () {
      var checks = await page.evaluate(function () {
        function n(text, rule) {
          return FW.analyzer.analyze(text, {}).issues.filter(function (i) { return i.rule === rule || (rule === 'filler' && /^filler-/.test(i.rule)); }).length;
        }
        return {
          verbPhrase: n('If you know where that spread is going you have the answer.', 'filler'),
          realFiller: n('It was, you know, a difficult quarter.', 'filler'),
          sameSection: n('The vendor ships quarterly. The vendor also patches weekly.', 'repeated-opener'),
          comparative: n('Test it against your own data rather than a demo set.', 'filler')
        };
      });
      t.equal(checks.verbPhrase, 0, '"you know where" passes');
      t.atLeast(checks.realFiller, 1, 'the conversational filler still fires');
      t.atLeast(checks.sameSection, 1, 'two openers inside one section still fire');
      t.equal(checks.comparative, 0, '"rather than" still passes');
    });

    await t.section('the delivered file', async function () {
      await page.locator('.pane-right .tab', { hasText: 'Export' }).click();
      await page.waitForTimeout(400);
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
      t.includes(bytes, 'w:ascii="Calibri"', 'Calibri');
      t.includes(bytes, '<w:sz w:val="28"/>', 'at 14pt');
      t.includes(bytes, 'EUR/USD', 'the pair notation survives into Word');
      t.atLeast((bytes.match(/<w:b\/>/g) || []).length, 4, 'the bold headings the brief requires are bold');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'finance brief', run: run };
