/* Engine tests — pure Node, no browser.
 *
 * These cover the parts of the app that are plain functions: brief parsing,
 * style generation, the writing checker, summarising, paraphrasing,
 * originality, citations, generated artwork and the ZIP writer. They run in
 * about a second, so they are the first thing to run and the first thing to
 * read when something breaks. */
'use strict';

var path = require('path');
var { createSuite } = require('./harness');

var ROOT = path.join(__dirname, '..');

function loadApp() {
  /* The app attaches everything to `window` and expects a DOM only in the UI
     layer, so a tiny shim is enough for the engines. */
  global.window = {};
  global.document = {
    createElement: function () {
      var node = {
        _html: '',
        style: {},
        set innerHTML(v) { node._html = String(v); },
        get innerHTML() { return node._html; },
        get textContent() { return node._html.replace(/<[^>]*>/g, ''); },
        childNodes: [],
        querySelectorAll: function () { return []; },
        querySelector: function () { return null; }
      };
      return node;
    }
  };

  [
    'assets/js/util.js',
    'assets/js/data/personas.js',
    'assets/js/data/lexicons.js',
    'assets/js/data/resources.js',
    'assets/js/core/brief.js',
    'assets/js/core/styles.js',
    'assets/js/core/analyzer.js',
    'assets/js/core/summarize.js',
    'assets/js/core/paraphrase.js',
    'assets/js/core/originality.js',
    'assets/js/core/citations.js',
    'assets/js/core/imagegen.js'
  ].forEach(function (f) {
    delete require.cache[require.resolve(path.join(ROOT, f))];
    require(path.join(ROOT, f));
  });

  return global.window.FW;
}

var SAMPLE_BRIEF = [
  'Topic: whether residential solar pays back in Texas',
  'Audience: suburban homeowners aged 35-60',
  'Tone: friendly, authoritative',
  'Length: 1,200-1,500 words. Due March 14, 2026.',
  'Primary keyword: home solar payback period',
  '- Must include at least 5 H2 subheadings and an FAQ section',
  '- Include a comparison table and cite 4 sources in APA format',
  '- Please provide a meta description and 3 headline options',
  '- Write in second person and keep the reading level around grade 8',
  'Do not use the phrase "game changer". Avoid hype and exaggeration.'
].join('\n');

async function run() {
  var t = createSuite('engines');
  var FW = loadApp();

  await t.section('brief parsing', function () {
    var a = FW.brief.analyze({ title: 'Solar payback guide', brief: SAMPLE_BRIEF });

    t.equal(a.meta.wordCount.min, 1200, 'reads the lower bound of a word-count range');
    t.equal(a.meta.wordCount.max, 1500, 'reads the upper bound of a word-count range');
    t.equal(a.meta.deadline.date, '2026-03-14', 'parses a "Month D, YYYY" deadline');

    /* "24 September 2026" was read by the month-first pattern as "September
       20" — the front of the year taken for the day — so the deadline came
       out four days early and looked entirely plausible. Every form a client
       writes has to land on the same day. */
    function deadlineFor(line) {
      var parsed = FW.brief.analyze({ title: 'T', brief: 'Blog post about cars.\n' + line }).meta.deadline;
      return parsed && parsed.date;
    }
    t.equal(deadlineFor('Deadline: 24 September 2026.'), '2026-09-24', 'day-first, with a trailing full stop');
    t.equal(deadlineFor('Deadline: 24 September 2026'), '2026-09-24', 'day-first, bare');
    t.equal(deadlineFor('Due 3 October 2026.'), '2026-10-03', 'a single-digit day is not padded out of shape');
    t.equal(deadlineFor('Deadline: 11 November 2026.'), '2026-11-11', 'and a day that matches its month is not confused for it');
    t.equal(deadlineFor('Deadline: September 24, 2026'), '2026-09-24', 'month-first still works');
    t.equal(deadlineFor('Deadline: 2026-09-24'), '2026-09-24', 'so does ISO');
    /* 24/09/2026 built an invalid date and reported no deadline at all. */
    t.equal(deadlineFor('Deadline: 24/09/2026'), '2026-09-24', 'a day-first slash date is read rather than dropped');
    t.equal(deadlineFor('Deadline: 09/24/2026'), '2026-09-24', 'and a month-first one still is');

    /* The keyword label and its separator have to share a line. \s spans
       newlines, so on a hyphen-bulleted brief "keywords" at the end of one
       line bound to the "-" starting the next and swallowed that bullet:
       half the tone guideline, "speaking directly to the reader", became the
       keyword the draft was measured for density against. */
    function keywordsFor(brief) {
      return FW.brief.analyze({ title: 'T', brief: brief }).meta.keywords.map(function (k) { return k.term; });
    }
    t.equal(keywordsFor([
      '- Content should insert any keywords',
      '- The tone of this content should be professional yet engaging, speaking directly to the reader'
    ].join('\n')).length, 0, 'a bullet after a bare "keywords" is not a keyword list');
    t.includes(keywordsFor('Keywords: electric cars 2026').join('|'), 'electric cars 2026', 'a labelled list on one line still reads');
    t.includes(keywordsFor('Keywords - electric cars 2026').join('|'), 'electric cars 2026', 'and so does a dash-separated one');

    /* The assignment is not a guideline. On its own line it was filed as a
       requirement of its own: a row restating the whole task, which the Cover
       checks have already broken into the parts that can be checked, and which
       nothing can ever tick. */
    var withTask = FW.brief.analyze({ title: 'T', brief: [
      '* Each piece of content should be no longer than 300 words',
      '* Content should be submitted in .docx format, font size 14, font family Calibri',
      '',
      'Task #478-B - (300 words) Blog post that provides a brief description and breakdown of the 5 top-rated FAA-approved private flight schools in the U.S. in 2026, including rates, course hours and course structure/overview.'
    ].join('\n') });
    var required = ((withTask.instructions && withTask.instructions.required) || [])
      .map(function (r) { return String(r && r.text ? r.text : r); });
    t.notMatch(required.join(' | '), /Task #478-B/, 'the assignment is not filed as a guideline about itself');
    t.equal(required.length, 2, 'the two real guidelines are kept');
    t.equal(withTask.meta.items.count, 5, 'and the task is still read as the task');

    /* A non-bulleted line is split into sentences, so only the first carries
       the task marker. #489-B's assignment runs to two sentences, and the
       second — "Please include at least 2 positive and 2 negative impacts" —
       was filed as a guideline of its own, duplicating the two checks already
       derived from it and adding a row nothing can tick. */
    var twoSentences = FW.brief.analyze({ title: 'T', brief: [
      '* Each piece of content should be no longer than 300 words',
      '',
      'Task #489-B - (300 words) Blog post that highlights at least 4 ways in which recent tax reform in 2026 will impact equipment leasing companies or lenders. Please include at least 2 positive and 2 negative impacts that the recent reform will have. Keywords: equipment leasing companies 2026 tax reform'
    ].join('\n') });
    var req2 = ((twoSentences.instructions && twoSentences.instructions.required) || [])
      .map(function (r) { return String(r && r.text ? r.text : r); });
    t.notMatch(req2.join(' | '), /Please include at least 2 positive/, 'the rest of the assignment is the assignment too');
    t.equal(req2.length, 1, 'only the real guideline is kept');
    t.equal(twoSentences.meta.items.count, 4, 'the count still comes off the task');
    t.includes(twoSentences.meta.keywords.map(function (k) { return k.term; }).join('|'),
      'equipment leasing companies 2026 tax reform', 'and so does the keyword');

    /* Every brief in tests/briefs is the same portal template — same bullets,
       same density rule, same Calibri line. A market's own pitching page is a
       different shape: a word count that is a floor rather than a cap, no
       keywords, no font rule, and commercial terms mixed in with content ones.
       Four things went wrong on one. */
    function parse(brief) { return FW.brief.analyze({ title: 'T', brief: brief }); }

    /* A rate quoted for "reported longform (>2,000 words)" fell through to the
       single-number branch and came back as a 1,900-2,200 band — telling the
       writer to file under the market's own minimum, and under the length the
       rate is paid for. */
    var floorCount = parse('Our floor for reported longform (>2,000 words) stories is $2,000.').meta.wordCount;
    t.equal(floorCount.min, 2000, 'a ">N words" floor is read as a floor');
    t.equal(floorCount.max, null, 'with no ceiling invented above it');
    t.equal(parse('We want over 1,500 words.').meta.wordCount.min, 1500, '"over N words" is a floor too');
    t.equal(parse('Pieces run 2,000+ words.').meta.wordCount.min, 2000, 'and so is "N+ words"');
    t.equal(parse('Pieces of 2,000 words or more.').meta.wordCount.min, 2000, 'and "N words or more"');
    /* The ceiling test had to move above the floor test to add "more than"
       without turning every cap into a minimum. */
    var cap = parse('Each piece of content should be no longer than 300 words.').meta.wordCount;
    t.equal(cap.max, 300, 'a cap is still a cap');
    t.equal(cap.min, null, 'with no floor invented below it');
    t.ok(cap.ceiling, 'and still marked as a ceiling');
    var noMore = parse('Write no more than 800 words.').meta.wordCount;
    t.equal(noMore.max, 800, '"no more than" is a cap, not a floor');
    t.equal(noMore.min, null, 'even though it contains the words "more than"');

    /* "brings a new topic, angle, or idea to the table" asked a pitch email for
       a table. */
    t.ok(!parse('A story that brings a new topic, angle, or idea to the table.').meta.structure.table,
      'an idiom is not a request for a table');
    t.ok(parse('Content should include a table.').meta.structure.table, 'but a request for one still is');
    t.ok(parse('Include a comparison table of upfront cost vs savings.').meta.structure.table,
      'and so is a named one');

    /* "the who, what, where, when, why, etc. of the piece" ended on a filler
       token, and Cover "etc" is not a requirement anyone can meet. */
    var listed = parse('Your pitch should explain the story, including the who, what, where, when, why, etc. of the piece.')
      .meta.coverage || [];
    t.notMatch(listed.join('|'), /^etc$|\|etc$|\|etc\|/i, 'a filler token is not a coverage point');
    t.includes(listed.join('|'), 'who', 'while the real ones survive');

    /* "Clips: Are not necessary to send... but do not select story pitches on
       the basis of qualification" is telling the writer what they may skip. It
       was filed as a prohibition because it contains "do not select" — which is
       the editor's own behaviour, not an instruction. */
    /* It has to be tested as a bullet. A non-bulleted line is sentence-split,
       which separates "not necessary" from the "do not select" that trips the
       prohibition reader, so the prose form never reproduced the fault. */
    var optional = parse('* Clips: Are not necessary to send along with a story pitch. We may ask you for examples of past work but do not select story pitches on the basis of qualification.');
    var banned = ((optional.instructions && optional.instructions.forbidden) || [])
      .map(function (i) { return String(i && i.text ? i.text : i); }).join(' | ');
    t.notMatch(banned, /not necessary/i, 'being told something is optional is not a prohibition');

    /* A second pitching page, a different shape again: rates in cents per word,
       no word count at all, and the requirements written as prose rather than as
       "Label: value". Four more things went wrong on it. */

    /* "Our writing is curious and fair, not snarky or scolding" is a house voice
       stated at length. Only the label-and-colon form was read, so the panel
       reported no tone specified — a gap sending the writer to ask an editor
       about something their own page answers. */
    var prose = parse('Match our tone. Our writing is curious and fair, not snarky or scolding - the voice of a trusted colleague, not a referee.');
    t.atLeast(prose.meta.tone.length, 1, 'a voice stated in prose is a stated voice');
    t.includes(prose.meta.tone.join(' '), 'curious and fair', 'quoted back in the page\u2019s own words');
    /* A voice statement longer than the capture allows gets cut mid-phrase, and
       this one lands exactly on an "and". Quoting a tone back to the writer
       ending on a conjunction reads as a truncation bug, which it was. */
    /* No word here is in the tone lexicon, so the raw capture is what gets
       quoted back — which is the path the trim guards. "warm" would have been
       recognised and short-circuited it. */
    var longVoice = parse('Our writing is clear, accurate and accessible, curious and fair, plain but exact, never snarky and never scolding and never cynical and never knowing.');
    t.atLeast(longVoice.meta.tone.length, 1, 'a long voice statement is still read');
    t.notMatch(longVoice.meta.tone.join(' '), /\b(?:and|or|not|but)$/i, 'and does not end on a dangling conjunction');
    t.includes(longVoice.meta.tone.join(' '), 'never scolding', 'keeping everything that fitted');
    t.notMatch(prose.gaps.join(' | '), /No tone specified/, 'and no gap claiming otherwise');
    /* The portal form has to keep working. */
    t.includes(parse('Tone: friendly, professional, direct').meta.tone.join('|'), 'professional', 'a labelled tone still reads');

    /* "Our readers include working journalists and news consumers" names an
       audience. "readers" was missing from the list entirely. */
    var whoReads = parse('Think about our audience. Our readers include working journalists and news consumers who care about journalism.');
    t.includes(String(whoReads.meta.audience), 'working journalists', 'an audience named in prose is found');
    t.notMatch(whoReads.gaps.join(' | '), /Audience is unstated/, 'and not reported as unstated');
    /* Adding "readers" without requiring a linking verb caught the wrong
       sentence first: "essays that help readers better understand how news
       works" is about the piece, not about who reads it. */
    t.equal(parse('We publish essays that help readers better understand how news works.').meta.audience, null,
      'a sentence that merely mentions readers is not an audience');

    /* "avoid jargon, hype and insider shorthand whenever possible" carried its
       qualifier into the last term, and the checker went hunting for the literal
       phrase "insider shorthand whenever possible". */
    var soft = parse('We avoid jargon, hype and insider shorthand whenever possible.').meta.banned;
    t.includes(soft.join('|'), 'insider shorthand', 'the banned term is the term');
    t.notMatch(soft.join('|'), /whenever possible/i, 'and not the qualifier hanging off it');
    t.includes(soft.join('|'), 'jargon', 'the other terms still come through');

    /* A reporting plan is not a list of things the piece must contain. */
    var plan = parse('Show your reporting plan. A likely word count, the sources you plan to interview and any expected access to documents, data or images will strengthen your pitch.');
    t.ok(!plan.meta.structure.images, 'access to images for reporting is not a request for a feature image');
    t.ok(!plan.meta.structure.quotes, 'and sources you plan to interview is not a request for pulled quotes');
    /* What a brief actually asking for them looks like. */
    t.ok(parse('Content should include 1 royalty-free hi-res feature image (dimensions 600 x 600 px).').meta.structure.images,
      'a required feature image still registers');
    t.ok(parse('Content should include quotes from an expert.').meta.structure.quotes,
      'and so does a required quote');
    t.equal(a.meta.pov, 'second person', 'detects the requested point of view');
    t.equal(a.meta.readingLevel, 8, 'detects the target reading level');
    t.equal(a.meta.citationStyle, 'APA 7', 'detects the citation style');
    t.equal(a.meta.structure.sections, 5, 'counts required subheadings');
    t.ok(a.meta.structure.faq, 'spots the FAQ requirement');
    t.ok(a.meta.structure.table, 'spots the table requirement');
    t.equal(a.meta.structure.sources, 4, 'counts required sources');
    t.includes(a.meta.audience, 'suburban homeowners', 'extracts the audience');
    t.ok(a.meta.tone.indexOf('friendly') !== -1, 'extracts tone words');
    t.equal(a.meta.keywords[0].term, 'home solar payback period', 'extracts the primary keyword');
    t.ok(a.meta.keywords[0].primary, 'marks the primary keyword as primary');

    /* Banned terms must come out clean — no stray quotes or "the phrase" prefix. */
    t.ok(a.meta.banned.indexOf('game changer') !== -1,
      'strips "the phrase" and quotes from a banned term');
    t.ok(a.meta.banned.indexOf('hype') !== -1, 'reads a banned term from an "Avoid:" list');

    t.notMatch(a.meta.topic, /^whether /i, 'trims a leading "whether" from the topic');
    t.atLeast(a.instructions.required.length, 4, 'collects the bulleted instructions');
    t.atLeast(a.confidence, 70, 'scores a well-specified brief as well specified');
    t.atLeast(a.checks.length, 12, 'produces a checkable requirement list');
  });

  await t.section('brief parsing — formats and personas the briefs actually use', function () {
    /* "Website content covering projections for EUR/USD" states its format
       plainly; not knowing the term made the app ask the client a question they
       had already answered. */
    var web = FW.brief.analyze({
      title: '',
      brief: 'Website content covering projections for the EUR/USD pair in FOREX trading for Q1.'
    });
    t.equal(web.meta.format, 'website content', 'a brief asking for website content is not an ambiguous deliverable');
    t.notMatch(web.gaps.join(' | '), /format is ambiguous/, 'and no gap asks what the deliverable is');

    /* A currency-pair outlook is financial writing. The signal list had no
       forex, currency, trading or yield in it, so this tied with blogging. */
    t.equal(web.meta.suggestedPersonas[0].id, 'financial', 'a FOREX brief suggests the financial writer first');

    var blogPost = FW.brief.analyze({ title: '', brief: 'Blog post about weekend recipes for busy parents.' });
    t.notMatch(String(blogPost.meta.format), /website content/, 'and an ordinary blog post is still a blog post');
  });

  await t.section('brief parsing — the awkward cases', function () {
    var forms = [
      ['at least 800 words', 800, null],
      ['no more than 600 words', null, 600],
      ['approx. 2000 words', 1800, 2200]
    ];
    forms.forEach(function (f) {
      var wc = FW.brief.analyze({ title: '', brief: f[0] }).meta.wordCount;
      if (f[1] !== null) t.equal(wc.min, f[1], 'word count from "' + f[0] + '" (min)');
      if (f[2] !== null) t.equal(wc.max, f[2], 'word count from "' + f[0] + '" (max)');
    });

    var empty = FW.brief.analyze({ title: 'Untitled', brief: '' });
    t.equal(empty.checks.length, 0, 'an empty brief produces no false requirements');
    t.atLeast(empty.gaps.length, 4, 'an empty brief is reported as full of gaps');
    t.atMost(empty.confidence, 20, 'an empty brief scores low confidence');

    var titled = FW.brief.analyze({ title: 'Q3 pricing memo', brief: 'Recommend whether to raise prices.' });
    t.ok(titled.meta.suggestedPersonas.some(function (p) { return p.id === 'business'; }),
      'suggests a persona using the title as well as the body');
  });

  await t.section('three writing approaches', function () {
    var task = { id: 't1', title: 'Solar payback', client: 'Meridian', personaId: 'blog', brief: SAMPLE_BRIEF };
    var a = FW.brief.analyze(task);
    var s = FW.styles.generate(task, a);

    t.equal(s.variants.length, 3, 'generates exactly three approaches');
    t.equal(new Set(s.variants.map(function (v) { return v.key; })).size, 3, 'the three are distinct');

    s.variants.forEach(function (v) {

      t.equal(v.headlines.length, 3, v.label + ': offers three headlines');
      t.atLeast(v.outline.length, 5, v.label + ': has a real structure');
      t.atLeast(v.risks.length, 1, v.label + ': names at least one risk');
      t.between(v.fit, 1, 99, v.label + ': has a sane fit score');
      t.ok(v.outline.every(function (o) { return o.words > 0; }),
        v.label + ': every section carries a word budget');
      t.notMatch(JSON.stringify(v.outline) + v.headlines.join(' '), /\{[A-Z]+\}/,
        v.label + ': no unsubstituted template placeholders');
    });

    /* Requirements from the brief must be folded into every structure. */
    s.variants.forEach(function (v) {
      var text = v.outline.map(function (o) { return o.text.toLowerCase(); }).join(' | ');
      t.match(text, /faq/, v.label + ': FAQ requirement folded into the outline');
      t.match(text, /table/, v.label + ': table requirement folded into the outline');
      t.match(text, /reference|source/, v.label + ': sources requirement folded into the outline');
      var last = v.outline[v.outline.length - 1].text.toLowerCase();
      t.match(last, /reference|source|note|appendix|disclaimer|shot list|b-roll/,
        v.label + ': back matter sorts to the end');
    });

    /* Same input, same output — generation is seeded, not random. */
    var again = FW.styles.generate(task, a);
    t.equal(JSON.stringify(again.variants), JSON.stringify(s.variants),
      'generation is deterministic for the same brief');

    t.equal(FW.personas.all.length, 12, 'twelve personas are registered');
    t.ok(FW.personas.all.every(function (p) { return p.styles.length === 3; }),
      'every persona defines three styles');
  });

  await t.section('the writing checker', function () {
    var text = 'Their is alot of reasons. The report was written by the team and the report was ' +
      'reviewed by the team. However the results where clear. Its going to be fine. ' +
      'At the end of the day you should definately try and think outside the box.';
    var r = FW.analyzer.analyze(text, { checks: {}, language: 'en-US', styleGuide: 'chicago' });

    function hasRule(rule) { return r.issues.some(function (i) { return i.rule === rule; }); }
    function fixFor(rule) {
      var i = r.issues.filter(function (x) { return x.rule === rule; })[0];
      return i ? i.fix : null;
    }

    t.ok(hasRule('their-there'), 'catches their/there');
    t.ok(hasRule('where-were'), 'catches where/were');
    t.ok(hasRule('its-contraction'), 'catches its/it\'s');
    t.ok(hasRule('typo-alot'), 'catches a common misspelling');
    t.ok(hasRule('typo-definately'), 'catches definately');
    t.ok(hasRule('passive'), 'flags passive voice');
    t.ok(hasRule('phrase-repetition'), 'flags a repeated phrase');
    t.ok(r.issues.some(function (i) { return /cliche/.test(i.rule); }), 'flags a cliche');

    /* Fixes must preserve the capitalisation of what they replace. */
    t.equal(fixFor('their-there'), 'There is', 'fix keeps sentence-initial capitals');
    t.equal(fixFor('its-contraction'), "It's going", 'contraction fix keeps capitals');

    /* Offsets must actually point at the reported text. */
    t.ok(r.issues.every(function (i) { return text.slice(i.start, i.end) === i.excerpt; }),
      'every issue offset matches its excerpt');

    /* One flag per repeated phrase, not one per occurrence. */
    var phrase = r.issues.filter(function (i) { return i.rule === 'phrase-repetition'; });
    t.equal(new Set(phrase.map(function (p) { return p.excerpt; })).size, phrase.length,
      'repeated phrases are reported once each');

    t.atLeast(r.stats.words, 40, 'counts words');
    t.between(r.stats.grade, 0, 20, 'produces a sane grade level');
    t.atLeast(r.stats.readingMinutes, 1, 'estimates reading time');
  });

  await t.section('checker — false positives', function () {
    var clean = 'You should visit an hour early. She had a unique idea about the European market. ' +
      'The team has one goal. We reviewed it on 2026-03-14 at https://example.com/a_b-c?d=1.';
    var r = FW.analyzer.analyze(clean, { checks: {}, language: 'en-US' });
    var errors = r.issues.filter(function (i) { return i.severity === 'error'; });

    t.equal(errors.length, 0, 'clean prose raises no errors: ' +
      errors.map(function (e) { return e.rule + '/' + e.excerpt; }).join(', '));
    t.ok(!r.issues.some(function (i) { return i.rule === 'a-an-vowel' && /unique|European|one/.test(i.excerpt); }),
      '"a unique", "a European", "a one" are not flagged');
    t.ok(!r.issues.some(function (i) { return i.start > clean.indexOf('https://'); }),
      'nothing inside a URL is flagged');

    /* Disabling a category must actually disable it. */
    var off = FW.analyzer.analyze('At the end of the day, teh report was written by the team.',
      { checks: { style: false, structure: false }, language: 'en-US' });
    t.ok(!off.issues.some(function (i) { return i.type === 'style' || i.type === 'structure'; }),
      'switched-off check categories produce no issues');
    t.ok(off.issues.some(function (i) { return i.type === 'spelling'; }),
      'other categories still run when one is switched off');
  });

  await t.section('locale handling', function () {
    var gb = FW.analyzer.analyze('The color of the theater program.', { checks: {}, language: 'en-GB' });
    t.ok(gb.issues.some(function (i) { return /locale-color/.test(i.rule); }),
      'en-GB suggests British spelling');
    var us = FW.analyzer.analyze('The colour of the theatre programme.', { checks: {}, language: 'en-US' });
    t.ok(us.issues.some(function (i) { return /locale-colour/.test(i.rule); }),
      'en-US suggests American spelling');
    t.equal(FW.resources.LANGUAGES.length, 20, 'twenty language packs are registered');
  });

  await t.section('summariser', function () {
    var text = 'Solar panels have become cheaper over the past decade. To work out whether they pay ' +
      'for themselves, homeowners need the installed cost, the local electricity rate and the ' +
      'sunlight the roof receives. Because Texas has high summer demand, payback periods there are ' +
      'shorter than the national average. The typical payback period is between seven and eleven ' +
      'years. State incentives change this calculation significantly. A system costing twenty ' +
      'thousand dollars may cost fourteen thousand after incentives.';
    var s = FW.summarize.summarize(text, { ratio: 0.3, keywords: ['payback'] });

    t.ok(s.tldr.length > 20, 'produces a TL;DR');
    t.atLeast(s.bullets.length, 3, 'produces key points');
    t.atLeast(s.compression, 20, 'the summary is meaningfully shorter than the source');
    t.atMost(s.summaryWords, s.originalWords, 'the summary is never longer than the source');

    /* Extractive means every sentence must come from the original. */
    var sentences = FW.util.splitSentences(s.summary);
    t.ok(sentences.every(function (x) { return text.indexOf(x.trim()) !== -1; }),
      'every summary sentence is lifted verbatim from the source');

    var short = FW.summarize.summarize('One sentence only.', { ratio: 0.3 });
    t.ok(typeof short.summary === 'string', 'a one-sentence input does not crash');
  });

  await t.section('paraphraser — it actually rewrites', function () {
    /* The original implementation gated every substitution behind a coin flip
       and only ever swapped words, so on ordinary prose it returned the input
       unchanged. These assertions exist to stop that shipping again. */
    var passages = [
      'Solar panels have become much cheaper over the past decade. Homeowners need to ' +
      'consider the installed cost, the local electricity rate and the sunlight their roof receives. ' +
      'Texas has high summer demand, so payback periods there are shorter than the national average.',

      'We recommend proceeding with the migration in the third quarter. The current platform ' +
      'costs the company roughly forty thousand pounds a year in maintenance. Delaying the ' +
      'decision by two quarters would erode the projected savings.'
    ];

    FW.paraphrase.MODES.forEach(function (mode) {
      var changed = 0, total = 0;
      passages.forEach(function (src) {
        var r = FW.paraphrase.paraphrase(src, mode.id, 'seed');
        changed += r.changedSentences;
        total += r.totalSentences;
      });
      t.atLeast(changed, 2, mode.label + ': rewrites ordinary prose (' + changed + '/' + total + ' sentences)');
    });

    /* Reporting must be honest: the counts are what the UI shows. */
    var r = FW.paraphrase.paraphrase(passages[0], 'standard', 'seed');
    t.equal(r.totalSentences, 3, 'reports how many sentences it looked at');
    t.equal(r.changedSentences + r.unchanged.length, r.totalSentences,
      'every sentence is accounted for as changed or unchanged');
    t.ok(r.notes.length > 0, 'reports what it did');
  });

  await t.section('paraphraser — structural rules', function () {
    function rewrite(src, mode) {
      return FW.paraphrase.paraphrase(src, mode || 'standard', 'fixed').text;
    }

    t.includes(rewrite('The report was written by the marketing team.'), 'wrote the report',
      'turns a passive clause active');
    t.includes(rewrite('The samples were reviewed by two independent analysts.'), 'reviewed the samples',
      'handles a regular past participle');
    t.includes(rewrite('The decision was taken by the board last spring.'), 'took the decision',
      'handles an irregular past participle');
    t.includes(rewrite('The decision was taken by the board last spring.'), 'last spring',
      'keeps a trailing time phrase at the end rather than inside the subject');

    /* An agentless passive cannot be made active without inventing a subject. */
    t.includes(rewrite('The budget was reduced last quarter.'), 'was reduced',
      'leaves an agentless passive alone');

    var expletive = rewrite('There are three factors that determine the payback period.');
    t.notMatch(expletive, /^There are/i, 'drops "there are"');
    t.match(expletive, /^Three factors determine/i, 'and keeps the clauses in the right order');

    t.notMatch(rewrite('It is important to note that incentives change every year.'), /^It is important/i,
      'drops a throat-clearing opener');
    t.includes(rewrite('The committee will make a decision about the proposal on Friday.'), 'decide',
      'unburies a verb from a nominalisation');
    t.includes(rewrite('The engineers who are responsible for the system have left.'), 'engineers responsible',
      'reduces a relative clause');
    t.includes(rewrite('Because demand is high in summer, payback periods are shorter.'), 'because demand is high',
      'moves a leading subordinate clause to the end');
    t.match(rewrite('Demand peaks in summer, so payback periods are shorter there.'), /^Because demand peaks/i,
      'recasts "so" as "because"');

    /* An expletive wrapping a passive needs two passes. One pass alone produced
       "The reviewers raised there are several issues that." */
    var compound = rewrite('There are several issues that were raised by the reviewers.');
    t.match(compound, /^The reviewers raised several issues/i,
      'unwinds an expletive wrapped around a passive');
    t.notMatch(compound, /there are/i, 'with no fragment of the expletive left behind');

    /* A leading adverbial must stay at the front, not be dragged into the
       object slot: "The steering group conducted to decide about the timeline,
       a review." was the earlier output. */
    var adverbial = rewrite('In order to make a decision about the timeline, a review was conducted by the steering group.');
    t.match(adverbial, /^To decide .*,\s*the steering group conducted a review/i,
      'keeps a leading adverbial at the front when going active');
  });

  await t.section('paraphraser — it agrees with the checker', function () {
    /* The app flags passive voice, expletive openings and wordiness. A
       paraphrase that increased any of them would have the two engines
       contradicting each other. */
    var messy = 'The report was written by the marketing team. There are several issues that ' +
      'were raised by the reviewers. It is important to note that the budget was approved by ' +
      'the board. In order to make a decision about the timeline, a review was conducted by ' +
      'the steering group.';

    function complaints(text) {
      var r = FW.analyzer.analyze(text, { checks: {}, language: 'en-US' });
      var out = { passive: 0, expletive: 0, wordy: 0 };
      r.issues.forEach(function (i) {
        if (/passive/.test(i.rule)) out.passive++;
        else if (/expletive/.test(i.rule)) out.expletive++;
        else if (/wordy/.test(i.rule)) out.wordy++;
      });
      return out;
    }

    var before = complaints(messy);
    t.atLeast(before.passive, 3, 'the sample really is full of passive voice');

    FW.paraphrase.MODES.forEach(function (mode) {
      var after = complaints(FW.paraphrase.paraphrase(messy, mode.id, 'fixed').text);
      t.atMost(after.passive, before.passive, mode.label + ': does not add passive voice');
      t.atMost(after.expletive, before.expletive, mode.label + ': does not add expletive openings');
      t.atMost(after.wordy, before.wordy, mode.label + ': does not add wordiness');
    });

    /* The modes built for tightening must actively reduce it. */
    ['standard', 'simple', 'shorten'].forEach(function (mode) {
      var after = complaints(FW.paraphrase.paraphrase(messy, mode, 'fixed').text);
      t.equal(after.passive, 0, mode + ': clears the passive voice entirely');
      t.equal(after.expletive, 0, mode + ': clears the expletive openings');
    });
  });

  await t.section('paraphraser — it does not break the sentence', function () {
    function rewriteAll(src) {
      return FW.paraphrase.MODES.map(function (m) {
        return { mode: m.label, text: FW.paraphrase.paraphrase(src, m.id, 'fixed').text };
      });
    }

    /* Facts a client would notice going missing. */
    rewriteAll('The team cut costs by 42% in Q3, saving Meridian Energy £1.2 million.').forEach(function (r) {
      ['42%', 'Q3', 'Meridian', '1.2'].forEach(function (token) {
        t.includes(r.text, token, r.mode + ': keeps "' + token + '"');
      });
    });

    /* Grammatical breakage the earlier version produced. */
    rewriteAll('Solar panels have become cheaper, and Texas has high summer demand.').forEach(function (r) {
      t.includes(r.text, 'have become', r.mode + ': does not substitute into a perfect construction');
      t.includes(r.text, 'Texas', r.mode + ': does not lower-case a proper noun');
    });

    rewriteAll('This study examines whether slow-wave activity mediates the effect.').forEach(function (r) {
      t.includes(r.text, 'slow-wave', r.mode + ': does not substitute inside a hyphenated compound');
    });

    rewriteAll('Homeowners need to consider the installed cost before they commit.').forEach(function (r) {
      t.notMatch(r.text, /\b(for|on|with|at|of)\s+to\b/, r.mode + ': does not break a verb + infinitive');
    });

    rewriteAll('The engineering team has spare capacity from the start of July.').forEach(function (r) {
      t.includes(r.text, 'start of July', r.mode + ': does not put a verb synonym in a noun slot');
    });

    var messy = 'In order to make a decision about the pricing, the team utilises a very large ' +
      'amount of data due to the fact that customers are quite sensitive.';
    rewriteAll(messy).forEach(function (r) {
      t.notMatch(r.text, /\b(\w+)\s+\1\b/i, r.mode + ': leaves no doubled words');
      t.notMatch(r.text, /\s{2,}|\s+[,.]/, r.mode + ': leaves no stray whitespace');
      t.match(r.text, /^[A-Z]/, r.mode + ': still starts with a capital');
      t.match(r.text, /[.!?]$/, r.mode + ': still ends with terminal punctuation');
    });

    /* A serial list is not two clauses. */
    var list = 'To work out the cost you need the installed price, the local electricity rate, ' +
      'and the amount of sunlight the roof receives each year in full.';
    t.notMatch(FW.paraphrase.paraphrase(list, 'simple', 'fixed').text, /rate\.\s/,
      'does not split a serial list into a fragment');

    /* Same seed, same answer. */
    var a = FW.paraphrase.paraphrase(messy, 'standard', 'seed').text;
    var b = FW.paraphrase.paraphrase(messy, 'standard', 'seed').text;
    t.equal(a, b, 'the same seed produces the same rewrite');

    var diff = FW.paraphrase.diff('the quick brown fox', 'the slow brown fox jumps');
    t.ok(diff.some(function (d) { return d.type === 'del' && d.text === 'quick'; }), 'diff marks deletions');
    t.ok(diff.some(function (d) { return d.type === 'ins' && d.text === 'slow'; }), 'diff marks insertions');
  });

  await t.section('originality', function () {
    var source = 'The payback period for a residential solar installation in Texas typically falls ' +
      'between seven and eleven years, according to the National Renewable Energy Laboratory.';
    var draft = 'Solar is popular. The payback period for a residential solar installation in Texas ' +
      'typically falls between seven and eleven years, which surprises people. At the end of the day, ' +
      'local rates matter most of all here.';

    var r = FW.originality.check(draft, { sources: [{ label: 'NREL', text: source }] });
    t.atLeast(r.sources[0].similarity, 20, 'detects a near-verbatim lift');
    t.atLeast(r.sources[0].longest, 10, 'reports the longest matching run');
    t.equal(r.risk.level, 'high', 'rates a heavy lift as high risk');
    t.ok(r.sources[0].spans.every(function (s) { return draft.slice(s.start, s.end) === s.text; }),
      'every matched span points at the right text');
    t.atLeast(r.stock.length, 1, 'flags stock phrasing');
    t.atLeast(r.distinctive.length, 1, 'suggests sentences to verify');
    t.match(r.distinctive[0].links[0].url, /^https:\/\/www\.google\.com\/search\?q=%22/,
      'builds an exact-phrase search link');

    var original = FW.originality.check(
      'Every word of this passage was composed independently and shares nothing with the source ' +
      'material provided alongside it for comparison purposes today.',
      { sources: [{ label: 'NREL', text: source }] });
    t.atMost(original.worstSimilarity, 10, 'unrelated text scores low similarity');
    t.equal(original.risk.level, 'clear', 'unrelated text is rated clear');
  });

  await t.section('citations', function () {
    var article = {
      type: 'article', authors: 'Kahneman, Daniel; Tversky, Amos',
      title: 'Prospect theory', journal: 'Econometrica',
      volume: '47', issue: '2', pages: '263-291', year: '1979', doi: '10.2307/1914185'
    };

    t.equal(FW.citations.STYLES.length, 7, 'seven citation styles are offered');
    t.atLeast(FW.citations.TYPES.length, 10, 'at least ten source types are offered');

    FW.citations.STYLES.forEach(function (style) {
      var out = FW.citations.format(article, style.id);
      t.includes(out, 'Kahneman', style.label + ': names the first author');
      t.includes(out, '1979', style.label + ': carries the year');
      t.notMatch(out, /undefined|\[object/, style.label + ': no undefined values leak through');
      t.notMatch(out, /\s{2,}/, style.label + ': no doubled spaces');
    });

    t.includes(FW.citations.format(article, 'apa'), 'Kahneman, D., & Tversky, A.', 'APA uses an ampersand');
    t.includes(FW.citations.format(article, 'harvard'), 'Kahneman, D. and Tversky, A.', 'Harvard uses "and"');
    t.includes(FW.citations.format(article, 'chicago-nb'), 'Kahneman, Daniel, and Amos Tversky',
      'Chicago inverts only the first author and keeps the serial comma');
    t.includes(FW.citations.format(article, 'ieee'), 'D. Kahneman and A. Tversky',
      'IEEE drops the comma for two authors');

    t.equal(FW.citations.inText(article, 'apa', '265'), '(Kahneman & Tversky, 1979, p. 265)', 'APA in-text form');
    t.equal(FW.citations.inText(article, 'mla', '265'), '(Kahneman and Tversky 265)', 'MLA in-text form');

    var sniffed = FW.citations.sniff('https://www.nytimes.com/2024/05/02/business/solar-payback.html');
    t.equal(sniffed.year, '2024', 'reads the year out of a URL');
    t.includes(sniffed.title, 'Solar Payback', 'reads a title out of a URL slug');

    var bib = FW.citations.bibliography([article, Object.assign({}, article, { authors: 'Adams, Ada' })], 'apa');
    t.match(bib[0], /^Adams/, 'the reference list sorts by author');
  });

  await t.section('generated artwork', function () {
    FW.imagegen.PATTERNS.forEach(function (p) {
      var out = FW.imagegen.generate({ title: 'A Headline', pattern: p.id, palette: 'midnight', layout: 'hero' });
      t.match(out.svg, /^<svg[^>]+><.*<\/svg>$/s, p.label + ': produces a well-formed SVG');
    });
    FW.imagegen.LAYOUTS.forEach(function (l) {
      var out = FW.imagegen.generate({ title: 'A Headline', subtitle: 'Sub', stat: '71%', layout: l.id });
      t.includes(out.svg, '</svg>', l.label + ': produces a complete SVG');
    });

    var escaped = FW.imagegen.generate({ title: 'Tom & Jerry <script>alert(1)</script>', layout: 'hero' });
    t.notMatch(escaped.svg, /<script>/, 'markup in the title is escaped, not embedded');
    t.includes(escaped.svg, '&amp;', 'ampersands are escaped');

    var a = FW.imagegen.generate({ title: 'X', pattern: 'mesh', seed: 'fixed' });
    var b = FW.imagegen.generate({ title: 'X', pattern: 'mesh', seed: 'fixed' });
    t.equal(a.svg, b.svg, 'the same seed produces the same artwork');

    t.includes(FW.imagegen.attribution({ title: 'Roof', author: 'J. Doe', source: 'Unsplash', licence: 'CC BY' }, 'markdown'),
      'J. Doe', 'builds an attribution line');
    t.equal(FW.imagegen.searchLinks('roof').length, 10, 'offers ten royalty-free libraries');
  });

  await t.section('utilities', function () {
    var U = FW.util;
    t.equal(U.splitSentences('Dr. Smith went to Washington. He left at 3.5 mph.').length, 2,
      'sentence splitting survives abbreviations and decimals');
    t.equal(U.wordCount("it's a well-known fact"), 4, 'hyphens and apostrophes count as one word');
    t.equal(U.slugify('Do Solar Panels Pay?!'), 'do-solar-panels-pay', 'slugify strips punctuation');
    t.equal(U.titleCase('the cost of a thing'), 'The Cost of a Thing', 'title case keeps small words lowercase');

    var rndA = U.seeded('x'), rndB = U.seeded('x');
    t.equal(rndA(), rndB(), 'the seeded RNG is reproducible');

    /* debounce.flush is what stops work being lost when a tab closes. */
    var calls = 0;
    var d = U.debounce(function () { calls++; }, 10000);
    d(); d(); d();
    t.equal(calls, 0, 'a debounced call does not fire immediately');
    d.flush();
    t.equal(calls, 1, 'flush runs the pending call exactly once');
    d.flush();
    t.equal(calls, 1, 'flushing twice does not double-fire');
  });

  return t.summary();
}

module.exports = { run: run, name: 'engines' };

if (require.main === module) {
  run().then(function (s) { process.exit(s.failed ? 1 : 0); });
}
