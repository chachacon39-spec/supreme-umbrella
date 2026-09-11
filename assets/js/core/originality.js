/* Originality checking: internal duplication, cross-draft reuse, and source overlap.
 * This runs entirely offline. It cannot see the web — it compares your draft against
 * itself, against your other drafts, and against sources you paste in, then builds
 * exact-phrase search links so you can verify the distinctive lines yourself. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util;

  var K = 5; /* shingle size in words */

  function tokenize(text) {
    var out = [], re = /[A-Za-z0-9][A-Za-z0-9'’-]*/g, m;
    while ((m = re.exec(text)) !== null) {
      out.push({ w: m[0].toLowerCase().replace(/[’']/g, "'"), start: m.index, end: m.index + m[0].length });
    }
    return out;
  }

  function shingles(tokens, k) {
    var map = {};
    for (var i = 0; i + k <= tokens.length; i++) {
      var key = tokens.slice(i, i + k).map(function (t) { return t.w; }).join(' ');
      (map[key] = map[key] || []).push(i);
    }
    return map;
  }

  /* Merge overlapping token-index ranges into character spans. */
  function mergeSpans(tokens, indices, k) {
    if (!indices.length) return [];
    indices = indices.slice().sort(function (a, b) { return a - b; });
    var spans = [], cur = { from: indices[0], to: indices[0] + k };
    for (var i = 1; i < indices.length; i++) {
      if (indices[i] <= cur.to) cur.to = Math.max(cur.to, indices[i] + k);
      else { spans.push(cur); cur = { from: indices[i], to: indices[i] + k }; }
    }
    spans.push(cur);
    return spans.map(function (s) {
      var a = tokens[s.from], b = tokens[Math.min(s.to - 1, tokens.length - 1)];
      return {
        start: a.start, end: b.end, words: s.to - s.from,
        text: null /* filled by the caller from the original string */
      };
    });
  }

  /* ---- draft vs one source ---- */
  function compareToSource(draft, source, label) {
    var dTok = tokenize(draft), sTok = tokenize(source);
    if (dTok.length < K || sTok.length < K) {
      return { label: label, similarity: 0, spans: [], matchedWords: 0, longest: 0, sourceWords: sTok.length };
    }
    var sMap = shingles(sTok, K);
    var dMap = shingles(dTok, K);
    var matchedIndices = [], shared = 0;

    Object.keys(dMap).forEach(function (key) {
      if (sMap[key]) {
        shared++;
        matchedIndices = matchedIndices.concat(dMap[key]);
      }
    });

    var spans = mergeSpans(dTok, matchedIndices, K).map(function (s) {
      s.text = draft.slice(s.start, s.end);
      return s;
    });
    var matchedWords = spans.reduce(function (a, s) { return a + s.words; }, 0);
    var longest = spans.reduce(function (a, s) { return Math.max(a, s.words); }, 0);

    return {
      label: label,
      similarity: Math.round((matchedWords / Math.max(1, dTok.length)) * 1000) / 10,
      shingleOverlap: Math.round((shared / Math.max(1, Object.keys(dMap).length)) * 1000) / 10,
      spans: spans.sort(function (a, b) { return b.words - a.words; }).slice(0, 60),
      matchedWords: matchedWords,
      longest: longest,
      sourceWords: sTok.length
    };
  }

  /* ---- duplication inside a single draft ---- */
  function internalDuplication(draft) {
    var tok = tokenize(draft);
    var map = shingles(tok, 6);
    var hits = [];
    Object.keys(map).forEach(function (key) {
      if (map[key].length < 2) return;
      map[key].slice(1).forEach(function (i) {
        hits.push({ index: i, key: key });
      });
    });
    var spans = mergeSpans(tok, hits.map(function (h) { return h.index; }), 6).map(function (s) {
      s.text = draft.slice(s.start, s.end);
      return s;
    });
    return {
      spans: spans.sort(function (a, b) { return b.words - a.words; }).slice(0, 30),
      duplicatedWords: spans.reduce(function (a, s) { return a + s.words; }, 0),
      pct: Math.round((spans.reduce(function (a, s) { return a + s.words; }, 0) / Math.max(1, tok.length)) * 1000) / 10
    };
  }

  /* ---- distinctiveness: which sentences are worth checking against the web ---- */
  function distinctiveSentences(draft, limit) {
    var sentences = U.splitSentences(draft);
    var freq = {};
    U.words(draft).forEach(function (w) { freq[w] = (freq[w] || 0) + 1; });

    return sentences.map(function (s) {
      var w = U.words(s);
      if (w.length < 8) return null;
      /* rare words + proper nouns + numbers make a sentence findable */
      var rarity = 0;
      w.forEach(function (x) {
        if (FW.analyzer.STOPSET[x]) return;
        rarity += 1 / (freq[x] || 1);
      });
      var proper = (s.slice(1).match(/\b[A-Z][a-z]{2,}\b/g) || []).length;
      var numbers = (s.match(/\b\d[\d,.]*\b/g) || []).length;
      var score = rarity + proper * 1.5 + numbers * 1.2 + Math.min(w.length, 30) / 20;
      return { text: s.trim(), score: score, words: w.length };
    }).filter(Boolean)
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 8)
      .map(function (s) {
        var phrase = s.text.replace(/^["'“”]|["'“”]$/g, '').slice(0, 220);
        var q = encodeURIComponent('"' + phrase + '"');
        return {
          text: s.text,
          words: s.words,
          links: [
            { name: 'Google', url: 'https://www.google.com/search?q=' + q },
            { name: 'Bing', url: 'https://www.bing.com/search?q=' + q },
            { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' + q }
          ]
        };
      });
  }

  /* ---- stock phrasing: unoriginal by construction ---- */
  function stockPhrases(draft) {
    var found = [];
    FW.lex.CLICHES.forEach(function (c) {
      var re = new RegExp('\\b' + FW.analyzer.escapeRe(c) + '\\b', 'gi');
      var m;
      while ((m = re.exec(draft)) !== null) {
        found.push({ phrase: m[0], start: m.index, end: m.index + m[0].length });
        if (found.length > 40) return;
      }
    });
    return found;
  }

  function riskLevel(pct) {
    if (pct >= 25) return { level: 'high', label: 'High overlap', note: 'Rewrite the matched passages before delivery.' };
    if (pct >= 12) return { level: 'medium', label: 'Moderate overlap', note: 'Check that the matched passages are quoted and cited.' };
    if (pct >= 4) return { level: 'low', label: 'Low overlap', note: 'Normal for quoted material and shared terminology.' };
    return { level: 'clear', label: 'No significant overlap', note: 'Nothing matched beyond common phrasing.' };
  }

  /* ---- main entry ---- */
  function check(draft, options) {
    options = options || {};
    var sources = options.sources || [];   /* [{label, text}] pasted reference material */
    var otherDrafts = options.otherDrafts || []; /* [{label, text}] from the workspace */

    var sourceResults = sources
      .filter(function (s) { return s.text && U.wordCount(s.text) > 10; })
      .map(function (s) { return compareToSource(draft, s.text, s.label || 'Pasted source'); });

    var draftResults = otherDrafts
      .filter(function (s) { return s.text && U.wordCount(s.text) > 30; })
      .map(function (s) { return compareToSource(draft, s.text, s.label); })
      .filter(function (r) { return r.similarity >= 2; })
      .sort(function (a, b) { return b.similarity - a.similarity; })
      .slice(0, 8);

    var internal = internalDuplication(draft);
    var worst = Math.max(
      sourceResults.reduce(function (a, r) { return Math.max(a, r.similarity); }, 0),
      draftResults.reduce(function (a, r) { return Math.max(a, r.similarity); }, 0)
    );

    return {
      checkedAt: Date.now(),
      words: U.wordCount(draft),
      sources: sourceResults,
      otherDrafts: draftResults,
      internal: internal,
      stock: stockPhrases(draft),
      distinctive: distinctiveSentences(draft, options.limit || 8),
      worstSimilarity: worst,
      risk: riskLevel(worst),
      disclaimer: 'Offline check. It compares your draft with itself, with your other drafts, and with any source text you paste in — it does not search the web. Use the verification links to check distinctive sentences against a live index.'
    };
  }

  FW.originality = {
    check: check, compareToSource: compareToSource, internalDuplication: internalDuplication,
    distinctiveSentences: distinctiveSentences
  };
})(window.FW);
