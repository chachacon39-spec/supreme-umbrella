/* A process brief, and a density target with no setting that satisfies it.
 *
 * Keyword density moves in steps. A four-word phrase used once in a 300-word
 * piece is 1.33%; used twice it is 2.67%. Against a 1.5-2.5% band there is no
 * number of mentions that lands inside it, and the writer would be told "thin",
 * add one, be told "stuffed", and have nowhere to go — when the fix is to cut
 * the piece to 266 words. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #482 Content Guidelines',
  'Small Business Blog Content',
  '',
  '* These tasks are content for a blog related to the business sector',
  '* Each piece of content should be no longer than 300 words',
  '* Each piece should include an SEO-friendly engaging title',
  '* Content should insert any keywords mentioned at a density of 2% throughout the content',
  '* The keyword should link to an outside relevant article on an authoritative website at least once (please see [link](https://moz.com/top500) for examples of authoritative websites)',
  '* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)',
  '* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 600 x 600 px) as well as two smaller royalty-free images inserted throughout the text',
  '* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content (either APA or AMA is acceptable as long as all citations follow the same format). Citations do not count toward the total word count of the piece',
  '* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources',
  '* The tone of this content should be professional yet engaging, speaking directly to the reader',
  '* Content should be submitted in .docx or .doc format, font size 14, font family Calibri',
  '',
  'Task #482-A - (300 words) Blog post that provides a breakdown of the SBIR grant application process, including a brief history of the grant, steps for fulfilling the application process and at least 3 additional steps or strategies to maximize chances for approval. Keywords: SBIR grant application process, how to get an SBIR grant'
].join('\n');

var TASK_TITLE = 'Task #482-A — (300 words) The SBIR grant application process';

var DRAFT = [
  '<h1>Winning an SBIR Award Without Wasting a Submission Cycle</h1>',
  '<p><strong>Where the money comes from</strong></p>',
  '<p>Congress created the program in 1982 to route federal research dollars toward small firms (Small Business Innovation Development Act, 1982). Eleven agencies now run their own solicitations under one shared rulebook, and that is the first thing worth understanding: you do not apply to “SBIR” — you apply to an agency.</p>',
  '<p><strong>The steps, in order</strong></p>',
  '<p>Register before you write. SAM.gov, the SBA Company Registry and the agency portal each take time, and a deadline will not wait for them.</p>',
  '<p>Then read the solicitation topic rather than the program overview. The SBIR grant application process is topic-driven. Your proposal answers one stated need, or it scores poorly however strong the science is (U.S. Small Business Administration, 2024).</p>',
  '<p><strong>Three ways to improve your odds</strong></p>',
  '<p>Call the topic author during the open question window. Agencies permit it, most applicants skip it, and it tells you what the reviewers are really asking for.</p>',
  '<p>Write Phase II into your Phase I. Reviewers look for a credible path beyond feasibility, not a promise to think about one later.</p>',
  '<p>Budget for commercial evidence — letters of intent, a named first customer — because technical merit alone rarely carries an award.</p>',
  '<p><strong>Before you submit</strong></p>',
  '<p>Score your own draft against the published evaluation criteria. Anyone asking <a href="https://www.sbir.gov/">how to get an SBIR grant</a> should be able to point at the paragraph satisfying each one. If you cannot, a reviewer will not find it either.</p>',
  '<h2>References</h2>',
  '<p>Small Business Innovation Development Act of 1982, Pub. L. No. 97-219, 96 Stat. 217.</p>',
  '<p>U.S. Small Business Administration. (2024). <em>Small Business Innovation Research (SBIR) program policy directive</em>. SBA.</p>'
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
  var t = createSuite('grant brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('which lengths can satisfy a density band', async function () {
      var w = await page.evaluate(function () {
        return {
          fourWords: FW.brief.densityWindows(4, { min: 1.5, max: 2.5 }, 300),
          sixWords: FW.brief.densityWindows(6, { min: 1.5, max: 2.5 }, 300),
          impossible: FW.brief.densityWindows(5, { min: 0.5, max: 1.5 }, 300),
          roomy: FW.brief.densityWindows(2, { min: 1, max: 2 }, 300)
        };
      });

      t.equal(w.fourWords.length, 1, 'a four-word keyword has one workable setting under a 300-word cap');
      t.equal(w.fourWords[0].uses, 1, 'using it once');
      t.equal(w.fourWords[0].minWords, 160, 'from 160 words');
      t.equal(w.fourWords[0].maxWords, 266, 'to 266 — so the 300-word ceiling is outside it');

      t.equal(w.sixWords[0].maxWords, 300, 'a six-word keyword does reach the ceiling');
      t.equal(w.impossible.length, 0, 'and a keyword that cannot fit at any length has no window');
      t.equal(w.roomy.length, 3, 'a short keyword in a wide band has several settings');
    });

    await t.section('what the brief analysis says before drafting', async function () {
      var a = await page.evaluate(function (args) {
        var r = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ meta: r.meta, gaps: r.gaps }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      /* A process, not a list of entities. */
      t.equal(a.meta.format, 'how-to guide', 'a process brief is recognised as a how-to');
      t.equal(a.meta.items.count, 3, 'the "at least 3 strategies" requirement is counted');
      t.includes(a.meta.coverage.join(' | '), 'brief history of the grant', 'the history requirement is kept');
      t.includes(a.meta.coverage.join(' | '), 'steps for fulfilling', 'and the steps requirement');
      t.equal(a.meta.keywords.length, 2, 'both keywords are read');

      /* The useful part: it says what length would work, before a word is written. */
      var window = a.gaps.filter(function (g) { return /neither lands in/.test(g); })[0];
      t.ok(window, 'a target no number of mentions can hit is raised up front');
      t.includes(String(window), '160–266 words', 'with the length that would satisfy it');
      t.notMatch(String(window), /contradicts itself/, 'and is not reported as an impossible brief, because it is not');
    });

    await t.section('drafting to the window', async function () {
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

      /* Written to the window the app calculated, so both land in band. */
      t.match(compliance, /of 1\.5–2\.5%/, 'density is measured against the band');
      t.notMatch(compliance, /\(thin\)/, 'the draft is not under the band');
      t.notMatch(compliance, /\(stuffed\)/, 'nor over it');
      t.match(compliance, /Cover 3 additional steps/, 'the strategy count is tracked');
      t.match(compliance, /Too long to check automatically/, 'clause-length requirements are stated, not graded');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });
      /* SBIR is read letter by letter, and "S" opens on a vowel sound. */
      t.notMatch(issueText, /Use “a” before a consonant sound/, 'an initialism taking "an" is not corrected to "a"');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('the article rule still works both ways', async function () {
      var checks = await page.evaluate(function () {
        function n(text) {
          return FW.analyzer.analyze(text, {}).issues.filter(function (i) { return i.rule === 'an-consonant'; }).length;
        }
        return {
          sbir: n('She won an SBIR grant last year.'),
          fda: n('He filed an FDA submission.'),
          nasa: n('It was an NASA contract.'),
          banana: n('I ate an banana for breakfast.'),
          consultant: n('We hired an consultant quickly.')
        };
      });
      t.equal(checks.sbir, 0, '"an SBIR" is left alone');
      t.equal(checks.fda, 0, 'so is "an FDA"');
      t.equal(checks.nasa, 0, 'and "an NASA", which is better missed than wrongly corrected');
      t.atLeast(checks.banana, 1, 'but a real article error still fires');
      t.atLeast(checks.consultant, 1, 'and so does this one');
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
      t.includes(bytes, '<w:hyperlink r:id=', 'the outbound link is a real hyperlink');
      t.includes(bytes, 'sbir.gov', 'pointing where the draft put it');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'grant brief', run: run };
