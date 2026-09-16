/* Two keywords, a legal citation, and a page made of hour counts.
 *
 * At 2% both keywords fit: five words in 251 is 1.99%, six is 2.39%. That makes
 * this the counter-case to the tax brief, where 1% made a six-word keyword
 * impossible — the same check has to stay quiet when the arithmetic works.
 *
 * The draft is a compliance piece, so it is full of the things the checker
 * used to argue with: "Cal. Code Regs. tit. 22" (periods that are not full
 * stops), "at least 120 hours" next to "at least 20 hours" (the phrase scanner
 * drops digits), "are supervised clinical experience" (a participle that
 * describes rather than acts), and the word "hours" seven times. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  "Task #491 Content Guidelines",
  "Vocational/Job Training Blog Content",
  "",
  "* These tasks are content for a blog related to the Vocational/Job Training sector",
  "* Each piece of content should be no longer than 300 words",
  "* Each piece should include an SEO-friendly engaging title",
  "* Content should insert any keywords mentioned at a density of 2% throughout the content",
  "* The keyword should link to an outside relevant article on an authoritative website at least once (please see [link](https://moz.com/top500) for examples of authoritative websites)",
  "* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)",
  "* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space",
  "* Content should include 1 royalty-free hi-res feature image (dimensions 600 x 600 px) as well as two smaller royalty-free images inserted throughout the text",
  "* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content (either APA or AMA is acceptable as long as all citations follow the same format). Citations do not count toward the total word count of the piece",
  "* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources",
  "* The tone of this content should be professional yet engaging, speaking directly to the reader",
  "* Content should be submitted in .docx or .doc format, font size 14, font family Calibri",
  "",
  "Task #491-A - (300 words) Blog post that provides a brief description and breakdown of the state requirements for Home Health Aide certification training programs in California. Please also provide a brief breakdown of 3 state-approved or accredited HHA certification training programs. Keywords: California HHA training programs 2026, California Home Health Aide certification 2026"
].join('\n');

var TASK_TITLE = 'Task #491-A \u2014 (300 words) California HHA certification requirements';

var DRAFT = [
  "<h1>What California Actually Requires of Home Health Aide Training</h1>",
  "<p><strong>The hour count is the whole story</strong></p>",
  "<p>Anyone comparing <a href=\"https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/hha.aspx\">California HHA training programs 2026</a> should start there, because the state fixes it in regulation and no school can shorten it.</p>",
  "<p><strong>The state minimum</strong></p>",
  "<p>A basic program runs at least 120 hours, and no more than 75 of those may be classroom time (Cal. Code Regs. tit. 22, § 74747). At least 20 hours are supervised clinical experience — 15 in personal services, three in nutrition, two in cleaning and care tasks. Sixteen classroom hours must come before a student touches a patient.</p>",
  "<p>Hold an active CNA certificate and the path shortens, because an approved 40-hour program replaces the 120. Either way, California Home Health Aide certification 2026 also means a Live Scan criminal record clearance. You then file a CDPH 283B application with the Aide and Technician Certification Section (California Department of Public Health, 2026).</p>",
  "<p><strong>Three approved programs</strong></p>",
  "<p><strong>San Diego Medical College.</strong> Forty hours for current CNAs: 20 of theory, 20 of supervised clinical work in a long-term care or assisted living facility, Monday through Friday, with a Saturday option.</p>",
  "<p><strong>Southern California Nursing Academy.</strong> A state-approved 40-hour course listed under program code HHP-1141.</p>",
  "<p><strong>California Medical College, San Diego.</strong> Runs nurse assistant and home health aide training side by side, which helps if you need the CNA first.</p>",
  "<p><strong>Before you enroll</strong></p>",
  "<p>Confirm your school still appears on the state’s current approved list. Approval lapses, and a certificate from a lapsed program will not certify you.</p>",
  "<h2>References</h2>",
  "<p>Cal. Code Regs. tit. 22, § 74747 (2026). <em>Home health aide training</em>.</p>",
  "<p>California Department of Public Health. (2026). <em>Home health aide certification</em>. Aide and Technician Certification Section.</p>"
].join('\n');

/* The sibling task: the same guidelines block, a different state, and a state
 * whose answer is that the credential does not exist. Texas licenses the
 * agency rather than the aide, so the piece leans on free relative clauses
 * ("What people call certification is ...") that open on a question word. */
var TEXAS_BRIEF = [
  "Task #491 Content Guidelines",
  "Vocational/Job Training Blog Content",
  "",
  "* These tasks are content for a blog related to the Vocational/Job Training sector",
  "* Each piece of content should be no longer than 300 words",
  "* Each piece should include an SEO-friendly engaging title",
  "* Content should insert any keywords mentioned at a density of 2% throughout the content",
  "* The keyword should link to an outside relevant article on an authoritative website at least once (please see [link](https://moz.com/top500) for examples of authoritative websites)",
  "* Content should include an introductory heading in bold (as well as bolded subheadings whenever possible)",
  "* Each section or paragraph of content should include no more than 5 lines of text before inserting a line space",
  "* Content should include 1 royalty-free hi-res feature image (dimensions 600 x 600 px) as well as two smaller royalty-free images inserted throughout the text",
  "* Content should include at least 2 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content (either APA or AMA is acceptable as long as all citations follow the same format). Citations do not count toward the total word count of the piece",
  "* Content should be unique, well-researched and provide value beyond content that is already available online or in other sources",
  "* The tone of this content should be professional yet engaging, speaking directly to the reader",
  "* Content should be submitted in .docx or .doc format, font size 14, font family Calibri",
  "",
  "Task #491-C - (300 words) Blog post that provides a brief description and breakdown of the state requirements for Home Health Aide certification training programs in Texas. Please also provide a brief breakdown of 3 state-approved or accredited HHA certification training programs. Keywords: Texas HHA training programs 2026, Texas Home Health Aide certification 2026"
].join('\n');

var TEXAS_TITLE = 'Task #491-C \u2014 (300 words) Texas HHA certification requirements';

var TEXAS_DRAFT = [
  "<h1>Texas Does Not Certify Home Health Aides. Here Is What It Requires Instead</h1>",
  "<p><strong>The credential you are looking for does not exist</strong></p>",
  "<p>Anyone searching <a href=\"https://www.hhs.texas.gov/\">Texas HHA training programs 2026</a> runs into the same surprise: the state keeps no aide registry and sets no aide exam. What people call Texas Home Health Aide certification 2026 is a competency file held by the agency that hires you.</p>",
  "<p><strong>What the rules actually say</strong></p>",
  "<p>Texas licenses the agency, not the aide. Home and Community Support Services Agencies operate under Health and Safety Code Chapter 142, and the aide qualifications in 26 Texas Administrative Code &sect; 558.701 point straight at the federal standard.</p>",
  "<p>That standard is 75 hours of training, of which at least 16 must be supervised practical work, and 16 hours of instruction must come before an aide has direct patient contact (42 C.F.R. &sect; 484.80). A registered nurse runs that evaluation and signs it off. After that, 12 hours of in-service training are due every 12 months.</p>",
  "<p><strong>Three accredited programs</strong></p>",
  "<p><strong>Houston Community College.</strong> A roughly six-week course at an accredited public college, with clinical placement arranged locally.</p>",
  "<p><strong>Austin Community College.</strong> Similar ground over about eight weeks, which suits students who want a slower classroom pace.</p>",
  "<p><strong>Victoria College.</strong> A six-week option serving the Crossroads region, useful outside the big metros.</p>",
  "<p><strong>Before you pay</strong></p>",
  "<p>Ask one question: does this course meet the 75-hour federal standard and include the competency evaluation? A certificate that skips it will not satisfy a Texas employer.</p>",
  "<h2>References</h2>",
  "<p>42 C.F.R. &sect; 484.80 (2026). <em>Condition of participation: Home health aide services</em>.</p>",
  "<p>26 Tex. Admin. Code &sect; 558.701 (2026). <em>Home health aide qualifications</em>.</p>"
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
  var t = createSuite('hha brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('two keywords that both fit', async function () {
      var a = await page.evaluate(function (args) {
        var r = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ meta: r.meta, gaps: r.gaps }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      t.equal(a.meta.keywordDensity.min, 1.5, 'a 2% target gets a lower bound');
      t.equal(a.meta.keywordDensity.max, 2.5, 'and an upper bound');
      t.equal(a.meta.keywords.length, 2, 'both keywords are read off one line');
      t.equal(a.meta.keywords[0].term, 'California HHA training programs 2026', 'the first');
      t.equal(a.meta.keywords[1].term, 'California Home Health Aide certification 2026', 'and the second');

      /* The tax brief asked 1% of a six-word keyword and could not be met. Two
         percent of a six-word keyword is 2.0% at one use, which is inside the
         band, so the contradiction warning must stay quiet here. */
      var impossible = a.gaps.filter(function (g) { return /contradicts itself/.test(g); });
      t.equal(impossible.length, 0, 'a reachable target raises no contradiction');

      t.equal(a.meta.items.count, 3, 'the programme count comes off the second sentence');
      t.includes(a.meta.items.noun, 'HHA certification training programs', 'with the noun intact');
      t.equal(a.meta.structure.imageSize, '600 \u00d7 600 px', 'a square feature image is read as square');
      t.equal(a.meta.submission.fontFamily, 'Calibri', 'and the submission font');
    });

    await t.section('a citation is not a sentence', async function () {
      var checks = await page.evaluate(function () {
        function n(text) {
          return FW.analyzer.analyze(text, {}).issues.filter(function (i) { return i.rule === 'sentence-lowercase'; }).length;
        }
        return {
          citation: n('The limit is fixed in regulation (Cal. Code Regs. tit. 22, \u00a7 74747). Programs cannot shorten it.'),
          reference: n('Cal. Code Regs. tit. 22, \u00a7 74747 (2026). Home health aide training.'),
          real: n('The program runs 120 hours. classroom time is capped at 75.'),
          afterDigit: n('The fee is $500. it is refundable within ten days.'),
          isAbbrev: FW.util.isAbbrev('Regs.'),
          notAbbrev: FW.util.isAbbrev('hours')
        };
      });
      /* "Regs." and "tit." end in periods that are not full stops. */
      t.equal(checks.citation, 0, 'an inline legal citation is not four sentences');
      t.equal(checks.reference, 0, 'nor is a reference-list entry');
      t.atLeast(checks.real, 1, 'a genuine lowercase sentence start still reports');
      /* The guard reads the word before the period, and a sentence can end on
         a number instead. That is still a sentence. */
      t.atLeast(checks.afterDigit, 1, 'including one that follows a sentence ending in a figure');
      t.ok(checks.isAbbrev, 'the abbreviation list knows a citation abbreviation');
      t.ok(!checks.notAbbrev, 'and does not swallow an ordinary word');
    });

    await t.section('a number is part of the phrase', async function () {
      var checks = await page.evaluate(function () {
        function n(text) {
          return FW.analyzer.analyze(text, {}).issues
            .filter(function (i) { return i.rule === 'phrase-repetition'; })
            .map(function (i) { return i.message; });
        }
        return {
          different: n('A program runs at least 120 hours in total. At least 20 hours are clinical work under supervision.'),
          same: n('Plan for at least 20 hours of study. Budget at least 20 hours again for the clinical placement, because at least 20 hours is the floor.')
        };
      });
      /* The scanner reads letters only, so both arrived as at/least/hours. */
      t.equal(checks.different.length, 0, 'two hour counts are not the same phrase twice');
      t.atLeast(checks.same.length, 1, 'the same count three times still is');
    });

    await t.section('participles that describe rather than act', async function () {
      var checks = await page.evaluate(function () {
        function n(text) {
          return FW.analyzer.analyze(text, {}).issues.filter(function (i) { return i.rule === 'passive'; }).length;
        }
        return {
          describes: n('At least 20 hours are supervised clinical experience under a registered nurse.'),
          accredited: n('The course is accredited and the instructor is licensed.'),
          agent: n('The curriculum was approved by the state last spring.'),
          real: n('The application was mailed on Tuesday.')
        };
      });
      t.equal(checks.describes, 0, 'a participle naming a category is not passive voice');
      t.equal(checks.accredited, 0, 'nor are the credential words this sector runs on');
      t.atLeast(checks.agent, 1, 'an explicit agent is still passive, adjectival or not');
      t.atLeast(checks.real, 1, 'and so is an ordinary passive');
    });

    await t.section('one flag per repeated word', async function () {
      var checks = await page.evaluate(function () {
        var text = 'The program runs 120 hours in total. Seventy-five hours may be classroom hours. ' +
          'Twenty hours are clinical hours. Sixteen hours come first. The remaining hours vary by school.';
        var issues = FW.analyzer.analyze(text, {}).issues;
        return {
          repetition: issues.filter(function (i) { return i.rule === 'word-repetition' && /hours/.test(i.message); }).length,
          overuse: issues.filter(function (i) { return i.rule === 'word-overuse' && /hours/.test(i.message); }).length
        };
      });
      /* Seven uses used to draw two identical "appears 3+ times" warnings. */
      t.equal(checks.repetition, 1, 'a word repeated throughout is flagged once, not once per window');
      t.equal(checks.overuse, 1, 'and the total is reported separately');
    });

    await t.section('a headline is chosen word by word', async function () {
      var checks = await page.evaluate(function () {
        var text = 'What California Actually Requires\nThe rule is actually quite simple once you read it.';
        function n(opts) {
          return FW.analyzer.analyze(text, opts).issues
            .filter(function (i) { return /^filler-/.test(i.rule) && /actually/i.test(i.message); }).length;
        }
        return {
          withHeading: n({ headingRanges: [{ start: 0, end: 32 }] }),
          without: n({})
        };
      });
      /* Every other structural rule already leaves headings alone. */
      t.equal(checks.withHeading, 1, 'a filler word in a heading is left alone, the one in prose is not');
      t.equal(checks.without, 2, 'and with no headings declared both still report');
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
      t.match(compliance, /Cover 3 state-approved/, 'the three programmes are tracked');
      t.match(compliance, /1\.99% of 1\.5\u20132\.5%/, 'the five-word keyword lands in band');
      t.match(compliance, /2\.39% of 1\.5\u20132\.5%/, 'and so does the six-word one');
      t.notMatch(compliance, /unreachable/, 'neither is reported as impossible');
      t.match(compliance, /1 of 1 with the keyword as anchor text/, 'the outbound link is on a keyword');
      t.match(compliance, /251 words so far \(references excluded\)/, 'the count leaves the references out');
      t.match(compliance, /600 \u00d7 600 px/, 'and the image brief carries through');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });
      t.notMatch(issueText, /lowercase letter/, 'the citations draw no sentence-case findings');
      t.notMatch(issueText, /At least 20 hours/, 'and the two hour counts draw no repetition finding');
      t.notMatch(issueText, /are supervised/, 'nor does the participle draw a passive finding');
      t.notMatch(issueText, /\u201cactually\u201d/, 'nor the headline its filler finding');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
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
      t.includes(bytes, 'cdph.ca.gov', 'the authoritative link survives');
      t.includes(bytes, '<w:hyperlink r:id=', 'as a real hyperlink');
    });

    await t.section('a clause is not a question', async function () {
      var checks = await page.evaluate(function () {
        function n(text) {
          return FW.analyzer.analyze(text, {}).issues.filter(function (i) { return i.rule === 'missing-question-mark'; }).length;
        }
        return {
          subject: n('What people call Texas Home Health Aide certification 2026 is a competency file held by the agency.'),
          where: n('Where the money actually goes is the question nobody asks.'),
          how: n('How a school arranges clinical placement is worth asking about.'),
          askCost: n('What is the total cost of the course.'),
          askWho: n('Who signs off on the competency evaluation.'),
          askDoes: n('Does the course include a competency evaluation.'),
          subordinate: n('When first-year bonus depreciation is generous, a buyer can expense most of an asset at once.')
        };
      });
      /* A question puts its verb straight after the wh-word; a free relative
         puts a noun phrase there and saves the main verb for later. */
      t.equal(checks.subject, 0, 'a wh-clause used as the subject is not a question');
      t.equal(checks.where, 0, 'and again for "where"');
      t.equal(checks.how, 0, 'and for "how"');
      t.atLeast(checks.askCost, 1, 'a real question with the verb up front still reports');
      t.atLeast(checks.askWho, 1, 'and one with no later copula to mislead it');
      t.atLeast(checks.askDoes, 1, 'and an auxiliary opening');
      t.equal(checks.subordinate, 0, 'the subordinate-opener guard still holds');
    });

    await t.section('the same brief, a different state', async function () {
      await page.locator('.viewnav button', { hasText: 'Board' }).click();
      await page.waitForTimeout(300);
      await page.locator('.board-bar .btn-primary', { hasText: 'New assignment' }).click();
      await page.waitForTimeout(300);
      var inputs = page.locator('.modal input[type="text"]');
      await inputs.nth(0).fill(TEXAS_TITLE);
      await inputs.nth(1).fill('Portal client');
      await page.locator('.modal textarea').fill(TEXAS_BRIEF);
      await page.waitForTimeout(500);
      await page.locator('.modal-foot .btn-primary', { hasText: 'Create & analyse' }).click();
      await page.waitForTimeout(900);

      var parsed = await page.evaluate(function (brief) {
        var r = FW.brief.analyze({ title: 'Task #491-C', brief: brief });
        return JSON.parse(JSON.stringify({ keywords: r.meta.keywords, items: r.meta.items, density: r.meta.keywordDensity }));
      }, TEXAS_BRIEF);
      /* The parse must not depend on which state the sentence names. */
      t.equal(parsed.keywords.length, 2, 'the sibling brief reads both keywords too');
      t.equal(parsed.keywords[0].term, 'Texas HHA training programs 2026', 'the first');
      t.equal(parsed.items.count, 3, 'and the same programme count');
      t.equal(parsed.density.max, 2.5, 'against the same band');

      await page.locator('.style-card .btn', { hasText: 'Start draft' }).first().click();
      await page.waitForTimeout(900);
      var confirm = page.locator('.modal-foot .btn', { hasText: 'Replace draft' });
      if (await confirm.count()) { await confirm.click(); await page.waitForTimeout(600); }

      await page.evaluate(function (html) {
        var ed = document.querySelector('.editor');
        ed.innerHTML = html;
        ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }, TEXAS_DRAFT);
      await page.waitForTimeout(2000);

      var compliance = await page.evaluate(function () {
        var first = document.querySelector('.check-item');
        return first && first.parentElement ? first.parentElement.innerText : '';
      });
      t.match(compliance, /2\.01% of 1\.5\u20132\.5%/, 'the five-word keyword lands in band');
      t.match(compliance, /2\.41% of 1\.5\u20132\.5%/, 'and the six-word one');
      t.match(compliance, /249 words so far \(references excluded\)/, 'the count leaves the references out');
      t.match(compliance, /1 of 1 with the keyword as anchor text/, 'and the link is on a keyword');

      /* The previous section left the right pane on Export, where .issue-list
         is not rendered at all — the notMatch assertions below would have
         passed against an empty string. Go back to Checks first, then prove
         the panel is actually showing something before reading it for absences. */
      await page.locator('.pane-right .tab', { hasText: 'Checks' }).first().click();
      await page.waitForTimeout(500);
      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });
      t.ok(/hours/.test(issueText), 'the issue panel is on screen and populated');
      t.notMatch(issueText, /reads as a question/, 'the free relative draws no question finding');
      t.notMatch(issueText, /lowercase letter/, 'and the C.F.R. citation none either');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'hha brief', run: run };
