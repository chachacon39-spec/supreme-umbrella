/* The first brief on this desk longer than 400 words, and most of what makes a
 * long-form brief a long-form brief had never been exercised: a word-count
 * range, a section cap, a title limit, a reading level expressed as a ceiling,
 * an FAQ with a question count, internal links, and a deadline.
 *
 * Six of those were wrong or missing. The worst was quiet: the checklist
 * counted two internal links the exported .docx did not contain. */
'use strict';

var path = require('path');
var { chromium } = require('playwright');
var { createSuite } = require('./harness');

var APP_URL = 'file://' + path.join(__dirname, '..', 'index.html');

var CLIENT_BRIEF = [
  "Task #503 Content Guidelines",
  "B2B SaaS Blog Content",
  "",
  "* These tasks are long-form content for a B2B software blog",
  "* Each piece of content should be between 1,500 and 1,800 words",
  "* Each piece should include an SEO-friendly engaging title of no more than 60 characters",
  "* Please include a meta description of no more than 155 characters",
  "* Content should insert any keywords mentioned at a density of 1.5% throughout the content",
  "* The primary keyword should appear in the title, in the first 100 words, and in at least one H2 subheading",
  "* Content should be broken into at least 5 H2 sections, and no section should run longer than 300 words",
  "* Each piece should close with a FAQ section containing at least 3 questions",
  "* The keyword should link to an outside relevant article on an authoritative website at least once (please see [link](https://moz.com/top500) for examples of authoritative websites)",
  "* Please include at least 2 internal links to other posts on the client blog",
  "* Content should include 1 royalty-free hi-res feature image (dimensions 1200 x 630 px) as well as two smaller royalty-free images inserted throughout the text",
  "* Content should include at least 3 APA or AMA-style citations at the end of the content with at least one direct reference to each citation throughout the content. Citations do not count toward the total word count of the piece",
  "* Reading level should be grade 9 or below",
  "* Please avoid the words leverage, utilize, synergy and robust",
  "* The tone of this content should be professional yet conversational, speaking directly to the reader",
  "* Content should be submitted in .docx or .doc format, font size 12, font family Arial",
  "* Deadline: all drafts are due by Friday, October 2, 2026",
  "",
  "Task #503-A - (1,500 words) Long-form blog post explaining how B2B SaaS companies can reduce customer churn. Please cover at least 4 churn drivers and the retention tactic that addresses each one. Keywords: B2B SaaS churn reduction, reduce customer churn 2026"
].join('\n');

var TASK_TITLE = 'Task #503-A — (1,500 words) Reducing B2B SaaS churn';

var DRAFT = [
  "<h1>B2B SaaS Churn Reduction: 4 Drivers and 4 Fixes</h1>",
  "<p>Most teams treat churn as a support problem. It is not. By the time a customer opens the ticket that ends the relationship, the decision is months old. Real <a href=\"https://hbr.org/1990/09/zero-defections-quality-comes-to-services\">B2B SaaS churn reduction</a> starts earlier, in the quiet weeks when an account is deciding whether your product still earns its seat cost.</p>",
  "<p>This post splits the problem into four drivers. Each driver gets one retention tactic that answers it directly. None of them need a new tool.</p>",
  "<h2>Why B2B SaaS churn reduction starts with the data</h2>",
  "<p>You cannot fix what you measure once a quarter. Most teams look at logo churn, which counts accounts that left. That number hides the shape of the loss. A single large account leaving is a different problem from twenty small ones drifting away, and the two need different answers.</p>",
  "<p>Track three things weekly instead. Net revenue retention shows whether growth inside your base covers the losses. Seat utilisation answers a blunter question: are the people you bill logging in at all? Time to first value catches the accounts that never got started at all.</p>",
  "<p>Weekly matters more than the choice of metric. A number reviewed every Monday gets acted on while the account is still reachable. The same number reviewed in a quarterly deck gets explained.</p>",
  "<p>Reichheld and Sasser (1990) showed that small gains in retention move profit far more than the same gains in acquisition. That relationship still holds, and it is why the work below pays for itself. Our guide to <a href=\"/blog/net-revenue-retention\">the calculation behind it</a> shows the working, including how to treat mid-term upgrades.</p>",
  "<h2>Driver 1: onboarding that never finishes</h2>",
  "<p>Most accounts that leave were never properly switched on. Someone signed the contract, a kickoff call happened, and then the project slipped behind whatever else the buyer had on that quarter. Six months later nobody on their side can explain what the tool does.</p>",
  "<p><strong>The tactic: define one activation event and chase it.</strong> Pick the single action that predicts a healthy account, such as the third report published or the first integration connected. Then make that milestone the only goal of onboarding, and say so to the customer in the kickoff call.</p>",
  "<p>Give the customer success team a deadline for it, usually thirty days. Anything that does not move an account toward it comes out of the onboarding plan. Teams that try to teach the whole product in week one tend to teach nothing.</p>",
  "<p>Measure the share of new accounts that reach that milestone inside the window, and post the figure weekly where the whole team sees it. When that share falls, you have found a problem months before it shows up as a cancellation.</p>",
  "<h2>Driver 2: the champion leaves</h2>",
  "<p>A person bought your product, not a company. When that person changes jobs, the account often has no one left who remembers why the contract exists. Renewal then lands on a stranger who sees a line item and no story.</p>",
  "<p><strong>The tactic: build a second relationship inside every account.</strong> Name it in the account plan and treat a single-contact account as a risk, not a convenience.</p>",
  "<p>Make the second contact someone who sees the output rather than the interface, usually the champion’s manager. Send that person a short quarterly note on what the account achieved. When the champion leaves, the note becomes the argument for renewal, and someone already knows it.</p>",
  "<p>Watch for the departure itself. A job change on a public profile is an early warning your competitors already act on. Treat it as a trigger and book a call inside two weeks. Someone is still writing the handover, and your product can be part of that document rather than a line the next person inherits.</p>",
  "<h2>Driver 3: pricing that outgrows the value</h2>",
  "<p>Seat-based pricing punishes accounts that grow. A customer who adds thirty people sees the invoice rise before the value does, and the finance team starts asking questions the champion cannot answer.</p>",
  "<p><strong>The tactic: audit accounts whose price per active user has drifted.</strong> Divide contract value by weekly active users each month. When that number climbs, the account is paying more for the same use, and it will notice at renewal.</p>",
  "<p>Bring it up before they do. A planned reduction costs less than a lost account. Gupta et al. (2004) put a number on that: a customer is worth the whole discounted margin they produce for as long as they stay. Shortening the stay is expensive.</p>",
  "<p>The conversation is easier than it sounds. You are telling a customer you noticed something before they raised it, which is the opposite of how most vendors behave, and it tends to buy goodwill that outlasts the discount.</p>",
  "<h2>Driver 4: support that closes tickets but not problems</h2>",
  "<p>A support team measured on resolution time will resolve tickets. It will not notice that the same account has filed the same kind of ticket nine times. Each one closes cleanly, the survey scores well, and the account still leaves.</p>",
  "<p><strong>The tactic: read tickets by account, not by queue.</strong> Once a month, group the last ninety days of tickets by customer and look for repetition.</p>",
  "<p>Repeated tickets of one kind mean a workflow your product does not support. That is a product finding, not a support finding, and it belongs in the roadmap conversation. Our note on <a href=\"/blog/customer-health-score\">building a customer health score</a> shows how to weight it.</p>",
  "<h2>How to sequence the work</h2>",
  "<p>Do not start all four at once. Teams that plan to reduce customer churn 2026 quarter by quarter usually pick the driver with the clearest evidence and finish it before moving on.</p>",
  "<p>Start with onboarding if your losses cluster in the first six months. Start with the champion problem if they cluster at renewal. Start with pricing if your largest accounts are the ones leaving. Start with support if the same names keep appearing in your ticket export.</p>",
  "<p>One finished change beats four half-built ones. Blattberg and Deighton (1996) argued that firms should spend on retention until the marginal return matches acquisition, which means the question is never whether to do this work. It is where the next hour goes.</p>",
  "<h2>What to expect in the first two quarters</h2>",
  "<p>Nothing moves in month one. B2B SaaS churn reduction is slow work, because the accounts you saved would not have left yet and the ones already deciding are past reach. Expect the first clear signal near the end of the second quarter.</p>",
  "<p>Companies that reduce customer churn 2026 will reward tend to share one habit: they review the same three numbers every week, in the same meeting, with the same owner. The metric matters less than the repetition.</p>",
  "<p>Set a floor you will not cross. If that number drops under one hundred percent for two quarters running, stop adding features and spend the quarter on the base.</p>",
  "<h2>A monthly review that takes one hour</h2>",
  "<p>Most of this work fails for a boring reason. Nobody owns it, so it happens when someone remembers. Put it in the calendar and keep it short.</p>",
  "<p>Open with the three numbers from the first section. Say out loud whether each one moved, and by how much. Do not explain them yet.</p>",
  "<p>Then pick the five accounts with the worst trend and name a person for each. That person has one job before the next review: find out what changed. Not fix it, find out. Teams skip this step and then argue about causes nobody has checked.</p>",
  "<p>Spend the last twenty minutes on accounts that renewed early or expanded. Wins carry more information than losses, because the customer is still around to explain them. Ask what they were trying to do in their first ninety days, and whether anything nearly stopped them.</p>",
  "<p>Write down one decision. A review that ends without a decision is a status meeting, and status meetings do not reduce customer churn 2026 or in any other year.</p>",
  "<h2>FAQ</h2>",
  "<p><strong>How long does it take to reduce customer churn 2026 targets will measure?</strong></p>",
  "<p>Plan for two quarters before the trend is readable, and a full year before the number is stable. Anything faster is usually a change in who you sold to, not a change in how you keep them.</p>",
  "<p><strong>Is B2B SaaS churn reduction different from consumer retention?</strong></p>",
  "<p>Yes. A consumer decides alone and leaves quietly. A business account has a buyer, a user and a budget holder, and losing any one of the three can end the contract while the other two are happy.</p>",
  "<p><strong>What single metric should we watch to reduce customer churn 2026 budgets depend on?</strong></p>",
  "<p>Net revenue retention, because it counts expansion and contraction together. Logo churn treats a shrinking account as a win, and a growing one as nothing.</p>",
  "<p><strong>Should we offer a discount to save an account?</strong></p>",
  "<p>Only when the price genuinely outran the value, and only with a change in what they get. A discount alone teaches the customer that the list price was never real, and the same conversation returns next year.</p>",
  "<h2>References</h2>",
  "<p>Blattberg, R. C., &amp; Deighton, J. (1996). Manage marketing by the customer equity test. <em>Harvard Business Review, 74</em>(4), 136&ndash;144.</p>",
  "<p>Gupta, S., Lehmann, D. R., &amp; Stuart, J. A. (2004). Valuing customers. <em>Journal of Marketing Research, 41</em>(1), 7&ndash;18.</p>",
  "<p>Reichheld, F. F., &amp; Sasser, W. E. (1990). Zero defections: Quality comes to services. <em>Harvard Business Review, 68</em>(5), 105&ndash;111.</p>"
].join('\n');

/* Twenty-two unrelated sentences, so a phrase either side of them is far apart
 * without the filler itself repeating anything. */
var FILLER = [
  'Onboarding decides whether an account ever starts.',
  'A champion who leaves takes the reason for buying away.',
  'Seat pricing punishes customers as they grow larger.',
  'Support queues hide problems that repeat quietly.',
  'Activation events predict health better than logins alone.',
  'Quarterly decks explain losses nobody can still reach.',
  'Weekly reviews catch drift while somebody can act.',
  'Expansion hides inside accounts that look flat.',
  'Discounts without a change teach buyers to wait.',
  'Handover notes decide renewals months before they land.',
  'Roadmap arguments need evidence from real tickets.',
  'Renewal dates arrive faster than product promises.',
  'Pilot teams rarely represent a wider organisation.',
  'Invoices get read by people who never logged in.',
  'Escalations reveal what a survey score hid.',
  'Adoption plateaus long before anyone complains.',
  'Success plans go stale the week they are written.',
  'Buyers change jobs more often than contracts renew.',
  'Usage reports persuade nobody without a comparison.',
  'Integrations decide whether a tool becomes furniture.',
  'Trials end quietly and are recorded as wins.',
  'Procurement asks questions a champion cannot answer.',
  'Sponsors want a story rather than a dashboard.',
  'A signed contract is not a started project.',
  'Finance notices price per user before the champion does.',
  'Nobody owns retention unless it sits in a calendar.',
  'Early renewals carry more information than cancellations.',
  'Thirty days is long enough to prove one thing works.',
  'Logo counts treat a shrinking account as a success.',
  'Product findings arrive disguised as support volume.',
  'Half-built programmes produce no readable signal at all.'
].join(' ');

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
  var t = createSuite('long-form brief');
  var browser = await chromium.launch();

  try {
    var page = await openApp(browser);

    await t.section('a range is not a target', async function () {
      var a = await page.evaluate(function (args) {
        var r = FW.brief.analyze({ title: args.title, brief: args.brief });
        return JSON.parse(JSON.stringify({ meta: r.meta, gaps: r.gaps }));
      }, { title: TASK_TITLE, brief: CLIENT_BRIEF });

      /* "between 1,500 and 1,800 words" joins its bounds with a word. The range
         test wanted a dash, so the single-number branch built a band around
         1,800 that ran to 1,980 — 180 words past the client's cap. */
      t.equal(a.meta.wordCount.min, 1500, 'the floor is the floor');
      t.equal(a.meta.wordCount.max, 1800, 'and the cap is the cap, not a centre');
      t.includes(a.meta.wordCount.raw, 'between', 'read from the phrase that states it');

      /* Every brief before this one reported "No deadline found". */
      t.equal(a.meta.deadline.date, '2026-10-02', 'a stated deadline is read');
      t.notMatch(a.gaps.join(' | '), /No deadline found/, 'and not asked for again');
    });

    await t.section('numbers that belong to another requirement', async function () {
      var a = await page.evaluate(function (brief) {
        var r = FW.brief.analyze({ title: 'x', brief: brief });
        return JSON.parse(JSON.stringify(r.meta.structure));
      }, CLIENT_BRIEF);

      /* "at least one H2 subheading" offered the scanner "2 subheading". */
      t.equal(a.sections, 5, 'the section count is not the digit inside "H2"');
      /* "at least once" is in the link bullet; "at least 5" is in another. */
      t.equal(a.externalLinks, 1, 'the outbound link count comes from its own bullet');
      t.equal(a.links, 2, 'and the internal link count from its own');
      t.ok(a.linksInternal, 'which the brief marked as internal');
    });

    await t.section('limits a 300-word brief never carries', async function () {
      var a = await page.evaluate(function (brief) {
        var r = FW.brief.analyze({ title: 'x', brief: brief });
        return JSON.parse(JSON.stringify({
          structure: r.meta.structure,
          level: r.meta.readingLevel,
          ceiling: r.meta.readingLevelCeiling,
          banned: r.meta.banned,
          labels: r.checks.map(function (c) { return c.label; })
        }));
      }, CLIENT_BRIEF);

      t.equal(a.structure.titleMaxChars, 60, 'a title character limit');
      t.equal(a.structure.metaMaxChars, 155, 'a meta description limit');
      t.equal(a.structure.sectionMaxWords, 300, 'a per-section word cap');
      t.equal(a.structure.faqQuestions, 3, 'and a number of FAQ questions');
      t.equal(a.banned.length, 4, 'all four banned words');

      /* Each of these used to vanish, and "Supply a meta description" with no
         number reads as met by a description twice the allowed length. */
      t.includes(a.labels.join(' | '), 'Title of no more than 60 characters', 'the title limit reaches the checklist');
      t.includes(a.labels.join(' | '), 'No section longer than 300 words', 'and the section cap');
      t.includes(a.labels.join(' | '), 'FAQ section with at least 3 questions', 'and the question count');
      t.includes(a.labels.join(' | '), 'Include at least 2 internal links', 'and the links are named internal');

      /* "grade 9 or below" is a wall. The checker used a symmetric band, so
         writing more plainly than asked counted as a miss. */
      t.equal(a.level, 9, 'the reading level');
      t.ok(a.ceiling, 'read as a ceiling');
      t.includes(a.labels.join(' | '), 'Reading level grade 9 or below', 'and said so on the checklist');
    });

    await t.section('a wide window is not a warning', async function () {
      var wide = await page.evaluate(function (brief) {
        return FW.brief.analyze({ title: 'x', brief: brief }).gaps;
      }, CLIENT_BRIEF);
      /* Five mentions across a 981-word window is no constraint at all. */
      t.notMatch(wide.join(' | '), /Plan the length before drafting/, 'a roomy target raises nothing');

      var narrow = await page.evaluate(function () {
        return FW.brief.analyze({
          title: 'x',
          brief: 'Each piece should be no longer than 300 words. Insert keywords at a density of 3%.\nTask - (300 words) A post about desktop manufacturing. Keywords: 3d printing IP issues 2026'
        }).gaps;
      });
      t.match(narrow.join(' | '), /Plan the length before drafting/, 'a narrow one still does');
      t.match(narrow.join(' | '), /15-word target/, 'naming how little room there is');
    });

    await t.section('repetition is about distance', async function () {
      var checks = await page.evaluate(function (filler) {
        function n(text) {
          return FW.analyzer.analyze(text, {}).issues
            .filter(function (i) { return i.rule === 'phrase-repetition' && /net revenue retention/.test(i.message); }).length;
        }
        return {
          gap: filler.length,
          far: n('Net revenue retention is the number that matters. ' + filler + ' We come back to net revenue retention at renewal.'),
          near: n('Net revenue retention is the number that matters. Our guide to net revenue retention explains it.')
        };
      }, FILLER);
      t.atLeast(checks.gap, 1500, 'the filler really does separate them');
      /* In 300 words the whole piece is close together, which is why "twice
         anywhere" worked until a brief asked for 1,500. */
      t.equal(checks.far, 0, 'a term used once per half of a long piece is not padding');
      t.atLeast(checks.near, 1, 'the same term twice in two sentences still is');
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
      await page.waitForTimeout(1000);
      await page.locator('.style-card .btn', { hasText: 'Start draft' }).first().click();
      await page.waitForTimeout(900);
      var confirm = page.locator('.modal-foot .btn', { hasText: 'Replace draft' });
      if (await confirm.count()) { await confirm.click(); await page.waitForTimeout(600); }

      await page.evaluate(function (html) {
        var ed = document.querySelector('.editor');
        ed.innerHTML = html;
        ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }, DRAFT);
      await page.waitForTimeout(3000);

      var compliance = await page.evaluate(function () {
        var first = document.querySelector('.check-item');
        return first && first.parentElement ? first.parentElement.innerText : '';
      });
      t.match(compliance, /15\/15 automatic/, 'every automatic check passes on the finished draft');
      t.match(compliance, /1,500 words so far/, 'inside the range');
      t.notMatch(compliance, /short|over by/, 'with nothing outstanding on length');
      t.match(compliance, /47 of 60 characters/, 'the title is measured, not assumed');
      t.match(compliance, /longest is \d+ words under/, 'and the longest section named');
      t.match(compliance, /4 of 3 questions in the FAQ block/, 'the FAQ questions are counted');
      t.match(compliance, /2 of 2 internal \(3 links in all\)/, 'internal links counted apart from the outbound one');
      t.match(compliance, /currently grade 7/, 'and the reading level');
      t.notMatch(compliance, /Reading level around/, 'stated as a ceiling rather than a target');

      t.equal(page.__errors.length, 0, 'no console errors: ' + page.__errors.join(' | '));
    });

    await t.section('the delivered file', async function () {
      await page.locator('.pane-right .tab', { hasText: 'Export' }).click();
      await page.waitForTimeout(400);
      var download = (await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        page.locator('.pane-right .btn', { hasText: 'Word (.docx)' }).first().click()
      ]))[0];
      var chunks = [];
      var stream = await download.createReadStream();
      await new Promise(function (resolve) {
        stream.on('data', function (c) { chunks.push(c); });
        stream.on('end', resolve);
      });
      var bytes = Buffer.concat(chunks).toString('latin1');
      t.includes(bytes, 'w:ascii="Arial"', 'Arial');
      t.includes(bytes, '<w:sz w:val="24"/>', 'at 12pt');
      t.includes(bytes, 'hbr.org', 'the outbound citation link survives');
      /* Only absolute URLs became hyperlinks, so the two internal links left
         the building as plain words while the checklist counted them. */
      var internal = (bytes.match(/Target="\/blog\//g) || []).length;
      t.equal(internal, 2, 'and both internal links survive as real links');
      t.equal((bytes.match(/<w:hyperlink r:id=/g) || []).length, 3, 'three hyperlinks in the body');
    });
  } finally {
    await browser.close();
  }

  return t.summary();
}

module.exports = { name: 'long-form brief', run: run };
