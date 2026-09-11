/* Citation generator: APA 7, MLA 9, Chicago (notes + author-date), Harvard, IEEE, Vancouver. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';

  var STYLES = [
    { id: 'apa', label: 'APA 7th' },
    { id: 'mla', label: 'MLA 9th' },
    { id: 'chicago-nb', label: 'Chicago (notes–bibliography)' },
    { id: 'chicago-ad', label: 'Chicago (author–date)' },
    { id: 'harvard', label: 'Harvard' },
    { id: 'ieee', label: 'IEEE' },
    { id: 'vancouver', label: 'Vancouver' }
  ];

  var TYPES = [
    { id: 'website', label: 'Web page', fields: ['authors', 'title', 'site', 'publisher', 'year', 'month', 'day', 'url', 'accessed'] },
    { id: 'article', label: 'Journal article', fields: ['authors', 'title', 'journal', 'volume', 'issue', 'pages', 'year', 'doi', 'url'] },
    { id: 'book', label: 'Book', fields: ['authors', 'title', 'edition', 'publisher', 'place', 'year', 'isbn'] },
    { id: 'chapter', label: 'Book chapter', fields: ['authors', 'title', 'editors', 'bookTitle', 'pages', 'publisher', 'place', 'year'] },
    { id: 'news', label: 'News article', fields: ['authors', 'title', 'site', 'year', 'month', 'day', 'url', 'accessed'] },
    { id: 'report', label: 'Report / white paper', fields: ['authors', 'title', 'publisher', 'number', 'year', 'url'] },
    { id: 'video', label: 'Video', fields: ['authors', 'title', 'site', 'year', 'month', 'day', 'url'] },
    { id: 'podcast', label: 'Podcast episode', fields: ['authors', 'title', 'site', 'year', 'month', 'day', 'url'] },
    { id: 'interview', label: 'Interview', fields: ['authors', 'title', 'interviewer', 'year', 'month', 'day', 'medium'] },
    { id: 'dataset', label: 'Dataset', fields: ['authors', 'title', 'publisher', 'year', 'version', 'doi', 'url'] },
    { id: 'social', label: 'Social media post', fields: ['authors', 'handle', 'title', 'site', 'year', 'month', 'day', 'url'] }
  ];

  var FIELD_LABELS = {
    authors: 'Author(s) — “Last, First” separated by semicolons',
    title: 'Title', site: 'Website / container', publisher: 'Publisher', place: 'Place of publication',
    journal: 'Journal', volume: 'Volume', issue: 'Issue', pages: 'Pages', year: 'Year',
    month: 'Month', day: 'Day', url: 'URL', doi: 'DOI', accessed: 'Date accessed',
    edition: 'Edition', isbn: 'ISBN', editors: 'Editor(s)', bookTitle: 'Book title',
    number: 'Report number', version: 'Version', interviewer: 'Interviewer', medium: 'Medium',
    handle: 'Handle (@name)'
  };

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  function parseAuthors(raw) {
    return String(raw || '').split(/;|\band\b|&/)
      .map(function (a) { return a.trim(); })
      .filter(Boolean)
      .map(function (a) {
        if (a.indexOf(',') !== -1) {
          var parts = a.split(',');
          return { last: parts[0].trim(), first: (parts[1] || '').trim() };
        }
        var words = a.split(/\s+/);
        if (words.length === 1) return { last: words[0], first: '', org: true };
        return { last: words.pop(), first: words.join(' ') };
      });
  }

  function initials(first) {
    return String(first || '').split(/[\s.-]+/).filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + '.'; }).join(' ');
  }

  function apaAuthors(list) {
    if (!list.length) return '';
    var names = list.map(function (a) {
      return a.org ? a.last : a.last + (a.first ? ', ' + initials(a.first) : '');
    });
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + ', & ' + names[1];
    if (names.length <= 20) return names.slice(0, -1).join(', ') + ', & ' + names[names.length - 1];
    return names.slice(0, 19).join(', ') + ', ... ' + names[names.length - 1];
  }

  function mlaAuthors(list) {
    if (!list.length) return '';
    var first = list[0].org ? list[0].last : list[0].last + (list[0].first ? ', ' + list[0].first : '');
    if (list.length === 1) return first;
    if (list.length === 2) return first + ', and ' + fullName(list[1]);
    return first + ', et al';
  }

  function fullName(a) { return (a.first ? a.first + ' ' : '') + a.last; }

  function chicagoAuthors(list, inverted) {
    if (!list.length) return '';
    var names = list.map(function (a, i) {
      if (a.org) return a.last;
      return (inverted && i === 0) ? a.last + (a.first ? ', ' + a.first : '') : fullName(a);
    });
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + (inverted ? ', and ' : ' and ') + names[1];
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  function ieeeAuthors(list) {
    if (!list.length) return '';
    var names = list.map(function (a) { return a.org ? a.last : initials(a.first) + ' ' + a.last; });
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + ' and ' + names[1];
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  function vancouverAuthors(list) {
    if (!list.length) return '';
    var names = list.slice(0, 6).map(function (a) {
      return a.org ? a.last : a.last + ' ' + String(initials(a.first)).replace(/[.\s]/g, '');
    });
    return names.join(', ') + (list.length > 6 ? ', et al' : '');
  }

  function dateParts(d) {
    var out = [];
    if (d.year) out.push(d.year);
    if (d.month) out.push(MONTHS[Number(d.month) - 1] || d.month);
    if (d.day) out.push(d.day);
    return out;
  }

  function clean(s) { return String(s == null ? '' : s).trim(); }
  function period(s) { return /[.!?]$/.test(s) ? s : s + '.'; }
  function join(parts, sep) { return parts.filter(function (p) { return p && String(p).trim(); }).join(sep || ' '); }

  function italic(s) { return { i: s }; }

  /* Each formatter returns plain text; the UI renders italics from the `<i>` markers. */
  function format(entry, styleId) {
    var d = entry || {};
    var authors = parseAuthors(d.authors);
    var year = clean(d.year) || 'n.d.';
    var title = clean(d.title);
    var site = clean(d.site) || clean(d.publisher);
    var url = clean(d.url);
    var doi = clean(d.doi);
    var accessed = clean(d.accessed);
    var pages = clean(d.pages);

    switch (styleId) {
      case 'apa': return apa();
      case 'mla': return mla();
      case 'chicago-nb': return chicagoNB();
      case 'chicago-ad': return chicagoAD();
      case 'harvard': return harvard();
      case 'ieee': return ieee();
      case 'vancouver': return vancouver();
      default: return apa();
    }

    function apa() {
      var a = apaAuthors(authors) || site || 'Anonymous';
      var dateStr = d.month ? year + ', ' + (MONTHS[Number(d.month) - 1] || d.month) + (d.day ? ' ' + d.day : '') : year;
      switch (d.type) {
        case 'article':
          return join([period(a), '(' + dateStr + ').', period(title),
            '<i>' + clean(d.journal) + '</i>' + (d.volume ? ', <i>' + d.volume + '</i>' : '') +
            (d.issue ? '(' + d.issue + ')' : '') + (pages ? ', ' + pages : '') + '.',
            doi ? 'https://doi.org/' + doi.replace(/^https?:\/\/doi\.org\//, '') : url]);
        case 'book':
          return join([period(a), '(' + year + ').', '<i>' + title + '</i>' + (d.edition ? ' (' + d.edition + ' ed.)' : '') + '.',
            period(clean(d.publisher))]);
        case 'chapter':
          return join([period(a), '(' + year + ').', period(title),
            'In ' + clean(d.editors) + ' (Ed.), <i>' + clean(d.bookTitle) + '</i>' + (pages ? ' (pp. ' + pages + ')' : '') + '.',
            period(clean(d.publisher))]);
        default:
          return join([period(a), '(' + dateStr + ').', '<i>' + title + '</i>.', period(site), url]);
      }
    }

    function mla() {
      var a = mlaAuthors(authors);
      var dateStr = dateParts({ year: d.year, month: d.month, day: d.day }).reverse().join(' ');
      switch (d.type) {
        case 'article':
          return join([a ? period(a) : '', '“' + period(title) + '”',
            '<i>' + clean(d.journal) + '</i>,' + (d.volume ? ' vol. ' + d.volume + ',' : '') +
            (d.issue ? ' no. ' + d.issue + ',' : '') + ' ' + year + (pages ? ', pp. ' + pages : '') + '.',
            doi ? 'https://doi.org/' + doi + '.' : (url ? url + '.' : '')]);
        case 'book':
          return join([a ? period(a) : '', '<i>' + period(title) + '</i>',
            (d.edition ? d.edition + ' ed., ' : '') + clean(d.publisher) + ', ' + year + '.']);
        default:
          return join([a ? period(a) : '', '“' + period(title) + '”', '<i>' + site + '</i>,',
            dateStr + ',', url + (accessed ? '. Accessed ' + accessed : '') + '.']);
      }
    }

    function chicagoNB() {
      var a = chicagoAuthors(authors, true);
      var dateStr = dateParts({ year: d.year, month: d.month, day: d.day });
      switch (d.type) {
        case 'book':
          return join([a ? period(a) : '', '<i>' + period(title) + '</i>',
            join([clean(d.place) ? clean(d.place) + ':' : '', clean(d.publisher) + ',', year + '.'])]);
        case 'article':
          return join([a ? period(a) : '', '“' + period(title) + '”', '<i>' + clean(d.journal) + '</i>',
            (d.volume || '') + (d.issue ? ', no. ' + d.issue : '') + ' (' + year + ')' + (pages ? ': ' + pages : '') + '.',
            doi ? 'https://doi.org/' + doi + '.' : '']);
        default:
          return join([a ? period(a) : '', '“' + period(title) + '”', '<i>' + site + '</i>,',
            (dateStr.length > 1 ? dateStr[1] + ' ' + (dateStr[2] || '') + ', ' : '') + year + '.', url + '.']);
      }
    }

    function chicagoAD() {
      var a = chicagoAuthors(authors, true);
      switch (d.type) {
        case 'book':
          return join([a ? period(a) : '', year + '.', '<i>' + period(title) + '</i>',
            join([clean(d.place) ? clean(d.place) + ':' : '', period(clean(d.publisher))])]);
        default:
          return join([a ? period(a) : '', year + '.', '“' + period(title) + '”',
            '<i>' + (clean(d.journal) || site) + '</i>' + (d.volume ? ' ' + d.volume : '') +
            (d.issue ? ' (' + d.issue + ')' : '') + (pages ? ': ' + pages : '') + '.', url]);
      }
    }

    function harvard() {
      var a = apaAuthors(authors).replace(/, & /g, ' and ').replace(/ & /g, ' and ') || site;
      switch (d.type) {
        case 'book':
          return join([a ? period(a) : '', year + '.', '<i>' + period(title) + '</i>',
            (d.edition ? d.edition + ' ed. ' : '') + join([clean(d.place) ? clean(d.place) + ':' : '', period(clean(d.publisher))])]);
        case 'article':
          return join([a ? period(a) : '', year + '.', period(title),
            '<i>' + clean(d.journal) + '</i>,' + (d.volume ? ' ' + d.volume : '') +
            (d.issue ? '(' + d.issue + ')' : '') + (pages ? ', pp. ' + pages : '') + '.']);
        default:
          return join([a ? period(a) : '', year + '.', '<i>' + period(title) + '</i>', site ? period(site) : '',
            url ? 'Available at: ' + url : '', accessed ? '[Accessed ' + accessed + '].' : '']);
      }
    }

    function ieee() {
      var a = ieeeAuthors(authors);
      switch (d.type) {
        case 'article':
          return join([a + ',', '“' + title + ',”', '<i>' + clean(d.journal) + '</i>,',
            (d.volume ? 'vol. ' + d.volume + ', ' : '') + (d.issue ? 'no. ' + d.issue + ', ' : '') +
            (pages ? 'pp. ' + pages + ', ' : '') + year + '.']);
        case 'book':
          return join([a + ',', '<i>' + title + '</i>.', join([clean(d.place) ? clean(d.place) + ':' : '', clean(d.publisher) + ',', year + '.'])]);
        default:
          return join([a ? a + ',' : '', '“' + title + ',”', site + ',', year + '.',
            url ? '[Online]. Available: ' + url : '', accessed ? '[Accessed: ' + accessed + '].' : '']);
      }
    }

    function vancouver() {
      var a = vancouverAuthors(authors);
      switch (d.type) {
        case 'article':
          return join([a + '.', period(title), clean(d.journal) + '.', year + ';' +
            (d.volume || '') + (d.issue ? '(' + d.issue + ')' : '') + (pages ? ':' + pages : '') + '.']);
        default:
          return join([a + '.', period(title), site ? period(site) : '', year + '.',
            url ? 'Available from: ' + url : '']);
      }
    }
  }

  function inText(entry, styleId, locator) {
    var authors = parseAuthors(entry.authors);
    var year = clean(entry.year) || 'n.d.';
    var name = authors.length
      ? (authors.length === 1 ? authors[0].last
        : authors.length === 2 ? authors[0].last + (styleId === 'apa' ? ' & ' : ' and ') + authors[1].last
          : authors[0].last + ' et al.')
      : (clean(entry.site) || clean(entry.title).slice(0, 30));

    switch (styleId) {
      case 'apa':
      case 'harvard':
        return '(' + name + ', ' + year + (locator ? ', p. ' + locator : '') + ')';
      case 'mla':
        return '(' + name + (locator ? ' ' + locator : '') + ')';
      case 'chicago-ad':
        return '(' + name + ' ' + year + (locator ? ', ' + locator : '') + ')';
      case 'chicago-nb':
        return '[footnote: ' + name + ', “' + clean(entry.title) + ',” ' + year + (locator ? ', ' + locator : '') + '.]';
      case 'ieee':
        return '[' + (entry.number || 'n') + ']';
      case 'vancouver':
        return '(' + (entry.number || 'n') + ')';
      default:
        return '(' + name + ', ' + year + ')';
    }
  }

  function sortKey(entry) {
    var a = parseAuthors(entry.authors);
    return (a.length ? a[0].last : clean(entry.site) || clean(entry.title)).toLowerCase();
  }

  function bibliography(entries, styleId) {
    var list = entries.slice();
    if (styleId === 'ieee' || styleId === 'vancouver') {
      list.forEach(function (e, i) { e.number = i + 1; });
    } else {
      list.sort(function (a, b) { return sortKey(a).localeCompare(sortKey(b)); });
    }
    return list.map(function (e, i) {
      var text = format(e, styleId);
      return (styleId === 'ieee' ? '[' + (i + 1) + '] ' : styleId === 'vancouver' ? (i + 1) + '. ' : '') + text;
    });
  }

  function headingFor(styleId) {
    if (styleId === 'mla') return 'Works Cited';
    if (styleId === 'chicago-nb') return 'Bibliography';
    if (styleId === 'ieee' || styleId === 'vancouver') return 'References';
    return 'References';
  }

  /* Best-effort metadata sniffing from a pasted URL or citation blob. */
  function sniff(input) {
    var out = {};
    var url = (String(input).match(/https?:\/\/\S+/) || [])[0];
    if (url) {
      out.url = url.replace(/[).,]+$/, '');
      try {
        var host = out.url.split('/')[2].replace(/^www\./, '');
        out.site = host.split('.').slice(0, -1).join('.').replace(/[-_]/g, ' ')
          .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      } catch (e) { /* malformed URL — leave site blank */ }
      var slug = out.url.split(/[?#]/)[0].split('/').filter(Boolean).pop() || '';
      if (slug && /[a-z]/i.test(slug) && slug.length > 8) {
        out.title = slug.replace(/\.(html?|php|aspx?)$/i, '').replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      }
      var y = out.url.match(/\/(20\d{2}|19\d{2})\//);
      if (y) out.year = y[1];
    }
    var doi = String(input).match(/\b10\.\d{4,9}\/[^\s"'<>]+/);
    if (doi) out.doi = doi[0];
    if (!out.year) {
      var yr = String(input).match(/\b(19|20)\d{2}\b/);
      if (yr) out.year = yr[0];
    }
    out.accessed = new Date().toISOString().slice(0, 10);
    return out;
  }

  FW.citations = {
    STYLES: STYLES, TYPES: TYPES, FIELD_LABELS: FIELD_LABELS,
    format: format, inText: inText, bibliography: bibliography,
    headingFor: headingFor, sniff: sniff, parseAuthors: parseAuthors
  };
})(window.FW);
