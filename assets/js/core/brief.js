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
    ['website content', /\bwebsite content\b|\bweb copy\b|\bsite content\b|\bweb page content\b/i],
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
    financial: /\bfinanc|\binvest|\bmarket\b|\bearnings\b|\bstock|\bbond|\bcrypto|\beconom|\bfintech\b|\bportfolio\b|\bbasis points?\b|\bfed\b|\bforex\b|\bcurrenc|\btrading\b|\byield|\bcentral bank\b|\bhedg/i,
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
    /* "between 1,500 and 1,800 words" joins its bounds with a word, not a dash,
       so the range test missed it and the single-number branch below built a
       band around 1,800 that ran to 1,980 — 180 words past the client's cap. */
    var between = text.match(/\bbetween\s+(\d[\d,]{1,7})\s+and\s+(\d[\d,]{1,7})\s*words?\b/i);
    if (between) return { min: num(between[1]), max: num(between[2]), raw: between[0] };
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

  /* A comma separates keywords, except when it is inside one: "allergy friendly
     restaurants in Bozeman, MT" is a single local-SEO phrase, and splitting it
     leaves the writer chasing a keyword called "MT". */
  var US_STATES = ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND ' +
    'OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC ' +
    'Alabama Alaska Arizona Arkansas California Colorado Connecticut Delaware Florida Georgia Hawaii Idaho Illinois ' +
    'Indiana Iowa Kansas Kentucky Louisiana Maine Maryland Massachusetts Michigan Minnesota Mississippi Missouri ' +
    'Montana Nebraska Nevada Ohio Oklahoma Oregon Pennsylvania Tennessee Texas Utah Vermont Virginia Washington ' +
    'Wisconsin Wyoming').split(/\s+/);
  var STATE_SET = {};
  US_STATES.forEach(function (st) { STATE_SET[st.toLowerCase()] = true; });

  function rejoinPlaceNames(parts) {
    var out = [];
    parts.forEach(function (part) {
      var trimmed = String(part).trim();
      var isState = STATE_SET[trimmed.toLowerCase()] ||
        /^(?:U\.?S\.?A?|UK|Canada)$/i.test(trimmed);
      if (out.length && trimmed && isState) {
        out[out.length - 1] = out[out.length - 1].trim() + ', ' + trimmed;
        return;
      }
      out.push(part);
    });
    return out;
  }

  /* ---- keywords ---- */
  function findKeywords(text) {
    var out = [];
    matchAll(/(?:primary |target |focus |main )?keywords?\s*[:\-]\s*([^\n]+)/gi, text).forEach(function (m) {
      rejoinPlaceNames(m[1].split(/[,;|]/)).forEach(function (k) {
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
      /* A tone word attached to a noun like "website" or "source" is describing
         something else — "an authoritative website" is not a house style. */
      var NOT_A_TONE = '(?!\\s+(?:website|site|sites|source|sources|domain|domains|article|articles|link|links|publication|publications|figure|figures))';
      TONES.forEach(function (t) {
        if (new RegExp('\\b' + t + '\\b' + NOT_A_TONE, 'i').test(text)) found.push(t);
      });
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
    /* "at least one H2 subheading" offered the scanner "2 subheading", and a
       brief asking for five sections was read as asking for two. A digit
       welded to a letter is part of a tag name, not a count. */
    var h2 = text.match(/(?:^|[^A-Za-z\d])(\d+)\s*(?:h2|h3|subheading|sub[- ]head|section)s?\b/i);
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
    var links = text.match(/(\d+)\s*(internal|external|outbound|authoritative)?\s*links?\b/i);
    if (links) {
      s.links = num(links[1]);
      /* "at least 2 internal links" is a different requirement from two links
         of any kind, and the draft can tell them apart by the href. */
      if (links[2] && /^internal$/i.test(links[2])) s.linksInternal = true;
    }

    /* "The keyword should link to an outside relevant article on an authoritative
       website at least once" — a requirement with no number in it, phrased as a
       verb, which a pattern looking for "N links" cannot see. */
    var linkOut = text.match(/\blinks?\s+(?:out\s+)?to\b[^.\n]{0,100}?\b(?:outside|external|authoritative|reputable|third[- ]party|high[- ]authority)\b/i) ||
      text.match(/\b(?:outbound|external)\s+links?\b/i);
    if (linkOut) {
      /* "at least once" belongs to the bullet about the link. Searching the
         whole brief found "at least 5 H2 sections" and asked for five
         outbound links. */
      var lineStart = text.lastIndexOf('\n', linkOut.index) + 1;
      var lineEnd = text.indexOf('\n', linkOut.index);
      var line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
      var howMany = line.match(/\bat least\s+(once|twice|\d+)\b/i);
      var n = 1;
      if (howMany) {
        var word = howMany[1].toLowerCase();
        n = word === 'once' ? 1 : word === 'twice' ? 2 : num(word);
      }
      s.externalLinks = Math.max(1, n);
      /* The rule is about the keyword itself carrying the link, not any link. */
      s.keywordLinks = /\bkeywords?\b[^.\n]{0,40}?\blinks?\b/i.test(text);
    }
    /* "at least 2 APA or AMA-style citations" puts three words between the
       number and the noun, so allow a short adjective run. */
    var sources = text.match(/(\d+)\s*(?:[\w.–-]+\s+){0,4}?(?:sources?|references?|citations?)\b/i);
    if (sources) s.sources = num(sources[1]);
    /* Long-form briefs carry length limits that a 300-word post never does, and
       a checklist that drops them leaves the writer to remember the numbers.
       "Supply a meta description" without its 155 is worse than saying nothing:
       it reads as met when the description is twice the length. */
    var CAP = '(?:no (?:more|longer|greater) than|no longer|longer than|under|at most|within|max(?:imum)?(?: of)?|up to)';
    var titleChars = text.match(new RegExp('\\btitle\\b[^.\\n]{0,40}?' + CAP + '\\s*(\\d{2,3})\\s*characters?', 'i'));
    if (titleChars) s.titleMaxChars = num(titleChars[1]);
    var metaChars = text.match(new RegExp('\\bmeta description\\b[^.\\n]{0,40}?' + CAP + '\\s*(\\d{2,3})\\s*characters?', 'i'));
    if (metaChars) s.metaMaxChars = num(metaChars[1]);
    var sectionWords = text.match(new RegExp('\\b(?:no|each|every)\\s+(?:h2\\s+)?section\\b[^.\\n]{0,40}?' + CAP + '\\s*(\\d{2,4})\\s*words?', 'i'));
    if (sectionWords) s.sectionMaxWords = num(sectionWords[1]);
    var faqCount = text.match(/\bfaq\b[^.\n]{0,60}?(?:at least|minimum(?: of)?|no fewer than)\s*(\d{1,2})\s*questions?/i);
    if (faqCount) s.faqQuestions = num(faqCount[1]);

    var dims = text.match(/(\d{2,4})\s*[x×]\s*(\d{2,4})\s*(?:px|pixels)?\b/i);
    if (dims) s.imageSize = dims[1] + ' × ' + dims[2] + ' px';
    return s;
  }

  var readingLevelIsCeiling = false;
  function findReadingLevel(text) {
    readingLevelIsCeiling = false;
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
        if (level >= 1 && level <= 16) {
          /* "grade 9 or below" is a wall, not a target. Writing more plainly
             than asked meets that brief; the symmetric band the checker used
             reported grade 7.4 against a grade 9 ceiling as a miss. */
          var around = text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 24);
          readingLevelIsCeiling = /\bor (?:below|lower|under|less)\b|\bno (?:higher|greater|more) than\b|\bat most\b|\bmaximum\b|\bunder\b/i.test(around);
          return level;
        }
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

  var NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  function numWord(s) {
    s = String(s).toLowerCase();
    return NUMBER_WORDS[s] !== undefined ? NUMBER_WORDS[s] : num(s);
  }

  /* Nearly every brief on a content portal has the same shape: "a breakdown of
     the 5 top-rated flight schools, including rates, course hours and course
     structure". The count and the per-item coverage are the whole assignment,
     and a piece that covers four of five is short however well it is written. */
  /* The count refers to the things being written about. "At least 2 APA-style
     citations" is a rule about the apparatus, not the subject matter. */
  var NOT_SUBJECT = /\b(?:citations?|references?|sources?|words?|images?|photos?|links?|lines?|paragraphs?|subheadings?|headings?|characters?|pages?|days?|formats?)\b/i;

  function findItemCount(text) {
    /* "discusses 3 current IP (intellectual property) legal issues" — the noun
       runs straight through a parenthetical gloss, and a character class that
       does not include brackets stops dead at one. The aside is for the reader,
       not for the count. */
    text = String(text).replace(/\s*\([^)]{0,80}\)/g, '');

    var patterns = [
      /\b(?:breakdown|rundown|description|overview|roundup|comparison|list)\s+(?:and breakdown\s+)?of\s+(?:the\s+)?(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b\s*([\w\s/'-]{0,70}?)(?=[,.]|\s+(?:in|for|that|which|from|with|to)\b|$)/gi,
      /\b(?:discuss(?:es|ing)?|cover(?:s|ing)?|compar(?:e|es|ing)|includ(?:e|es|ing)|featur(?:e|es|ing)|profil(?:e|es|ing))\s+(?:at least\s+)?(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+((?:other\s+)?[\w\s/'-]{2,70}?)(?=[,.]|\s+(?:in|for|that|which|from|with|or|to)\b|$)/gi,
      /\btop[- ](?:rated\s+)?(\d{1,2})\b\s*([\w\s/'-]{0,70}?)(?=[,.]|\s+(?:in|for|that|which)\b|$)/gi,
      /\bat least\s+(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\s+([\w\s/'-]{2,70}?)(?=[,.]|\s+(?:to|in|for|that|which|from|with)\b|$)/gi
    ];
    for (var i = 0; i < patterns.length; i++) {
      var candidates = matchAll(patterns[i], text);
      for (var j = 0; j < candidates.length; j++) {
        var m = candidates[j];
        var n = numWord(m[1]);
        if (!(n >= 2 && n <= 20)) continue;
        var noun = String(m[2] || '').replace(/\s+/g, ' ').trim()
          .replace(/^(?:top[- ]rated|other|new|different)\s+/i, '')
          /* "3 legal issues being discussed" — the participle describes the
             search, not the thing to write about. */
          .replace(/\s+(?:being|that (?:are|is)|which (?:are|is))\s+[\w-]+$/i, '');
        if (!noun) continue;
        /* "include at least 2 positive and 2 negative impacts" — a noun holding
           a second number means the capture ran across a compound requirement,
           and the count it found is not the one the piece is built on. The
           number has to stand alone: "B2B product offerings" is a noun. */
        if (/(?:^|\s)\d+(?:\s|$)/.test(noun)) continue;
        /* The disqualifying word can sit just past the capture: "2 APA or
           AMA-style citations" stops the noun at "APA". Read on a little. */
        var context = text.slice(m.index, m.index + m[0].length + 40);
        if (NOT_SUBJECT.test(noun) || NOT_SUBJECT.test(context)) continue;
        return { count: n, noun: noun };
      }
    }
    return null;
  }

  /* "at least 2 positive and 2 negative impacts" is not a count of things to
     write about — it is a requirement that they divide two ways. A piece with
     four upsides and no downsides meets "4 ways" and fails the brief. */
  function findBalance(text) {
    var NUM = '\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten';
    var re = new RegExp('\\bat least\\s+(' + NUM + ')\\s+([a-z-]{3,20})\\s+and\\s+(?:at least\\s+)?(' +
      NUM + ')\\s+([a-z-]{3,20})\\s+([a-z][\\w\\s-]{2,30}?)(?=[,.]|\\s+(?:that|which|to|for|in|from)\\b|$)', 'i');
    var m = text.match(re);
    if (!m) return [];
    var noun = m[5].replace(/\s+/g, ' ').trim();
    var first = numWord(m[1]), second = numWord(m[3]);
    if (!(first >= 1 && first <= 20 && second >= 1 && second <= 20)) return [];
    return [
      { count: first, label: m[2].toLowerCase(), noun: noun },
      { count: second, label: m[4].toLowerCase(), noun: noun }
    ];
  }

  /* "including rates, course hours and course structure/overview" — three things
     the client will look for by name. */
  function escapeRe(v) { return String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function findCoveragePoints(text, topic) {
    var points = [];
    /* "at least one feature dish from each restaurant" states a per-item
       requirement without ever saying "including". */
    matchAll(/\b(?:include|feature|name|profile)\s+at least\s+(?:one|two|three|\d+)\s+([\w\s-]{3,40}?)\s+(?:from|for|per)\s+each\b/gi, text)
      .forEach(function (hit) { points.push(hit[1].trim()); });

    /* "as well as a brief comparison of each model to the Tesla Model 3" — a
       named benchmark every item has to be measured against. The benchmark is
       the checkable part, so make it the requirement. */
    matchAll(/\b(?:comparison|compare[ds]?|comparing|benchmark(?:ed)?)\s+(?:of|to|against)?\s*each\s+[\w\s-]{2,30}?\s+(?:to|against|with)\s+(?:the\s+)?([\w.'’-]+(?:\s+[\w.'’-]+){0,3})/gi, text)
      .forEach(function (hit) {
        /* The capture can run past the end of the sentence and into the next
           label — "Tesla Model 3. Keywords". Cut at the sentence break. */
        var benchmark = hit[1].split(/\.\s/)[0].replace(/[.,;:]+$/, '').trim();
        /* A benchmark is a name. "each of them to the others" is not one. */
        if (!/[A-Z]/.test(benchmark)) return;
        /* "compare each of them to Salesforce" names the piece's own subject.
           A check the draft cannot fail tells the writer nothing, and it
           crowds out the ones that can.

           Whether it is the subject is decided by the brief, not by whatever
           the writer happened to type in the title box: a benchmark already
           named before the comparison clause is what the piece is about.
           "3 electric car models, as well as a comparison of each to the
           Tesla Model 3" names the Tesla for the first time right there. */
        var before = text.slice(0, hit.index);
        if (new RegExp('\\b' + escapeRe(benchmark) + '\\b', 'i').test(before)) return;
        if (topic && new RegExp('\\b' + escapeRe(benchmark) + '\\b', 'i').test(topic)) return;
        points.push(benchmark);
      });

    /* "covering 3 new offerings ... and how they may impact the current market"
       — a second requirement per item, hung off the end of the sentence as a
       clause. It is the argument the client is paying for, not a detail. */
    /* Without a modal to absorb, the capture began on the auxiliary and the
       checklist read "are continuing to differentiate themselves". Consume the
       whole verb run so the requirement starts where the content does. */
    matchAll(/\band how (?:they|these|it|this|the\s+\w+)\s+(?:(?:may|might|could|will|can|would|are|is|was|were|have|has|had|do|does|did)\s+)*([\w\s-]{4,60}?)(?=[,.]|\s+(?:in|for|that|which)\b|$)/gi, text)
      .forEach(function (hit) { points.push(hit[1].replace(/\s+/g, ' ').trim()); });

    /* The task line states requirements the standing guidelines never do, and
       two shapes of it went untracked: "should be relevant to X" and a plain
       "as well as Y" that is not hanging off an "including" clause.

       Both are read from the task line alone. The guidelines say "as well as
       two smaller royalty-free images" and "as well as bolded subheadings",
       which are the client's house rules, not this piece's requirements. */
    var taskLines = String(text).split('\n').filter(function (line) { return /^\s*task\s*#/i.test(line); });
    var taskLine = taskLines.length ? taskLines[taskLines.length - 1] : '';
    if (taskLine) {
      var relevant = taskLine.match(/\bshould (?:also\s+)?be\s+(relevant to [\w\s'’-]{4,50}?)(?=\s+as well as\b|[,.]|$)/i);
      if (relevant) points.push(relevant[1].replace(/\s+/g, ' ').trim());

      matchAll(/\bas well as\s+(?:a|an|the)?\s*([\w][\w\s\/'’-]{4,70}?)(?=[,.]|\s+(?:for|that|which)\b|$)/gi, taskLine)
        .forEach(function (hit) {
          var candidate = hit[1].replace(/\s+/g, ' ').trim();
          /* "a brief comparison of each model to the Tesla Model 3" is already
             on the list as "Tesla Model 3". The longer wrapper adds nothing. */
          var covered = points.some(function (existing) {
            return existing && candidate.toLowerCase().indexOf(existing.toLowerCase()) !== -1;
          });
          if (!covered) points.push(candidate);
        });
    }

    var m = text.match(/\bincluding\s+([^.\n]{4,160})/i);
    if (!m) return U.unique(points).slice(0, 6);
    return U.unique(points.concat(m[1].split(/\s*,\s*|\s+as well as\s+|\s+and\s+/i).map(function (part) {
      return part
        .replace(/^(?:a|an|the)\s+/i, '')
        /* "how these incorporate drones" is a requirement written as a clause.
           Strip the interrogative rather than discarding the requirement. */
        .replace(/^(?:how|why|what|when|where|which|that)\s+(?:these|this|they|it|the\b[\w]*)?\s*/i, '')
        .replace(/[.;:]+$/, '')
        .trim();
    }).filter(function (part) {
      return part.length >= 3 && part.length <= 70;
    }))).slice(0, 6);
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
      readingLevelCeiling: readingLevelIsCeiling,
      banned: findBannedTerms(normalized),
      structure: structure,
      keywordDensity: findKeywordDensity(normalized),
      items: findItemCount(normalized),
      balance: findBalance(normalized),
      coverage: findCoveragePoints(normalized, String(task.title || '') + ' ' + findTopic(text, task.title)),
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
    if (meta.readingLevel) {
      check('reading', 'reading',
        meta.readingLevelCeiling
          ? 'Reading level grade ' + meta.readingLevel + ' or below'
          : 'Reading level around grade ' + meta.readingLevel,
        'Checked with Flesch–Kincaid.');
    }
    if (structure.sections) check('sections', 'structure', 'At least ' + structure.sections + ' subheadings', 'Use H2s.');
    if (structure.intro) check('intro', 'structure', 'Include an introduction', '');
    if (structure.conclusion) check('conclusion', 'structure', 'Include a conclusion', '');
    if (structure.cta) check('cta', 'structure', 'Include a call to action', '');
    if (structure.faq) {
      check('faq', 'structure',
        structure.faqQuestions ? 'FAQ section with at least ' + structure.faqQuestions + ' questions' : 'Include an FAQ section', '');
    }
    if (structure.metaDescription) {
      check('meta', 'deliverable', 'Supply a meta description',
        structure.metaMaxChars ? 'No more than ' + structure.metaMaxChars + ' characters.' : '150–160 characters.');
    }
    if (structure.titleMaxChars) {
      check('title-length', 'structure', 'Title of no more than ' + structure.titleMaxChars + ' characters', 'Counted from the H1.');
    }
    if (structure.sectionMaxWords) {
      check('section-length', 'structure', 'No section longer than ' + structure.sectionMaxWords + ' words',
        'Measured between subheadings.');
    }
    if (structure.titleOptions) check('titles', 'deliverable', 'Supply ' + structure.titleOptions + ' headline options', '');
    if (structure.table) check('table', 'structure', 'Include a table', '');
    if (structure.bullets) check('bullets', 'structure', 'Include bulleted lists', '');
    if (meta.items) {
      check('items', 'structure', 'Cover ' + meta.items.count + ' ' + meta.items.noun,
        'The brief asks for ' + meta.items.count + '. Counted from subheadings and list items.');
    }
    meta.balance.forEach(function (side, i) {
      check('balance-' + i, 'deliverable',
        'At least ' + side.count + ' ' + side.label + ' ' + side.noun,
        'The brief asks for both sides; only you can judge which is which.');
    });
    meta.coverage.forEach(function (point, i) {
      check('cover-' + i, 'coverage', 'Cover “' + point + '”',
        meta.items ? 'The brief asks for this on each of the ' + meta.items.count + '.' : '');
    });
    if (structure.images) check('images', 'deliverable', 'Supply or specify images',
      (structure.imageSize ? 'Feature image ' + structure.imageSize + '. ' : '') + 'Use the royalty-free finder and log the licence.');
    if (structure.quotes) check('quotes', 'structure', 'Include quotes or expert comment', '');
    if (structure.links) {
      check('links', 'structure',
        'Include at least ' + structure.links + (structure.linksInternal ? ' internal links' : ' links'), '');
    }
    if (structure.externalLinks) {
      check('extlinks', 'structure',
        (structure.keywordLinks ? 'Link the keyword out to an authoritative source' : 'Link out to an authoritative source') +
          (structure.externalLinks > 1 ? ' (' + structure.externalLinks + ' times)' : ''),
        structure.keywordLinks ? 'The anchor text has to be the keyword itself.' : '');
    }
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

  /* The word-count ranges in which a keyword used n times sits inside the band.
     Returns the workable settings in order, cheapest use-count first. */
  function densityWindows(termWords, band, ceiling) {
    var out = [];
    for (var uses = 1; uses <= 6; uses++) {
      var occupied = uses * termWords * 100;
      var minWords = Math.ceil(occupied / band.max);
      var maxWords = Math.floor(occupied / band.min);
      if (maxWords < minWords) continue;
      if (ceiling && minWords > ceiling) break;
      out.push({ uses: uses, minWords: minWords, maxWords: ceiling ? Math.min(maxWords, ceiling) : maxWords });
    }
    return out;
  }

  function buildGaps(meta, instructions) {
    var gaps = [];

    /* Keyword density only moves in steps: a four-word phrase used once in a
       300-word piece is 1.33% and used twice is 2.67%, so a 1.5–2.5% band has
       no setting that satisfies it at that length. The writer would be told
       "thin", add a second mention, be told "stuffed", and have no way out —
       when the actual fix is to cut the piece to 266 words. */
    if (meta.keywordDensity && meta.wordCount && meta.wordCount.max) {
      (meta.keywords || []).forEach(function (k) {
        var termWords = String(k.term).trim().split(/\s+/).length;
        var windows = densityWindows(termWords, meta.keywordDensity, meta.wordCount.max);

        if (!windows.length) {
          var floorPct = (termWords / meta.wordCount.max) * 100;
          gaps.push('“' + k.term + '” is ' + termWords + ' words, so using it even once in ' +
            meta.wordCount.max + ' words is ' + floorPct.toFixed(1) + '% — above the ' +
            meta.keywordDensity.max + '% cap. The brief contradicts itself; ask which rule wins.');
          return;
        }

        /* The ceiling works, but only just: a four-word keyword at a 2% target
           in 325 words needs exactly two mentions and a piece of 320 words or
           more. Miss by five words and both mentions fall out of band. That is
           worth knowing before drafting, not after. */
        var atCeiling = windows.filter(function (w) { return meta.wordCount.max <= w.maxWords; });
        if (atCeiling.length) {
          var fit = atCeiling[0];
          var span = fit.maxWords - fit.minWords;
          /* Needing several mentions is not itself a problem — at 1,800 words a
             keyword lands five times across a 981-word window, which is no
             constraint at all. Narrowness is the thing worth raising before
             drafting, so let that decide alone. */
          if (span < meta.wordCount.max * 0.15) {
            gaps.push('“' + k.term + '” needs ' + fit.uses + ' mention' + (fit.uses === 1 ? '' : 's') +
              ' at this length, and only works between ' + fit.minWords + ' and ' + fit.maxWords +
              ' words — a ' + (span + 1) + '-word target. Plan the length before drafting.');
          }
          return;
        }
        if (!atCeiling.length) {
          var best = windows[0];
          gaps.push('“' + k.term + '” is ' + termWords + ' words. At ' + meta.wordCount.max +
            ' words, ' + best.uses + ' use is ' + ((best.uses * termWords / meta.wordCount.max) * 100).toFixed(2) +
            '% and ' + (best.uses + 1) + ' is ' + (((best.uses + 1) * termWords / meta.wordCount.max) * 100).toFixed(2) +
            '% — neither lands in ' + meta.keywordDensity.min + '–' + meta.keywordDensity.max +
            '%. Using it ' + best.uses + ' time needs the piece to run ' + best.minWords + '–' + best.maxWords + ' words.');
        }
      });
    }
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

  FW.brief = { analyze: analyze, densityWindows: densityWindows, FORMATS: FORMATS, TONES: TONES };
})(window.FW);
