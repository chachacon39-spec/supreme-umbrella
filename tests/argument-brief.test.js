/* A brief whose second requirement per item is an argument, and a keyword
 * target with a six-word landing zone.
 *
 * "Covering 3 new B2B product offerings ... and how they may impact the current
 * market" hangs the real work off the end of the sentence as a clause. And a
 * four-word keyword at a 2% target in 325 words needs exactly two mentions and
 * a piece of 320 words or more — miss by five and both fall out of band. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #465 Content Guidelines',
  'Business Blog Content',
  '',
  '* These tasks are content for a blog related to the b2b sector',
  '* Each piece of content should be no longer than 325 words',
  '* Each piece should include an SEO-friendly engaging title',
  '* Content should insert any keywords mentioned at a density of 2% throughout the content',
  '* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)',
  '* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 500 x 600 px) as well as two smaller royalty-free images inserted throughout the text',
  '* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content (either APA or AMA is acceptable as long as all citations follow the same format). Citations do not count toward the total word count of the piece',
  '* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources',
  '* The tone of this content should be professional yet engaging, speaking directly to the reader',
  '* Content should be submitted in .docx or .doc format, font size 14, font family Calibri',
  '',
  'Task #465-A - (325 words) Blog post covering 3 new B2B product offerings or services from Google for the 2026 year and how they may impact the current market for these products and services. Keywords: Google B2B products 2026, Google B2B services 2026'
].join('\n');

var TASK_TITLE = 'Task #465-A — (325 words) New Google B2B offerings';

var DRAFT = [
  '<h1>Reading Google’s Next Enterprise Wave Without the Hype</h1>',
  '<p><strong>Three launches, and what each one threatens</strong></p>',
  '<p><em>Bracketed names are placeholders. Confirm each launch and its availability date before filing.</em></p>',
  '<p>Every year the announcements land faster than the procurement cycles that absorb them. The useful question about Google B2B products 2026 is not what shipped, but which incumbent budget line each launch targets (Alphabet Inc., 2024).</p>',
  '<p><strong>[Launch one — cloud or data platform]</strong></p>',
  '<p>Positioned against the established data warehouse vendors, and priced to force a comparison. The impact here is on price rather than capability: when a hyperscaler bundles a capability that a specialist sells standalone, the specialist defends on depth and loses on renewal economics.</p>',
  '<p><strong>[Launch two — workspace or collaboration]</strong></p>',
  '<p>This one competes for a seat license you already pay someone else for. Displacement is slow because switching costs sit in habit and integration, not in features, so expect share to move at contract renewal rather than at launch.</p>',
  '<p><strong>[Launch three — security or identity]</strong></p>',
  '<p>The most consequential of the three, because security spend is defensive and rarely cut. If it clears enterprise compliance review, it lands in the same evaluations as the incumbent suites and resets their pricing power (Porter, 1980).</p>',
  '<p><strong>How to read the market effect</strong></p>',
  '<p>Ask four questions of any launch. Does it replace a line item or add one? Does it need a migration, or does it sit alongside what you run? Is it sold by the seat, the query, or the workload? And who inside your organization already owns that budget, because they will decide whether it gets evaluated at all?</p>',
  '<p>Those answers tell you more about Google B2B products 2026 than any keynote will. Treat the Google B2B services 2026 roadmap as a pricing signal to your existing vendors, whether or not you buy any of it.</p>',
  '<p>Their quiet effect, and the reason Google B2B services 2026 matters, is on what you pay incumbents at the next renewal, long before anyone signs.</p>',
  '<h2>References</h2>',
  '<p>Alphabet Inc. (2024). <em>Form 10-K annual report</em>. U.S. Securities and Exchange Commission.</p>',
  '<p>Porter, M. E. (1980). <em>Competitive strategy: Techniques for analyzing industries and competitors</em>. Free Press.</p>'
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
  var t = createSuite('argument brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('a requirement hung off the end of the sentence', async function () {
      var a = await page.evaluate(function (args) {
        var r = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ meta: r.meta, gaps: r.gaps }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      t.equal(a.meta.items.count, 3, 'the three offerings are counted');
      t.includes(a.meta.coverage.join(' | '), 'impact the current market',
        'and the argument the client is paying for is kept, though no "including" introduces it');

      /* This group states no link rule; inventing one would be as bad as
         missing the rule the other groups do state. */
      t.equal(a.meta.structure.externalLinks, undefined, 'no outbound-link requirement is invented for a group that has none');

      /* Two mentions, and the piece must reach 320 words. */
      var narrow = a.gaps.filter(function (g) { return /6-word target/.test(g); });
      t.equal(narrow.length, 2, 'both keywords are flagged as having a narrow workable length');
      t.includes(narrow[0], '2 mentions', 'saying how many mentions are needed');
      t.includes(narrow[0], 'between 320 and 325 words', 'and the length that makes them land');
    });

    await t.section('drafting into a six-word window', async function () {
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

      t.notMatch(compliance, /over$|\d+ over/, 'the draft sits inside the 325-word ceiling');
      t.notMatch(compliance, /\(stuffed\)|\(thin\)/, 'and both keywords land in band at two mentions each');
      t.match(compliance, /Cover 3 /, 'the item count is tracked');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });
      /* Every one of these was the app arguing with its own compliance panel. */
      t.notMatch(issueText, /“launch” appears/i, 'a word shared by three subheads is not repetition');
      t.notMatch(issueText, /“about Google B”/, 'a fragment of a required keyword is not padding');
      t.notMatch(issueText, /Serial \(Oxford\) comma/, '"whether or not" is not a series');
      t.notMatch(issueText, /Two sentences in a row open with “Does”/, 'parallel questions are a device');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('the guards still catch the real thing', async function () {
      var checks = await page.evaluate(function () {
        function n(text, rule, opts) {
          return FW.analyzer.analyze(text, opts || {}).issues.filter(function (i) { return i.rule === rule; }).length;
        }
        return {
          whetherClause: n('A signal to your vendors, whether or not you buy any of it.', 'oxford', { styleGuide: 'chicago' }),
          realSeries: n('We compared rates, hours and structure.', 'oxford', { styleGuide: 'chicago' }),
          parallelQuestions: n('Does it replace a line item? Does it need a migration?', 'repeated-opener'),
          realRepeatedOpener: n('The vendor ships quarterly. The vendor also patches weekly.', 'repeated-opener')
        };
      });
      t.equal(checks.whetherClause, 0, '"whether or not" passes');
      t.atLeast(checks.realSeries, 1, 'a real series is still flagged');
      t.equal(checks.parallelQuestions, 0, 'parallel questions pass');
      t.atLeast(checks.realRepeatedOpener, 1, 'a real repeated opener is still flagged');
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
      t.atLeast((bytes.match(/<w:b\/>/g) || []).length, 4, 'the bold headings survive');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'argument brief', run: run };
