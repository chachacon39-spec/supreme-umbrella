/* A second real client brief, from a different task group.
 *
 * Where the b2b brief stated a density band, this one states a flat percentage,
 * requires an outbound link to an authoritative site with the keyword as anchor
 * text, and embeds a markdown link in its own instructions. It also contradicts
 * itself: a five-word keyword cannot sit under a 1.5% cap in 300 words. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #472 Content Guidelines',
  'Marketing Blog Content',
  '',
  '* These tasks are content for a blog related to the marketing/market research sector',
  '* Each piece of content should be no longer than 300 words',
  '* Content should insert any keywords mentioned at a density of 1% throughout the content',
  '* The keyword should link to an outside relevant article on an authoritative website at least once (please see [link](https://moz.com/top500) for examples of authoritative websites)',
  '* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 500 x 800 px) as well as two smaller royalty-free images inserted throughout the text',
  '* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content. Citations do not count toward the total word count of the piece',
  '* The tone of this content should be professional yet engaging, speaking directly to the reader',
  '* Content should be submitted in .docx or .doc format, font size 14, font family Calibri',
  '',
  'Task #472-A - (300 words) Blog post comparing 2 companies or service providers that offer online market research technology and data management services for medium to large companies. Keywords: online marketing companies 2026, online market research companies 2026'
].join('\n');

var TASK_TITLE = 'Task #472-A — (300 words) Online market research providers compared';

var DRAFT = [
  '<h1>Qualtrics vs Medallia: Picking a Research Platform for 2026</h1>',
  '<p><strong>Two platforms, two different bets</strong></p>',
  '<p>Search for online marketing companies 2026 and you get a list that mixes creative agencies with software vendors. If what you need is research technology and data management for a company of real size, the shortlist narrows quickly.</p>',
  '<p><strong>Qualtrics: research first</strong></p>',
  '<p>It grew up as a survey platform and still shows it. Study design, sampling, and statistical testing are its strongest ground (Qualtrics, n.d.).</p>',
  '<p><strong>Medallia: signals first</strong></p>',
  '<p>Medallia came at the same problem from operations. It captures feedback where it happens and routes it to whoever can act on it.</p>',
  '<p><strong>How to choose</strong></p>',
  '<p>Research teams usually prefer Qualtrics. Customer experience and operations groups go the other way. Both satisfy enterprise data governance requirements, so compliance rarely decides it (ESOMAR, 2023).</p>',
  '<p>If you are comparing <a href="https://www.esomar.org/">online market research companies 2026</a>, price the integration work, not the license.</p>',
  '<h2>References</h2>',
  '<p>ESOMAR. (2023). <em>ICC/ESOMAR international code on market, opinion and social research and data analytics</em>. ESOMAR.</p>',
  '<p>Qualtrics. (n.d.). <em>Qualtrics CoreXM product documentation</em>. Qualtrics.</p>'
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
  var t = createSuite('marketing brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('requirements stated as prose, not numbers', async function () {
      var a = await page.evaluate(function (args) {
        var result = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ meta: result.meta, gaps: result.gaps }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      /* "should link to an outside relevant article ... at least once" carries no
         number, so a pattern looking for "N links" never saw it. */
      t.equal(a.meta.structure.externalLinks, 1, 'an outbound-link rule with no number in it is still found');
      t.ok(a.meta.structure.keywordLinks, 'and the rule that the keyword itself is the anchor');

      /* "an authoritative website" describes the link target, not the voice. */
      t.notIncludes(a.meta.tone.join(','), 'authoritative', 'a link target is not read as a tone word');
      t.includes(a.meta.tone.join(','), 'professional', 'the tone the brief does state is still read');

      /* A flat "1%" is a target, so it needs a band to be checkable. */
      t.equal(a.meta.keywordDensity.min, 0.5, 'a flat density target gets a lower bound');
      t.equal(a.meta.keywordDensity.max, 1.5, 'and an upper bound');

      t.equal(a.meta.structure.imageSize, '500 × 800 px', 'this group has its own image dimensions');

      /* Five words used once in 300 is 1.67%. No draft can satisfy both rules. */
      t.ok(a.gaps.some(function (g) { return /contradicts itself/.test(g); }),
        'the impossible keyword-density rule is raised as a question for the client');
    });

    await t.section('drafting and checking', async function () {
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

      t.match(compliance, /Link the keyword out to an authoritative source/i, 'the outbound-link rule reaches the compliance panel');
      t.match(compliance, /1 of 1 with the keyword as anchor text/i, 'and is checked against the anchor text, not just any link');

      /* Amber on a target arithmetic forbids sends the writer hunting. */
      t.match(compliance, /unreachable/i, 'an unreachable density target says so');
      t.notMatch(compliance, /1\.80% of 0\.5–1\.5% \(stuffed\)/, 'rather than reporting it as the writer overusing the keyword');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });

      /* A bibliography is a citation format, not prose. */
      t.notMatch(issueText, /“esomar” appears/i, 'repeated author names in the reference list are not repetition');
      /* A subhead naming its subject, then a paragraph doing the same, is structure. */
      t.notMatch(issueText, /Two sentences in a row open with/i, 'a subhead is not a sentence opener');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('the link survives into Word', async function () {
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

      /* The client requires a working link. Blue underlined text is not one, and
         the compliance panel passing it while the file dropped the URL is worse
         than either failure alone. */
      t.includes(bytes, '<w:hyperlink r:id=', 'the .docx contains a real hyperlink element');
      t.includes(bytes, 'relationships/hyperlink', 'with a package relationship');
      t.includes(bytes, 'TargetMode="External"', 'pointing outside the document');
      t.includes(bytes, 'https://www.esomar.org/', 'and the destination URL is still in the file');
      t.includes(bytes, 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
        'the relationship namespace is declared on the document');
      t.includes(bytes, 'w:styleId="Hyperlink"', 'and Word has a Hyperlink style to render it with');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'marketing brief', run: run };
