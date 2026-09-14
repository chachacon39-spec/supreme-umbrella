/* A local-SEO brief, where the keyword contains a comma.
 *
 * "allergy friendly restaurants in Bozeman, MT" is one phrase. The keyword list
 * is comma-separated, so the parser cut it in half and handed the writer a
 * keyword called "MT" — then measured density and the outbound-link anchor
 * against a phrase the client never asked for. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  'Task #477 Content Guidelines',
  'Real Estate/Travel Blog Content',
  '',
  '* These tasks are content for a blog related to the travel/real estate sector',
  '* Each piece of content should be no longer than 350 words',
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
  'Task #477-F - (350 words) Blog post that provides a brief description and breakdown of 4 restaurants/food spots in Bozeman, MT that cater to patrons with various food allergies. Blog post should include at least one feature dish from each restaurant that is food allergy-friendly. Keywords: allergy friendly restaurants in Bozeman, MT'
].join('\n');

var TASK_TITLE = 'Task #477-F — (350 words) Allergy-friendly dining in Bozeman';

var DRAFT = [
  '<h1>Eating Well in Bozeman When Something on the Menu Can Hurt You</h1>',
  '<p><strong>Ask before you order, every time</strong></p>',
  '<p><em>Names and dishes below are placeholders: confirm each one with the restaurant before you file this.</em></p>',
  '<p>Bozeman’s dining scene has grown fast, and kitchens here field the question daily. Still, a menu label is a starting point, not a guarantee. If you are searching for <a href="https://www.fda.gov/food/food-allergensgluten-free-guidance-documents-regulatory-information">allergy friendly restaurants in Bozeman, MT</a>, call ahead and name the allergen you are avoiding, not the diet you follow.</p>',
  '<p><strong>The downtown kitchen</strong></p>',
  '<p>A downtown kitchen with a separate preparation area for gluten-free orders. The feature dish worth asking about is their gluten-free flatbread, built on a dedicated board.</p>',
  '<p><strong>The brunch room</strong></p>',
  '<p>Known for handling dairy and egg allergies across the brunch menu. Ask about the dairy-free hash, a feature dish made to order with the sauce alongside.</p>',
  '<p><strong>The nut-free cafe</strong></p>',
  '<p>A smaller spot where the whole menu excludes nuts by policy rather than by request. Their nut-free pesto pasta is the feature dish here, cooked in a dedicated batch.</p>',
  '<p><strong>The counter-service bowl shop</strong></p>',
  '<p>A counter-service place with an allergen matrix posted at the till. The soy-free rice bowl is a useful feature dish, assembled in front of you.</p>',
  '<p><strong>How to use this list</strong></p>',
  '<p>Treat every entry here as a lead, not a clearance. Cross-contact happens at the fryer, the grill, and the cutting board. Only the kitchen on shift can tell you what is true tonight (U.S. Food and Drug Administration, 2024). Anaphylaxis risk does not respond to good intentions (Food Allergy Research &amp; Education, 2023).</p>',
  '<p>Call ahead, be specific, and ask how the kitchen handles it that night.</p>',
  '<h2>References</h2>',
  '<p>U.S. Food and Drug Administration. (2024). <em>Food allergies</em>. U.S. Department of Health and Human Services.</p>',
  '<p>Food Allergy Research &amp; Education. (2023). <em>Dining out with food allergies</em>. FARE.</p>'
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
  var t = createSuite('local seo');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('a keyword with a comma in it', async function () {
      var meta = await page.evaluate(function (args) {
        return JSON.parse(JSON.stringify(FW.brief.analyze({ title: args.title, brief: args.brief }).meta));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      t.equal(meta.keywords.length, 1, 'a place name does not split one keyword into two');
      t.equal(meta.keywords[0].term, 'allergy friendly restaurants in Bozeman, MT', 'the phrase survives whole');

      /* The per-item requirement here never says "including". */
      t.includes(meta.coverage.join(' '), 'feature dish', 'a "one X from each Y" rule is read as per-item coverage');
      t.equal(meta.items.count, 4, 'and the item count comes with it');

      /* A flat 2% target needs a band to be checkable. */
      t.equal(meta.keywordDensity.min, 1.5, 'a 2 percent target gets a workable lower bound');
      t.equal(meta.keywordDensity.max, 2.5, 'and upper bound');
    });

    await t.section('multi-keyword briefs still split', async function () {
      var terms = await page.evaluate(function () {
        return FW.brief.analyze({
          title: '',
          brief: 'Keywords: Salesforce SAAS, SAAS Salesforce 2026'
        }).meta.keywords.map(function (k) { return k.term; });
      });
      t.equal(terms.length, 2, 'two ordinary keywords are still two');
      t.equal(terms[0], 'Salesforce SAAS', 'first is intact');
      t.equal(terms[1], 'SAAS Salesforce 2026', 'second is intact');
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
      t.match(compliance, /allergy friendly restaurants in Bozeman, MT/, 'the whole phrase is what gets checked');
      t.match(compliance, /Cover 4 /, 'the four venues are tracked');
      t.match(compliance, /4 mentions across 4 items/, 'and the feature dish on each of them');

      var issueText = await page.evaluate(function () {
        var host = document.querySelector('.issue-list');
        return host ? host.innerText : '';
      });
      /* "in Bozeman, MT, call ahead and name the allergen" is a place name
         followed by a clause, not a three-item series. */
      t.notMatch(issueText, /Serial \(Oxford\) comma/, 'a geographic comma is not a serial comma');
      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('rules that only fire on prose', async function () {
      var checks = await page.evaluate(function () {
        function count(text, rule, opts) {
          return FW.analyzer.analyze(text, opts || {}).issues.filter(function (i) { return i.rule === rule; }).length;
        }
        return {
          placeSeries: count('If you are in Bozeman, MT, call ahead and name the allergen.', 'oxford', { styleGuide: 'chicago' }),
          realSeries: count('The kitchen serves bread, pasta and rice.', 'oxford', { styleGuide: 'chicago' }),
          properNoun: count('Sierra Academy is good. Epic Flight Academy is close. FlightSafety Academy costs more.', 'word-repetition'),
          commonNoun: count('The academy was full. The academy closed early. The academy reopened in spring.', 'word-repetition'),
          designation: count('Part 141 governs this. Under Part 61 the minimum differs. A Part 91 operator sees neither.', 'word-repetition'),
          dependent: count('If your researchers write their own questionnaires, this is the natural home.', 'comma-splice'),
          splice: count('The platform is popular, it is also expensive.', 'comma-splice')
        };
      });
      t.equal(checks.placeSeries, 0, 'a state code after a comma is geography');
      t.atLeast(checks.realSeries, 1, 'a real series is still flagged');
      t.equal(checks.properNoun, 0, 'a word inside several names is not repetition');
      t.atLeast(checks.commonNoun, 1, 'the same word as a common noun still is');
      t.equal(checks.designation, 0, 'Part 141 is a designation, not vocabulary');
      t.equal(checks.dependent, 0, 'a leading dependent clause takes its comma');
      t.atLeast(checks.splice, 1, 'a real comma splice is still caught');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'local seo', run: run };
