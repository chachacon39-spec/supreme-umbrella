/* A comparison against a named benchmark.
 *
 * "A breakdown of 3 electric car models ... as well as a brief comparison of
 * each model to the Tesla Model 3" — the benchmark is half the assignment, and
 * it is the fourth way these briefs phrase a per-item requirement. It also
 * exposed a rule matching across a paragraph boundary: the end of one block and
 * the start of the next read as a passive nobody wrote. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #474 Content Guidelines',
  'Technology Blog Content',
  '',
  '* These tasks are content for a blog related to the technology sector',
  '* Each piece of content should be no longer than 300 words',
  '* Each piece should include an SEO-friendly engaging title',
  '* Content should insert any keywords mentioned at a density of 1.5% throughout the content',
  '* The keyword should link to an outside relevant article on an authoritative website at least once (please see [link](https://moz.com/top500) for examples of authoritative websites)',
  '* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)',
  '* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 400 x 600 px) as well as two smaller royalty-free images inserted throughout the text',
  '* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content (either APA or AMA is acceptable as long as all citations follow the same format). Citations do not count toward the total word count of the piece',
  '* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources',
  '* The tone of this content should be professional yet engaging, speaking directly to the reader',
  '* Content should be submitted in .docx or .doc format, font size 14, font family Calibri',
  '',
  'Task #474-D -(300 words) Blog post that includes a breakdown of 3 electric car models from Q1 2026 as well as a brief comparison of each model to the Tesla Model 3. Keywords: electric cars 2026'
].join('\n');

var TASK_TITLE = 'Task #474-D — (300 words) Three EVs against the Model 3';

var DRAFT = [
  '<h1>Three New EVs, Measured Against the Car Everyone Already Knows</h1>',
  '<p><strong>The Model 3 is the yardstick, whether or not you want it to be</strong></p>',
  '<p><em>Bracketed names and figures are placeholders. Confirm each model, its range, and its price before filing.</em></p>',
  '<p>Shoppers comparing <a href="https://www.fueleconomy.gov/">electric cars 2026</a> almost always start from one reference point. The Tesla Model 3 set the expectations for range, charging speed, and software that updates without a dealer visit (U.S. Department of Energy, 2024).</p>',
  '<p><strong>[Model one — mainstream sedan]</strong></p>',
  '<p>Aimed squarely at the same buyer. Expect a similar EPA figure and a lower sticker price, with the trade showing up in how fast it takes a charge rather than in headline capacity. Set beside the Tesla Model 3 it wins on cabin space and loses at the plug.</p>',
  '<p><strong>[Model two — compact crossover]</strong></p>',
  '<p>A different shape for the same money. Crossovers give up miles at motorway speed, so read the highway figure, not the combined one (U.S. Environmental Protection Agency, 2024). Weighed against the Tesla Model 3, it trades efficiency for ride height and cargo volume.</p>',
  '<p><strong>[Model three — premium entry]</strong></p>',
  '<p>Priced above the others and sold on interior quality. The software is the thing to test: over-the-air updates and route planning are where legacy platforms still lag. Next to the Tesla Model 3 its materials are the draw, and its network access is the unknown.</p>',
  '<p><strong>How to compare them honestly</strong></p>',
  '<p>Drive all four back to back if you can, and check the rate at 20 percent state of charge, not at zero. Manufacturers quote peak kilowatts; you live with the average.</p>',
  '<h2>References</h2>',
  '<p>U.S. Department of Energy. (2024). <em>Alternative fuels data center: Electric vehicles</em>. Office of Energy Efficiency and Renewable Energy.</p>',
  '<p>U.S. Environmental Protection Agency. (2024). <em>Fuel economy guide</em>. EPA.</p>'
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
  var t = createSuite('benchmark brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('the benchmark is a requirement', async function () {
      var meta = await page.evaluate(function (args) {
        return JSON.parse(JSON.stringify(FW.brief.analyze({ title: args.title, brief: args.brief }).meta));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      t.equal(meta.items.count, 3, 'the three models are counted');
      t.includes(meta.coverage.join(' | '), 'Tesla Model 3', 'and the car they are all measured against');
      /* The capture used to run past the sentence into the keyword label. */
      t.notMatch(meta.coverage.join(' | '), /Keywords/, 'the benchmark stops at the end of its sentence');
      t.equal(meta.coverage[0].split(/\s+/).length, 3, 'and is short enough to check against the draft');
      t.equal(meta.keywords.length, 1, 'this brief states one keyword');
    });

    await t.section('the same shape in other briefs', async function () {
      var found = await page.evaluate(function () {
        return {
          /* The "compare each of them to X" phrasing, with a benchmark that is
             not what the piece is about. */
          named: FW.brief.analyze({
            title: 'Task - (300 words) Project management tools for agencies',
            brief: 'Please discuss at least 3 other competitors or alternatives in this space and compare each of them to Asana.'
          }).meta.coverage,
          /* The same phrasing where the benchmark IS the subject. A check the
             draft cannot fail is not worth a line on the checklist. */
          selfBenchmark: FW.brief.analyze({
            title: 'Task #462-B - (300 words) How Salesforce leads SaaS',
            brief: 'Please discuss at least 3 other competitors or alternatives in this space and compare each of them to Salesforce.'
          }).meta.coverage,
          none: FW.brief.analyze({
            title: '',
            brief: 'Blog post comparing 2 companies that offer market research technology.'
          }).meta.coverage
        };
      });
      t.includes(found.named.join(' '), 'Asana', 'a benchmark stated as "compare each of them to X" is read too');
      t.notIncludes(found.selfBenchmark.join(' '), 'Salesforce', 'unless the benchmark is the piece\u2019s own subject');
      t.equal(found.none.length, 0, 'and a brief naming no benchmark gets none invented');
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
      t.match(compliance, /Cover “Tesla Model 3”/, 'the benchmark reaches the compliance panel');
      t.match(compliance, /mentions across 3 items/, 'counted against the three models, not just found once');
      t.notMatch(compliance, /\(thin\)|\(stuffed\)/, 'the single keyword sits in band');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });
      t.notMatch(issueText, /be\s*\n/, 'no issue is reported across a paragraph boundary');
      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('rules stop at the block boundary', async function () {
      var checks = await page.evaluate(function () {
        function n(text, rule) {
          return FW.analyzer.analyze(text, {}).issues.filter(function (i) { return i.rule === rule; }).length;
        }
        return {
          acrossBlocks: n('You may not want it to be\nBracketed names are placeholders.', 'passive'),
          withinLine: n('The report was written by the team.', 'passive'),
          doubledAcross: n('the end of one block\nblock two starts here', 'doubled-word'),
          doubledReal: n('This is is wrong.', 'doubled-word')
        };
      });
      t.equal(checks.acrossBlocks, 0, 'a passive is not assembled from two paragraphs');
      t.atLeast(checks.withinLine, 1, 'a real passive inside one sentence still fires');
      t.equal(checks.doubledAcross, 0, 'nor is a doubled word');
      t.atLeast(checks.doubledReal, 1, 'though a real doubled word still fires');
    });

    await t.section('the assignment is not a guideline', async function () {
      /* Pasted without a blank line before it, the task line rides along on
         the last bullet and the whole assignment is filed as a rule about the
         submission format. Seen live on #474-D:
         "...font family Calibri Task #474-D -(300 words) Blog post that
         includes a breakdown of 3 electric car models from Q1 2026...". */
      var glued = CLIENT_BRIEF
        .replace(/ Keywords: electric cars 2026$/, '')
        .replace(/Calibri\n\nTask #474-D/, 'Calibri Task #474-D');

      var a = await page.evaluate(function (brief) {
        var r = FW.brief.analyze({ title: 'Task #474-D', brief: brief });
        var req = (r.instructions && r.instructions.required) || [];
        return {
          count: req.length,
          last: req.length ? String(req[req.length - 1].text || req[req.length - 1]) : '',
          items: JSON.parse(JSON.stringify(r.meta.items || {}))
        };
      }, glued);

      t.notMatch(a.last, /Task #474-D/, 'the task does not end up inside a submission-format rule');
      t.notMatch(a.last, /electric car models/, 'nor does what the piece is about');
      t.match(a.last, /font family Calibri$/, 'the guideline ends where it ends');
      t.equal(a.count, 13, 'and no guideline is lost in the process');
      /* The task line still has to be read as the task. */
      t.equal(a.items.count, 3, 'the count is still taken from it');
      t.includes(a.items.noun, 'electric car models', 'along with the subject');
    });

    await t.section('counting sections is not covering them', async function () {
      var scaffold = await page.evaluate(function () {
        var ed = document.querySelector('.editor');
        ed.innerHTML = '<h1>Working title</h1>' +
          ['Thesis', 'Evidence', 'Weak points', 'Implications', 'Counter-argument',
           'Application', 'Image plan', 'Sources'].map(function (h) {
            return '<h2>' + h + '</h2><p><em>~50 words. Draft this section.</em></p>';
          }).join('');
        ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
        return ed.querySelectorAll('h2').length;
      });
      t.equal(scaffold, 8, 'an untouched outline has eight headings');
      await page.waitForTimeout(1600);

      var row = await page.evaluate(function () {
        var items = Array.prototype.slice.call(document.querySelectorAll('.pane-left .check-item'));
        for (var i = 0; i < items.length; i++) {
          if (/Cover 3 electric car/.test(items[i].innerText)) {
            return { text: items[i].innerText, pass: !!items[i].querySelector('.dot-pass') };
          }
        }
        return null;
      });
      t.ok(!!row, 'the coverage row is shown');
      /* Eight outline headings beat the three the brief asks for, so this went
         green on a draft that had not named a single car. */
      t.ok(row && !row.pass, 'eight empty headings do not satisfy "cover 3 electric car models"');
      t.match(row ? row.text : '', /nothing written yet/, 'it says nothing has been written');

      await page.evaluate(function (html) {
        var ed = document.querySelector('.editor');
        ed.innerHTML = html;
        ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }, DRAFT);
      await page.waitForTimeout(1600);

      var written = await page.evaluate(function () {
        var items = Array.prototype.slice.call(document.querySelectorAll('.pane-left .check-item'));
        for (var i = 0; i < items.length; i++) {
          if (/Cover 3 electric car/.test(items[i].innerText)) {
            return { text: items[i].innerText, pass: !!items[i].querySelector('.dot-pass') };
          }
        }
        return { text: '', pass: false };
      });
      t.match(written.text, /written section/, 'a written draft is counted by its sections');
      /* The app cannot tell what a section is about, so it asks rather than
         reporting the requirement met. Five bold leads clear a count of three
         whether or not a single car has been named. */
      t.ok(!written.pass, 'meeting the count is still not a pass');
      t.match(written.text, /check they are the 3/, 'and the writer is asked to confirm they are the right three');
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
      t.includes(bytes, 'fueleconomy.gov', 'the authoritative link survives');
      t.includes(bytes, '<w:hyperlink r:id=', 'as a real hyperlink');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'benchmark brief', run: run };
