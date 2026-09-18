/* The hardest brief on the board, end to end.
 *
 * Five named schools, each needing rates, course hours and course structure,
 * inside a 300-word ceiling — about 45 words per school once the intro, the
 * outbound link and the citations are paid for. The count and the per-item
 * coverage are the assignment, and nothing in the app tracked either of them
 * until this job. It is also full of proper nouns and regulatory designations,
 * which the prose checker had been reading as a writer's repetition. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #478 Content Guidelines',
  'Private Blog Content',
  '',
  '* These tasks are content for a blog related to the plane flying/school vertical',
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
  'Task #478-B - (300 words) Blog post that provides a brief description and breakdown of the 5 top-rated FAA-approved private flight schools in the U.S. in 2026, including rates, course hours and course structure/overview. Keywords: best private flight schools 2026'
].join('\n');

var TASK_TITLE = 'Task #478-B — (300 words) Top private flight schools';

var DRAFT = [
  '<h1>Five FAA-Approved Flight Schools Worth Your Shortlist</h1>',
  '<p><strong>Start with the structure, not the sticker price</strong></p>',
  '<p>Every quote you see starts from the FAA minimum of 40 flight hours under Part 61, or 35 under Part 141. Most students finish closer to 70 (Federal Aviation Administration, 2024). Read the <a href="https://www.faa.gov/">best private flight schools 2026</a> rankings with that gap in mind.</p>',
  '<p><strong>ATP Flight School</strong></p>',
  '<p>An accelerated Part 141 course structure, shaped around the airline career track. The school publishes course hours up front and quotes rates for the whole program rather than per hour.</p>',
  '<p><strong>Embry-Riddle Aeronautical University</strong></p>',
  '<p>Flight training folded into a degree. Course structure follows the academic calendar, so course hours accumulate slowly and rates sit inside tuition rather than beside it.</p>',
  '<p><strong>FlightSafety Academy</strong></p>',
  '<p>A long-established Vero Beach program for students going straight to a commercial career. Its course structure runs by stage under Part 141, and the school quotes rates the same way.</p>',
  '<p><strong>Sierra Academy of Aeronautics</strong></p>',
  '<p>An Oakland career-pilot school with an international intake. Course hours and course structure follow the Part 141 syllabus, and rates vary with aircraft type.</p>',
  '<p><strong>Epic Flight Academy</strong></p>',
  '<p>A Florida school offering both Part 61 and Part 141 course structures, so you can trade lower hourly rates against more course hours.</p>',
  '<p><strong>What to ask before you pay</strong></p>',
  '<p>Ask every school to quote at 70 hours, not the regulatory minimum, and to state what a checkride retake costs (14 CFR § 61.109, 2024). That single question separates the honest quotes from the advertised ones.</p>',
  '<h2>References</h2>',
  '<p>Federal Aviation Administration. (2024). <em>Pilot\'s handbook of aeronautical knowledge</em> (FAA-H-8083-25C). U.S. Department of Transportation.</p>',
  '<p>14 C.F.R. § 61.109 (2024). <em>Aeronautical experience: Private pilot certificate</em>.</p>'
].join('\n');

/* Other task groups on the same board, to keep the count parser honest about
   shapes it has not been tuned against. */
var OTHER_TASKS = [
  { label: '#462-B', text: 'Please discuss at least 3 other competitors or alternatives in this space and compare each of them to Salesforce.', count: 3 },
  { label: '#465-A', text: 'Blog post covering 3 new B2B product offerings or services from Google for the 2026 year.', count: 3 },
  { label: '#472-A', text: 'Blog post comparing 2 companies or service providers that offer online market research technology.', count: 2 },
  { label: '#474-D', text: 'Blog post that includes a breakdown of 3 electric car models from Q1 2026.', count: 3 },
  { label: '#477-F', text: 'Blog post that provides a brief description and breakdown of 4 restaurants/food spots in Bozeman, MT.', count: 4 },
  { label: '#479-A', text: 'Blog post that provides a brief description and breakdown of the 3 top-rated NREMT testing programs/schools in 2026.', count: 3 }
];

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
  var t = createSuite('flight schools');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('the count and the coverage are the assignment', async function () {
      var meta = await page.evaluate(function (args) {
        return JSON.parse(JSON.stringify(FW.brief.analyze({ title: args.title, brief: args.brief }).meta));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      t.equal(meta.items.count, 5, 'the number of things to write about is read from the brief');
      t.includes(meta.items.noun, 'flight schools', 'along with what they are');
      t.equal(meta.coverage.length, 3, 'the per-item coverage points are extracted');
      t.includes(meta.coverage.join(' | '), 'rates', 'rates');
      t.includes(meta.coverage.join(' | '), 'course hours', 'course hours');
      t.includes(meta.coverage.join(' | '), 'course structure', 'course structure');

      /* "At least 2 APA-style citations" is a rule about the apparatus. Reading
         it as the subject matter turned this into a piece about 2 things. */
      t.notIncludes(meta.items.noun, 'APA', 'a citation rule is not mistaken for the subject');
      t.notMatch(meta.items.noun, /citation|reference|word|image/i, 'nor any other requirement about the deliverable');
    });

    await t.section('the same shape across the rest of the board', async function () {
      var results = await page.evaluate(function (tasks) {
        return tasks.map(function (task) {
          var m = FW.brief.analyze({ title: '', brief: task.text }).meta.items;
          return { label: task.label, got: m ? m.count : null, want: task.count };
        });
      }, OTHER_TASKS);
      results.forEach(function (r) {
        t.equal(r.got, r.want, r.label + ': counts the items it asks for');
      });
    });

    await t.section('checking a draft against them', async function () {
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

      t.match(compliance, /Cover 5 /, 'the item count reaches the compliance panel');
      t.match(compliance, /of 5\b/, 'and says what it is counting against');
      t.match(compliance, /5 mentions across 5 items/, 'coverage is counted per item, not just found once');
      t.notMatch(compliance, /some are missing it/, 'the finished draft covers every point on every school');

      /* A draft that says "course structures" has met a "course structure"
         requirement; demanding one spelling reports a gap that is not there. */
      t.notMatch(compliance, /Cover “course structure\/overview”\n[^\n]*not mentioned/, 'inflected forms count');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });

      /* Five named schools, a regulation cited by number, and the words the
         brief orders repeated on each item — none of it is a writing fault. */
      t.notMatch(issueText, /“academy” appears/i, 'a word inside three school names is not repetition');
      t.notMatch(issueText, /“part” appears/i, 'a regulation cited as "Part 141" is a designation, not vocabulary');
      t.notMatch(issueText, /“rates” appears|“course” appears/i, 'words the brief requires on each item are not repetition');
      t.notMatch(issueText, /“school” appears/i, 'and neither is the singular of a keyword');
      t.notMatch(issueText, /reading as a list/i, 'a brief that asks for a breakdown of five is not warned that it reads as a list');

      /* A quoted phrase has to be findable in the draft. */
      t.notMatch(issueText, /“part course structure”/i, 'a repeated phrase is quoted as written, not as normalised');

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

      t.includes(bytes, 'w:ascii="Calibri"', 'the typeface the client demands');
      t.includes(bytes, '<w:sz w:val="28"/>', 'at 14pt');
      t.includes(bytes, '<w:hyperlink r:id=', 'the outbound link survives as a link');
      t.includes(bytes, 'https://www.faa.gov/', 'with its destination intact');
      t.atLeast((bytes.match(/<w:b\/>/g) || []).length, 6, 'the bold headings the brief requires are bold in Word');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'flight schools', run: run };
