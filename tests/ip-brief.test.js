/* The highest density target on the board, and a keyword that starts with a
 * digit.
 *
 * 3% with a five-word keyword in 300 words: one mention is 1.67%, two is 3.33%,
 * three is 5%. Only two works, and only between 286 and 300 words. The keyword
 * also reaches the phrase scanner as "d printing ip", because that scanner
 * reads letter runs and "3d" has its letters at the back. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #497 Content Guidelines',
  'Technology Blog Content',
  '',
  '* These tasks are content for a blog related to the technology sector',
  '* Each piece of content should be no longer than 300 words',
  '* Each piece should include an SEO-friendly engaging title',
  '* Content should insert any keywords mentioned at a density of 3% throughout the content',
  '* The keyword should link to an outside relevant article on an authoritative website at least once (please see [link](https://moz.com/top500) for examples of authoritative websites)',
  '* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)',
  '* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 400 x 600 px) as well as two smaller royalty-free images inserted throughout the text',
  '* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content (either APA or AMA is acceptable as long as all citations follow the same format). Citations do not count toward the total word count of the piece',
  '* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources',
  '* The tone of this content should be professional yet engaging, speaking directly to the reader',
  '* Content should be submitted in .docx or .doc format, font size 14, font family Calibri',
  '',
  'Task #497-A - (300 words) Blog post that discusses 3 current IP (intellectual property) legal issues being discussed in the 3d printing vertical. Keywords: 3d printing IP issues 2026'
].join('\n');

var TASK_TITLE = 'Task #497-A — (300 words) IP issues in 3D printing';

var DRAFT = [
  '<h1>Three Intellectual Property Fights Shaping Desktop Manufacturing</h1>',
  '<p><strong>The file and the finished part are different things in law</strong></p>',
  '<p>Anyone tracking <a href="https://www.uspto.gov/">3d printing IP issues 2026</a> should start with that distinction, because almost every open question follows from it. A patent covers making, using, or selling an article. A design file is not the article.</p>',
  '<p><strong>1. Sharing a file is not making the part</strong></p>',
  '<p>Whoever prints the object may infringe. The uploader usually has not made anything, so rights holders have to argue induced or contributory infringement instead (35 U.S.C. § 271, 2018). That is a harder case, and it is why enforcement tends to land on platforms rather than on printers.</p>',
  '<p><strong>2. Copyright usually stops where function starts</strong></p>',
  '<p>A useful article is protectable only where you can identify its artistic features separately from its function (Star Athletica v. Varsity Brands, 2017). A replacement bracket fails that test. The model file may carry its own expressive choices, which is a narrower claim than most takedown notices assume.</p>',
  '<p><strong>3. Notices aimed at the wrong right</strong></p>',
  '<p>Repositories receive copyright takedowns for objects that copyright never covered. Some are patent or trademark complaints wearing the wrong label, and a platform reviewing thousands of uploads cannot easily tell one from the other.</p>',
  '<p>Replacement parts sharpen this. Trademark protects a logo on a part, not the shape that makes the part fit, and the repair market keeps testing that line.</p>',
  '<p><strong>What to watch</strong></p>',
  '<p>The 3d printing IP issues 2026 conversation is moving from whether anyone can control the files to who bears the cost of deciding. Watch platform policy rather than case law alone: terms of service settle far more of these disputes than courts ever reach, and they change without a hearing.</p>',
  '<h2>References</h2>',
  '<p>Star Athletica, LLC v. Varsity Brands, Inc., 580 U.S. 405 (2017).</p>',
  '<p>35 U.S.C. § 271 (2018). <em>Infringement of patent</em>.</p>'
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
  var t = createSuite('ip brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('a 3% target and a parenthetical', async function () {
      var a = await page.evaluate(function (args) {
        var r = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ meta: r.meta, gaps: r.gaps }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      t.equal(a.meta.keywordDensity.min, 2.5, 'a 3% target gets a lower bound');
      t.equal(a.meta.keywordDensity.max, 3.5, 'and an upper bound');

      /* "discusses 3 current IP (intellectual property) legal issues" — the noun
         runs through a parenthetical gloss, which stopped the count dead. */
      t.equal(a.meta.items.count, 3, 'a count survives a parenthetical gloss in the middle of the noun');
      t.includes(a.meta.items.noun, 'IP legal issues', 'and the noun is what the piece is about');
      t.notMatch(a.meta.items.noun, /being discussed/, 'without the participle describing the search');

      /* Two mentions, and only in a fifteen-word stretch at the top of the cap. */
      var narrow = a.gaps.filter(function (g) { return /15-word target/.test(g); });
      t.equal(narrow.length, 1, 'the narrow workable length is raised before drafting');
      t.includes(narrow[0], '2 mentions', 'saying how many mentions are needed');
      t.includes(narrow[0], 'between 286 and 300 words', 'and the length that makes them land');
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
      t.match(compliance, /of 2\.5–3\.5%/, 'density is measured against the 3% band');
      t.notMatch(compliance, /\(thin\)|\(stuffed\)/, 'the draft lands inside it');
      t.match(compliance, /Cover 3 /, 'the three issues are tracked');
      t.match(compliance, /1 of 1 with the keyword as anchor text/, 'and the outbound link is on the keyword');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });
      /* "3d printing IP issues 2026" reaches the phrase scanner as "d printing
         ip". A fragment of a required keyword is not padding. */
      t.notMatch(issueText, /“d printing IP”/, 'a keyword whose letters sit behind a digit is exempt too');
      /* A subhead states the claim its paragraph makes; they share wording. */
      t.notMatch(issueText, /“file is not”/, 'a phrase shared by a subhead and its paragraph is not padding');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('its / it’s', async function () {
      var checks = await page.evaluate(function () {
        function n(text) {
          return FW.analyzer.analyze(text, {}).issues.filter(function (i) { return i.rule === 'its-possessive'; }).length;
        }
        return {
          correct: n('The file carries its own expressive choices.'),
          wrong: n('The file carries it’s own expressive choices.'),
          correctWay: n('The company lost its way last year.'),
          wrongWay: n('The company lost it’s way last year.')
        };
      });
      /* The rule matched "it's" and "its" alike, so it reported correct writing
         as an error and offered a fix identical to the text. */
      t.equal(checks.correct, 0, 'a correct possessive is not an error');
      t.atLeast(checks.wrong, 1, 'the apostrophe form still is');
      t.equal(checks.correctWay, 0, 'and again for "its way"');
      t.atLeast(checks.wrongWay, 1, 'and its apostrophe form');
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
      t.includes(bytes, 'uspto.gov', 'the authoritative link survives');
      t.includes(bytes, '<w:hyperlink r:id=', 'as a real hyperlink');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'ip brief', run: run };
