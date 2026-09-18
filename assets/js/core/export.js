/* Export: TXT, Markdown, HTML, DOCX (real OOXML zip), PDF (print), email, JSON. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util;

  /* ============ minimal ZIP writer (stored, no compression) ============ */
  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var out = [], s = unescape(encodeURIComponent(str));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return new Uint8Array(out);
  }

  function dosTime(date) {
    return ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2)) & 0xFFFF;
  }
  function dosDate(date) {
    return (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xFFFF;
  }

  function zip(files) {
    var now = new Date();
    var chunks = [], central = [], offset = 0;

    function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }

    files.forEach(function (file) {
      var nameBytes = utf8(file.name);
      var dataBytes = file.data instanceof Uint8Array ? file.data : utf8(file.data);
      var crc = crc32(dataBytes);
      var header = [].concat(
        u32(0x04034b50), u16(20), u16(0x0800), u16(0),
        u16(dosTime(now)), u16(dosDate(now)),
        u32(crc), u32(dataBytes.length), u32(dataBytes.length),
        u16(nameBytes.length), u16(0)
      );
      chunks.push(new Uint8Array(header), nameBytes, dataBytes);

      central.push([].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0),
        u16(dosTime(now)), u16(dosDate(now)),
        u32(crc), u32(dataBytes.length), u32(dataBytes.length),
        u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
        u32(0), u32(offset)
      ));
      central.push(nameBytes);
      offset += header.length + nameBytes.length + dataBytes.length;
    });

    var centralBytes = [], centralSize = 0;
    for (var i = 0; i < central.length; i++) {
      var part = central[i] instanceof Uint8Array ? central[i] : new Uint8Array(central[i]);
      centralBytes.push(part);
      centralSize += part.length;
    }
    var end = new Uint8Array([].concat(
      u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
      u32(centralSize), u32(offset), u16(0)
    ));

    return new Blob(chunks.concat(centralBytes, [end]), { type: 'application/zip' });
  }

  /* ============ HTML → plain text ============ */
  function htmlToText(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    var out = [];
    Array.prototype.forEach.call(div.childNodes, function (node) {
      out.push(blockText(node));
    });
    return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function blockText(node) {
    if (node.nodeType === 3) return node.nodeValue.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    var tag = node.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'ul' || tag === 'ol') {
      return Array.prototype.map.call(node.children, function (li, i) {
        return (tag === 'ol' ? (i + 1) + '. ' : '• ') + li.textContent.trim();
      }).join('\n');
    }
    if (/^h[1-6]$/.test(tag)) return node.textContent.trim();
    if (tag === 'blockquote') return node.textContent.trim().split(/\n+/).map(function (l) { return '> ' + l; }).join('\n');
    if (tag === 'div' || tag === 'p' || tag === 'section') {
      var inner = Array.prototype.map.call(node.childNodes, blockText).join('');
      return inner.trim();
    }
    return node.textContent;
  }

  /* ============ HTML → Markdown ============ */
  function htmlToMarkdown(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    var blocks = [];
    Array.prototype.forEach.call(div.childNodes, function (node) {
      var md = mdBlock(node);
      if (md !== null && md.trim() !== '') blocks.push(md);
    });
    return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function mdInline(node) {
    if (node.nodeType === 3) return node.nodeValue.replace(/([*_`])/g, '\\$1');
    if (node.nodeType !== 1) return '';
    var tag = node.tagName.toLowerCase();
    var inner = Array.prototype.map.call(node.childNodes, mdInline).join('');
    switch (tag) {
      case 'strong': case 'b': return '**' + inner + '**';
      case 'em': case 'i': return '*' + inner + '*';
      case 'u': return '<u>' + inner + '</u>';
      case 's': case 'strike': case 'del': return '~~' + inner + '~~';
      case 'code': return '`' + node.textContent + '`';
      case 'a': return '[' + inner + '](' + (node.getAttribute('href') || '') + ')';
      case 'br': return '  \n';
      case 'img': return '![' + (node.getAttribute('alt') || '') + '](' + (node.getAttribute('src') || '') + ')';
      case 'mark': return '==' + inner + '==';
      default: return inner;
    }
  }

  function mdBlock(node) {
    if (node.nodeType === 3) {
      var t = node.nodeValue.trim();
      return t ? t : null;
    }
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    var m = tag.match(/^h([1-6])$/);
    if (m) return new Array(Number(m[1]) + 1).join('#') + ' ' + mdInline(node).trim();
    if (tag === 'ul') {
      return Array.prototype.map.call(node.children, function (li) { return '- ' + mdInline(li).trim(); }).join('\n');
    }
    if (tag === 'ol') {
      return Array.prototype.map.call(node.children, function (li, i) { return (i + 1) + '. ' + mdInline(li).trim(); }).join('\n');
    }
    if (tag === 'blockquote') {
      return mdInline(node).trim().split(/\n+/).map(function (l) { return '> ' + l; }).join('\n');
    }
    if (tag === 'hr') return '---';
    if (tag === 'pre') return '```\n' + node.textContent.replace(/\s+$/, '') + '\n```';
    if (tag === 'table') return tableToMarkdown(node);
    if (tag === 'img') return mdInline(node);
    if (tag === 'div' || tag === 'p' || tag === 'section') {
      var parts = [];
      var buffer = [];
      Array.prototype.forEach.call(node.childNodes, function (child) {
        if (child.nodeType === 1 && /^(h[1-6]|ul|ol|blockquote|pre|table|hr|div|p)$/.test(child.tagName.toLowerCase())) {
          if (buffer.length) { parts.push(buffer.join('').trim()); buffer = []; }
          var sub = mdBlock(child);
          if (sub) parts.push(sub);
        } else buffer.push(mdInline(child));
      });
      if (buffer.length) parts.push(buffer.join('').trim());
      return parts.filter(Boolean).join('\n\n');
    }
    return mdInline(node).trim();
  }

  function tableToMarkdown(table) {
    var rows = Array.prototype.map.call(table.querySelectorAll('tr'), function (tr) {
      return Array.prototype.map.call(tr.children, function (cell) {
        return mdInline(cell).trim().replace(/\|/g, '\\|');
      });
    });
    if (!rows.length) return '';
    var header = rows[0];
    var sep = header.map(function () { return '---'; });
    return [header.join(' | '), sep.join(' | ')].concat(rows.slice(1).map(function (r) { return r.join(' | '); }))
      .map(function (r) { return '| ' + r + ' |'; }).join('\n');
  }

  /* ============ standalone HTML ============ */
  function standaloneHtml(bodyHtml, meta) {
    meta = meta || {};
    var font = meta.fontStack || 'Georgia, serif';
    return '<!doctype html>\n<html lang="' + (meta.lang || 'en') + '">\n<head>\n' +
      '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + U.escapeHtml(meta.title || 'Untitled') + '</title>\n' +
      (meta.description ? '<meta name="description" content="' + U.escapeHtml(meta.description) + '">\n' : '') +
      (meta.author ? '<meta name="author" content="' + U.escapeHtml(meta.author) + '">\n' : '') +
      '<style>\n' +
      ':root { color-scheme: light dark; }\n' +
      'body { font-family: ' + font + '; font-size: ' + (meta.size || 18) + 'px; line-height: ' + (meta.line || 1.7) +
      '; max-width: ' + (meta.width || 720) + 'px; margin: 3rem auto; padding: 0 1.25rem; color: #17171b; background: #fdfdfb; }\n' +
      '@media (prefers-color-scheme: dark) { body { color: #e8e6e1; background: #16161a; } a { color: #7dd3fc; } }\n' +
      'h1,h2,h3,h4 { line-height: 1.25; margin: 2em 0 .6em; }\n' +
      'h1 { font-size: 1.9em; margin-top: 0; }\n' +
      'blockquote { margin: 1.5em 0; padding-left: 1.1em; border-left: 3px solid currentColor; opacity: .85; }\n' +
      'img { max-width: 100%; height: auto; }\n' +
      'table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }\n' +
      'th, td { border: 1px solid rgba(128,128,128,.4); padding: .5em .7em; text-align: left; }\n' +
      'hr { border: none; border-top: 1px solid rgba(128,128,128,.35); margin: 2.5em 0; }\n' +
      '.doc-meta { font-size: .8em; opacity: .6; margin-bottom: 2.5rem; }\n' +
      '</style>\n</head>\n<body>\n' +
      (meta.showMeta === false ? '' : '<p class="doc-meta">' +
        [meta.author, meta.client, meta.date].filter(Boolean).map(U.escapeHtml).join(' · ') + '</p>\n') +
      bodyHtml + '\n</body>\n</html>\n';
  }

  /* ============ DOCX ============ */
  function xmlEscape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  /* Set for the duration of one htmlToDocxBody call; links belong to a package,
     not to a run, so the allocator lives one level up. */
  var linkRef = function () { return ''; };

  function runs(node, inherited) {
    inherited = inherited || {};
    var out = [];
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {
        var text = child.nodeValue.replace(/\s+/g, ' ');
        if (!text) return;
        out.push(runXml(text, inherited));
        return;
      }
      if (child.nodeType !== 1) return;
      var tag = child.tagName.toLowerCase();
      var props = Object.assign({}, inherited);
      if (tag === 'strong' || tag === 'b') props.bold = true;
      if (tag === 'em' || tag === 'i') props.italic = true;
      if (tag === 'u') props.underline = true;
      if (tag === 's' || tag === 'strike' || tag === 'del') props.strike = true;
      if (tag === 'code') props.mono = true;
      if (tag === 'a') {
        var href = child.getAttribute('href') || '';
        props.link = true;
        /* A relative path is how a writer points at another post on the
           client's blog, and briefs ask for those by the pair. Only absolute
           URLs became real hyperlinks, so an internal link arrived as plain
           words with its destination gone — while the compliance panel went on
           counting it. A requirement reported as met that the delivered file
           did not meet is worse than one reported as missing. */
        var linkable = href && !/^\s*javascript:/i.test(href) && href.charAt(0) !== '#';
        if (linkable) {
          out.push('<w:hyperlink r:id="' + xmlEscape(linkRef(href)) + '">' + runs(child, props) + '</w:hyperlink>');
          return;
        }
      }
      if (tag === 'br') { out.push('<w:r><w:br/></w:r>'); return; }
      out.push(runs(child, props));
    });
    return out.join('');
  }

  function runXml(text, props) {
    var rPr = '';
    if (props.bold) rPr += '<w:b/>';
    if (props.italic) rPr += '<w:i/>';
    if (props.underline) rPr += '<w:u w:val="single"/>';
    if (props.strike) rPr += '<w:strike/>';
    if (props.mono) rPr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>';
    if (props.link) rPr += '<w:color w:val="1155CC"/><w:u w:val="single"/>';
    return '<w:r>' + (rPr ? '<w:rPr>' + rPr + '</w:rPr>' : '') +
      '<w:t xml:space="preserve">' + xmlEscape(text) + '</w:t></w:r>';
  }

  var DATA_URL = /^data:image\/(png|jpe?g|gif|bmp|webp);base64,([A-Za-z0-9+/=\s]+)$/i;

  /* A pasted image arrives as a data URL, which is the only kind whose bytes
     are available without a network round trip from a file:// page. */
  function dataUrlBytes(src) {
    var m = DATA_URL.exec(String(src || '').trim());
    if (!m) return null;
    var ext = m[1].toLowerCase();
    if (ext === 'jpg') ext = 'jpeg';
    try {
      var binary = atob(m[2].replace(/\s+/g, ''));
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { ext: ext === 'jpeg' ? 'jpg' : ext, data: bytes };
    } catch (e) {
      return null;
    }
  }

  function para(content, style, extra) {
    return '<w:p><w:pPr>' + (style ? '<w:pStyle w:val="' + style + '"/>' : '') + (extra || '') + '</w:pPr>' + content + '</w:p>';
  }

  /* A link rendered as blue underlined text is not a link. Word carries the
     destination in a package relationship, so an <a href> has to add one — a
     brief that requires an outbound link is not satisfied by the styling. */
  function htmlToDocxBody(html, links, media) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    var out = [];
    links = links || [];
    media = media || [];

    function linkId(href) {
      for (var i = 0; i < links.length; i++) if (links[i].href === href) return links[i].id;
      var id = 'rIdL' + (links.length + 1);
      links.push({ id: id, href: href });
      return id;
    }

    function walk(node) {
      if (node.nodeType === 3) {
        if (node.nodeValue.trim()) out.push(para(runXml(node.nodeValue.replace(/\s+/g, ' '), {})));
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.tagName.toLowerCase();
      var h = tag.match(/^h([1-6])$/);
      if (h) { out.push(para(runs(node, { bold: false }), 'Heading' + h[1])); return; }
      /* runs() has no case for an image, so a picture inside a block produced
         an empty paragraph and vanished from the delivered file. This app's own
         image generator inserts <p><img ...></p>, so every feature image it
         made was dropped — while the compliance panel reported it present and
         listed for the client. A pasted photograph went the same way. */
      if ((tag === 'p' || tag === 'figure' || tag === 'figcaption') && node.querySelector('img')) {
        if (node.textContent.trim()) out.push(para(runs(node, {})));
        Array.prototype.forEach.call(node.querySelectorAll('img'), function (picture) {
          out.push(imageXml(picture));
        });
        return;
      }
      if (tag === 'p') { out.push(para(runs(node, {}))); return; }
      if (tag === 'ul' || tag === 'ol') { emitList(node, 0); return; }
      if (tag === 'blockquote') { out.push(para(runs(node, { italic: true }), 'Quote')); return; }
      /* Every line of a code block collapsed onto one. The whole point of the
         element is where the breaks fall. */
      if (tag === 'pre') {
        var lines = String(node.textContent).replace(/\s+$/, '').split('\n');
        out.push(para(lines.map(function (line, i) {
          return (i ? '<w:r><w:br/></w:r>' : '') + runXml(line, { mono: true });
        }).join('')));
        return;
      }
      if (tag === 'hr') { out.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>'); return; }
      if (tag === 'br') { out.push(para('<w:r><w:br/></w:r>')); return; }
      if (tag === 'table') { tableXml(node); return; }
      if (tag === 'img') { out.push(imageXml(node)); return; }
      if (tag === 'div' || tag === 'section' || tag === 'article') {
        if (Array.prototype.some.call(node.childNodes, function (c) {
          return c.nodeType === 1 && /^(p|h[1-6]|ul|ol|blockquote|div|table|hr)$/.test(c.tagName.toLowerCase());
        })) {
          Array.prototype.forEach.call(node.childNodes, walk);
        } else {
          out.push(para(runs(node, {})));
        }
        return;
      }
      out.push(para(runs(node, {})));
    }

    /* An <img> matched nothing in the walk and fell through to a paragraph of
       its text content, which an image has none of. Every brief on this desk
       asks for a feature image, and each one left without a trace: no picture,
       no alt text, no source for the client to go and find.

       A data URL carries its own bytes, so it can be embedded properly. A
       remote one cannot be fetched from here, so it becomes a line naming the
       image and where it lives. Neither is silent. */
    var EMU_PER_PX = 9525;
    var MAX_WIDTH_PX = 624;

    function imageXml(node) {
      var src = node.getAttribute('src') || '';
      var alt = (node.getAttribute('alt') || '').trim();
      var bytes = dataUrlBytes(src);
      if (!bytes) {
        /* A remote URL is worth printing — the client can go and fetch it. A
           data URI is not: it is the picture itself, and printing one put a
           wall of encoded bytes in the document where a photograph should be. */
        var source = /^\s*data:/i.test(src) ? '' : src;
        return para(runXml('[Image' + (alt ? ': ' + alt : '') + ']' +
          (source ? ' \u2014 ' + source : src ? ' \u2014 could not be embedded' : ''), { italic: true }));
      }
      var w = Number(node.getAttribute('width')) || node.naturalWidth || 480;
      var h = Number(node.getAttribute('height')) || node.naturalHeight || Math.round(w * 0.625);
      if (w > MAX_WIDTH_PX) { h = Math.round(h * (MAX_WIDTH_PX / w)); w = MAX_WIDTH_PX; }
      var id = media.length + 1;
      var name = 'image' + id + '.' + bytes.ext;
      media.push({ id: 'rIdI' + id, name: name, ext: bytes.ext, data: bytes.data });
      var cx = Math.max(1, Math.round(w * EMU_PER_PX)), cy = Math.max(1, Math.round(h * EMU_PER_PX));
      return '<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
        '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + id + '" name="Picture ' + id +
        '" descr="' + xmlEscape(alt) + '"/>' +
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        '<pic:nvPicPr><pic:cNvPr id="' + id + '" name="' + xmlEscape(name) + '" descr="' + xmlEscape(alt) + '"/>' +
        '<pic:cNvPicPr/></pic:nvPicPr>' +
        '<pic:blipFill><a:blip r:embed="rIdI' + id + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>' +
        '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
    }

    /* A list inside a list item is its own run of paragraphs. Rendering the
       item whole ran the nested text straight onto the end of its parent
       ("Second bulletA nested bullet") and lost one bullet entirely. */
    function emitList(list, level) {
      var ordered = list.tagName.toLowerCase() === 'ol';
      Array.prototype.forEach.call(list.children, function (li) {
        if (li.tagName.toLowerCase() !== 'li') return;
        var nested = Array.prototype.filter.call(li.children, function (c) {
          return /^(?:ul|ol)$/i.test(c.tagName);
        });
        nested.forEach(function (n) { li.removeChild(n); });
        out.push(para(runs(li, {}), ordered ? 'ListNumber' : 'ListBullet',
          '<w:numPr><w:ilvl w:val="' + Math.min(level, 8) + '"/><w:numId w:val="' + (ordered ? 2 : 1) + '"/></w:numPr>'));
        nested.forEach(function (n) { emitList(n, level + 1); });
      });
    }

    function tableXml(table) {
      var rows = table.querySelectorAll('tr');
      if (!rows.length) return;
      var xml = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/>' +
        '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (side) {
          return '<w:' + side + ' w:val="single" w:sz="4" w:space="0" w:color="999999"/>';
        }).join('') + '</w:tblBorders></w:tblPr>';
      Array.prototype.forEach.call(rows, function (tr) {
        xml += '<w:tr>';
        Array.prototype.forEach.call(tr.children, function (cell) {
          var bold = cell.tagName.toLowerCase() === 'th';
          xml += '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' +
            para(runs(cell, bold ? { bold: true } : {})) + '</w:tc>';
        });
        xml += '</w:tr>';
      });
      xml += '</w:tbl>' + para('');
      out.push(xml);
    }

    var previousRef = linkRef;
    linkRef = linkId;
    try {
      Array.prototype.forEach.call(div.childNodes, walk);
    } finally {
      linkRef = previousRef;
    }
    if (!out.length) out.push(para(''));
    return out.join('');
  }

  /* Clients specify the typeface and the point size, and a portal will bounce a
     file that ignores them — so the .docx has to carry whatever was asked for,
     not whatever the studio happens to be showing on screen. Word measures type
     in half-points, and headings scale from the body size rather than sitting at
     fixed sizes, so 14pt body copy does not end up with 20pt headings. */
  var DOCX_DEFAULT_FONT = 'Georgia';
  var DOCX_DEFAULT_PT = 12;
  /* walk() emits Heading1 through Heading6, so all six need a style. An h5
     referenced a style the package never defined and arrived as body text. */
  var HEADING_SCALE = { 1: 1.67, 2: 1.33, 3: 1.17, 4: 1.08, 5: 1, 6: 1 };

  function halfPoints(pt) {
    var n = Math.round(Number(pt) * 2);
    if (!isFinite(n) || n < 8) n = DOCX_DEFAULT_PT * 2;
    return Math.min(n, 320);
  }

  /* A stack is for CSS; Word wants one family name. Generic keywords
     ("ui-monospace", "sans-serif") are not families Word can resolve. */
  var GENERIC_FONTS = /^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-(?:serif|sans-serif|monospace|rounded))$/i;
  function docxFamily(stack) {
    var parts = String(stack || '').split(',');
    for (var i = 0; i < parts.length; i++) {
      var name = parts[i].replace(/["']/g, '').trim();
      if (name && !GENERIC_FONTS.test(name)) return name;
    }
    return DOCX_DEFAULT_FONT;
  }

  function docxStyles(font, pt) {
    var body = halfPoints(pt);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + xmlEscape(font) + '" w:hAnsi="' + xmlEscape(font) +
    '" w:cs="' + xmlEscape(font) + '"/><w:sz w:val="' + body + '"/><w:szCs w:val="' + body + '"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="180" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    [1, 2, 3, 4, 5, 6].map(function (n) {
      var size = Math.round(body * HEADING_SCALE[n] / 2) * 2;
      return '<w:style w:type="paragraph" w:styleId="Heading' + n + '"><w:name w:val="heading ' + n + '"/>' +
        '<w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="140"/><w:outlineLvl w:val="' + (n - 1) + '"/></w:pPr>' +
        '<w:rPr><w:b/><w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/></w:rPr></w:style>';
    }).join('') +
    '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/>' +
    '<w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/>' +
    '<w:pPr><w:ind w:left="720" w:hanging="360"/><w:spacing w:after="80"/></w:pPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="ListNumber"><w:name w:val="List Number"/><w:basedOn w:val="Normal"/>' +
    '<w:pPr><w:ind w:left="720" w:hanging="360"/><w:spacing w:after="80"/></w:pPr></w:style>' +
    '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style>' +
    '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/>' +
    '<w:rPr><w:color w:val="1155CC"/><w:u w:val="single"/></w:rPr></w:style>' +
    '</w:styles>';
  }

  var DOCX_NUMBERING = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/>' +
    '<w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>' +
    '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/>' +
    '<w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>' +
    '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
    '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>';

  function toDocx(html, meta) {
    meta = meta || {};
    var font = meta.docxFont || (meta.fontStack ? docxFamily(meta.fontStack) : DOCX_DEFAULT_FONT);
    var pt = meta.docxSize || DOCX_DEFAULT_PT;
    var links = [];
    var media = [];
    var body = htmlToDocxBody(html, links, media);
    var document_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"' +
      /* An inline picture is DrawingML inside WordprocessingML, so the drawing
         namespaces have to be declared on the document as well. */
      ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"' +
      ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"' +
      ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>' +
      '</w:sectPr></w:body></w:document>';

    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      media.filter(function (m, i, all) {
        return all.findIndex(function (x) { return x.ext === m.ext; }) === i;
      }).map(function (m) {
        var type = m.ext === 'jpg' ? 'jpeg' : m.ext;
        return '<Default Extension="' + xmlEscape(m.ext) + '" ContentType="image/' + xmlEscape(type) + '"/>';
      }).join('') +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '</Types>';

    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '</Relationships>';

    var docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
      links.map(function (l) {
        return '<Relationship Id="' + xmlEscape(l.id) +
          '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' +
          xmlEscape(l.href) + '" TargetMode="External"/>';
      }).join('') +
      media.map(function (m) {
        return '<Relationship Id="' + xmlEscape(m.id) +
          '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' +
          xmlEscape(m.name) + '"/>';
      }).join('') +
      '</Relationships>';

    var core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + xmlEscape(meta.title || 'Untitled') + '</dc:title>' +
      '<dc:creator>' + xmlEscape(meta.author || '') + '</dc:creator>' +
      '<cp:lastModifiedBy>' + xmlEscape(meta.author || '') + '</cp:lastModifiedBy>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString() + '</dcterms:created>' +
      '</cp:coreProperties>';

    return zip([
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rels },
      { name: 'docProps/core.xml', data: core },
      { name: 'word/document.xml', data: document_xml },
      { name: 'word/_rels/document.xml.rels', data: docRels },
      { name: 'word/styles.xml', data: docxStyles(font, pt) },
      { name: 'word/numbering.xml', data: DOCX_NUMBERING }
    ].concat(media.map(function (m) {
      return { name: 'word/media/' + m.name, data: m.data };
    })));
  }

  /* ============ PDF via the browser print dialog ============ */
  function printPdf(html, meta) {
    meta = meta || {};
    var win = window.open('', '_blank');
    if (!win) return false;
    var doc = standaloneHtml(html, Object.assign({}, meta, { showMeta: meta.showMeta }))
      .replace('</style>', '@page { margin: 20mm; }\n@media print { body { margin: 0; max-width: none; background: #fff; color: #000; } }\n</style>');
    win.document.open();
    win.document.write(doc);
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 350);
    return true;
  }

  /* ============ email ============ */
  function mailto(meta, text) {
    var body = text.length > 1800 ? text.slice(0, 1800) + '\n\n[…truncated — the full draft is attached or pasted below]' : text;
    return 'mailto:' + encodeURIComponent(meta.to || '') +
      '?subject=' + encodeURIComponent(meta.subject || meta.title || 'Draft') +
      '&body=' + encodeURIComponent((meta.intro ? meta.intro + '\n\n' : '') + body);
  }

  function emailHtml(html, meta) {
    /* Inline styles: email clients ignore <style> blocks inconsistently. */
    var div = document.createElement('div');
    div.innerHTML = html;
    Array.prototype.forEach.call(div.querySelectorAll('*'), function (node) {
      var tag = node.tagName.toLowerCase();
      if (tag === 'p') node.setAttribute('style', 'margin:0 0 16px;font-size:16px;line-height:1.6;color:#222;');
      if (/^h[1-3]$/.test(tag)) node.setAttribute('style', 'margin:28px 0 10px;line-height:1.25;color:#111;');
      if (tag === 'blockquote') node.setAttribute('style', 'margin:16px 0;padding-left:14px;border-left:3px solid #ccc;color:#555;');
      if (tag === 'li') node.setAttribute('style', 'margin:0 0 8px;font-size:16px;line-height:1.6;color:#222;');
      if (tag === 'a') node.setAttribute('style', 'color:#1155cc;');
    });
    return '<div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;padding:24px;">' +
      (meta && meta.title ? '<h1 style="font-size:26px;margin:0 0 18px;">' + U.escapeHtml(meta.title) + '</h1>' : '') +
      div.innerHTML + '</div>';
  }

  FW.exporter = {
    zip: zip, htmlToText: htmlToText, htmlToMarkdown: htmlToMarkdown,
    standaloneHtml: standaloneHtml, toDocx: toDocx, printPdf: printPdf,
    mailto: mailto, emailHtml: emailHtml, crc32: crc32,
    docxFamily: docxFamily, DOCX_DEFAULT_FONT: DOCX_DEFAULT_FONT, DOCX_DEFAULT_PT: DOCX_DEFAULT_PT
  };
})(window.FW);
