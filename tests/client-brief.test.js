/* A real client brief, start to finish.
 *
 * Every assertion here comes from running an actual assignment through the app:
 * a freelancer portal brief in, a submittable Word file out. The portal states a
 * word ceiling, a keyword density band, a bold-heading format, a citation rule
 * and a typeface — all things the app got wrong until this job exercised them. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

/* Verbatim from the portal, bullets and all. */
var CLIENT_BRIEF = [
  'Task #462 Content Guidelines',
  'Business Blog Content',
  '',
  '* These tasks are content for a blog related to the b2b sector',
  '* Each piece of content should be no longer than 300 words',
  '* Each piece should include an SEO-friendly engaging title',
  '* Content should insert any keywords mentioned at a density of 1-2% throughout the content',
  '* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)',
  '* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space',
  '* Content should include 1 royalty-free hi-res feature image (dimensions 500 x 600 px) as well as one smaller royalty-free images inserted throughout the text',
  '* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content (either APA or AMA is acceptable as long as all citations follow the same format). Citations do not count toward the total word count of the piece',
  '* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources',
  '* The tone of this content should be professional yet engaging, speaking directly to the reader',
  '* Content should be submitted in .docx or .doc format, font size 14, font family Calibri',
  '',
  /* The real task line, comparison clause and all. The fixture used to stop
     at "similar spaces", which is why nothing here noticed what the coverage
     reader did with "compare each of them to Salesforce". */
  'Task #462-B - (300 words) Blog post discussing how Salesforce became one of the market leaders in the SAAS (software as a service) and how they are continuing to differentiate themselves from competitors in similar spaces. Please discuss at least 3 other competitors or alternatives in this space and compare each of them to Salesforce. Keywords: Salesforce SAAS, SAAS Salesforce 2026'
].join('\n');

var TASK_TITLE = 'Task #462-B — (300 words) Salesforce and the SaaS market';

/* The delivered copy: bold headings, keywords at density, references at the end. */
var DRAFT = [
  '<h1>How Salesforce Became the Benchmark for SaaS — and Who Is Closing In</h1>',
  '<p><strong>The company that made renting software feel normal</strong></p>',
  '<p>In 1999, buying business software meant servers, licences and a long installation. Salesforce sold you a login instead. That one change — renting software someone else runs and updates — is why Salesforce SAAS is still the reference point for the entire category (Benioff &amp; Adler, 2009).</p>',
  '<p><strong>What still separates it</strong></p>',
  '<p>The advantage is no longer the CRM itself. It is everything bolted around it: the AppExchange marketplace, Slack, Tableau and the Einstein AI layer. Leaving means replacing a platform, not swapping an app — and that is a switching cost competitors cannot match with features alone (Cusumano, 2010).</p>',
  '<p><strong>How the main alternatives compare</strong></p>',
  '<p>Microsoft Dynamics 365 competes on bundling. If you already pay for Microsoft 365 and Azure, the integration and the pricing are hard to argue with, though the product line takes longer to learn.</p>',
  '<p>HubSpot attacks from the opposite end. It is quicker to adopt and cheaper to start, and its marketing tools are excellent — but reporting gets thin as you scale.</p>',
  '<p>Zoho CRM undercuts almost everyone on price with a broad suite, trading away polish and partner depth. Oracle and SAP compete on depth of finance and ERP data rather than ease of use.</p>',
  '<p><strong>What this means for your shortlist</strong></p>',
  '<p>Salesforce SAAS pricing carries a premium for that ecosystem, so the honest question is what you plan to connect to it. If you are comparing SAAS Salesforce 2026 quotes, price the platform you will actually use, not the one in the demo.</p>',
  '<h2>References</h2>',
  '<p>Benioff, M., &amp; Adler, C. (2009). <em>Behind the cloud: The untold story of how Salesforce.com went from idea to billion-dollar company—and revolutionized an industry</em>. Jossey-Bass.</p>',
  '<p>Cusumano, M. (2010). Cloud computing and SaaS as new computing platforms. <em>Communications of the ACM, 53</em>(4), 27–29. https://doi.org/10.1145/1721654.1721667</p>'
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
  var t = createSuite('client brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    /* ---------- what the analyser makes of a real portal brief ---------- */
    var meta, instructions;
    await t.section('reading the brief', async function () {
      var result = await page.evaluate(function (args) {
        var a = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ meta: a.meta, instructions: a.instructions }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });
      meta = result.meta;
      instructions = result.instructions;

      /* "no longer than 300 words" is a wall, not a target to centre a band on.
         Reading it as a target told the writer 330 words was fine. */
      t.equal(meta.wordCount.max, 300, 'a stated ceiling is read as the maximum');
      t.equal(meta.wordCount.min, null, 'and no phantom minimum is invented');
      t.ok(meta.wordCount.ceiling, 'the ceiling is marked as such');

      /* "royalty-free hi-res feature image" is not a feature article. */
      t.equal(meta.format, 'blog post', 'the format comes from the task, not from the word “feature”');

      /* Portal titles carry scaffolding the writing templates should never echo. */
      t.notMatch(meta.topic, /task\s*#/i, 'the task number is stripped from the topic');
      t.notMatch(meta.topic, /\(\s*\d+\s*words/i, 'and so is the word count');

      /* "speaking directly to the reader" is a tone note; the words after it
         belong to the next bullet. */
      t.notMatch(String(meta.audience || ''), /content should/i, 'a bullet fragment is never reported as the audience');

      t.equal(meta.structure.sources, 2, 'counts citations through an adjective run ("2 APA or AMA-style citations")');
      t.equal(meta.structure.imageSize, '500 × 600 px', 'picks up the required image dimensions');

      t.equal(meta.keywordDensity.min, 1, 'reads the lower bound of the density band');
      t.equal(meta.keywordDensity.max, 2, 'reads the upper bound of the density band');

      t.equal(meta.submission.fontFamily, 'Calibri', 'reads the required typeface');
      t.equal(meta.submission.fontSize, 14, 'reads the required point size');
      t.equal(meta.submission.fileFormat, '.docx', 'reads the required file format');

      t.ok(meta.countExcludesCitations, 'notices that citations are exempt from the word count');

      /* The longest bullet carries the citation rules. It used to be dropped
         silently for being over 300 characters. */
      t.ok(instructions.required.some(function (r) { return /APA or AMA/i.test(r); }),
        'the long citation bullet survives instead of being dropped');
      t.ok(instructions.required.some(function (r) { return /Calibri/i.test(r); }),
        'the submission bullet is kept as an instruction');

      /* "No longer than 300 words" is a measurement. Filed under prohibitions it
         reads as a ban on writing. */
      t.equal(instructions.forbidden.length, 0, 'numeric limits are not filed as prohibitions');
    });

    /* ---------- the three approaches ---------- */
    await t.section('the comparison clause', async function () {
      var a = await page.evaluate(function (args) {
        var r = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ items: r.meta.items, coverage: r.meta.coverage }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });
      var coverage = a.coverage.join(' | ');

      t.equal(a.items.count, 3, 'three competitors to cover');
      t.includes(a.items.noun, 'competitor', 'and the noun says what they are');

      /* "compare each of them to Salesforce" names the piece's own subject, and
         a check the draft cannot fail crowds out the ones that can. */
      t.notIncludes(a.coverage, 'Salesforce', 'the piece is not asked to cover its own subject');
      /* Without a modal to absorb, this began on the auxiliary and read
         "are continuing to differentiate themselves from competitors". */
      t.includes(coverage, 'continuing to differentiate', 'the differentiation requirement survives');
      t.notMatch(coverage, /\bare continuing\b/, 'starting where the content does, not on the verb');
    });

    await t.section('the same two readers on other briefs', async function () {
      var other = await page.evaluate(function () {
        function cov(title, brief) {
          return FW.brief.analyze({ title: title, brief: brief }).meta.coverage;
        }
        return JSON.parse(JSON.stringify({
          /* A benchmark that is not the subject is still the checkable part. */
          benchmark: cov('Task - (400 words) Electric cars under thirty thousand',
            'Blog post covering 3 electric car models, as well as a brief comparison of each model to the Tesla Model 3.'),
          /* A modal is still consumed, exactly as before. */
          modal: cov('Task - (325 words) Google B2B offerings',
            'Blog post covering 3 new B2B product offerings from Google and how they may impact the current market for these products.')
        }));
      });
      t.includes(other.benchmark, 'Tesla Model 3', 'a benchmark outside the topic still reports');
      t.includes(other.modal, 'impact the current market', 'and a modal is still absorbed');
    });

    await t.section('the approaches it offers', async function () {
      var variants = await page.evaluate(function (args) {
        var task = { id: 'probe', title: args.title, brief: args.brief, personaId: 'blog', wordTarget: 0 };
        var analysis = FW.brief.analyze(task);
        return JSON.parse(JSON.stringify(FW.styles.generate(task, analysis).variants));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      t.equal(variants.length, 3, 'three approaches are generated');

      var headlines = variants.reduce(function (all, v) { return all.concat(v.headlines); }, []);
      t.atLeast(headlines.length, 9, 'each approach suggests headlines');

      /* "How to Salesforce and the SaaS Market" — a noun phrase dropped into a
         slot that needs a verb. Those templates are gone. */
      headlines.forEach(function (h) {
        t.notMatch(h, /\b(?:How to|Ways to|Before You)\s+Salesforce/i, 'no verb-slot nonsense: ' + h);
      });
      t.notMatch(headlines.join(' | '), /Without the the/i, 'no doubled article from the obstacle list');
      /* The audience is unstated here, so nothing may fall back to "the reader". */
      t.notMatch(headlines.join(' | '), /Most the Reader|for the Reader/i, 'no singular-audience fallback in a plural slot');
      t.includes(headlines.join(' | '), 'SaaS', 'acronyms survive headline casing (not "Saas")');

      /* No approach may claim experience nobody had. */
      t.notMatch(headlines.join(' | '), /I Spent \d+ Months/i, 'no invented personal history offered as a title');

      variants.forEach(function (v) {
        t.equal(v.opener, undefined, v.label + ': ships no pre-written opening line');
        t.equal(v.angle, undefined, v.label + ': ships no randomly assigned angle');

        var spent = v.outline.reduce(function (sum, o) { return sum + (o.words || 0); }, 0);
        t.atMost(spent, 330, v.label + ': the section budget respects the 300-word ceiling (' + spent + ')');

        var refSection = v.outline.filter(function (o) { return /reference|sources and further/i.test(o.text); })[0];
        if (refSection) t.ok(!refSection.words, v.label + ': the reference list gets no share of the word budget');
      });
    });

    /* ---------- drafting against it ---------- */
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

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });

      /* A bold standalone line is a heading. It needs no full stop, and "What
         this means for your shortlist" is not a question missing its mark. */
      t.notMatch(issueText, /without terminal punctuation/i, 'bold headings are not marked as unpunctuated paragraphs');
      t.notMatch(issueText, /reads as a question/i, 'headings beginning "How"/"What" are not marked as questions');

      /* The brief orders "Salesforce" repeated to hit a density target. */
      t.notMatch(issueText, /“salesforce” appears/i, 'a required keyword is not flagged as repetition');

      var compliance = await page.evaluate(function () {
        var first = document.querySelector('.check-item');
        return first && first.parentElement ? first.parentElement.innerText : '';
      });

      /* The brief exempts citations from the count; charging the writer for them
         costs real copy. */
      t.match(compliance, /references excluded/i, 'the reference list is excluded from the word count');
      t.notMatch(compliance, /\d+ over/i, 'a 260-word piece with references is not reported as over the 300-word cap');
      t.match(compliance, /% of 1–2%/, 'keyword density is measured against the brief’s band');
      t.notMatch(compliance, /\(stuffed\)/, 'the delivered copy sits inside the density band');
      t.notMatch(compliance, /\(thin\)/, 'and is not below it either');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    /* ---------- the file the client actually receives ---------- */
    await t.section('the Word file', async function () {
      await page.locator('.pane-right .tab', { hasText: 'Export' }).click();
      await page.waitForTimeout(400);

      var pane = await page.locator('.tool-pane').first().innerText();
      t.match(pane, /From the brief:.*Calibri.*14pt/s, 'the export pane reports what the brief demands');

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

      /* Entries are stored uncompressed, so the XML is readable in the raw file. */
      t.includes(bytes, 'w:ascii="Calibri"', 'the .docx is set in the typeface the client asked for');
      t.includes(bytes, '<w:sz w:val="28"/>', 'and at 14pt (28 half-points), not the studio default');
      t.notIncludes(bytes, 'w:ascii="Georgia"', 'the old hardcoded typeface is gone');

      /* Headings scale from the body size; 14pt body copy must not keep 20pt H1s. */
      t.includes(bytes, 'w:styleId="Heading1"', 'heading styles are still defined');
      t.atLeast(bytes.indexOf('PK'), 0, 'the download is a real ZIP container');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'client brief', run: run };
