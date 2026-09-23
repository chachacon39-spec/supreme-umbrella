/* Extractive summarizer: TF-scored sentences with positional and cue weighting. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util;

  var CUE_STRONG = /\b(in short|in summary|the key|the point is|crucially|most importantly|the result|overall|therefore|conclusion|found that|shows that|concluded)\b/i;
  var CUE_WEAK = /\b(for example|for instance|such as|e\.g\.|in other words)\b/i;

  function termFrequencies(sentences) {
    var freq = {}, total = 0;
    sentences.forEach(function (s) {
      U.words(s.text).forEach(function (w) {
        if (FW.analyzer.STOPSET[w] || w.length < 3) return;
        freq[w] = (freq[w] || 0) + 1;
        total++;
      });
    });
    Object.keys(freq).forEach(function (k) { freq[k] = freq[k] / Math.max(1, total); });
    return freq;
  }

  function score(sentences, freq, opts) {
    var keywords = (opts.keywords || []).map(function (k) { return String(k).toLowerCase(); });
    var n = sentences.length;
    return sentences.map(function (s, i) {
      var w = U.words(s.text);
      if (!w.length) return { sentence: s, score: 0, index: i };
      var tf = 0;
      w.forEach(function (x) { tf += freq[x] || 0; });
      var value = tf / Math.sqrt(w.length);

      /* Position: openings and closings carry disproportionate meaning. */
      if (i === 0) value *= 1.6;
      else if (i === 1) value *= 1.25;
      else if (i === n - 1) value *= 1.2;
      if (s.paragraphFirst) value *= 1.2;

      /* Cue phrases */
      if (CUE_STRONG.test(s.text)) value *= 1.45;
      if (CUE_WEAK.test(s.text)) value *= 0.75;

      /* Numbers and named entities usually mark substance */
      if (/\d/.test(s.text)) value *= 1.12;
      if (/\b[A-Z][a-z]{2,}\b/.test(s.text.slice(1))) value *= 1.06;

      /* Brief keywords */
      keywords.forEach(function (k) {
        if (k && s.text.toLowerCase().indexOf(k) !== -1) value *= 1.3;
      });

      /* Length shaping — very short or very long sentences summarise badly */
      if (w.length < 6) value *= 0.5;
      if (w.length > 45) value *= 0.8;

      /* Questions rarely work as summary lines */
      if (/\?\s*$/.test(s.text)) value *= 0.7;

      return { sentence: s, score: value, index: i };
    });
  }

  /* A heading is a label, not a sentence of the piece. It scores well — it is
     short and full of the words the piece repeats — so it was picked as a
     summary sentence and spliced into the prose either side of it: "...back to
     BIM A chair found in an AI render can now return to Revit". That summary is
     offered straight back through "Save as meta description".

     The summariser only ever sees plain text, so it cannot be told which lines
     were headings. What it can see is that they carry no terminal punctuation,
     which no finished sentence of prose lacks. */
  function isProseSentence(t) {
    return /[.!?]["'\u201d\u2019)\]]*$/.test(String(t).trim());
  }

  function buildSentences(text) {
    var out = [];
    U.splitParagraphs(text).forEach(function (p, pi) {
      var prose = U.splitSentences(p).filter(isProseSentence);
      prose.forEach(function (t, si) {
        out.push({ text: t, paragraph: pi, paragraphFirst: si === 0 });
      });
    });
    return out;
  }

  /* ratio: 0.05–0.5 of the original sentence count */
  function summarize(text, opts) {
    opts = opts || {};
    var sentences = buildSentences(text);
    if (sentences.length < 2) {
      return { tldr: sentences[0] ? sentences[0].text : '', summary: text, bullets: [], keyTerms: [], outline: [], compression: 0 };
    }
    var freq = termFrequencies(sentences);
    var scored = score(sentences, freq, opts);
    var ranked = scored.slice().sort(function (a, b) { return b.score - a.score; });

    var ratio = U.clamp(opts.ratio || 0.25, 0.05, 0.6);
    var take = U.clamp(Math.round(sentences.length * ratio), 1, sentences.length);
    var chosen = ranked.slice(0, take).sort(function (a, b) { return a.index - b.index; });

    var summary = chosen.map(function (c) { return c.sentence.text; }).join(' ');

    /* Bullets: the top sentences, trimmed to their load-bearing clause. */
    var bullets = ranked.slice(0, Math.min(7, Math.max(3, Math.round(take * 1.2))))
      .sort(function (a, b) { return a.index - b.index; })
      .map(function (c) { return toBullet(c.sentence.text); });

    /* Outline: one line per paragraph, its highest-scoring sentence. */
    var byPara = {};
    scored.forEach(function (c) {
      var p = c.sentence.paragraph;
      if (!byPara[p] || byPara[p].score < c.score) byPara[p] = c;
    });
    var outline = Object.keys(byPara).sort(function (a, b) { return a - b; })
      .map(function (p) { return { paragraph: Number(p) + 1, text: toBullet(byPara[p].sentence.text) }; });

    var keyTerms = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 12);

    var originalWords = U.wordCount(text);
    var summaryWords = U.wordCount(summary);

    return {
      tldr: compress(ranked[0].sentence.text),
      summary: summary,
      bullets: bullets,
      outline: outline,
      keyTerms: keyTerms,
      originalWords: originalWords,
      summaryWords: summaryWords,
      compression: originalWords ? Math.round((1 - summaryWords / originalWords) * 100) : 0,
      sentencesUsed: chosen.length,
      sentencesTotal: sentences.length
    };
  }

  function toBullet(sentence) {
    var s = String(sentence).trim()
      .replace(/^(?:However|Moreover|Furthermore|In addition|That said|Of course|Indeed|Also|And|But|So|Then|Now)\b[,\s]+/i, '')
      .replace(/^(?:In (?:short|summary|fact|other words)|For (?:example|instance))\b[,\s]+/i, '');
    s = U.sentenceCase(s);
    return s.replace(/\s+/g, ' ');
  }

  function compress(sentence) {
    var s = toBullet(sentence);
    /* Drop a trailing subordinate clause for a tighter one-liner. */
    var m = s.match(/^(.{40,}?),\s+(?:which|although|though|while|whereas|since|because)\b.*$/i);
    if (m) s = m[1] + '.';
    return s;
  }

  FW.summarize = { summarize: summarize, toBullet: toBullet };
})(window.FW);
