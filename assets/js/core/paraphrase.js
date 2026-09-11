/* Rule-based paraphraser. Deterministic rewrites with an auditable change log. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, L = FW.lex;

  var MODES = [
    { id: 'standard', label: 'Standard', note: 'Different words, same register and length.' },
    { id: 'formal', label: 'Formal', note: 'Raises the register; expands contractions.' },
    { id: 'simple', label: 'Plain English', note: 'Shorter sentences, everyday words.' },
    { id: 'creative', label: 'Creative', note: 'Fresher verbs and varied openings.' },
    { id: 'shorten', label: 'Concise', note: 'Cuts filler and wordy constructions.' },
    { id: 'expand', label: 'Expand', note: 'Adds connective tissue and specificity prompts.' }
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

  var CREATIVE_OPENERS = ['Notably, ', 'In practice, ', 'More to the point, ', 'What follows is simple: ',
    'Here is the part that matters: ', 'Put plainly, '];

  var EXPAND_PROMPTS = [
    ' [add a concrete example here]', ' [name the source]', ' [quantify this]',
    ' [say who this affects]', ' [state the timeframe]'
  ];

  function register(mode) {
    if (mode === 'formal') return 'formal';
    if (mode === 'simple' || mode === 'shorten') return 'simple';
    if (mode === 'creative') return 'creative';
    return 'neutral';
  }

  function pickSynonym(word, mode, rnd) {
    var entry = L.SYNONYMS[word.toLowerCase()];
    if (!entry) return null;
    var reg = register(mode);
    var pool = entry[reg] && entry[reg].length ? entry[reg] : entry.neutral;
    if (!pool || !pool.length) return null;
    return U.pick(pool, rnd);
  }

  function matchCase(source, replacement) {
    if (/^[A-Z][a-z]/.test(source)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    if (/^[A-Z]+$/.test(source) && source.length > 2) return replacement.toUpperCase();
    return replacement;
  }

  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Move a leading subordinate clause to the end, or vice versa. */
  function reorderClauses(sentence, rnd) {
    var lead = sentence.match(/^(Because|Although|Though|While|When|If|Since|After|Before|Unless|Whereas)\s+([^,]{8,90}),\s+(.{10,})$/i);
    if (lead) {
      var tail = lead[3].replace(/\s*$/, '');
      var conj = lead[1].toLowerCase();
      var body = U.sentenceCase(tail.replace(/[.]$/, ''));
      return { text: body + ' ' + conj + ' ' + lead[2].replace(/[.]$/, '') + '.', note: 'moved the “' + conj + '” clause to the end' };
    }
    var trail = sentence.match(/^(.{15,})\s+(because|although|though|while|whereas|since|unless)\s+(.{8,})[.]$/i);
    if (trail && rnd() > 0.35) {
      return {
        text: U.sentenceCase(trail[2]) + ' ' + trail[3].replace(/[.]$/, '') + ', ' +
          trail[1].charAt(0).toLowerCase() + trail[1].slice(1) + '.',
        note: 'fronted the “' + trail[2].toLowerCase() + '” clause'
      };
    }
    return null;
  }

  /* Split at a coordinating conjunction when the sentence runs long. */
  var FINITE = /\b(is|are|was|were|has|have|had|will|would|can|could|should|must|may|might|does|do|did|makes|made|means|shows|showed|gives|gave|takes|took|costs?|pays?|works?|needs?|becomes?|remains?|includes?)\b/i;

  function splitSentence(sentence) {
    if (U.wordCount(sentence) < 26) return null;
    var m = sentence.match(/^([^,]{40,}?),\s+(and|but|so|yet)\s+(.{25,})$/i);
    if (!m) return null;
    /* A serial list ("a, b, and c") is not two clauses — leave it alone. */
    if (/,/.test(m[1])) return null;
    /* The second half must stand on its own as a sentence. */
    if (!FINITE.test(m[3]) || U.wordCount(m[3]) < 5) return null;
    var second = m[3];
    var lead = { and: '', but: 'But ', so: 'So ', yet: 'Yet ' }[m[2].toLowerCase()] || '';
    return {
      text: m[1].replace(/[,\s]*$/, '') + '. ' + lead + U.sentenceCase(second),
      note: 'split one long sentence into two'
    };
  }

  function rewriteSentence(sentence, mode, rnd) {
    var text = sentence;
    var notes = [];

    /* 1. phrase-level wordiness */
    if (mode === 'shorten' || mode === 'standard' || mode === 'simple' || mode === 'formal') {
      L.WORDY.forEach(function (pair) {
        var re = new RegExp('\\b' + escapeRe(pair[0]) + '\\b', 'gi');
        if (re.test(text)) {
          text = text.replace(re, function (m) { return pair[1] ? matchCase(m, pair[1]) : ''; });
          notes.push(pair[1] ? '“' + pair[0] + '” → “' + pair[1] + '”' : 'cut “' + pair[0] + '”');
        }
      });
    }

    /* 2. filler removal */
    if (mode === 'shorten' || mode === 'simple' || mode === 'standard') {
      L.FILLERS.forEach(function (f) {
        var re = new RegExp('\\b' + escapeRe(f) + '\\s+', 'gi');
        if (re.test(text)) {
          text = text.replace(re, '');
          notes.push('removed filler “' + f + '”');
        }
      });
    }

    /* 3. contractions */
    if (mode === 'formal') {
      Object.keys(CONTRACTIONS).forEach(function (c) {
        var re = new RegExp(escapeRe(c).replace("'", "['’]"), 'gi');
        if (re.test(text)) {
          text = text.replace(re, function (m) { return matchCase(m, CONTRACTIONS[c]); });
          notes.push('expanded “' + c + '”');
        }
      });
    } else if (mode === 'simple') {
      Object.keys(CONTRACTIONS).forEach(function (c) {
        var re = new RegExp('\\b' + escapeRe(CONTRACTIONS[c]) + '\\b', 'gi');
        if (/^(cannot|do not|does not|is not|are not|will not|it is|they are|we are|you are)$/i.test(CONTRACTIONS[c]) && re.test(text)) {
          text = text.replace(re, function (m) { return matchCase(m, c); });
          notes.push('contracted to “' + c + '”');
        }
      });
    }

    /* 4. synonym substitution — at most a third of eligible words, so the voice survives */
    var swapped = 0;
    var eligible = (text.match(/\b[A-Za-z]{3,}\b/g) || []).filter(function (w) { return L.SYNONYMS[w.toLowerCase()]; });
    var budget = Math.max(1, Math.ceil(eligible.length / 3));
    text = text.replace(/\b[A-Za-z]{3,}\b/g, function (word) {
      if (swapped >= budget) return word;
      if (rnd() < 0.45) return word;
      var syn = pickSynonym(word, mode, rnd);
      if (!syn || syn.toLowerCase() === word.toLowerCase()) return word;
      swapped++;
      notes.push('“' + word + '” → “' + syn + '”');
      return matchCase(word, syn);
    });

    /* 5. structural moves */
    if (mode !== 'shorten') {
      var re2 = reorderClauses(text, rnd);
      if (re2 && rnd() > 0.4) { text = re2.text; notes.push(re2.note); }
    }
    if (mode === 'simple' || mode === 'shorten') {
      var sp = splitSentence(text);
      if (sp) { text = sp.text; notes.push(sp.note); }
    }

    /* 6. mode flourishes */
    if (mode === 'creative' && rnd() > 0.62) {
      var opener = U.pick(CREATIVE_OPENERS, rnd);
      text = opener + text.charAt(0).toLowerCase() + text.slice(1);
      notes.push('new opening beat');
    }
    if (mode === 'expand') {
      if (rnd() > 0.45) {
        var prompt = U.pick(EXPAND_PROMPTS, rnd);
        text = text.replace(/([.!?])\s*$/, prompt + '$1');
        notes.push('inserted an expansion prompt');
      }
      var transition = U.pick(['In practice, ', 'More specifically, ', 'The reason is straightforward: ', 'Taken together, '], rnd);
      if (rnd() > 0.65) {
        text = transition + text.charAt(0).toLowerCase() + text.slice(1);
        notes.push('added a connective opening');
      }
    }

    text = text.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
    /* A multi-word substitution can leave a doubled function word ("have to to"). */
    text = text.replace(/\b(to|of|the|a|an|in|for|that|and|is|are)\s+\1\b/gi, '$1');
    text = U.sentenceCase(text);
    if (!/[.!?…"”’)]$/.test(text) && /[.!?]$/.test(sentence)) text += sentence.slice(-1);

    return { text: text, notes: notes };
  }

  function paraphrase(text, mode, seed) {
    mode = mode || 'standard';
    var rnd = U.seeded((seed || 'para') + '|' + mode + '|' + text.slice(0, 200));
    var paragraphs = U.splitParagraphs(text);
    if (!paragraphs.length) return { text: '', pairs: [], notes: [], mode: mode };

    var pairs = [], allNotes = [];
    var out = paragraphs.map(function (p) {
      return U.splitSentences(p).map(function (s) {
        var r = rewriteSentence(s, mode, rnd);
        if (r.text !== s) {
          pairs.push({ before: s, after: r.text, notes: r.notes });
          allNotes = allNotes.concat(r.notes);
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

  FW.paraphrase = { paraphrase: paraphrase, diff: diff, MODES: MODES };
})(window.FW);
