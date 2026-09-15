/* A legal brief, where the requirements are written as clauses.
 *
 * "including how these incorporate drones as well as a comparison to the
 * differences in legislation prior to the 2026 updates" is two requirements
 * joined by a phrase the parser did not treat as a separator, each written as
 * a clause the parser threw away for starting with "how". They are the whole
 * substance of the assignment. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #480 Content Guidelines',
  'Legal Blog Content',
  '',
  '* These tasks are content for a blog related to the legal sector',
  '* Each piece of content should be no longer than 300 words',
  '* Each piece should include an SEO-friendly engaging title',
  '* Content should insert any keywords mentioned at a density of 1% throughout the content',
  '* The keyword should link to an outside relevant article on an authoritative website at least once (please see [link](https://moz.com/top500) for examples of authoritative websites)',
  '* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)',
  '* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 800 x 600 px) as well as two smaller royalty-free images inserted throughout the text',
  '* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content (either APA or AMA is acceptable as long as all citations follow the same format). Citations do not count toward the total word count of the piece',
  '* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources',
  '* The tone of this content should be professional yet engaging, speaking directly to the reader',
  '* Content should be submitted in .docx or .doc format, font size 14, font family Calibri',
  '',
  'Task #480-A - (300 words) Blog post that provides a breakdown of the latest FAA (Federal Aviation Administration) regulations from 2026, including how these incorporate drones as well as a comparison to the differences in legislation prior to the 2026 updates. Keywords: FAA regulations 2026, FAA drone regulations 2026'
].join('\n');

var TASK_TITLE = 'Task #480-A — (300 words) FAA drone rules, before and after';

var DRAFT = [
  '<h1>What Changed in Drone Law This Year, and What Did Not</h1>',
  '<p><strong>Start with the part that rarely moves</strong></p>',
  '<p><em>Bracketed items below are placeholders. Check every 2026 change against the Federal Register before filing.</em></p>',
  '<p>If you are reading up on <a href="https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-107">FAA drone regulations 2026</a>, start with what stayed put. Part 107 still governs commercial flights under 55 pounds, still requires a Remote Pilot Certificate, and still keeps you within visual line of sight unless you hold a waiver (14 C.F.R. § 107.31, 2024).</p>',
  '<p><strong>Where drones sit in the rules</strong></p>',
  '<p>Drones are not a bolt-on chapter. The same airspace framework that governs crewed flight covers them. That is why the FAA judges a Part 107 waiver on the safety case it would ask an airline to make. Remote identification applies across the fleet: if it broadcasts, it can be attributed (14 C.F.R. pt. 89, 2024).</p>',
  '<p><strong>What the [2026 update] actually changes</strong></p>',
  '<p>[Summarise the operative change here — effective date, the section amended, and who it binds.] The practical question for an operator is narrow: does it alter your waiver, your registration, or your reporting?</p>',
  '<p><strong>Before and after</strong></p>',
  '<p>Prior legislation treated beyond-visual-line-of-sight flight as an exception granted case by case. [State whether the 2026 rule replaces that posture with a standing authorisation, and under what conditions.] That is the difference worth writing down, because it decides whether you file paperwork per flight or per fleet.</p>',
  '<p><strong>What to do with this</strong></p>',
  '<p>Read the rule, not the summary. Anyone comparing FAA regulations 2026 against last year\'s should work from the Federal Register text and note the effective dates, which often trail publication by months.</p>',
  '<h2>References</h2>',
  '<p>14 C.F.R. § 107.31 (2024). <em>Visual line of sight aircraft operation</em>.</p>',
  '<p>14 C.F.R. pt. 89 (2024). <em>Remote identification of unmanned aircraft</em>.</p>'
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
  var t = createSuite('legal brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('requirements written as clauses', async function () {
      var meta = await page.evaluate(function (args) {
        return JSON.parse(JSON.stringify(FW.brief.analyze({ title: args.title, brief: args.brief }).meta));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      t.equal(meta.coverage.length, 2, 'both halves of the requirement are kept');
      t.includes(meta.coverage.join(' | '), 'incorporate drones', 'a clause keeps its content once the interrogative is stripped');
      t.includes(meta.coverage.join(' | '), 'legislation prior to the 2026 updates', '"as well as" separates two requirements');

      /* No number of things to write about — and "at least 2 APA citations"
         must not be mistaken for one. */
      t.equal(meta.items, null, 'a brief with no item count reports none');

      t.equal(meta.keywords.length, 2, 'both keywords are read');
      t.equal(meta.keywords[1].term, 'FAA drone regulations 2026', 'including the longer overlapping one');
      t.equal(meta.format, 'comparison', 'the deliverable is recognised as a comparison');
    });

    await t.section('the item count stays off the apparatus', async function () {
      var counts = await page.evaluate(function () {
        var cite = ' Content should include at least 2 APA or AMA-style citations at the end of the content.';
        return [
          { label: 'a real count survives the citation rule', got: (FW.brief.analyze({ title: '', brief: 'breakdown of the 5 top-rated flight schools in the U.S.' + cite }).meta.items || {}).count },
          { label: 'no count is invented from the citation rule', got: (FW.brief.analyze({ title: '', brief: 'A breakdown of the latest regulations.' + cite }).meta.items || {}).count }
        ];
      });
      t.equal(counts[0].got, 5, counts[0].label);
      t.equal(counts[1].got, undefined, counts[1].label);
    });

    await t.section('checking the draft', async function () {
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

      t.match(compliance, /FAA regulations 2026/, 'the first keyword is checked');
      t.match(compliance, /FAA drone regulations 2026/, 'and so is the second');
      t.notMatch(compliance, /unreachable/, 'both fit the density band at this length, so neither is called impossible');

      /* No draft contains a ten-word requirement verbatim. Searching for one
         and reporting "not mentioned" would be a gap that is not there. */
      t.match(compliance, /Too long to check automatically/, 'a clause-length requirement is stated, not graded');
      t.match(compliance, /Cover “incorporate drones”/, 'a short one is still checked');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });
      /* "Remote ID applies: if it broadcasts, it can be attributed" — the
         dependent clause is mid-sentence, after a colon. */
      t.notMatch(issueText, /comma splice/i, 'a dependent clause after a colon is not a comma splice');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('dependent clauses anywhere in the sentence', async function () {
      var checks = await page.evaluate(function () {
        function n(text) {
          return FW.analyzer.analyze(text, {}).issues.filter(function (i) { return i.rule === 'comma-splice'; }).length;
        }
        return {
          afterColon: n('Remote identification applies across the fleet: if it broadcasts, it can be attributed.'),
          leading: n('If your researchers write their own questionnaires, this is the natural home.'),
          real: n('The platform is popular, it is also expensive.'),
          secondComma: n('Although the tool is cheap, it is slow, it is also unsupported.')
        };
      });
      t.equal(checks.afterColon, 0, 'mid-sentence dependent clause is exempt');
      t.equal(checks.leading, 0, 'leading dependent clause is exempt');
      t.atLeast(checks.real, 1, 'a real splice still fires');
      t.atLeast(checks.secondComma, 1, 'and a splice after a dependent clause still fires');
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
      t.includes(bytes, 'ecfr.gov', 'the authoritative link the brief asks for survives');
      t.includes(bytes, '<w:hyperlink r:id=', 'as a real hyperlink');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'legal brief', run: run };
