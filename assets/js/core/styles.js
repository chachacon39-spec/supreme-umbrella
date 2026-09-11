/* Style generation: one brief → three fully-specified approaches. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util;

  var OBSTACLES = ['the guesswork', 'a bigger budget', 'starting over', 'the usual advice',
    'wasting a weekend', 'hiring anyone', 'the jargon', 'a second tool'];

  function tokens(task, analysis, rnd) {
    var meta = (analysis && analysis.meta) || {};
    var topic = meta.topic || task.title || 'the subject';
    var kw = (meta.keywords && meta.keywords[0] && meta.keywords[0].term) || topic;
    return {
      TOPIC: topic,
      SUBJECT: U.titleCase(String(topic).split(/[,:—-]/)[0].trim()) || 'the subject',
      KEYWORD: kw,
      AUDIENCE: meta.audience || 'the reader',
      CLIENT: task.client || 'the client',
      YEAR: String(new Date().getFullYear()),
      NUMBER: String(3 + Math.floor(rnd() * 8)),
      OBSTACLE: U.pick(OBSTACLES, rnd),
      BENEFIT: meta.audience ? ('what ' + meta.audience + ' actually want') : 'the result you are after',
      RIVAL: 'the obvious alternative',
      VERB: 'shift'
    };
  }

  /* Tokens that read as sentence fragments get their first letter lowered when they
     land mid-sentence — but only when the value looks like a common noun phrase,
     so proper nouns ("Tesla Model 3") keep their capitals. */
  var SOFT_CASE = { TOPIC: 1, AUDIENCE: 1, BENEFIT: 1, OBSTACLE: 1, KEYWORD: 1 };

  function looksCommon(value) {
    var parts = String(value).trim().split(/\s+/);
    if (!parts.length) return false;
    if (!/^[A-Z][a-z]/.test(parts[0])) return false;
    var capitalised = parts.filter(function (w) { return /^[A-Z]/.test(w); }).length;
    return parts.length === 1 || capitalised === 1;
  }

  function fill(template, tok) {
    var str = String(template || '');
    return str.replace(/\{([A-Z]+)\}/g, function (m, key, offset) {
      if (tok[key] === undefined) return m;
      var value = String(tok[key]);
      var before = str.slice(0, offset).replace(/["'“‘\[(]+$/, '');
      var midSentence = /[^\s]/.test(before) && !/[.!?:]\s*$/.test(before);
      if (midSentence && SOFT_CASE[key] && looksCommon(value)) {
        value = value.charAt(0).toLowerCase() + value.slice(1);
      }
      return value;
    });
  }

  /* Distribute the word target across outline sections. */
  function budget(outline, total) {
    if (!total || !outline.length) return outline.map(function () { return null; });
    var weights = outline.map(function (item, i) {
      var s = String(item).toLowerCase();
      if (i === 0) return 0.7;
      if (/sources|notes|references|appendix|disclaimer|shot list|b-roll|changelog/.test(s)) return 0.4;
      if (/conclusion|close|cta|call to action|next step|recap|kicker/.test(s)) return 0.6;
      if (/verdict|thesis|bottom line|lead|abstract/.test(s)) return 0.8;
      return 1.15;
    });
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    return weights.map(function (w) { return Math.max(40, Math.round((w / sum) * total / 10) * 10); });
  }

  /* Fold requirements the brief demands into an outline that lacks them. */
  function enforceRequirements(outline, analysis) {
    var out = outline.slice();
    var st = (analysis && analysis.meta && analysis.meta.structure) || {};
    var joined = out.join(' ').toLowerCase();
    function ensure(test, item, position) {
      if (test.test(joined)) return;
      if (position === 'end') out.push(item);
      else out.splice(Math.max(1, out.length - 1), 0, item);
      joined = out.join(' ').toLowerCase();
    }
    if (st.faq) ensure(/faq|frequently asked/, 'FAQ: the five questions readers actually ask', 'end');
    if (st.cta) ensure(/cta|call to action/, 'Call to action (single, unambiguous)', 'end');
    if (st.table) ensure(/table|matrix|scorecard/, 'Comparison table', 'mid');
    if (st.quotes) ensure(/quote|interview|expert/, 'Expert quote or interview excerpt', 'mid');
    if (st.sources || (analysis && analysis.meta && analysis.meta.citationStyle)) {
      ensure(/source|reference|notes|bibliograph/, 'Reference list' +
        (analysis.meta.citationStyle ? ' (' + analysis.meta.citationStyle + ')' : ''), 'end');
    }
    if (st.images) ensure(/image|visual|b-roll|shot list|photo/, 'Image plan with licence notes', 'end');
    if (st.conclusion) ensure(/conclusion|close|recap|final|kicker|resolution/, 'Conclusion', 'end');
    if (st.intro) ensure(/intro|lead|hook|open/, 'Introduction', 'mid');
    if (st.sections && out.length < st.sections + 2) {
      for (var i = out.length; i < st.sections + 2; i++) {
        out.splice(out.length - 1, 0, 'Additional H2 section ' + (i - 1) + ' — subtopic to be named');
      }
    }
    return orderOutline(out);
  }

  /* Back matter always sits at the back, in a predictable order. */
  function orderOutline(outline) {
    var rank = function (item) {
      var s = String(item).toLowerCase();
      if (/^references?\b|reference list|bibliograph|works cited|sources and|notes on sources|^notes\b/.test(s)) return 4;
      if (/disclaimer|methodology appendix|^appendix|changelog|shot list|b-roll/.test(s)) return 5;
      if (/image plan/.test(s)) return 3;
      if (/faq|frequently asked/.test(s)) return 1;
      if (/call to action|^cta\b/.test(s)) return 2;
      return 0;
    };
    return outline
      .map(function (item, i) { return { item: item, r: rank(item), i: i }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; })
      .map(function (x) { return x.item; });
  }

  function headlineOptions(persona, tok, rnd, n) {
    var pool = (persona.headlines || []).concat(FW.lex.HEADLINE_FORMULAS);
    return U.pickN(pool, n || 3, rnd).map(function (h) {
      var filled = fill(h, tok);
      /* Headline case, but leave any sentence-ending punctuation structure alone. */
      return filled.split(/([.:!?] )/).map(function (chunk, i) {
        return i % 2 ? chunk : U.titleCase(chunk);
      }).join('');
    });
  }

  /* Adapt the persona's voice note to what the brief demands. */
  function voiceFor(persona, style, analysis) {
    var parts = [style.voiceNote];
    var meta = (analysis && analysis.meta) || {};
    if (meta.pov) parts.push('Brief overrides point of view: write in ' + meta.pov + '.');
    else parts.push('Default point of view: ' + persona.voice.person + '.');
    if (meta.tone && meta.tone.length) parts.push('Client tone words: ' + meta.tone.join(', ') + '.');
    if (meta.readingLevel) parts.push('Hold the reading level near grade ' + meta.readingLevel + '.');
    else parts.push('Natural reading grade for this persona: ' + persona.voice.readingGrade[0] + '–' + persona.voice.readingGrade[1] + '.');
    parts.push('Average sentence length target: about ' + persona.voice.sentenceTarget + ' words.');
    parts.push(persona.voice.contractions ? 'Contractions are fine.' : 'Avoid contractions.');
    return parts.join(' ');
  }

  function risksFor(style, persona, analysis) {
    var base = {
      practical: ['Can read as generic if the examples are not specific to the client.', 'Watch for step bloat — merge anything under one sentence.'],
      narrative: ['Anecdote must be true and verifiable if the client is the subject.', 'Do not let the story delay the payoff past 200 words.'],
      authority: ['Every statistic needs a live, checkable source.', 'Slower to write — budget research time.'],
      verdict: ['Requires a real testing period; do not imply testing you did not do.', 'Score must be defensible against the criteria.'],
      diary: ['Needs genuine time with the product.', 'Chronology can bury the verdict — signpost it early.'],
      comparative: ['Rival specs must be current as of the publication date.', 'Discloses affiliate relationships or it fails trust review.'],
      analytic: ['Cannot drift into investment advice.', 'Every figure needs an as-of date.'],
      explainer: ['Analogies break down — say where.', 'Risk of over-simplifying a regulated topic.'],
      narrativefin: ['Human subject must consent to being identified.', 'Numbers must survive fact-check independent of the narrative.'],
      memo: ['Requires real cost data; estimates must be labelled.', 'Only works if one decision is actually on the table.'],
      casestudy: ['Client must approve named metrics before publication.', 'Needs the measurement method or the number is worthless.'],
      thought: ['A weak contrarian claim reads as posturing.', 'Needs proprietary evidence to earn the position.'],
      reported: ['Reconstruction must be flagged as reconstruction.', 'Source access may gate the whole structure.'],
      argument: ['The objection must be steel-manned or the chapter collapses.', 'Citation load is heavy.'],
      braided: ['Two threads double the research burden.', 'Convergence must genuinely land or the structure feels like a trick.'],
      closethird: ['Interiority can slide into telling — check every emotion word.', 'Needs a real turn, not just atmosphere.'],
      firstvoice: ['Voice can become mannerism.', 'Digressions must pay off or get cut.'],
      literary: ['Pacing risk — plot can stall behind the imagery.', 'Motif must change, not merely repeat.'],
      tutorial: ['Every step needs to be executed once before publishing.', 'Version pins go stale fast.'],
      concept: ['Needs a diagram to carry its weight.', 'Abstract without a concrete anchor loses readers.'],
      reference: ['Completeness is the whole job — gaps are failures.', 'Tedious to maintain after publication.'],
      pas: ['Agitation can tip into manipulation — keep it honest.', 'Needs real proof immediately after the turn.'],
      bab: ['The “after” must be attainable or it reads as a lie.', 'Bridge section is where most drafts get vague.'],
      proof: ['Requires permission to name customers and numbers.', 'Understated tone needs genuinely strong data.'],
      pyramid: ['Two independent sources minimum for contested claims.', 'Lead must not editorialise.'],
      featurejourn: ['Scene requires on-the-ground reporting or archival detail.', 'Named subjects need informed consent.'],
      datajourn: ['Methodology must be reproducible.', 'Institution needs right of reply before publication.'],
      imrad: ['Methods section must be reproducible in detail.', 'Limitations cannot be an afterthought.'],
      litreview: ['Inclusion criteria must be stated and applied consistently.', 'Synthesis, not summary — avoid a list of papers.'],
      essayarg: ['Needs close reading, not paraphrase.', 'Conceptual claims must be anchored to texts.'],
      voicematch: ['Requires at least 1,000 words of the client’s own writing to match.', 'Never attribute an opinion the client has not expressed.'],
      authority2: ['Claims must come from the client’s real record.', 'Contrarianism without evidence damages the client.'],
      story2: ['Personal detail requires explicit sign-off.', 'Avoid retrofitting a tidy arc onto a messy history.'],
      explainervid: ['Script must be timed against runtime, not word count alone.', 'Visual cues need to be producible.'],
      narrativevid: ['Budget constrains locations and cast — write to what exists.', 'Subtext needs a performer who can carry it.'],
      interviewvid: ['Questions must be open enough to produce usable answers.', 'Archive licensing has to clear before the edit.']
    };
    var out = (base[style.key] || ['Confirm the approach with the client before drafting at length.']).slice();
    var meta = (analysis && analysis.meta) || {};
    if (meta.wordCount && meta.wordCount.max && meta.wordCount.max < 700 && style.outline.length > 6) {
      out.push('This structure has ' + style.outline.length + ' movements against a ' + meta.wordCount.max + '-word ceiling — merge sections or pitch a longer piece.');
    }
    if (meta.deadline && meta.deadline.date) {
      var days = U.daysUntil(meta.deadline.date);
      if (days !== null && days <= 2 && /reported|datajourn|braided|imrad|litreview|diary/.test(style.key)) {
        out.push('Deadline is ' + (days < 0 ? 'past' : days + ' day(s) out') + ' — this approach needs research time you may not have.');
      }
    }
    return out;
  }

  function fitScore(style, persona, analysis) {
    var meta = (analysis && analysis.meta) || {};
    var score = 60, reasons = [];
    var text = (style.label + ' ' + style.summary + ' ' + style.outline.join(' ')).toLowerCase();

    if (meta.tone && meta.tone.length) {
      meta.tone.forEach(function (t) {
        if (/formal|academic|professional|objective|neutral|serious/.test(t) && /analytic|memo|imrad|reference|pyramid|argument|litreview|essayarg/.test(style.key)) { score += 10; reasons.push('matches the “' + t + '” tone the brief asks for'); }
        if (/conversational|friendly|casual|playful|witty|warm/.test(t) && /practical|narrative|pas|bab|voicematch|story2|firstvoice/.test(style.key)) { score += 10; reasons.push('matches the “' + t + '” tone the brief asks for'); }
        if (/authoritative|confident|persuasive/.test(t) && /authority|thought|proof|verdict|datajourn|analytic/.test(style.key)) { score += 8; reasons.push('carries the authority the brief calls for'); }
      });
    }
    if (meta.wordCount) {
      var target = meta.wordCount.max || meta.wordCount.min || 0;
      if (target && target < 800 && style.outline.length <= 7) { score += 8; reasons.push('fits a short deliverable without cramming'); }
      if (target && target >= 1800 && style.outline.length >= 8) { score += 8; reasons.push('has enough movements to carry ' + target.toLocaleString() + ' words'); }
    }
    if (meta.structure) {
      if (meta.structure.table && /table|matrix|scorecard|comparative|reference/.test(text)) { score += 6; reasons.push('natural home for the table the brief requires'); }
      if (meta.structure.sources && /source|evidence|cited|method|reference/.test(text)) { score += 6; reasons.push('built around the sourcing requirement'); }
      if (meta.structure.cta && /cta|call to action/.test(text)) { score += 5; reasons.push('ends on the CTA the brief wants'); }
    }
    if (meta.keywords && meta.keywords.length && /practical|authority|tutorial|explainer/.test(style.key)) {
      score += 5; reasons.push('search-friendly structure for the target keyword');
    }
    if (meta.deadline && meta.deadline.date) {
      var days = U.daysUntil(meta.deadline.date);
      if (days !== null && days <= 3 && style.outline.length <= 7) { score += 6; reasons.push('deliverable inside a tight deadline'); }
    }
    if (!reasons.length) reasons.push('a solid default for this persona and topic');
    return { score: U.clamp(score, 0, 99), reasons: U.unique(reasons).slice(0, 3) };
  }

  /* ---- main entry ---- */
  function generate(task, analysis) {
    var persona = FW.personas.get(task.personaId);
    var seedBase = (task.id || '') + '|' + (task.brief || '').slice(0, 400) + '|' + persona.id;
    var meta = (analysis && analysis.meta) || {};
    var total = meta.wordCount ? (meta.wordCount.max || meta.wordCount.min) : (task.wordTarget || 0);

    var variants = persona.styles.map(function (style, idx) {
      var rnd = U.seeded(seedBase + '|' + style.key + '|' + idx);
      var tok = tokens(task, analysis, rnd);
      var outline = enforceRequirements(style.outline.map(function (o) { return fill(o, tok); }), analysis);
      var budgets = budget(outline, total);
      var fit = fitScore(style, persona, analysis);

      return {
        key: style.key,
        label: style.label,
        summary: fill(style.summary, tok),
        angle: fill(U.pick(persona.angles, rnd), tok),
        voice: voiceFor(persona, style, analysis),
        opener: fill(style.opener, tok),
        headlines: headlineOptions(persona, tok, rnd, 3),
        outline: outline.map(function (o, i) {
          return { text: o, words: budgets[i] };
        }),
        devices: style.devices.slice(),
        fit: fit.score,
        fitReasons: fit.reasons,
        risks: risksFor(style, persona, analysis),
        rules: persona.rules.slice(0, 4),
        avoid: U.unique(persona.banned.concat(meta.banned || [])).slice(0, 10)
      };
    });

    variants.sort(function (a, b) { return b.fit - a.fit; });

    return {
      personaId: persona.id,
      personaName: persona.name,
      generatedAt: Date.now(),
      totalWords: total || null,
      variants: variants,
      recommendation: variants[0] ? variants[0].key : null
    };
  }

  FW.styles = { generate: generate, fill: fill, tokens: tokens };
})(window.FW);
