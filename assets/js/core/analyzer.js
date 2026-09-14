/* The checker. Plain-text in, offset-anchored issues out. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, L = FW.lex;

  /* Words that follow "a" despite a vowel spelling, and vice versa. */
  var A_BEFORE_VOWEL = /^(one|once|unique|uniform|unit|united|universal|university|user|usual|useful|use|used|using|european|ubiquitous|utility|utopian|eulogy|euro|ewe)/i;
  var AN_BEFORE_CONSONANT = /^(hour|honest|honor|honour|heir|honest|herb|x-ray|f|h|l|m|n|r|s|x|mba|mri|nda|seo|sec|fbi|hr|llc|rn|sos|nhs)\b/i;

  /* Past participles that routinely act as adjectives after "be". */
  var ADJECTIVAL = ['interested', 'tired', 'excited', 'involved', 'concerned', 'committed',
    'supposed', 'aged', 'advanced', 'limited', 'complicated', 'detailed', 'dedicated',
    'experienced', 'qualified', 'talented', 'gifted', 'pleased', 'satisfied', 'worried',
    'surprised', 'confused', 'related', 'connected', 'married', 'closed', 'open', 'crowded',
    'determined', 'prepared', 'skilled', 'suited', 'inclined', 'accustomed', 'delighted'];

  var INCLUSIVE = [
    ['\\bguys\\b', 'everyone / the team', 'Gendered when addressing a mixed group.'],
    ['\\bmanpower\\b', 'workforce / staffing', ''],
    ['\\bman-hours?\\b', 'person-hours / work hours', ''],
    ['\\bchairman\\b', 'chair / chairperson', ''],
    ['\\bspokesman\\b', 'spokesperson', ''],
    ['\\bmanned\\b', 'crewed / staffed', ''],
    ['\\bmankind\\b', 'humanity / people', ''],
    ['\\bblacklist\\b', 'blocklist / denylist', ''],
    ['\\bwhitelist\\b', 'allowlist', ''],
    ['\\bmaster\\/slave\\b|\\bmaster and slave\\b', 'primary/replica', ''],
    ['\\bgrandfathered\\b', 'legacy / exempt', ''],
    ['\\bhandicapped\\b', 'disabled / people with disabilities', ''],
    ['\\bthe disabled\\b', 'disabled people', 'Avoid the noun form.'],
    ['\\bthe elderly\\b', 'older people', ''],
    ['\\bcommit(?:ted)? suicide\\b', 'died by suicide', 'Preferred by reporting guidelines.'],
    ['\\bsuffers from\\b', 'lives with / has', ''],
    ['\\bcrazy\\b|\\binsane\\b', 'remarkable / extreme', 'Casual use of clinical terms.'],
    ['\\blame\\b', 'weak / unconvincing', ''],
    ['\\bnormal people\\b', 'people without X / most people', ''],
    ['\\bsanity check\\b', 'quick check / confidence check', ''],
    ['\\bgypped\\b|\\bjipped\\b', 'cheated', 'Slur origin.'],
    ['\\btone[- ]deaf\\b', 'insensitive', '']
  ];

  var COMMON_TYPOS = {
    teh: 'the', adn: 'and', taht: 'that', thier: 'their', recieve: 'receive', recieved: 'received',
    seperate: 'separate', definately: 'definitely', occured: 'occurred', occuring: 'occurring',
    untill: 'until', wich: 'which', becuase: 'because', beleive: 'believe', acheive: 'achieve',
    arguement: 'argument', existance: 'existence', goverment: 'government', independant: 'independent',
    neccessary: 'necessary', noticable: 'noticeable', occassion: 'occasion', persistant: 'persistent',
    priviledge: 'privilege', publically: 'publicly', reccomend: 'recommend', refered: 'referred',
    rythm: 'rhythm', succesful: 'successful', tommorow: 'tomorrow', truely: 'truly', wierd: 'weird',
    accomodate: 'accommodate', embarass: 'embarrass', harrass: 'harass', maintenence: 'maintenance',
    millenium: 'millennium', perseverence: 'perseverance', questionaire: 'questionnaire',
    supercede: 'supersede', threshhold: 'threshold', writting: 'writing', alot: 'a lot',
    irregardless: 'regardless', anyways: 'anyway', dont: "don't", cant: "can't", wont: "won't",
    isnt: "isn't", arent: "aren't", didnt: "didn't", doesnt: "doesn't", wasnt: "wasn't",
    werent: "weren't", couldnt: "couldn't", shouldnt: "shouldn't", wouldnt: "wouldn't",
    havent: "haven't", hasnt: "hasn't", hadnt: "hadn't", im: "I'm", ive: "I've", id: "I'd",
    youre: "you're", theyre: "they're", thats: "that's", lets: "let's", oclock: "o'clock"
  };

  var EXPLETIVE = /(^|[.!?]\s+|\n)\s*(There\s+(?:is|are|was|were)|It\s+(?:is|was)\s+(?:important|clear|necessary|possible|evident|worth))\b/g;

  function makeScanner(text, extraRanges) {
    /* Regions we never flag inside: URLs, emails, code-ish runs, and anything
       the caller marks as not-prose (a reference list is a bibliography, not
       writing — its repeated author names are the format working correctly). */
    var protectedRanges = [];
    (extraRanges || []).forEach(function (r) {
      if (r && r.end > r.start) protectedRanges.push([r.start, r.end]);
    });
    [/https?:\/\/[^\s<>"')]+/g, /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, /`[^`\n]+`/g, /\b\d+\.\d+\b/g]
      .forEach(function (re) {
        var m, rx = new RegExp(re.source, 'g');
        while ((m = rx.exec(text)) !== null) protectedRanges.push([m.index, m.index + m[0].length]);
      });

    function isProtected(start, end) {
      for (var i = 0; i < protectedRanges.length; i++) {
        if (start < protectedRanges[i][1] && end > protectedRanges[i][0]) return true;
      }
      return false;
    }
    return { isProtected: isProtected };
  }

  function analyze(text, opts) {
    text = String(text || '');
    opts = opts || {};
    var checks = opts.checks || {};
    var lang = FW.resources.language(opts.language || 'en-US');
    var guide = opts.styleGuide || 'chicago';
    var persona = opts.personaId ? FW.personas.get(opts.personaId) : null;
    var scanner = makeScanner(text, opts.skipRanges);

    var issues = [];
    var seen = {};

    function add(issue) {
      if (issue.start == null || issue.end == null || issue.end <= issue.start) return;
      if (scanner.isProtected(issue.start, issue.end)) return;
      var key = issue.rule + ':' + issue.start + ':' + issue.end;
      if (seen[key]) return;
      seen[key] = true;
      issue.id = 'iss-' + issues.length;
      issue.excerpt = text.slice(issue.start, issue.end);
      issues.push(issue);
    }

    function scan(re, fn) {
      var rx = new RegExp(re.source, re.flags.indexOf('g') === -1 ? re.flags + 'g' : re.flags);
      var m;
      while ((m = rx.exec(text)) !== null) {
        fn(m);
        if (m.index === rx.lastIndex) rx.lastIndex++;
      }
    }

    /* Rule helper: simple regex → issue with an optional replacement. */
    function rule(id, category, severity, re, message, replacer, groupIndex) {
      scan(re, function (m) {
        var gi = groupIndex || 0;
        var offset = gi ? m[0].indexOf(m[gi]) : 0;
        var start = m.index + (offset < 0 ? 0 : offset);
        var matched = gi ? m[gi] : m[0];
        add({
          rule: id, type: category, severity: severity,
          start: start, end: start + matched.length,
          message: typeof message === 'function' ? message(m) : message,
          fix: typeof replacer === 'function' ? replacer(m) : (replacer === undefined ? null : replacer)
        });
      });
    }

    /* The editor knows which spans are headings; flat text does not. */
    var headingRanges = opts.headingRanges || [];
    function inHeading(start, end) {
      for (var i = 0; i < headingRanges.length; i++) {
        if (start >= headingRanges[i].start && (end == null ? start : end) <= headingRanges[i].end) return true;
      }
      return false;
    }
    var sentenceCuts = [];
    headingRanges.forEach(function (r) { sentenceCuts.push(r.start, r.end); });

    var sentences = indexSentences(text, sentenceCuts);
    var paragraphs = indexParagraphs(text);

    /* ================= SPELLING ================= */
    if (checks.spelling !== false) {
      Object.keys(COMMON_TYPOS).forEach(function (bad) {
        rule('typo-' + bad, 'spelling', 'error',
          new RegExp('\\b' + bad + '\\b', 'gi'),
          'Likely misspelling — did you mean “' + COMMON_TYPOS[bad] + '”?',
          function (m) { return matchCase(m[0], COMMON_TYPOS[bad]); });
      });
      /* Locale spelling variants */
      Object.keys(lang.spelling || {}).forEach(function (from) {
        var to = lang.spelling[from];
        rule('locale-' + from, 'spelling', 'suggestion',
          new RegExp('\\b' + from + '\\b', 'gi'),
          lang.label + ' spelling prefers “' + to + '”.',
          function (m) { return matchCase(m[0], to); });
      });
    }

    /* ================= GRAMMAR ================= */
    if (checks.grammar !== false) {
      rule('a-an-vowel', 'grammar', 'error', /\ba\s+([aeiou]\w*)/gi,
        function (m) { return 'Use “an” before a vowel sound: an ' + m[1] + '.'; },
        function (m) { return 'an ' + m[1]; });
      /* Drop the false positives: "a one", "a user", and any article sitting in front of
         a word we have already flagged as a misspelling. */
      issues = issues.filter(function (i) {
        if (i.rule !== 'a-an-vowel') return true;
        var next = i.excerpt.replace(/^a\s+/i, '');
        return !A_BEFORE_VOWEL.test(next) && !COMMON_TYPOS[next.toLowerCase()];
      });

      rule('an-consonant', 'grammar', 'error', /\ban\s+([b-df-hj-np-tv-z]\w*)/gi,
        function (m) { return 'Use “a” before a consonant sound: a ' + m[1] + '.'; },
        function (m) { return 'a ' + m[1]; });
      issues = issues.filter(function (i) {
        return i.rule !== 'an-consonant' || !AN_BEFORE_CONSONANT.test(i.excerpt.replace(/^an\s+/i, ''));
      });

      rule('doubled-word', 'grammar', 'error', /\b(\w{2,})\s+\1\b/gi,
        function (m) { return 'The word “' + m[1] + '” is repeated.'; },
        function (m) { return m[1]; });

      rule('could-of', 'grammar', 'error', /\b(could|should|would|must|might)\s+of\b/gi,
        'Should be “have”, not “of”.', function (m) { return m[1] + ' have'; });

      rule('its-possessive', 'grammar', 'error', /\bit'?s\s+(own|way|place|purpose)\b/gi,
        'Possessive is “its” with no apostrophe.', function (m) { return 'its ' + m[1]; });
      rule('its-contraction', 'grammar', 'error', /\bits\s+(been|going|going to|a\b|the\b|not\b|clear\b|time\b)/gi,
        'This looks like “it is / it has” — use “it’s”.',
        function (m) { return matchCase(m[0], "it's " + m[1]); });

      rule('youre', 'grammar', 'error', /\byour\s+(welcome|right|wrong|going|doing|not|probably|already|invited)\b/gi,
        'Should be “you’re” (you are).', function (m) { return matchCase(m[0], "you're " + m[1]); });
      rule('your-poss', 'grammar', 'error', /\byou'?re\s+(name|book|business|site|website|team|company|order|account|draft|client)\b/gi,
        'Possessive — use “your”.', function (m) { return 'your ' + m[1]; });

      rule('their-there', 'grammar', 'error', /\btheir\s+(is|are|was|were)\b/gi,
        'Should be “there”.', function (m) { return matchCase(m[0], 'there ' + m[1]); });
      rule('there-their', 'grammar', 'error', /\bthere\s+(own|names?|ideas?|homes?|teams?|clients?|opinions?)\b/gi,
        'Possessive — use “their”.', function (m) { return matchCase(m[0], 'their ' + m[1]); });
      rule('theyre', 'grammar', 'error', /\bthere\s+(going|coming|looking|trying|working)\b/gi,
        'Should be “they’re”.', function (m) { return matchCase(m[0], "they're " + m[1]); });

      rule('then-than', 'grammar', 'error',
        /\b(more|less|better|worse|rather|other|greater|fewer|larger|smaller|higher|lower|faster|slower|earlier|later|cheaper)\s+then\b/gi,
        'Comparison takes “than”.', function (m) { return m[1] + ' than'; });

      rule('there-is-plural', 'grammar', 'error',
        /\bthere\s+is\s+(many|several|numerous|two|three|four|five|multiple|lots of|a number of)\b/gi,
        'Plural subject — use “there are”.', function (m) { return 'there are ' + m[1]; });

      rule('subject-verb-dont', 'grammar', 'error', /\b(he|she|it|this|that)\s+don'?t\b/gi,
        'Third person singular takes “doesn’t”.', function (m) { return m[1] + " doesn't"; });
      rule('subject-verb-have', 'grammar', 'error', /\b(he|she|it)\s+have\b/gi,
        'Third person singular takes “has”.', function (m) { return m[1] + ' has'; });
      rule('subject-verb-were', 'grammar', 'error', /\b(he|she|it|I)\s+were\b/g,
        'Singular subject takes “was” (unless this is the subjunctive: “if I were”).',
        function (m) { return m[1] + ' was'; });

      rule('lowercase-i', 'grammar', 'error', /(^|[^\w'’])i([^\w'’]|$)/g,
        'The pronoun “I” is capitalised.', null);
      issues = issues.filter(function (x) {
        if (x.rule !== 'lowercase-i') return true;
        return /(^|\s)i(\s|$)/.test(x.excerpt);
      });

      rule('where-were', 'grammar', 'error',
        /\b(they|we|you|there|results|things|numbers|people|figures|sales|costs)\s+where\b/gi,
        'Should be “were” (past tense of “be”), not “where”.',
        function (m) { return m[1] + ' were'; });

      rule('between-you-and-i', 'grammar', 'error', /\bbetween you and I\b/gi,
        'Object of a preposition — “between you and me”.', 'between you and me');
      rule('double-negative', 'grammar', 'error', /\b(don'?t|doesn'?t|didn'?t|can'?t|won'?t|couldn'?t|haven'?t)\s+(\w+\s+)?(no|nothing|nobody|never|nowhere)\b/gi,
        'Double negative — this reverses your meaning.', null);
      rule('amount-count', 'grammar', 'warning', /\bamount of\s+(\w+s)\b/gi,
        'Countable nouns take “number of”.', function (m) { return 'number of ' + m[1]; });
      rule('fewer-less', 'grammar', 'warning',
        /\bless\s+(people|words|items|readers|clients|sources|options|steps|pages|hours|days|dollars|sentences|articles)\b/gi,
        'Countable noun — use “fewer”.', function (m) { return 'fewer ' + m[1]; });
      rule('based-off', 'grammar', 'warning', /\bbased off(?: of)?\b/gi,
        'Standard form is “based on”.', 'based on');
      rule('different-than', 'grammar', 'suggestion', /\bdifferent than\b/gi,
        'Most style guides prefer “different from”.', 'different from');
      rule('comprised-of', 'grammar', 'warning', /\bcomprised of\b/gi,
        'The whole comprises the parts — use “composed of” or “comprises”.', 'composed of');
      rule('try-and', 'grammar', 'suggestion', /\btry and\b/gi,
        'In formal prose, “try to”.', 'try to');
      rule('reason-is-because', 'grammar', 'warning', /\bthe reason (?:is|was) because\b/gi,
        'Redundant — “the reason is that”.', 'the reason is that');
      rule('sentence-lowercase', 'grammar', 'warning', /[.!?]\s+([a-z])/g,
        'Sentence starts with a lowercase letter.',
        function (m) { return m[0].replace(m[1], m[1].toUpperCase()); });

      /* Possible comma splice: comma followed by a pronoun and a finite verb.
         A sentence that opens with a subordinating conjunction has a dependent
         first clause, so its comma is correct: "If you write your own
         questionnaires, this is the natural home" is not a splice. */
      var SUBORDINATOR = /^\s*(?:if|when|whenever|while|although|though|because|since|unless|until|after|before|once|whereas|as|provided|assuming|given|where|wherever)\b/i;
      sentences.forEach(function (s) {
        var re = /,\s+(he|she|it|they|we|you|i|this|that|these|those)\s+(is|are|was|were|has|have|had|will|would|can|could|should|did|does|do|makes|made|took|takes|gets|got|needs|need|means|means)\b/gi;
        var m;
        while ((m = re.exec(s.text)) !== null) {
          /* Only the comma that closes the leading dependent clause is exempt;
             a second comma later in the same sentence can still be a splice. */
          if (SUBORDINATOR.test(s.text) && s.text.slice(0, m.index).indexOf(',') === -1) continue;
          add({
            rule: 'comma-splice', type: 'grammar', severity: 'warning',
            start: s.start + m.index, end: s.start + m.index + m[0].length,
            message: 'Possible comma splice — two independent clauses joined by a comma. Use a full stop, a semicolon, or add a conjunction.',
            fix: m[0].replace(/^,/, ';')
          });
        }
      });
    }

    /* ================= PUNCTUATION ================= */
    if (checks.punctuation !== false) {
      rule('missing-space', 'punctuation', 'error', /[,;:!?](?=[A-Za-z])/g,
        'Add a space after the punctuation mark.', function (m) { return m[0] + ' '; });
      rule('missing-space-period', 'punctuation', 'error', /\.(?=[A-Z][a-z])/g,
        'Add a space after the full stop.', '. ');
      rule('space-before-punct', 'punctuation', 'error', /\s+([,.;:!?])/g,
        'Remove the space before the punctuation mark.', function (m) { return m[1]; });
      rule('double-punct', 'punctuation', 'error', /([,;:])\1+|\.{2}(?!\.)|[.]{4,}/g,
        'Duplicated punctuation.', function (m) { return m[0][0]; });
      rule('mixed-terminal', 'punctuation', 'error', /[?!]\./g,
        'Two terminal marks — keep one.', function (m) { return m[0][0]; });
      rule('multi-space', 'punctuation', 'suggestion', /(?<=\S)  +(?=\S)/g,
        'Multiple spaces between words.', ' ');
      rule('multi-bang', 'punctuation', 'suggestion', /[!?]{2,}/g,
        'Repeated exclamation or question marks read as shouting in professional copy.',
        function (m) { return m[0][0]; });
      rule('double-hyphen', 'punctuation', 'suggestion', /(?<=\w)--(?=\w)|\s--\s/g,
        'Use an em dash (—) rather than a double hyphen.', '—');
      rule('hyphen-as-dash', 'punctuation', 'suggestion', /(?<=\w)\s-\s(?=\w)/g,
        'A hyphen is doing a dash’s job — use an em dash (—) or en dash (–).', '—');
      rule('decade-apostrophe', 'punctuation', 'error', /\b(1[89]\d0|20[0-9]0)'s\b/g,
        'Decades take no apostrophe.', function (m) { return m[1] + 's'; });
      rule('straight-quote', 'punctuation', 'suggestion', /(?<=\w)'(?=\w)/g,
        'Use a typographic apostrophe (’) in published copy.', '’');
      rule('comma-that', 'punctuation', 'warning', /,\s+that\b/g,
        'A restrictive “that” clause normally takes no comma.', ' that');
      rule('oxford', 'punctuation', 'suggestion',
        /\w+,\s+\w+(?:\s+\w+)?\s+(and|or)\s+\w+/g,
        function () {
          return guide === 'ap'
            ? 'AP style drops the serial comma in a simple series — check this list.'
            : 'Serial (Oxford) comma: ' + (guide === 'apa' || guide === 'chicago' ? 'required by this style guide.' : 'keep it consistent across the piece.');
        }, null);

      /* Introductory adverbial without a comma */
      rule('intro-comma', 'punctuation', 'suggestion',
        /(^|[.!?]\s+|\n)(However|Therefore|Moreover|Furthermore|Meanwhile|Nevertheless|Consequently|Instead|Ultimately|Finally|Similarly|Accordingly|Otherwise|In addition|For example|For instance|In fact|Of course|In short|As a result)\s+(?![,\w]*,)/g,
        function (m) { return 'Introductory “' + m[2] + '” usually takes a comma.'; },
        function (m) { return m[1] + m[2] + ', '; });

      /* Question phrased as a statement */
      sentences.forEach(function (s) {
        if (/^(who|what|when|where|why|how|is|are|do|does|did|can|could|should|would|will|have|has)\b/i.test(s.text)
          && /\.$/.test(s.text.trim()) && s.words > 3 && !/^how to\b/i.test(s.text)
          && !inHeading(s.start, s.end)) {
          add({
            rule: 'missing-question-mark', type: 'punctuation', severity: 'warning',
            start: s.start + s.text.trim().length - 1, end: s.start + s.text.trim().length,
            message: 'This reads as a question but ends with a full stop.', fix: '?'
          });
        }
      });

      /* Unbalanced pairs, per paragraph */
      paragraphs.forEach(function (p) {
        [['(', ')'], ['[', ']'], ['{', '}'], ['“', '”']].forEach(function (pair) {
          var opens = (p.text.split(pair[0]).length - 1);
          var closes = (p.text.split(pair[1]).length - 1);
          if (opens !== closes) {
            add({
              rule: 'unbalanced', type: 'punctuation', severity: 'warning',
              start: p.start, end: p.start + Math.min(60, p.text.length),
              message: 'Unbalanced ' + pair[0] + pair[1] + ' in this paragraph (' + opens + ' open, ' + closes + ' closed).',
              fix: null
            });
          }
        });
        var dq = (p.text.match(/"/g) || []).length;
        if (dq % 2 === 1) {
          add({
            rule: 'unbalanced-quote', type: 'punctuation', severity: 'warning',
            start: p.start, end: p.start + Math.min(60, p.text.length),
            message: 'Odd number of straight quotation marks in this paragraph.', fix: null
          });
        }
        /* Missing terminal punctuation */
        var trimmed = p.text.replace(/\s+$/, '');
        if (trimmed.length > 40 && !/[.!?:"”’)\]]$/.test(trimmed) && !/^#{1,6}\s/.test(trimmed)
          && !inHeading(p.start, p.start + trimmed.length)) {
          add({
            rule: 'missing-terminal', type: 'punctuation', severity: 'warning',
            start: p.start + trimmed.length - 1, end: p.start + trimmed.length,
            message: 'Paragraph ends without terminal punctuation.', fix: trimmed.slice(-1) + '.'
          });
        }
      });

      /* Locale quote convention */
      if (lang.commaInQuotes === false) {
        rule('quote-punct-outside', 'punctuation', 'suggestion', /[,.](?=["”’'])/g,
          lang.label + ' places commas and full stops outside the quotation marks unless they belong to the quote.', null);
      }
    }

    /* ================= STRUCTURE ================= */
    if (checks.structure !== false) {
      /* Long sentences */
      sentences.forEach(function (s) {
        if (s.words > 40) {
          add({
            rule: 'sentence-very-long', type: 'structure', severity: 'warning',
            start: s.start, end: s.end,
            message: 'Very long sentence (' + s.words + ' words). Split it — readers lose the thread past about 30.',
            fix: null
          });
        } else if (s.words > 30) {
          add({
            rule: 'sentence-long', type: 'structure', severity: 'suggestion',
            start: s.start, end: s.end,
            message: 'Long sentence (' + s.words + ' words). Consider splitting for rhythm.',
            fix: null
          });
        }
      });

      /* Consecutive sentences opening with the same word. A subhead naming its
         subject and the paragraph beneath it doing the same is normal structure,
         not a repeated opener, so headings do not count as sentences here. */
      var prose = sentences.filter(function (s) { return !inHeading(s.start, s.end); });
      for (var i = 1; i < prose.length; i++) {
        var a = firstWord(prose[i - 1].text), b = firstWord(prose[i].text);
        if (a && a === b && a.length > 2) {
          add({
            rule: 'repeated-opener', type: 'structure', severity: 'warning',
            start: prose[i].start, end: prose[i].start + b.length,
            message: 'Two sentences in a row open with “' + b + '”. Vary the entry point.',
            fix: null
          });
        }
      }

      /* Sentence-opener overuse across the whole piece */
      var openerCounts = {};
      sentences.forEach(function (s) {
        var w = firstWord(s.text);
        if (w && w.length > 2) (openerCounts[w] = openerCounts[w] || []).push(s);
      });
      Object.keys(openerCounts).forEach(function (w) {
        var list = openerCounts[w];
        if (list.length >= 4 && sentences.length > 6) {
          add({
            rule: 'opener-overuse', type: 'structure', severity: 'suggestion',
            start: list[3].start, end: list[3].start + w.length,
            message: '“' + U.sentenceCase(w) + '” opens ' + list.length + ' sentences in this piece. Rework a few.',
            fix: null
          });
        }
      });

      /* Repeated content words in a window */
      /* The brief orders these words repeated to a density target. Flagging them
         as repetition sets the app against its own compliance panel. */
      var required = {};
      ((opts.analysis && opts.analysis.meta && opts.analysis.meta.keywords) || []).forEach(function (k) {
        String(k.term || '').toLowerCase().split(/[^a-z0-9'’-]+/).forEach(function (w) {
          if (w.length > 3) required[w] = true;
        });
      });
      repeatedWords(text, sentences, required).forEach(add);

      /* Repeated phrases (3-grams) */
      repeatedPhrases(text).forEach(add);

      /* Duplicate sentences */
      var sentMap = {};
      sentences.forEach(function (s) {
        var key = s.text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
        if (key.length < 25) return;
        if (sentMap[key]) {
          add({
            rule: 'duplicate-sentence', type: 'structure', severity: 'error',
            start: s.start, end: s.end,
            message: 'This sentence already appears earlier, almost word for word.', fix: null
          });
        } else sentMap[key] = s;
      });

      /* Long paragraphs */
      paragraphs.forEach(function (p) {
        if (p.words > 160) {
          add({
            rule: 'paragraph-long', type: 'structure', severity: 'warning',
            start: p.start, end: p.start + Math.min(80, p.text.length),
            message: 'Dense paragraph (' + p.words + ' words, ' + p.sentences + ' sentences). Break it up.',
            fix: null
          });
        } else if (p.sentences > 6) {
          add({
            rule: 'paragraph-many-sentences', type: 'structure', severity: 'suggestion',
            start: p.start, end: p.start + Math.min(60, p.text.length),
            message: p.sentences + ' sentences in one paragraph — consider a break.', fix: null
          });
        }
      });

      /* Passive voice */
      var beAlt = L.BE_FORMS.filter(function (b) { return /^[a-z]+$/.test(b); }).join('|');
      var partAlt = L.PARTICIPLES.join('|');
      rule('passive', 'structure', 'suggestion',
        new RegExp('\\b(' + beAlt + ')\\s+(?:\\w+ly\\s+)?(\\w+(?:ed|en)|' + partAlt + ')\\b(\\s+by\\b)?', 'gi'),
        function (m) {
          return 'Passive voice' + (m[3] ? ' with an explicit agent' : '') + ' — “' + m[0].trim() + '”. Name the actor and use an active verb where you can.';
        }, null);
      issues = issues.filter(function (x) {
        return x.rule !== 'passive' || ADJECTIVAL.indexOf(lastWord(x.excerpt).toLowerCase()) === -1;
      });

      /* Expletive openings */
      rule('expletive', 'structure', 'suggestion', EXPLETIVE,
        'Opening on “there is / it is” delays the subject. Lead with the actor.', null, 2);

      /* Adverb pile-up */
      sentences.forEach(function (s) {
        var adverbs = s.text.match(/\b\w{4,}ly\b/g) || [];
        if (adverbs.length >= 3) {
          add({
            rule: 'adverb-pileup', type: 'structure', severity: 'suggestion',
            start: s.start, end: s.end,
            message: adverbs.length + ' “-ly” adverbs in one sentence (' + adverbs.slice(0, 3).join(', ') + '). Choose stronger verbs instead.',
            fix: null
          });
        }
      });

      /* Transitions missing across a long stretch */
      var transitionWords = [];
      Object.keys(L.TRANSITIONS).forEach(function (k) { transitionWords = transitionWords.concat(L.TRANSITIONS[k]); });
      var transRe = new RegExp('\\b(' + transitionWords.map(escapeRe).join('|') + ')\\b', 'i');
      var runLength = 0;
      paragraphs.forEach(function (p, idx) {
        if (transRe.test(p.text)) runLength = 0; else runLength++;
        if (runLength === 4) {
          add({
            rule: 'no-transitions', type: 'structure', severity: 'suggestion',
            start: p.start, end: p.start + Math.min(50, p.text.length),
            message: 'Four paragraphs in a row with no transition word. The argument may be reading as a list.',
            fix: null
          });
          runLength = 0;
        }
      });
    }

    /* ================= STYLE ================= */
    if (checks.style !== false) {
      L.WORDY.forEach(function (pair, idx) {
        rule('wordy-' + idx, 'style', 'suggestion',
          new RegExp('\\b' + escapeRe(pair[0]) + '\\b', 'gi'),
          pair[1] ? 'Wordy — “' + pair[1] + '” says the same thing.' : 'Filler phrase — this can be cut entirely.',
          function (m) { return pair[1] ? matchCase(m[0], pair[1]) : ''; });
      });

      L.CLICHES.forEach(function (c, idx) {
        rule('cliche-' + idx, 'style', 'warning',
          new RegExp('\\b' + escapeRe(c) + '\\b', 'gi'),
          'Cliché — “' + c + '”. Replace it with something specific to this piece.', null);
      });

      /* Some fillers are only fillers on their own. "Rather than a demo set" is a
         comparison and "just in case" is a set phrase; deleting the word there
         breaks the sentence the suggestion offers to fix. */
      var FILLER_EXCEPTIONS = {
        rather: /\brather\s+than\b/i,
        just: /\bjust\s+in\s+case\b|\bjust\s+as\b/i,
        quite: /\bquite\s+(?:a|the)\b/i
      };
      L.FILLERS.forEach(function (f, idx) {
        var exception = FILLER_EXCEPTIONS[String(f).toLowerCase()];
        scan(new RegExp('\\b' + escapeRe(f) + '\\b', 'gi'), function (m) {
          if (exception && exception.test(text.slice(m.index, m.index + 24))) return;
          add({
            rule: 'filler-' + idx, type: 'style', severity: 'suggestion',
            start: m.index, end: m.index + m[0].length,
            message: 'Filler — “' + f + '” usually weakens the sentence. Cut it and see if anything is lost.',
            fix: ''
          });
        });
      });

      L.WEASEL.forEach(function (w, idx) {
        rule('weasel-' + idx, 'style', 'warning',
          new RegExp('\\b' + escapeRe(w) + '\\b', 'gi'),
          'Vague attribution — “' + w + '”. Name the source, the study or the number.', null);
      });

      L.HEDGES.forEach(function (h, idx) {
        rule('hedge-' + idx, 'style', 'suggestion',
          new RegExp('\\b' + escapeRe(h) + '\\b', 'gi'),
          'Hedge — “' + h + '”. Keep it only if the uncertainty is real.', null);
      });

      rule('nominalisation', 'style', 'suggestion',
        /\b(make|makes|made|making)\s+(?:a|an|the)\s+(decision|assessment|determination|contribution|recommendation|adjustment|announcement|improvement)\b/gi,
        function (m) { return 'Buried verb — try “' + nominalVerb(m[2]) + '”.'; },
        function (m) { return nominalVerb(m[2]); });

      rule('exclam-formal', 'style', 'suggestion', /!/g,
        'Exclamation marks read as unearned emphasis in most professional registers.', null);

      /* Persona-specific banned language */
      if (persona) {
        persona.banned.forEach(function (b, idx) {
          rule('persona-ban-' + idx, 'style', 'warning',
            new RegExp('\\b' + escapeRe(b) + '\\b', 'gi'),
            persona.name + ' house rule: avoid “' + b + '”.', null);
        });
      }

      /* Brief-mandated banned terms */
      var briefBanned = (opts.analysis && opts.analysis.meta && opts.analysis.meta.banned) || [];
      briefBanned.forEach(function (b, idx) {
        if (!b || b.length < 2) return;
        rule('brief-ban-' + idx, 'style', 'error',
          new RegExp('\\b' + escapeRe(b) + '\\b', 'gi'),
          'The brief rules this out: “' + b + '”.', null);
      });
    }

    /* ================= INCLUSIVE LANGUAGE ================= */
    if (checks.inclusive !== false) {
      INCLUSIVE.forEach(function (entry, idx) {
        rule('inclusive-' + idx, 'inclusive', 'suggestion',
          new RegExp(entry[0], 'gi'),
          'Consider “' + entry[1] + '”.' + (entry[2] ? ' ' + entry[2] : ''), null);
      });
    }

    issues.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    issues.forEach(function (x, i) { x.id = 'iss-' + i; });

    return {
      issues: issues,
      stats: readability(text, sentences, paragraphs, issues),
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      counts: countByType(issues)
    };
  }

  /* ---------- helpers ---------- */
  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function matchCase(source, replacement) {
    if (/^[A-Z][a-z]/.test(source)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    if (/^[A-Z]+$/.test(source) && source.length > 1) return replacement.toUpperCase();
    return replacement;
  }

  function firstWord(s) {
    var m = String(s).match(/[A-Za-z’']+/);
    return m ? m[0].toLowerCase() : '';
  }

  function lastWord(s) {
    var m = String(s).trim().match(/([A-Za-z’']+)\s*$/);
    return m ? m[1] : '';
  }

  function nominalVerb(noun) {
    var map = {
      decision: 'decide', assessment: 'assess', determination: 'determine', contribution: 'contribute',
      recommendation: 'recommend', adjustment: 'adjust', announcement: 'announce', improvement: 'improve'
    };
    return map[noun.toLowerCase()] || noun;
  }

  /* A heading carries no full stop, so without an explicit boundary the splitter
     runs it into the paragraph below and reports one long malformed sentence. */
  function indexSentences(text, boundaries) {
    var cuts = [0, text.length];
    (boundaries || []).forEach(function (b) { if (b > 0 && b < text.length) cuts.push(b); });
    cuts = U.unique(cuts.map(Number)).sort(function (a, b) { return a - b; });

    var out = [];
    for (var i = 0; i < cuts.length - 1; i++) {
      var from = cuts[i], to = cuts[i + 1];
      if (to <= from) continue;
      var segment = text.slice(from, to);
      var pos = 0;
      U.splitSentences(segment).forEach(function (sentence) {
        var idx = segment.indexOf(sentence, pos);
        if (idx === -1) idx = pos;
        out.push({
          text: sentence, start: from + idx, end: from + idx + sentence.length,
          words: U.wordCount(sentence)
        });
        pos = idx + sentence.length;
      });
    }
    return out;
  }

  function indexParagraphs(text) {
    var out = [], pos = 0;
    text.split(/\n/).forEach(function (p) {
      var idx = text.indexOf(p, pos);
      if (idx === -1) idx = pos;
      pos = idx + p.length;
      if (!p.trim()) return;
      out.push({
        text: p, start: idx, end: idx + p.length,
        words: U.wordCount(p), sentences: U.splitSentences(p).length
      });
    });
    return out;
  }

  var STOP = ('a an the and or but if then than that this these those of to in on at by for with from as is are was were be been being it its it\'s you your we our they their he she his her i me my not no so do does did have has had will would can could should may might must about into over under out up down more most other some such only own same very just also each');
  var STOPSET = {};
  STOP.split(' ').forEach(function (w) { STOPSET[w] = true; });

  function repeatedWords(text, sentences, exempt) {
    var out = [];
    var tokens = [];
    exempt = exempt || {};
    var re = /[A-Za-z][A-Za-z'’-]{3,}/g, m;
    while ((m = re.exec(text)) !== null) {
      var w = m[0].toLowerCase();
      if (STOPSET[w] || exempt[w]) continue;
      tokens.push({ word: w, start: m.index, end: m.index + m[0].length });
    }
    var byWord = {};
    tokens.forEach(function (t) { (byWord[t.word] = byWord[t.word] || []).push(t); });

    Object.keys(byWord).forEach(function (w) {
      var list = byWord[w];
      if (list.length < 3) return;
      /* three or more occurrences inside a 60-word window */
      for (var i = 2; i < list.length; i++) {
        var span = list[i].start - list[i - 2].start;
        if (span < 420) {
          out.push({
            rule: 'word-repetition', type: 'structure', severity: 'warning',
            start: list[i].start, end: list[i].end,
            message: '“' + w + '” appears ' + 3 + '+ times in close succession. Vary it or restructure.',
            fix: null
          });
          i += 2;
        }
      }
      /* whole-document overuse */
      var density = list.length / Math.max(1, U.wordCount(text));
      if (list.length >= 6 && density > 0.012) {
        out.push({
          rule: 'word-overuse', type: 'structure', severity: 'suggestion',
          start: list[list.length - 1].start, end: list[list.length - 1].end,
          message: '“' + w + '” appears ' + list.length + ' times (' + (density * 100).toFixed(1) + '% of the text).',
          fix: null
        });
      }
    });
    return out;
  }

  function repeatedPhrases(text) {
    var out = [];
    var words = [], re = /[A-Za-z][A-Za-z'’-]*/g, m;
    while ((m = re.exec(text)) !== null) words.push({ w: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
    var grams = {};
    for (var i = 0; i + 3 <= words.length; i++) {
      var slice = words.slice(i, i + 3);
      if (slice.every(function (x) { return STOPSET[x.w]; })) continue;
      var key = slice.map(function (x) { return x.w; }).join(' ');
      (grams[key] = grams[key] || []).push({ start: slice[0].start, end: slice[2].end });
    }
    Object.keys(grams).forEach(function (key) {
      var hits = grams[key];
      if (hits.length < 2) return;
      /* Report the second occurrence only — one flag per repeated phrase. */
      var h = hits[1];
      out.push({
        rule: 'phrase-repetition', type: 'structure', severity: 'warning',
        start: h.start, end: h.end,
        message: 'The phrase “' + key + '” is used ' + hits.length + ' times. Repetition like this reads as padding.',
        fix: null
      });
    });
    out.sort(function (a, b) { return a.start - b.start; });
    var deduped = [], lastEnd = -1;
    out.forEach(function (o) {
      if (o.start >= lastEnd) { deduped.push(o); lastEnd = o.end; }
    });
    return deduped.slice(0, 25);
  }

  function countByType(issues) {
    var c = { grammar: 0, punctuation: 0, structure: 0, style: 0, spelling: 0, inclusive: 0, total: issues.length, error: 0, warning: 0, suggestion: 0 };
    issues.forEach(function (i) {
      c[i.type] = (c[i.type] || 0) + 1;
      c[i.severity] = (c[i.severity] || 0) + 1;
    });
    return c;
  }

  function readability(text, sentences, paragraphs, issues) {
    var w = U.words(text);
    var wordTotal = w.length;
    var sentTotal = Math.max(1, sentences.length);
    var syllables = 0, complex = 0, longWords = 0, chars = 0;
    w.forEach(function (word) {
      var s = U.countSyllables(word);
      syllables += s;
      if (s >= 3) complex++;
      if (word.length > 6) longWords++;
      chars += word.length;
    });

    var asl = wordTotal / sentTotal;
    var asw = wordTotal ? syllables / wordTotal : 0;
    var flesch = wordTotal ? 206.835 - 1.015 * asl - 84.6 * asw : 0;
    var fk = wordTotal ? 0.39 * asl + 11.8 * asw - 15.59 : 0;
    var fog = wordTotal ? 0.4 * (asl + 100 * (complex / wordTotal)) : 0;
    var smog = sentTotal >= 3 ? 1.043 * Math.sqrt(complex * (30 / sentTotal)) + 3.1291 : fk;
    var ari = wordTotal ? 4.71 * (chars / wordTotal) + 0.5 * asl - 21.43 : 0;

    var lengths = sentences.map(function (s) { return s.words; }).filter(function (n) { return n > 0; });
    var mean = lengths.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, lengths.length);
    var variance = lengths.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / Math.max(1, lengths.length);
    var stdev = Math.sqrt(variance);

    var passive = issues.filter(function (i) { return i.rule === 'passive'; }).length;
    var adverbs = (text.match(/\b\w{4,}ly\b/g) || []).length;

    var grade = U.clamp(Math.round(((fk + fog + smog + ari) / 4) * 10) / 10, 0, 20);
    var band = L.GRADE_BANDS.find(function (b) { return grade <= b.max; }) || L.GRADE_BANDS[L.GRADE_BANDS.length - 1];

    return {
      words: wordTotal,
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      syllables: syllables,
      avgSentenceLength: Math.round(asl * 10) / 10,
      avgWordLength: wordTotal ? Math.round((chars / wordTotal) * 10) / 10 : 0,
      longWordPct: wordTotal ? Math.round((longWords / wordTotal) * 1000) / 10 : 0,
      flesch: Math.round(flesch * 10) / 10,
      fleschKincaid: Math.round(fk * 10) / 10,
      gunningFog: Math.round(fog * 10) / 10,
      smog: Math.round(smog * 10) / 10,
      ari: Math.round(ari * 10) / 10,
      grade: grade,
      gradeLabel: band.label,
      gradeNote: band.note,
      sentenceStdev: Math.round(stdev * 10) / 10,
      rhythm: stdev < 4 && lengths.length > 7 ? 'monotonous' : stdev > 12 ? 'highly varied' : 'varied',
      passiveCount: passive,
      passivePct: sentences.length ? Math.round((passive / sentences.length) * 1000) / 10 : 0,
      adverbCount: adverbs,
      adverbPct: wordTotal ? Math.round((adverbs / wordTotal) * 1000) / 10 : 0,
      readingMinutes: Math.max(1, Math.round(wordTotal / 238)),
      speakingMinutes: Math.max(1, Math.round(wordTotal / 150))
    };
  }

  /* ---------- keyword density ---------- */
  function keywordDensity(text, limit) {
    var w = U.words(text).filter(function (x) { return !STOPSET[x] && x.length > 2; });
    var counts = {};
    w.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
    return Object.keys(counts)
      .map(function (k) { return { term: k, count: counts[k], pct: Math.round((counts[k] / Math.max(1, w.length)) * 1000) / 10 }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, limit || 15);
  }

  function phraseCount(text, phrase) {
    if (!phrase) return 0;
    var re = new RegExp('\\b' + escapeRe(phrase).replace(/\s+/g, '\\s+') + '\\b', 'gi');
    return (text.match(re) || []).length;
  }

  FW.analyzer = {
    analyze: analyze, readability: readability, keywordDensity: keywordDensity,
    phraseCount: phraseCount, escapeRe: escapeRe, STOPSET: STOPSET,
    indexSentences: indexSentences, indexParagraphs: indexParagraphs
  };
})(window.FW);
