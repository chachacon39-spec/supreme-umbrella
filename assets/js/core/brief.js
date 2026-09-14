/* Brief analysis: turns a pasted assignment into structured, checkable requirements. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util;

  var FORMATS = [
    ['listicle', /\blistic[l]?e\b|\btop\s+\d+\b|\b\d+\s+(?:ways|tips|reasons|things|ideas|tools)\b/i],
    ['how-to guide', /\bhow[- ]to\b|\bstep[- ]by[- ]step\b|\btutorial\b|\bwalkthrough\b/i],
    ['product review', /\breview\b|\bhands[- ]on\b|\bunboxing\b|\bverdict\b/i],
    ['comparison', /\bvs\.?\b|\bversus\b|\bcomparison\b|\bhead[- ]to[- ]head\b|\bbuyer'?s guide\b/i],
    ['case study', /\bcase stud(?:y|ies)\b/i],
    ['white paper', /\bwhite ?paper\b/i],
    ['press release', /\bpress release\b/i],
    ['newsletter', /\bnewsletter\b|\bemail (?:copy|blast|sequence)\b/i],
    ['landing page', /\blanding page\b|\bsales page\b|\bhomepage copy\b/i],
    ['news report', /\bnews (?:story|report|article)\b|\bbreaking\b|\breported piece\b/i],
    ['feature article', /\bfeature (?:article|piece|story)\b|\blong[- ]form\b|\bprofile piece\b/i],
    ['opinion / op-ed', /\bop[- ]ed\b|\bopinion piece\b|\bcolumn\b/i],
    ['academic paper', /\bresearch paper\b|\bliterature review\b|\bdissertation\b|\bthesis\b|\bessay\b/i],
    ['book chapter', /\bchapter\b|\bmanuscript\b|\bbook proposal\b/i],
    ['short story', /\bshort story\b|\bflash fiction\b|\bnovella\b|\bscene\b/i],
    ['script', /\bscript\b|\bscreenplay\b|\bvideo (?:script|copy)\b|\bvoice[- ]over\b/i],
    ['social copy', /\bsocial (?:media )?(?:post|copy)\b|\blinkedin post\b|\bthread\b|\bcaption\b/i],
    ['technical documentation', /\bdocumentation\b|\bapi docs?\b|\breadme\b|\bknowledge base\b/i],
    ['blog post', /\bblog (?:post|article)\b|\bpost\b/i],
    ['guide', /\bguide\b|\bprimer\b|\bexplainer\b|\b101\b/i]
  ];

  var TONES = ['authoritative', 'conversational', 'friendly', 'professional', 'formal', 'informal',
    'casual', 'witty', 'humorous', 'serious', 'empathetic', 'inspirational', 'urgent', 'neutral',
    'objective', 'persuasive', 'playful', 'confident', 'warm', 'direct', 'academic', 'technical',
    'optimistic', 'candid', 'irreverent', 'reassuring', 'punchy', 'lyrical', 'suspenseful'];

  var CITATION_STYLES = [
    ['APA 7', /\bapa\b/i], ['MLA 9', /\bmla\b/i], ['Chicago', /\bchicago\b|\bturabian\b/i],
    ['Harvard', /\bharvard\b/i], ['IEEE', /\bieee\b/i], ['Vancouver', /\bvancouver\b/i],
    ['AMA', /\bama\b|\bamerican medical association\b/i], ['AP', /\bap style\b|\bassociated press\b/i]
  ];

  var PERSONA_SIGNALS = {
    blog: /\bblog\b|\bseo\b|\bkeyword\b|\bpost\b|\bcms\b|\bwordpress\b|\borganic traffic\b/i,
    review: /\breview\b|\bproduct\b|\brating\b|\bpros and cons\b|\bverdict\b|\btested\b|\baffiliate\b/i,
    financial: /\bfinanc|\binvest|\bmarket\b|\bearnings\b|\bstock|\bbond|\bcrypto|\beconom|\bfintech\b|\bportfolio\b|\bbasis points?\b|\bfed\b/i,
    business: /\bb2b\b|\bexecutive\b|\bstrateg|\bmemo\b|\bcase stud|\bstakeholder|\bkpi\b|\broi\b|\bwhite ?paper\b|\bconsult/i,
    nonfiction: /\bchapter\b|\bmanuscript\b|\bnarrative nonfiction\b|\bmemoir\b|\bbiograph|\bhistor|\barchiv/i,
    fiction: /\bfiction\b|\bshort story\b|\bnovel\b|\bcharacter\b|\bplot\b|\bscene\b|\bprotagonist\b|\bworld[- ]build/i,
    technical: /\bapi\b|\bdocumentation\b|\bdeveloper\b|\bsdk\b|\bsoftware\b|\binstall|\bconfigur|\bcode\b/i,
    copy: /\bcopywrit|\blanding page\b|\bcta\b|\bconversion\b|\bad copy\b|\bsales page\b|\bemail sequence\b/i,
    journalist: /\bnews\b|\breport(?:ing|er)\b|\binterview\b|\bsources?\b|\bon the record\b|\bpress\b/i,
    academic: /\bacademic\b|\bpeer[- ]review|\bcitation|\bliterature review\b|\bmethodolog|\bhypothes|\bjournal\b/i,
    ghost: /\bghost ?writ|\bon behalf of\b|\bmy voice\b|\bfounder'?s? voice\b|\bbyline\b|\bthought leadership\b/i,
    scriptwriter: /\bscript\b|\bscreenplay\b|\bvideo\b|\byoutube\b|\bvoice[- ]over\b|\bshot list\b|\bpodcast\b/i
  };

  function matchAll(re, text) {
    var out = [], m;
    var rx = new RegExp(re.source, re.flags.indexOf('g') === -1 ? re.flags + 'g' : re.flags);
    while ((m = rx.exec(text)) !== null) {
      out.push(m);
      if (m.index === rx.lastIndex) rx.lastIndex++;
    }
    return out;
  }

  function num(s) { return parseInt(String(s).replace(/[,\s]/g, ''), 10); }

  /* ---- word count ---- */
  function findWordCount(text) {
    var range = text.match(/(\d[\d,]{1,7})\s*(?:-|–|—|to)\s*(\d[\d,]{1,7})\s*(?:\+)?\s*words?\b/i);
    if (range) return { min: num(range[1]), max: num(range[2]), raw: range[0] };
    var atLeast = text.match(/(?:at least|minimum(?: of)?|no fewer than|min\.?)\s*(\d[\d,]{1,7})\s*words?\b/i);
    if (atLeast) return { min: num(atLeast[1]), max: null, raw: atLeast[0] };
    /* A ceiling is not a target. "No longer than 300 words" means 300 is the
       wall, so a centred band around it would send the writer over. */
    var atMost = text.match(/(?:no (?:more|longer|greater) than|not (?:to )?exceed(?:ing)?|at most|maximum(?: of)?|under|up to|within|max\.?)\s*(\d[\d,]{1,7})\s*words?\b/i);
    if (atMost) return { min: null, max: num(atMost[1]), raw: atMost[0], ceiling: true };
    var orFewer = text.match(/(\d[\d,]{1,7})\s*words?\s+or\s+(?:fewer|less)\b/i);
    if (orFewer) return { min: null, max: num(orFewer[1]), raw: orFewer[0], ceiling: true };
    var about = text.match(/(?:approx(?:imately)?\.?|around|about|roughly|~)\s*(\d[\d,]{1,7})\s*words?\b/i);
    if (about) { var n = num(about[1]); return { min: Math.round(n * 0.9), max: Math.round(n * 1.1), raw: about[0] }; }
    var exact = text.match(/(\d[\d,]{2,7})\s*(?:\+)?\s*words?\b/i);
    if (exact) { var e = num(exact[1]); return { min: Math.round(e * 0.95), max: Math.round(e * 1.1), raw: exact[0] }; }
    var wc = text.match(/\bword count\s*[:\-]?\s*(\d[\d,]{2,7})/i);
    if (wc) { var w = num(wc[1]); return { min: Math.round(w * 0.95), max: Math.round(w * 1.1), raw: wc[0] }; }
    return null;
  }

  /* ---- deadline ---- */
  var MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec';
  function findDeadline(text) {
    var iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso) return { raw: iso[0], date: iso[0] };
    var md = text.match(new RegExp('\\b(' + MONTHS + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?', 'i'));
    if (md) {
      var d = new Date(md[0].replace(/(\d)(st|nd|rd|th)/i, '$1') + (md[3] ? '' : ' ' + new Date().getFullYear()));
      if (!isNaN(d.getTime())) return { raw: md[0], date: d.toISOString().slice(0, 10) };
    }
    var slash = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2}|\d{2})\b/);
    if (slash) {
      var yr = slash[3].length === 2 ? '20' + slash[3] : slash[3];
      var dt = new Date(yr + '-' + String(slash[1]).padStart(2, '0') + '-' + String(slash[2]).padStart(2, '0'));
      if (!isNaN(dt.getTime())) return { raw: slash[0], date: dt.toISOString().slice(0, 10) };
    }
    var rel = text.match(/\b(?:due|deadline|deliver(?:y)?|submit(?:ted)? by|needed by)\s*[:\-]?\s*([^\n.;]{3,40})/i);
    if (rel) return { raw: rel[0].trim(), date: null, note: rel[1].trim() };
    return null;
  }

  /* ---- keywords ---- */
  function findKeywords(text) {
    var out = [];
    matchAll(/(?:primary |target |focus |main )?keywords?\s*[:\-]\s*([^\n]+)/gi, text).forEach(function (m) {
      m[1].split(/[,;|]/).forEach(function (k) {
        k = k.trim().replace(/^["'“”]|["'“”]$/g, '');
        if (k && k.length < 60) out.push({ term: k, primary: /primary|focus|main|target/i.test(m[0]) });
      });
    });
    matchAll(/(?:seo|search) (?:term|phrase)s?\s*[:\-]\s*([^\n]+)/gi, text).forEach(function (m) {
      m[1].split(/[,;|]/).forEach(function (k) { k = k.trim(); if (k) out.push({ term: k, primary: false }); });
    });
    matchAll(/["“]([^"”\n]{4,50})["”]\s*(?:keyword|phrase|as the (?:main|primary) (?:keyword|term))/gi, text)
      .forEach(function (m) { out.push({ term: m[1].trim(), primary: true }); });
    var seen = {};
    return out.filter(function (k) {
      var key = k.term.toLowerCase();
      if (seen[key]) return false; seen[key] = true; return true;
    }).slice(0, 12);
  }

  /* ---- audience ---- */
  /* "speaking directly to the reader" is a tone note, not an audience, and the
     words that follow it are the next bullet. Anything that reads like another
     instruction is not a description of a person. */
  function plausibleAudience(s) {
    s = String(s).replace(/^[-*•·▪◦]\s*/, '').trim();
    if (s.length < 3) return null;
    if (/^(?:content|each (?:piece|section)|the tone|please|these tasks|it|this)\b/i.test(s)) return null;
    if (!/[a-z]{3}/i.test(s)) return null;
    return s.replace(/\.$/, '');
  }

  function findAudience(text) {
    var m = text.match(/(?:target audience|audience|readership|reader persona|written for|aimed at|for an audience of)\s*(?:is|are|:|-)?\s*([^\n.;]{3,90})/i);
    if (m) { var a = plausibleAudience(m[1]); if (a) return a; }
    var m2 = text.match(/\bfor\s+((?:small[- ]business owners|marketers|developers|investors|students|parents|beginners|executives|clinicians|teachers|founders|freelancers|homeowners|retail investors)[^\n.;]{0,40})/i);
    return m2 ? m2[1].trim() : null;
  }

  /* ---- tone ---- */
  function findTone(text) {
    var explicit = text.match(/(?:tone|voice|style)\s*(?:of voice)?\s*[:\-]\s*([^\n.;]{3,80})/i);
    var found = [];
    if (explicit) {
      TONES.forEach(function (t) { if (new RegExp('\\b' + t + '\\b', 'i').test(explicit[1])) found.push(t); });
      if (!found.length) found.push(explicit[1].trim().toLowerCase());
    }
    if (!found.length) {
      TONES.forEach(function (t) { if (new RegExp('\\b' + t + '\\b', 'i').test(text)) found.push(t); });
    }
    return U.unique(found).slice(0, 5);
  }

  /* ---- point of view ---- */
  function findPOV(text) {
    if (/\bfirst[- ]person\b|\bwrite as (?:i|me|we)\b|\bmy voice\b/i.test(text)) return 'first person';
    if (/\bsecond[- ]person\b|\baddress the reader\b|\buse ["“]?you["”]?\b/i.test(text)) return 'second person';
    if (/\bthird[- ]person\b|\bno first person\b|\bavoid ["“]?i["”]?\b/i.test(text)) return 'third person';
    return null;
  }

  /* ---- required elements (imperatives / bullets) ---- */
  var REQUIRE_RE = /\b(?:must|should|need to|needs to|please|make sure to|be sure to|ensure(?: that)?|required to|we(?:'| a)?re looking for|include|incorporate|add|cover|mention|use|provide|write|feature|contain|end with|start with|open with|close with|structure)\b/i;
  var FORBID_RE = /\b(?:do not|don'?t|avoid|never|no |without|refrain from|steer clear of|omit|exclude|not use|must not|should not|shouldn'?t|cannot|can'?t)\b/i;

  function splitInstructions(text) {
    var lines = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;
      var bullet = /^[-*•·▪◦]\s+|^\d+[.)]\s+|^[a-z][.)]\s+/i.test(trimmed);
      var body = trimmed.replace(/^[-*•·▪◦]\s+|^\d+[.)]\s+|^[a-z][.)]\s+/i, '');
      if (bullet) { lines.push({ text: body, bullet: true }); return; }
      U.splitSentences(body).forEach(function (s) { lines.push({ text: s, bullet: false }); });
    });
    return lines;
  }

  /* "No longer than 300 words" is a measurement, not a ban. Filing it under
     prohibitions buries the real prohibitions and reads as nonsense. */
  var LIMIT_RE = /\bno (?:more|longer|fewer|less|greater) than\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b|\bnot (?:to )?exceed\b|\bmaximum of\b|\bat most\b|\bup to\s+\d/i;

  /* "Citations do not count toward the word count" tells the writer what is
     exempt. It reads as a prohibition to a regex and as nonsense to a human. */
  var NOT_A_RULE_RE = /\bdo(?:es)? not count\b|\bare not (?:included|counted)\b|\bdo not apply\b/i;

  function findInstructions(text) {
    var required = [], forbidden = [];

    function file(t, bullet) {
      t = t.trim();
      if (t.length < 4) return;
      if (/^(?:tone|audience|word count|keywords?|deadline|due|format|title|client|budget|rate|deliverable)s?\s*[:\-]/i.test(t)) return;
      if (NOT_A_RULE_RE.test(t)) { required.push(t); return; }
      if (FORBID_RE.test(t) && !LIMIT_RE.test(t)) { forbidden.push(t); return; }
      if (bullet || REQUIRE_RE.test(t)) required.push(t);
    }

    splitInstructions(text).forEach(function (line) {
      var t = line.text.trim();
      /* The longest bullet is usually the one carrying the citation rules or
         the submission format. Splitting beats discarding. */
      if (t.length > 300) {
        U.splitSentences(t).forEach(function (sentence) {
          if (sentence.trim().length <= 300) file(sentence, line.bullet);
        });
        return;
      }
      file(t, line.bullet);
    });
    return { required: U.unique(required).slice(0, 40), forbidden: U.unique(forbidden).slice(0, 25) };
  }

  /* ---- banned terms stated explicitly ---- */
  function findBannedTerms(text) {
    var out = [];
    matchAll(/(?:do not use|don'?t use|avoid(?: using| the words?)?|never (?:use|say)|banned(?: words?| terms?)?|blacklist(?:ed)?)\s*[:\-]?\s*([^\n.]{2,160})/gi, text)
      .forEach(function (m) {
        var terms = [];
        /* A quoted phrase is one term however many words it holds, so pull those
           out before splitting the rest on commas and conjunctions. */
        var rest = m[1].replace(/["“']([^"”']{2,60})["”']/g, function (_, quoted) {
          terms.push(quoted);
          return ',';
        });
        rest.split(/[,;]|\s+(?:and|or)\s+/i).forEach(function (w) { terms.push(w); });

        terms.forEach(function (w) {
          w = String(w).replace(/["'“”]/g, '').trim()
            .replace(/^(?:the\s+)?(?:phrase|word|term|expression|cliché|cliche)s?\s+/i, '')
            .replace(/^(?:using|saying|any(?:thing)?\s+like)\s+/i, '')
            .replace(/[.,;:]+$/, '').trim();
          /* Pulling a quoted phrase out can leave its introducer behind
             ("do not use the phrase X" -> "the phrase"); that is not a term. */
          if (/^(?:the|a|an|any|some)?\s*(?:phrase|word|term|expression|cliché|cliche|language|wording)s?(?:\s+(?:like|such as))?$/i.test(w)) return;
          if (/^(?:the|a|an|any|and|or|of|to|it|is|be|use|using)$/i.test(w)) return;
          if (/^(?:such as|like|including|e\.?g\.?|i\.?e\.?|etc\.?)$/i.test(w)) return;
          if (w && w.split(/\s+/).length <= 5 && w.length > 1 && w.length < 40) out.push(w);
        });
      });
    return U.unique(out).slice(0, 25);
  }

  /* ---- structural asks ---- */
  function findStructure(text) {
    var s = {};
    var h2 = text.match(/(\d+)\s*(?:h2|subheading|sub[- ]head|section)s?\b/i);
    if (h2) s.sections = num(h2[1]);
    if (/\bmeta description\b/i.test(text)) s.metaDescription = true;
    if (/\btitle tag\b|\bseo title\b/i.test(text)) s.titleTag = true;
    var titles = text.match(/(\d+)\s*(?:headline|title)\s*(?:options|variations|ideas)/i);
    if (titles) s.titleOptions = num(titles[1]);
    if (/\bintroduction\b|\bintro\b/i.test(text)) s.intro = true;
    if (/\bconclusion\b|\bwrap[- ]up\b|\bsummary\b/i.test(text)) s.conclusion = true;
    if (/\bcall[- ]to[- ]action\b|\bcta\b/i.test(text)) s.cta = true;
    if (/\bfaq\b|\bfrequently asked\b/i.test(text)) s.faq = true;
    if (/\btable\b/i.test(text)) s.table = true;
    if (/\bbullet(?:ed)? (?:points?|lists?)\b/i.test(text)) s.bullets = true;
    if (/\bimages?\b|\bphotos?\b|\bvisuals?\b|\bgraphics?\b/i.test(text)) s.images = true;
    if (/\bquotes?\b|\binterview\b|\bexpert (?:opinion|comment)\b/i.test(text)) s.quotes = true;
    var links = text.match(/(\d+)\s*(?:internal|external|outbound|authoritative)?\s*links?\b/i);
    if (links) s.links = num(links[1]);
    /* "at least 2 APA or AMA-style citations" puts three words between the
       number and the noun, so allow a short adjective run. */
    var sources = text.match(/(\d+)\s*(?:[\w.–-]+\s+){0,4}?(?:sources?|references?|citations?)\b/i);
    if (sources) s.sources = num(sources[1]);
    var dims = text.match(/(\d{2,4})\s*[x×]\s*(\d{2,4})\s*(?:px|pixels)?\b/i);
    if (dims) s.imageSize = dims[1] + ' × ' + dims[2] + ' px';
    return s;
  }

  function findReadingLevel(text) {
    /* Briefs phrase this every which way: "reading level: 8", "keep the reading
       level around grade 8", "aim for an 8th-grade level", "write at a grade 9". */
    var patterns = [
      /(?:reading|grade|readability)\s*level\b[^.\n]{0,24}?(\d{1,2})\b/i,
      /\b(\d{1,2})(?:st|nd|rd|th)?[-\s]grade\b/i,
      /\bgrade\s+(\d{1,2})\b/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m) {
        var level = num(m[1]);
        if (level >= 1 && level <= 16) return level;
      }
    }
    if (/\bplain (?:english|language)\b|\beasy to read\b/i.test(text)) return 8;
    return null;
  }

  function findCitationStyle(text) {
    for (var i = 0; i < CITATION_STYLES.length; i++) {
      if (CITATION_STYLES[i][1].test(text)) return CITATION_STYLES[i][0];
    }
    return null;
  }

  /* SEO briefs state a density band and then check it. "1-2%" and "around 2%"
     both mean the same thing to a human and nothing at all to a word counter. */
  function findKeywordDensity(text) {
    var band = text.match(/(\d(?:\.\d)?)\s*(?:-|–|—|to)\s*(\d(?:\.\d)?)\s*%\s*(?:keyword )?densit|densit\w*\s*(?:of|:)?\s*(\d(?:\.\d)?)\s*(?:-|–|—|to)\s*(\d(?:\.\d)?)\s*%/i);
    if (band) {
      var lo = parseFloat(band[1] || band[3]), hi = parseFloat(band[2] || band[4]);
      if (lo > 0 && hi >= lo && hi <= 20) return { min: lo, max: hi };
    }
    var single = text.match(/densit\w*\s*(?:of|:)?\s*(?:around |about |approximately |roughly )?(\d(?:\.\d)?)\s*%/i) ||
      text.match(/(\d(?:\.\d)?)\s*%\s*(?:keyword )?densit/i);
    if (single) {
      var n = parseFloat(single[1]);
      if (n > 0 && n <= 20) return { min: Math.max(0.1, n - 0.5), max: n + 0.5 };
    }
    return null;
  }

  /* Portals reject files on the typeface and the extension before anyone reads
     a word, so these three details are worth pulling out of the prose and
     handing straight to the exporter. */
  function findSubmission(text) {
    var out = {};
    var family = text.match(/font[\s-]*family\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 ]{1,24}?)(?=[,.;\n]|$)/i) ||
      text.match(/\bin\s+(Calibri|Arial|Helvetica|Times New Roman|Georgia|Garamond|Verdana|Cambria|Book Antiqua|Courier New)\b/i) ||
      text.match(/\b(Calibri|Arial|Times New Roman|Georgia|Verdana|Cambria|Courier New)\b(?=[\s,]*(?:font|\d{1,2}\s*(?:pt|point)))/i);
    if (family) out.fontFamily = family[1].trim();
    var size = text.match(/font\s*size\s*[:\-]?\s*(\d{1,2})\b/i) || text.match(/\b(\d{1,2})\s*(?:pt|point)\b/i);
    if (size) { var n = num(size[1]); if (n >= 6 && n <= 36) out.fontSize = n; }
    var file = text.match(/\.(docx|doc|pdf|rtf|odt|md|txt)\b/i);
    if (file) out.fileFormat = '.' + file[1].toLowerCase();
    else if (/\bgoogle doc(?:ument)?s?\b/i.test(text)) out.fileFormat = 'Google Doc';
    return (out.fontFamily || out.fontSize || out.fileFormat) ? out : null;
  }

  function findFormat(text) {
    for (var i = 0; i < FORMATS.length; i++) if (FORMATS[i][1].test(text)) return FORMATS[i][0];
    return null;
  }

  /* Topics get dropped into noun slots in the style templates, so a leading
     "whether"/"if" reads badly ("If whether solar pays back…"). Trim it. */
  function cleanTopic(s) {
    return String(s).trim()
      .replace(/^["'“”]|["'“”.]$/g, '')
      /* Portal titles arrive as "Task #462-B — (300 words) How Salesforce…".
         The scaffolding is for the portal; the templates want the subject. */
      .replace(/^task\s*#?\s*[\w-]+\s*[–—:.-]?\s*/i, '')
      .replace(/^\(\s*\d[\d,]*\s*words?\s*\)\s*[–—:.-]?\s*/i, '')
      .replace(/^(?:whether(?: or not)?|if)\s+/i, '')
      .trim();
  }

  function findTopic(text, title) {
    var m = text.match(/(?:topic|subject|about|title|headline|working title|assignment)\s*[:\-]\s*([^\n]{3,120})/i);
    if (m) return cleanTopic(m[1]);
    if (title && title !== 'Untitled assignment') return cleanTopic(title);
    var first = U.splitSentences(String(text || '').trim())[0];
    return first ? first.slice(0, 120) : '';
  }

  function suggestPersona(text) {
    var scores = [];
    Object.keys(PERSONA_SIGNALS).forEach(function (id) {
      var hits = matchAll(PERSONA_SIGNALS[id], text).length;
      if (hits) scores.push({ id: id, score: hits });
    });
    scores.sort(function (a, b) { return b.score - a.score; });
    return scores.slice(0, 3);
  }

  /* ---- main entry ---- */
  function analyze(task) {
    var text = String(task.brief || '');
    var normalized = U.normalizeQuotes(text);
    var wc = findWordCount(normalized);
    var deadline = findDeadline(normalized);
    var keywords = findKeywords(normalized);
    var instructions = findInstructions(text);
    var structure = findStructure(normalized);
    var suggestions = suggestPersona(String(task.title || '') + '\n' + normalized);

    var meta = {
      topic: findTopic(text, task.title),
      format: findFormat(String(task.title || '') + '\n' + normalized),
      audience: findAudience(normalized),
      tone: findTone(normalized),
      pov: findPOV(normalized),
      wordCount: wc,
      deadline: deadline,
      keywords: keywords,
      citationStyle: findCitationStyle(normalized),
      readingLevel: findReadingLevel(normalized),
      banned: findBannedTerms(normalized),
      structure: structure,
      keywordDensity: findKeywordDensity(normalized),
      /* Most academic-ish briefs exempt the reference list from the count, and a
         writer who trims real copy to make room for it has lost words for free. */
      countExcludesCitations: /(?:citations?|references?|sources?|bibliograph\w*)[^.\n]{0,60}?(?:do|does|are|is)\s*n[o']t\s*(?:count|included|included in)/i.test(normalized) ||
        /(?:not count(?:ed)? toward|excluded from)[^.\n]{0,40}word count/i.test(normalized),
      submission: findSubmission(normalized),
      suggestedPersonas: suggestions
    };

    /* Build the machine-checkable requirement list. */
    var checks = [];
    function check(id, type, label, detail, severity) {
      checks.push({ id: id, type: type, label: label, detail: detail || '', severity: severity || 'must' });
    }

    if (wc) {
      check('wordcount', 'wordcount',
        wc.min && wc.max ? ('Word count ' + wc.min.toLocaleString() + '–' + wc.max.toLocaleString())
          : wc.min ? ('At least ' + wc.min.toLocaleString() + ' words')
            : ('No more than ' + wc.max.toLocaleString() + ' words'),
        'Found in the brief as “' + wc.raw + '”.');
    }
    var density = findKeywordDensity(normalized);
    keywords.forEach(function (k, i) {
      check('kw-' + i, 'keyword', 'Use the keyword “' + k.term + '”',
        density ? 'Target density ' + density.min + '–' + density.max + '%.'
          : k.primary ? 'Primary keyword — put it in the title, the first paragraph and at least one subheading.'
            : 'Secondary keyword — work it in naturally at least once.',
        k.primary ? 'must' : 'should');
    });
    meta.banned.forEach(function (b, i) {
      check('ban-' + i, 'banned', 'Never use “' + b + '”', 'The brief rules this out explicitly.');
    });
    if (meta.readingLevel) check('reading', 'reading', 'Reading level around grade ' + meta.readingLevel, 'Checked with Flesch–Kincaid.');
    if (structure.sections) check('sections', 'structure', 'At least ' + structure.sections + ' subheadings', 'Use H2s.');
    if (structure.intro) check('intro', 'structure', 'Include an introduction', '');
    if (structure.conclusion) check('conclusion', 'structure', 'Include a conclusion', '');
    if (structure.cta) check('cta', 'structure', 'Include a call to action', '');
    if (structure.faq) check('faq', 'structure', 'Include an FAQ section', '');
    if (structure.metaDescription) check('meta', 'deliverable', 'Supply a meta description', '150–160 characters.');
    if (structure.titleOptions) check('titles', 'deliverable', 'Supply ' + structure.titleOptions + ' headline options', '');
    if (structure.table) check('table', 'structure', 'Include a table', '');
    if (structure.bullets) check('bullets', 'structure', 'Include bulleted lists', '');
    if (structure.images) check('images', 'deliverable', 'Supply or specify images',
      (structure.imageSize ? 'Feature image ' + structure.imageSize + '. ' : '') + 'Use the royalty-free finder and log the licence.');
    if (structure.quotes) check('quotes', 'structure', 'Include quotes or expert comment', '');
    if (structure.links) check('links', 'structure', 'Include at least ' + structure.links + ' links', '');
    if (structure.sources) check('sources', 'structure', 'Cite at least ' + structure.sources + ' sources', '');
    if (meta.citationStyle) check('citestyle', 'citation', 'Use ' + meta.citationStyle + ' citation style', 'Set the citation generator to match.');
    if (meta.submission) {
      var sub = [];
      if (meta.submission.fileFormat) sub.push('Submit as ' + meta.submission.fileFormat);
      if (meta.submission.fontFamily) sub.push(meta.submission.fontFamily);
      if (meta.submission.fontSize) sub.push(meta.submission.fontSize + 'pt');
      check('submission', 'deliverable', sub.join(' · '), 'The export tab is pre-set to match.');
    }
    if (meta.pov) check('pov', 'voice', 'Write in ' + meta.pov, '');
    if (meta.tone.length) check('tone', 'voice', 'Tone: ' + meta.tone.join(', '), '');
    instructions.required.forEach(function (r, i) {
      check('req-' + i, 'instruction', r, '', 'must');
    });
    instructions.forbidden.forEach(function (f, i) {
      check('forbid-' + i, 'prohibition', f, '', 'must');
    });

    var coverage = 0;
    ['topic', 'format', 'audience', 'pov'].forEach(function (k) { if (meta[k]) coverage++; });
    if (wc) coverage++;
    if (deadline) coverage++;
    if (keywords.length) coverage++;
    if (meta.tone.length) coverage++;
    if (instructions.required.length) coverage++;

    return {
      meta: meta,
      instructions: instructions,
      checks: checks,
      confidence: Math.round((coverage / 9) * 100),
      analyzedAt: Date.now(),
      gaps: buildGaps(meta, instructions)
    };
  }

  function buildGaps(meta, instructions) {
    var gaps = [];
    if (!meta.wordCount) gaps.push('No word count stated — confirm the target length before drafting.');
    if (!meta.deadline) gaps.push('No deadline found — get one in writing.');
    if (!meta.audience) gaps.push('Audience is unstated. Ask who the reader is; it changes everything downstream.');
    if (!meta.tone.length) gaps.push('No tone specified — propose one and have the client confirm.');
    if (!meta.format) gaps.push('Deliverable format is ambiguous (article? memo? script?).');
    if (!instructions.required.length) gaps.push('The brief contains no explicit instructions — this is a scope-creep risk. Write your own spec and get sign-off.');
    if (!meta.citationStyle && /\bsource|\bcite|\bstudy|\bdata\b/i.test(JSON.stringify(meta))) {
      gaps.push('Sources are expected but no citation style is named — ask which one.');
    }
    return gaps;
  }

  FW.brief = { analyze: analyze, FORMATS: FORMATS, TONES: TONES };
})(window.FW);
