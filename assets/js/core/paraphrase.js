/* Rule-based paraphraser.
 *
 * The earlier version only substituted words from a small list, and gated even
 * that behind a coin flip — so on ordinary prose it usually handed back the
 * input unchanged. This version is built around syntactic transformations that
 * genuinely restructure a sentence while preserving its meaning: passive to
 * active, expletive removal, buried verbs, relative-clause reduction, clause
 * reordering, splitting and joining. Lexical substitution still runs, but it is
 * the last resort rather than the whole engine.
 *
 * Rules are applied deterministically: the seed decides *which* of several
 * equally good options is taken, never *whether* to act. When nothing applies,
 * that is reported rather than disguised. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, L = FW.lex;

  var MODES = [
    { id: 'standard', label: 'Standard', note: 'Restructures sentences and varies wording, keeping register and length.' },
    { id: 'formal', label: 'Formal', note: 'Raises the register, expands contractions, prefers precise verbs.' },
    { id: 'simple', label: 'Plain English', note: 'Shorter sentences, everyday words, active voice.' },
    { id: 'creative', label: 'Creative', note: 'Varies rhythm and sentence openings more freely.' },
    { id: 'shorten', label: 'Concise', note: 'Cuts filler and wordy constructions without losing content.' },
    { id: 'expand', label: 'Expand', note: 'Unpacks dense sentences into fuller, more explicit prose.' }
  ];

  var CONTRACTIONS = {
    "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'cannot',
    "won't": 'will not', "shouldn't": 'should not', "couldn't": 'could not', "wouldn't": 'would not',
    "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
    "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not', "it's": 'it is',
    "that's": 'that is', "there's": 'there is', "here's": 'here is', "what's": 'what is',
    "let's": 'let us', "they're": 'they are', "we're": 'we are', "you're": 'you are',
    "I'm": 'I am', "I've": 'I have', "we've": 'we have', "you've": 'you have',
    "they've": 'they have', "I'll": 'I will', "we'll": 'we will', "you'll": 'you will',
    "they'll": 'they will', "I'd": 'I would', "we'd": 'we would', "you'd": 'you would'
  };

  var CONTRACTIBLE = ['cannot', 'do not', 'does not', 'did not', 'is not', 'are not',
    'was not', 'were not', 'will not', 'it is', 'they are', 'we are', 'you are',
    'have not', 'has not', 'that is', 'there is'];

  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function matchCase(source, replacement) {
    if (/^[A-Z][a-z]/.test(source)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    if (/^[A-Z]+$/.test(source) && source.length > 2) return replacement.toUpperCase();
    return replacement;
  }

  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function upper(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Words that are capitalised only because they start a sentence. Anything not
     on this list is assumed to be a proper noun and keeps its capital: writing
     "texas" is a visible error, whereas leaving "Solar" capitalised mid-sentence
     is merely untidy, so the bias runs that way. */
  var SENTENCE_STARTERS = ('the a an this that these those it its it\'s they their them ' +
    'we our us you your he she his her him i my me one some many most all each every ' +
    'if when while because although though since after before unless whereas as ' +
    'there here what which who how why but and or so yet for nor ' +
    'is are was were be being been has have had do does did will would can could ' +
    'should may might must let no not now then also however therefore moreover ' +
    'in on at by with from about over under between through during against ' +
    'more less fewer other another such both either neither any few several ' +
    'people homeowners readers clients customers writers teams companies businesses ' +
    'prior recent current new old first second third last next final').split(' ');

  /* Common words that are safe to lower-case even when a sentence begins with
     them. Without this, restructuring leaves "Because Demand peaks…" — the
     lower-case evidence below covers most real drafts, but a single pasted
     sentence offers none. */
  var COMMON_WORDS = ('demand supply cost costs price prices value values work works ' +
    'research results result data study studies report reports team teams group ' +
    'company companies business market markets growth change changes risk risks ' +
    'time times year years month months week weeks day days rate rates number ' +
    'numbers level levels point points part parts case cases fact facts reason ' +
    'reasons problem problems issue issues question questions answer answers ' +
    'payback revenue profit margin margins budget budgets capacity demandside ' +
    'sales customers clients users readers writers editors drafts writing ' +
    'payment payments savings spending income output input quality speed ' +
    'design designs plan plans project projects process processes system systems ' +
    'service services product products feature features version versions ' +
    'evidence findings method methods approach approaches strategy analysis ' +
    'performance behaviour behavior activity training memory sleep duration ' +
    'engineers developers managers staff people person policy policies ' +
    'installation hardware software platform migration maintenance').split(' ');

  /* A number word is never a proper noun, so the "assume a proper noun" bias
     above has nothing to protect here. Left off the list, "Four of these
     locations are in Uganda, but..." came back as "Although Four of these
     locations are in Uganda, ..." with the capital still on. */
  var NUMBER_WORDS = ('one two three four five six seven eight nine ten eleven twelve ' +
    'thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty ' +
    'forty fifty sixty seventy eighty ninety hundred thousand million billion ' +
    'dozen half quarter third fourth fifth sixth seventh eighth ninth tenth ' +
    'once twice').split(' ');

  var STARTER_SET = {};
  SENTENCE_STARTERS.forEach(function (w) { STARTER_SET[w] = true; });
  COMMON_WORDS.forEach(function (w) { STARTER_SET[w] = true; });
  NUMBER_WORDS.forEach(function (w) { STARTER_SET[w] = true; });

  /* Words seen in lower case anywhere in the source are safe to lower-case:
     if "solar" appears mid-sentence somewhere, "Solar" is not a proper noun. */
  var lowerSeen = {};

  function noteLowercaseWords(text) {
    lowerSeen = {};
    var re = /\b[a-z][a-z'’-]{1,}\b/g, m;
    while ((m = re.exec(text)) !== null) lowerSeen[m[0].toLowerCase()] = true;
  }

  function decap(s) {
    var str = String(s);
    var first = str.split(/\s+/)[0] || '';
    var bare = first.replace(/[^A-Za-z'’-]/g, '');
    if (!bare || !/^[A-Z]/.test(bare)) return str;
    if (bare === 'I') return str;
    var key = bare.toLowerCase();
    if (STARTER_SET[key] || lowerSeen[key]) return lower(str);
    return str;  /* assume a proper noun */
  }

  function terminal(sentence) {
    var m = String(sentence).match(/([.!?]["'”’)\]]*)\s*$/);
    return m ? m[1] : '';
  }

  function stripTerminal(sentence) {
    return String(sentence).replace(/[.!?]["'”’)\]]*\s*$/, '').trim();
  }

  /* =====================================================================
     Transformation rules.
     Each takes the sentence body (no terminal punctuation) and returns
     { text, note } when it applies, or null when it does not.
     ===================================================================== */

  var BE = '(?:is|are|was|were|be|been|being)';

  /* "The report was written by the team" -> "The team wrote the report".
     Only fires when the passive names its agent; an agentless passive cannot be
     made active without inventing a subject. */
  function passiveToActive(text) {
    var re = new RegExp('^(.{3,90}?)\\s+' + BE + '\\s+(?:\\w+ly\\s+)?(\\w+(?:ed|en)|' +
      Object.keys(L.PARTICIPLE_TO_PAST).join('|') + ')\\s+by\\s+(.{2,60})$', 'i');
    var m = text.match(re);
    if (!m) return null;

    var subject = m[1].trim(), participle = m[2].toLowerCase(), agent = m[3].trim();

    /* "There are several issues that were raised by X" would otherwise yield
       "X raised there are several issues that". Leave it to removeExpletive. */
    if (/^there\s+(?:is|are|was|were)\b/i.test(subject)) return null;
    if (/\b(?:that|which|who)$/i.test(subject)) return null;

    /* A leading adverbial stays at the front rather than being dragged into the
       object slot: "In order to X, a review was conducted by Y" becomes
       "In order to X, Y conducted a review". */
    var prefix = '';
    var leading = subject.match(/^(.*?,\s*)(.+)$/);
    if (leading) {
      prefix = leading[1];
      subject = leading[2].trim();
      if (!subject || U.wordCount(subject) > 12) return null;
    }

    /* "by the board last spring" — the time phrase belongs at the end of the
       new sentence, not inside the subject. */
    var tail = '';
    var adverbial = agent.match(/\s+((?:last|next|this|each|every)\s+\w+|yesterday|today|tonight|recently|in\s+(?:19|20)\d{2}|(?:in|on|at)\s+\w+day)$/i);
    if (adverbial) {
      tail = ' ' + adverbial[1].trim();
      agent = agent.slice(0, adverbial.index).trim();
    }
    /* An agent carrying its own clause is too risky to move. */
    if (/\s(?:who|which|that|and|or|because|while)\s/i.test(agent)) return null;
    if (/[,;:]$/.test(agent)) return null;

    var past = L.PARTICIPLE_TO_PAST[participle] ||
      (/ed$/.test(participle) ? participle : null);
    if (!past) return null;

    var body = (prefix ? decap(agent) : upper(decap(agent))) + ' ' + past + ' ' + decap(subject) + tail;
    return {
      text: (prefix ? upper(prefix) + body : body),
      note: 'passive → active'
    };
  }

  /* "There are three things you need" -> "You need three things".
     "It is important to note that X" -> "X". */
  function removeExpletive(text) {
    var m = text.match(/^There\s+(?:is|are|was|were)\s+(.+?)\s+(?:that|which|who)\s+(.+)$/i);
    if (m) {
      /* "There are three factors that determine X" -> "Three factors determine X":
         the noun phrase leads and the relative clause becomes the predicate. */
      return { text: upper(decap(m[1].trim())) + ' ' + decap(m[2].trim()), note: 'dropped "there is/are"', exposes: true };
    }
    m = text.match(/^It\s+(?:is|was)\s+(?:important|worth|necessary|useful|helpful)\s+to\s+(?:note|remember|say)\s+that\s+(.+)$/i);
    if (m) return { text: upper(decap(m[1].trim())), note: 'dropped the throat-clearing opener', exposes: true };

    m = text.match(/^It\s+(?:is|was)\s+(?:clear|evident|obvious|apparent)\s+that\s+(.+)$/i);
    if (m) return { text: upper(decap(m[1].trim())), note: 'dropped "it is clear that"', exposes: true };

    m = text.match(/^There\s+(?:is|are|was|were)\s+(.+)$/i);
    if (m && U.wordCount(m[1]) > 3) {
      return { text: upper(decap(m[1].trim())) + ' exists', note: 'dropped "there is/are"', exposes: true };
    }
    return null;
  }

  /* Nouns doing a verb's work. */
  function unburyVerb(text) {
    for (var i = 0; i < L.NOMINALISATIONS.length; i++) {
      var pair = L.NOMINALISATIONS[i];
      var re = new RegExp(pair[0].source, pair[0].flags);
      if (re.test(text)) {
        var out = text.replace(new RegExp(pair[0].source, pair[0].flags), function (match) {
          return matchCase(match, pair[1]);
        });
        if (out !== text) return { text: out, note: 'unburied a verb' };
      }
    }
    return null;
  }

  /* "the sunlight that their roof receives" -> "the sunlight their roof receives"
     "the team which is responsible" -> "the team responsible" */
  function reduceRelative(text) {
    var out = text.replace(/\b(\w+)\s+(?:which|that|who)\s+(?:is|are|was|were)\s+/gi, '$1 ');
    if (out !== text) return { text: out, note: 'reduced a relative clause' };

    out = text.replace(/\b(\w+)\s+that\s+(their|his|her|its|our|your|my|the)\s+/gi, '$1 $2 ');
    if (out !== text) return { text: out, note: 'dropped an optional "that"' };
    return null;
  }

  /* Move a leading subordinate clause to the end, or the reverse. */
  function moveClause(text, rnd) {
    var lead = text.match(/^(Because|Although|Though|While|When|If|Since|After|Before|Unless|Whereas|As)\s+([^,]{8,90}),\s+(.{10,})$/i);
    if (lead) {
      /* Without the comma the moved clause reads as part of whatever ended the
         main clause: "...reserves harbour communities although they are found
         across west Africa" attaches "although" to "harbour". The trailing
         branch below already punctuates its move; this one did not. */
      return {
        text: upper(decap(lead[3].trim().replace(/[,;:]+$/, ''))) + ', ' +
          lead[1].toLowerCase() + ' ' + decap(lead[2].trim()),
        note: 'moved the "' + lead[1].toLowerCase() + '" clause to the end'
      };
    }
    var trail = text.match(/^(.{15,})\s+(because|although|though|while|whereas|since|unless)\s+(.{8,})$/i);
    if (trail) {
      /* The comma that separated the two clauses was captured with the main
         clause and carried to the end of the rewritten sentence, so fronting
         "because" gave back "...beside a generated table,." — a comma and a
         full stop together, in text a writer can paste straight into a draft. */
      var main = trail[1].trim().replace(/[,;:]+$/, '');
      return {
        text: upper(trail[2]) + ' ' + decap(trail[3].trim()) + ', ' + decap(main),
        note: 'fronted the "' + trail[2].toLowerCase() + '" clause'
      };
    }
    return null;
  }

  /* Swap a coordinating conjunction for a subordinating one, which restructures
     the relationship rather than just renaming it. */
  function recastConjunction(text) {
    var m = text.match(/^(.{12,}?),\s+so\s+(.{10,})$/i);
    if (m) {
      return {
        text: 'Because ' + decap(m[1].trim()) + ', ' + decap(m[2].trim()),
        note: '"so" recast as "because"'
      };
    }
    m = text.match(/^(.{12,}?),\s+but\s+(.{10,})$/i);
    if (m) {
      return {
        text: 'Although ' + decap(m[1].trim()) + ', ' + decap(m[2].trim()),
        note: '"but" recast as "although"'
      };
    }
    return null;
  }

  var FINITE = /\b(is|are|was|were|has|have|had|will|would|can|could|should|must|may|might|does|do|did|makes|made|means|shows|showed|gives|gave|takes|took|costs?|pays?|works?|needs?|becomes?|remains?|includes?|receives?|requires?)\b/i;

  /* Split a long coordinated sentence. Never splits a serial list. */
  function splitSentence(text) {
    if (U.wordCount(text) < 22) return null;
    var m = text.match(/^([^,]{35,}?),\s+(and|but|so|yet)\s+(.{20,})$/i);
    if (!m) return null;
    if (/,/.test(m[1])) return null;
    if (!FINITE.test(m[3]) || U.wordCount(m[3]) < 5) return null;
    var lead = { and: '', but: 'But ', so: 'So ', yet: 'Yet ' }[m[2].toLowerCase()] || '';
    return {
      text: m[1].replace(/[,\s]*$/, '') + '. ' + lead + upper(decap(m[3])),
      note: 'split one long sentence into two'
    };
  }

  /* Unpack a dense sentence by making an implicit relationship explicit. */
  function expandSentence(text, rnd) {
    var m = text.match(/^(.{15,}?),\s+(and|which)\s+(.{12,})$/i);
    if (m) {
      var connector = U.pick(['This matters because', 'The consequence is that', 'In practice this means'], rnd);
      var rest = decap(m[3].trim());
      /* "which" was the subject of the verb that follows it. Cutting it and
         starting a new sentence left the verb with nothing in front of it:
         "...are in Uganda. In practice this means is the most straightforward
         destination". A new subject has to take its place, and it has to agree
         with the verb that stranded. */
      if (m[2].toLowerCase() === 'which') {
        var verb = rest.match(/^([A-Za-z']+)/);
        if (!verb) return null;
        var plural = /^(?:are|were|have|do|include|comprise|remain|offer|give|run|cost|sit|lie|make|take|come|go)$/i;
        var singular = /^(?:is|was|has|does|includes|comprises|remains|offers|gives|runs|costs|sits|lies|makes|takes|comes|goes)$/i;
        if (plural.test(verb[1])) rest = 'they ' + rest;
        else if (singular.test(verb[1])) rest = 'it ' + rest;
        else return null;  /* not a verb we can supply a subject for */
      }
      return {
        text: m[1].replace(/[,\s]*$/, '') + '. ' + connector + ' ' + rest,
        note: 'made an implied relationship explicit'
      };
    }
    /* Turn a bare comparative into a stated comparison. */
    m = text.match(/^(.{10,}?)\s+(?:is|are)\s+(\w+er|more\s+\w+)\s+than\s+(.{4,})$/i);
    if (m) {
      return {
        text: m[1].trim() + ' comes out ' + m[2] + ' than ' + m[3].trim() +
          ', and the gap is wide enough to matter',
        note: 'stated the comparison rather than implying it'
      };
    }
    return null;
  }

  /* ---- lexical passes ---- */

  function applyWordy(text) {
    var notes = [];
    L.WORDY.forEach(function (pair) {
      var re = new RegExp('\\b' + escapeRe(pair[0]) + '\\b', 'gi');
      if (re.test(text)) {
        text = text.replace(new RegExp('\\b' + escapeRe(pair[0]) + '\\b', 'gi'), function (m) {
          return pair[1] ? matchCase(m, pair[1]) : '';
        });
        notes.push(pair[1] ? '“' + pair[0] + '” → “' + pair[1] + '”' : 'cut “' + pair[0] + '”');
      }
    });
    return { text: text, notes: notes };
  }

  function applyFillers(text) {
    var notes = [];
    L.FILLERS.forEach(function (f) {
      var re = new RegExp('\\b' + escapeRe(f) + '\\s+', 'gi');
      if (re.test(text)) {
        text = text.replace(re, '');
        notes.push('removed filler “' + f + '”');
      }
    });
    return { text: text, notes: notes };
  }

  function applyContractions(text, mode) {
    var notes = [];
    if (mode === 'formal') {
      Object.keys(CONTRACTIONS).forEach(function (c) {
        var re = new RegExp(escapeRe(c).replace("'", "['’]"), 'gi');
        if (re.test(text)) {
          text = text.replace(re, function (m) { return matchCase(m, CONTRACTIONS[c]); });
          notes.push('expanded “' + c + '”');
        }
      });
    } else if (mode === 'simple' || mode === 'creative') {
      CONTRACTIBLE.forEach(function (full) {
        var short = Object.keys(CONTRACTIONS).filter(function (k) { return CONTRACTIONS[k] === full; })[0];
        if (!short) return;
        var re = new RegExp('\\b' + escapeRe(full) + '\\b', 'gi');
        if (re.test(text)) {
          text = text.replace(re, function (m) { return matchCase(m, short); });
          notes.push('contracted to “' + short + '”');
        }
      });
    }
    return { text: text, notes: notes };
  }

  /* A word after one of these is carrying inflection the synonym bank does not
     have, so it is left alone. */
  var AUXILIARIES = {};
  ('have has had having is are was were be been being am ' +
   'will would can could should may might must')
    .split(' ').forEach(function (w) { AUXILIARIES[w] = true; });

  /* Prepositions an adjective can be read through: past one of these the word
     belongs to the verb's phrasing rather than to a following noun. */
  var ADJ_PREP = /^\s+(?:among|amongst|above|over|of|for|to|with|than|by|into|across|through|against|about|on|in|at|from|between)\b/i;

  var DETERMINERS = {};
  ('the a an this that these those its his her their our your my no any each every')
    .split(' ').forEach(function (w) { DETERMINERS[w] = true; });

  function register(mode) {
    if (mode === 'formal') return 'formal';
    if (mode === 'simple' || mode === 'shorten') return 'simple';
    if (mode === 'creative') return 'creative';
    return 'neutral';
  }

  /* Substitute up to `budget` eligible words. Which ones, and which synonym, is
     decided by the seed — but if anything is eligible, something is changed. */
  function applySynonyms(text, mode, rnd, budget) {
    var reg = register(mode);
    var notes = [];
    var eligible = [];
    var re = /\b[A-Za-z]{3,}\b/g, m;
    while ((m = re.exec(text)) !== null) {
      if (!L.SYNONYMS[m[0].toLowerCase()]) continue;

      /* Not inside a hyphenated compound: "slow-wave" must not become
         "laggy-wave". */
      var before = text.charAt(m.index - 1), after = text.charAt(m.index + m[0].length);
      if (before === '-' || after === '-') continue;

      /* Not an inflected verb: the bank holds base forms, so substituting into
         "have become" or "is required" produces "have grow", "is need". */
      var preceding = text.slice(0, m.index).match(/([A-Za-z']+)\s+$/);
      if (preceding && AUXILIARIES[preceding[1].toLowerCase()]) continue;

      /* Not a verb taking an infinitive: "need to consider" cannot become
         "call for to consider", and most alternatives govern a complement
         differently, so the whole construction is left alone. */
      var following = text.slice(m.index + m[0].length).match(/^\s+([A-Za-z']+)/);
      if (following && /^to$/i.test(following[1])) continue;

      /* A verb's synonyms do not fit a noun slot: "the start of July" must not
         become "the launch of July". A determiner in front means this word is
         being used as a noun whatever the bank thinks it is. */
      var entry = L.SYNONYMS[m[0].toLowerCase()];
      if (entry.pos === 'verb' && preceding && DETERMINERS[preceding[1].toLowerCase()]) continue;

      /* A conjunctive adverb joins clauses, and so does everything offered in
         its place. In the slot before a verb none of them is grammatical:
         "it also tends to be" came back as "it plus tends to be", and "Mahale
         also has" as "Mahale on top of that has". Only the front of a clause
         takes them. */
      if (entry.conjunctive && m.index !== 0) continue;

      /* An adjective sitting straight in front of a preposition is not
         modifying a noun — it is part of the verb's own phrasing. "ranks high
         among my favourite parks" is not a claim about height, so the bank's
         adjectives give back "ranks elevated among" and "ranks considerable
         among". */
      if (entry.pos === 'adj' && after !== '' && ADJ_PREP.test(text.slice(m.index + m[0].length))) continue;

      eligible.push({ word: m[0], index: m.index });
    }
    if (!eligible.length) return { text: text, notes: notes };

    var picks = U.pickN(eligible, Math.max(1, Math.min(budget, Math.ceil(eligible.length / 2))), rnd);
    /* Replace from the back so earlier offsets stay valid. */
    picks.sort(function (a, b) { return b.index - a.index; }).forEach(function (pick) {
      var entry = L.SYNONYMS[pick.word.toLowerCase()];
      var pool = (entry[reg] && entry[reg].length) ? entry[reg] : entry.neutral;
      /* A phrase goes at the edge of a clause, not into the adverb slot before
         a verb: "I usually just use trail shoes" must not become "I most of
         the time just use trail shoes". */
      if (entry.pos === 'adv' && pick.index !== 0) {
        pool = pool.filter(function (c) { return c.indexOf(' ') === -1; });
        if (!pool.length && entry.neutral) {
          pool = entry.neutral.filter(function (c) { return c.indexOf(' ') === -1; });
        }
      }
      if (!pool || !pool.length) return;
      var choice = U.pick(pool, rnd);
      if (!choice || choice.toLowerCase() === pick.word.toLowerCase()) return;
      text = text.slice(0, pick.index) + matchCase(pick.word, choice) +
        text.slice(pick.index + pick.word.length);
      notes.push('“' + pick.word + '” → “' + choice + '”');
    });
    return { text: text, notes: notes };
  }

  /* Which structural rules each mode may use, in the order they are tried. */
  var RULES_BY_MODE = {
    standard: [removeExpletive, passiveToActive, unburyVerb, reduceRelative, moveClause, recastConjunction],
    formal: [removeExpletive, passiveToActive, unburyVerb, moveClause, recastConjunction],
    simple: [removeExpletive, passiveToActive, unburyVerb, reduceRelative, splitSentence],
    creative: [removeExpletive, passiveToActive, moveClause, recastConjunction, splitSentence],
    shorten: [removeExpletive, passiveToActive, unburyVerb, reduceRelative],
    expand: [expandSentence, passiveToActive, moveClause]
  };

  var SYNONYM_BUDGET = {
    standard: 3, formal: 3, simple: 2, creative: 4, shorten: 1, expand: 2
  };

  function rewriteSentence(sentence, mode, rnd) {
    var end = terminal(sentence);
    var text = stripTerminal(sentence);
    var notes = [];

    /* 1. Structural rules first — they reshape the sentence the others polish.
       One change per sentence, with a single exception: dropping an expletive
       can expose a passive underneath ("There are issues that were raised by
       X"), so that case alone gets a second pass. Allowing a general second
       pass just lets rules undo each other — moving a clause that the previous
       rule had only just created. */
    var rules = RULES_BY_MODE[mode] || RULES_BY_MODE.standard;
    var used = {};

    for (var pass = 0; pass < 2; pass++) {
      var applied = null;
      for (var i = 0; i < rules.length; i++) {
        if (used[i]) continue;
        var result = rules[i](text, rnd);
        if (result && result.text && result.text !== text) {
          text = result.text;
          notes.push(result.note);
          used[i] = true;
          applied = result;
          break;
        }
      }
      /* Only a rule that says it uncovered something takes a second pass. */
      if (!applied || !applied.exposes) break;
    }

    /* 2. Wordiness and filler. */
    if (mode !== 'expand') {
      var wordy = applyWordy(text);
      text = wordy.text; notes = notes.concat(wordy.notes);
    }
    if (mode === 'shorten' || mode === 'simple' || mode === 'standard') {
      var filler = applyFillers(text);
      text = filler.text; notes = notes.concat(filler.notes);
    }

    /* 3. Register. */
    var contract = applyContractions(text, mode);
    text = contract.text; notes = notes.concat(contract.notes);

    /* 4. Lexical substitution, last. */
    var syn = applySynonyms(text, mode, rnd, SYNONYM_BUDGET[mode] || 2);
    text = syn.text; notes = notes.concat(syn.notes);

    /* tidy */
    text = text.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
    text = text.replace(/\b(to|of|the|a|an|in|for|that|and|is|are)\s+\1\b/gi, '$1');
    text = upper(text);
    if (end && !/[.!?]$/.test(text)) text += end;

    return { text: text, notes: notes, changed: text !== sentence };
  }

  /* Join two short adjacent sentences. Runs across a paragraph rather than
     within one sentence, so it lives outside rewriteSentence. */
  function joinShortPairs(sentences, rnd) {
    var out = [], notes = [], i = 0;
    while (i < sentences.length) {
      var a = sentences[i], b = sentences[i + 1];
      if (b && U.wordCount(a) <= 11 && U.wordCount(b) <= 11 &&
        !/^(But|And|So|Yet|However|Then)\b/i.test(b) && /[.]$/.test(a)) {
        var connector = U.pick([', and ', ', and ', '; '], rnd);
        out.push(stripTerminal(a) + connector + decap(stripTerminal(b)) + terminal(b));
        notes.push('joined two short sentences');
        i += 2;
      } else {
        out.push(a);
        i += 1;
      }
    }
    return { sentences: out, notes: notes };
  }

  function paraphrase(text, mode, seed) {
    mode = mode || 'standard';
    var rnd = U.seeded((seed || 'para') + '|' + mode + '|' + String(text).slice(0, 200));
    noteLowercaseWords(text);
    var paragraphs = U.splitParagraphs(text);
    if (!paragraphs.length) {
      return {
        text: '', mode: mode, pairs: [], notes: [], changedSentences: 0,
        totalSentences: 0, wordsBefore: 0, wordsAfter: 0, unchanged: []
      };
    }

    var pairs = [], allNotes = [], unchanged = [], total = 0;

    var out = paragraphs.map(function (p) {
      var sentences = U.splitSentences(p);

      if (mode === 'creative') {
        var joined = joinShortPairs(sentences, rnd);
        if (joined.notes.length) {
          sentences = joined.sentences;
          allNotes = allNotes.concat(joined.notes);
        }
      }

      return sentences.map(function (s) {
        total++;
        var r = rewriteSentence(s, mode, rnd);
        if (r.changed) {
          pairs.push({ before: s, after: r.text, notes: r.notes });
          allNotes = allNotes.concat(r.notes);
        } else {
          unchanged.push(s);
        }
        return r.text;
      }).join(' ');
    }).join('\n\n');

    return {
      text: out,
      mode: mode,
      pairs: pairs,
      notes: U.unique(allNotes),
      changedSentences: pairs.length,
      totalSentences: total,
      unchanged: unchanged,
      wordsBefore: U.wordCount(text),
      wordsAfter: U.wordCount(out)
    };
  }

  /* Word-level diff for the before/after display. */
  function diff(before, after) {
    var a = before.split(/(\s+)/), b = after.split(/(\s+)/);
    var m = a.length, n = b.length;
    var lcs = [];
    for (var i = 0; i <= m; i++) lcs.push(new Array(n + 1).fill(0));
    for (i = m - 1; i >= 0; i--) {
      for (var j = n - 1; j >= 0; j--) {
        lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
    var out = [];
    i = 0; j = 0;
    while (i < m && j < n) {
      if (a[i] === b[j]) { out.push({ type: 'same', text: a[i] }); i++; j++; }
      else if (lcs[i + 1][j] >= lcs[i][j + 1]) { out.push({ type: 'del', text: a[i] }); i++; }
      else { out.push({ type: 'ins', text: b[j] }); j++; }
    }
    while (i < m) { out.push({ type: 'del', text: a[i++] }); }
    while (j < n) { out.push({ type: 'ins', text: b[j++] }); }
    return out;
  }

  FW.paraphrase = {
    paraphrase: paraphrase, diff: diff, MODES: MODES,
    /* exposed for testing the individual transformations */
    rules: {
      passiveToActive: passiveToActive, removeExpletive: removeExpletive,
      unburyVerb: unburyVerb, reduceRelative: reduceRelative,
      moveClause: moveClause, recastConjunction: recastConjunction,
      splitSentence: splitSentence, expandSentence: expandSentence
    }
  };
})(window.FW);
