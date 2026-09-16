/* A brief that asks for a count and a balance in the same breath.
 *
 * "at least 4 ways ... at least 2 positive and 2 negative impacts" is two
 * different requirements. The count is the shape of the piece; the balance is a
 * constraint on what the four are. Four upsides and no downsides satisfies the
 * count and fails the assignment, so the checklist has to carry both.
 *
 * The brief also asks for 1% density on a six-word keyword in 300 words, which
 * is arithmetically impossible: one use is 2%. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #489 Content Guidelines',
  'Consumer Tech Blog Content',
  '',
  '* These tasks are content for a blog related to the business sector',
  '* Each piece of content should be no longer than 300 words',
  '* Each piece should include an SEO-friendly engaging title',
  '* Content should insert any keywords mentioned at a density of 1% throughout the content',
  '* The keyword should link to an outside relevant article on an authoritative website at least once (please see [link](https://moz.com/top500) for examples of authoritative websites)',
  '* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)',
  '* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 700 x 500 px) as well as two smaller royalty-free images inserted throughout the text',
  '* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content (either APA or AMA is acceptable as long as all citations follow the same format). Citations do not count toward the total word count of the piece',
  '* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources',
  '* The tone of this content should be professional yet engaging, speaking directly to the reader',
  '* Content should be submitted in .docx or .doc format, font size 14, font family Calibri',
  '',
  'Task #489-B - (300 words) Blog post that highlights at least 4 ways in which recent tax reform in 2026 will impact equipment leasing companies or lenders. Please include at least 2 positive and 2 negative impacts that the recent reform will have. Keywords: equipment leasing companies 2026 tax reform'
].join('\n');

var TASK_TITLE = 'Task #489-B — (300 words) Tax reform and equipment leasing';

var DRAFT = [
  '<h1>Four Ways Tax Reform Changes the Math on Equipment Leasing</h1>',
  '<p><strong>Lease-versus-buy is a tax question before it is a cash question</strong></p>',
  '<p><em>Bracketed items are placeholders. Confirm the operative provisions and effective dates of the 2026 reform before filing.</em></p>',
  '<p>Every serious conversation about <a href="https://www.irs.gov/">equipment leasing companies 2026 tax reform</a> comes back to one thing: who gets the write-off, and when. Change that and you change which side of the deal looks cheaper.</p>',
  '<p><strong>Good: a smaller immediate write-off pushes buyers toward leasing</strong></p>',
  '<p>When first-year bonus depreciation is generous, a buyer can expense most of an asset at once, and leasing looks expensive by comparison (26 U.S.C. § 168(k), 2018). [Confirm how the 2026 reform moves that percentage.] As the immediate deduction shrinks, the lessor’s offer gets more competitive without changing a single term.</p>',
  '<p><strong>Good: interest caps make operating leases attractive</strong></p>',
  '<p>Companies that cannot fully deduct business interest have a reason to keep debt off the balance sheet (26 U.S.C. § 163(j), 2018). An operating lease can be the cheaper route for a borrower already at the cap.</p>',
  '<p><strong>Bad: a lower corporate rate devalues the depreciation shield</strong></p>',
  '<p>Lessors price deals partly on the tax benefit they keep. Cut the rate and that benefit is worth less, which either widens the spread the customer pays or thins the lessor’s margin.</p>',
  '<p><strong>Bad: higher expensing limits pull small buyers out of the market</strong></p>',
  '<p>Raise the Section 179 ceiling and a small firm can write off a machine outright. That customer stops leasing, and the segment most sensitive to monthly cost is the first to go.</p>',
  '<p><strong>What to do about it</strong></p>',
  '<p>Reprice your book against the new rules before renewal season, not after.</p>',
  '<h2>References</h2>',
  '<p>26 U.S.C. § 168(k) (2018). <em>Special allowance for certain property</em>.</p>',
  '<p>26 U.S.C. § 163(j) (2018). <em>Limitation on business interest</em>.</p>'
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
  var t = createSuite('tax brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('a count and a balance in the same sentence', async function () {
      var a = await page.evaluate(function (args) {
        var r = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ meta: r.meta, gaps: r.gaps }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      /* The second sentence's "at least 2" is closer to the end of the brief,
         and the count reader took it: "Cover 2 positive and 2 negative
         impacts". The piece is built on four things, not two. */
      t.equal(a.meta.items.count, 4, 'the count is the one the piece is built on');
      t.equal(a.meta.items.noun, 'ways', 'and the noun is what the four are');
      t.notMatch(a.meta.items.noun, /positive|negative/, 'the balance sentence did not become the count');

      t.equal(a.meta.balance.length, 2, 'the balance requirement is read as two sides');
      t.equal(a.meta.balance[0].count, 2, 'two of the first');
      t.equal(a.meta.balance[0].label, 'positive', 'which is the positive side');
      t.equal(a.meta.balance[0].noun, 'impacts', 'and the noun carries across');
      t.equal(a.meta.balance[1].count, 2, 'two of the second');
      t.equal(a.meta.balance[1].label, 'negative', 'the negative side');

      /* Six words at 1% of 300 is 3 words of room. One use is 2%. */
      var impossible = a.gaps.filter(function (g) { return /contradicts itself/.test(g); });
      t.equal(impossible.length, 1, 'an impossible density target is raised before drafting');
      t.includes(impossible[0], '2.0%', 'with the arithmetic that makes it impossible');
      t.includes(impossible[0], 'above the 1.5% cap', 'and what it breaches');
    });

    await t.section('a number that is part of the noun', async function () {
      /* The guard that stopped "2 positive and 2 negative impacts" rejects a
         noun holding a second number. "B2B" holds a digit and is not one. */
      var counts = await page.evaluate(function () {
        function items(brief) { return FW.brief.analyze({ title: 'x', brief: brief }).meta.items; }
        return JSON.parse(JSON.stringify({
          b2b: items('Task #465-A - (325 words) Blog post covering 3 new B2B product offerings or services from Google for the 2026 year and how they may impact the current market for these products and services.'),
          compound: items('Blog post that highlights at least 4 ways tax reform will bite. Please include at least 2 positive and 2 negative impacts that the reform will have.')
        }));
      });
      t.equal(counts.b2b.count, 3, 'a digit inside a word does not disqualify the noun');
      t.equal(counts.b2b.noun, 'B2B product offerings', 'and the noun survives whole');
      t.equal(counts.compound.count, 4, 'a standalone number in the noun does');
    });

    await t.section('drafting into it', async function () {
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
      t.match(compliance, /Cover 4 ways/, 'the four ways are tracked');
      t.includes(compliance, 'At least 2 positive impacts', 'and so is the positive half of the balance');
      t.includes(compliance, 'At least 2 negative impacts', 'and the negative half');
      t.match(compliance, /only you can judge which is which/, 'a balance is the writer’s call, not an automatic tick');
      /* Honest about the contradiction rather than reporting stuffing. */
      t.match(compliance, /unreachable: 6 words in 300 is 2\.00%/, 'the density check says why the band cannot be hit');
      t.match(compliance, /1 of 1 with the keyword as anchor text/, 'the outbound link is on the keyword');
      t.match(compliance, /280 words so far \(references excluded\)/, 'and the count leaves the reference list out');

      var issues = await page.evaluate(function () {
        return document.querySelectorAll('.issue-item').length;
      });
      t.equal(issues, 0, 'a clean draft draws no findings');
      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('sentences the checker used to argue with', async function () {
      var checks = await page.evaluate(function () {
        function rule(name, text) {
          return FW.analyzer.analyze(text, {}).issues.filter(function (i) { return i.rule === name; }).length;
        }
        return {
          subordinate: rule('missing-question-mark',
            'When first-year bonus depreciation is generous, a buyer can expense most of an asset at once.'),
          stillAsks: rule('missing-question-mark',
            'How lessors price these deals under the new corporate rate.'),
          citations: rule('phrase-repetition',
            'A buyer can expense most of an asset at once (26 U.S.C. § 168(k), 2018). Borrowers at the cap face a different limit (26 U.S.C. § 163(j), 2018). Small firms rely on 26 U.S.C. § 179 instead.'),
          stillPads: rule('phrase-repetition',
            'You should reprice the book before renewal. Reprice the book before renewal or you will lose margin. Reprice the book before renewal season arrives.')
        };
      });
      /* "When X, Y." is a subordinate clause, not a question. The comma closing
         the opening clause is what separates the two. */
      t.equal(checks.subordinate, 0, 'a subordinate opener is not a question missing its mark');
      t.atLeast(checks.stillAsks, 1, 'a real one still is');
      /* "26 U.S.C." reaches the phrase scanner as the words u, s, c. */
      t.equal(checks.citations, 0, 'a repeated citation format is not padding');
      t.atLeast(checks.stillPads, 1, 'a genuinely repeated phrase still is');
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
      t.includes(bytes, 'irs.gov', 'the authoritative link survives');
      t.includes(bytes, '<w:hyperlink r:id=', 'as a real hyperlink');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'tax brief', run: run };
