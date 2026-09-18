/* Local image generator. Produces SVG (and PNG via canvas) with no network calls,
 * so everything it makes is yours to use — no licence to track. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util;

  var PALETTES = [
    { id: 'ink', label: 'Ink & Paper', bg: '#f6f4ef', fg: '#16161a', accent: '#c2410c', muted: '#8a8578' },
    { id: 'midnight', label: 'Midnight', bg: '#0f172a', fg: '#f8fafc', accent: '#38bdf8', muted: '#64748b' },
    { id: 'forest', label: 'Forest', bg: '#0f2417', fg: '#eefbf3', accent: '#4ade80', muted: '#3f6b52' },
    { id: 'ember', label: 'Ember', bg: '#1c1109', fg: '#fff7ed', accent: '#fb923c', muted: '#7c5637' },
    { id: 'bloom', label: 'Bloom', bg: '#fdf2f8', fg: '#500724', accent: '#db2777', muted: '#be push' },
    { id: 'slate', label: 'Slate', bg: '#e2e8f0', fg: '#0f172a', accent: '#2563eb', muted: '#64748b' },
    { id: 'sand', label: 'Sand', bg: '#faf5eb', fg: '#3f2d13', accent: '#b45309', muted: '#a8a29e' },
    { id: 'mono', label: 'Monochrome', bg: '#ffffff', fg: '#111111', accent: '#111111', muted: '#9ca3af' },
    { id: 'teal', label: 'Deep Teal', bg: '#042f2e', fg: '#ecfeff', accent: '#2dd4bf', muted: '#0f766e' },
    { id: 'plum', label: 'Plum', bg: '#2e1065', fg: '#f5f3ff', accent: '#c4b5fd', muted: '#6d28d9' }
  ];
  PALETTES[4].muted = '#be185d';

  var SIZES = [
    { id: 'featured', label: 'Featured image (1200×675)', w: 1200, h: 675 },
    { id: 'social', label: 'Social / OG card (1200×630)', w: 1200, h: 630 },
    { id: 'square', label: 'Square post (1080×1080)', w: 1080, h: 1080 },
    { id: 'story', label: 'Story / Reel (1080×1920)', w: 1080, h: 1920 },
    { id: 'pin', label: 'Pinterest (1000×1500)', w: 1000, h: 1500 },
    { id: 'banner', label: 'Wide banner (1600×400)', w: 1600, h: 400 },
    { id: 'cover', label: 'Book cover (1600×2400)', w: 1600, h: 2400 },
    { id: 'inline', label: 'Inline figure (800×450)', w: 800, h: 450 }
  ];

  var PATTERNS = [
    { id: 'mesh', label: 'Mesh gradient' },
    { id: 'waves', label: 'Layered waves' },
    { id: 'topo', label: 'Topographic lines' },
    { id: 'grid', label: 'Engineering grid' },
    { id: 'blobs', label: 'Organic blobs' },
    { id: 'rays', label: 'Radial rays' },
    { id: 'halftone', label: 'Halftone dots' },
    { id: 'strata', label: 'Sedimentary strata' },
    { id: 'plain', label: 'Plain field' }
  ];

  var LAYOUTS = [
    { id: 'hero', label: 'Title card' },
    { id: 'quote', label: 'Pull quote' },
    { id: 'stat', label: 'Stat callout' },
    { id: 'chapter', label: 'Chapter divider' },
    { id: 'cover', label: 'Cover mock' },
    { id: 'blank', label: 'Background only' }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function wrap(text, maxChars) {
    var words = String(text || '').split(/\s+/).filter(Boolean);
    var lines = [], line = '';
    words.forEach(function (w) {
      if (!line.length) line = w;
      else if ((line + ' ' + w).length <= maxChars) line += ' ' + w;
      else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines;
  }

  /* ---------- background patterns ---------- */
  function background(pattern, p, w, h, rnd) {
    var out = [];
    out.push('<rect width="' + w + '" height="' + h + '" fill="' + p.bg + '"/>');

    function blob(cx, cy, r, fill, opacity) {
      return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) +
        '" fill="' + fill + '" opacity="' + opacity + '"/>';
    }

    switch (pattern) {
      case 'mesh':
        out.push('<defs><filter id="blur"><feGaussianBlur stdDeviation="' + (Math.min(w, h) / 9).toFixed(0) + '"/></filter></defs>');
        out.push('<g filter="url(#blur)">');
        for (var i = 0; i < 6; i++) {
          out.push(blob(rnd() * w, rnd() * h, Math.min(w, h) * (0.22 + rnd() * 0.3),
            i % 2 ? p.accent : p.muted, (0.35 + rnd() * 0.4).toFixed(2)));
        }
        out.push('</g>');
        break;

      case 'waves':
        for (var k = 0; k < 5; k++) {
          var base = h * (0.45 + k * 0.11);
          var amp = h * (0.05 + rnd() * 0.06);
          var d = 'M0,' + base.toFixed(0);
          for (var x = 0; x <= w; x += w / 8) {
            d += ' Q' + (x + w / 16).toFixed(0) + ',' + (base + (x / (w / 8) % 2 ? amp : -amp)).toFixed(0) +
              ' ' + (x + w / 8).toFixed(0) + ',' + base.toFixed(0);
          }
          d += ' L' + w + ',' + h + ' L0,' + h + ' Z';
          out.push('<path d="' + d + '" fill="' + (k % 2 ? p.accent : p.muted) + '" opacity="' + (0.16 + k * 0.08).toFixed(2) + '"/>');
        }
        break;

      case 'topo':
        for (var t = 0; t < 16; t++) {
          var cy = h * (0.5 + (rnd() - 0.5) * 0.2);
          var path = 'M-20,' + (cy + t * (h / 26)).toFixed(0);
          for (var xx = 0; xx <= w + 20; xx += w / 12) {
            path += ' Q' + (xx + w / 24).toFixed(0) + ',' + (cy + t * (h / 26) + (rnd() - 0.5) * h * 0.09).toFixed(0) +
              ' ' + (xx + w / 12).toFixed(0) + ',' + (cy + t * (h / 26)).toFixed(0);
          }
          out.push('<path d="' + path + '" fill="none" stroke="' + p.accent + '" stroke-width="1.5" opacity="' + (0.10 + (t % 4) * 0.05).toFixed(2) + '"/>');
        }
        break;

      case 'grid':
        var step = Math.round(Math.min(w, h) / 22);
        for (var gx = 0; gx <= w; gx += step) {
          out.push('<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + h + '" stroke="' + p.muted + '" stroke-width="1" opacity="0.18"/>');
        }
        for (var gy = 0; gy <= h; gy += step) {
          out.push('<line x1="0" y1="' + gy + '" x2="' + w + '" y2="' + gy + '" stroke="' + p.muted + '" stroke-width="1" opacity="0.18"/>');
        }
        out.push('<rect x="' + (step * 2) + '" y="' + (step * 2) + '" width="' + (w - step * 4) + '" height="' + (h - step * 4) +
          '" fill="none" stroke="' + p.accent + '" stroke-width="2" opacity="0.5"/>');
        break;

      case 'blobs':
        for (var b = 0; b < 9; b++) {
          out.push(blob(rnd() * w, rnd() * h, Math.min(w, h) * (0.05 + rnd() * 0.16),
            b % 3 === 0 ? p.accent : p.muted, (0.12 + rnd() * 0.25).toFixed(2)));
        }
        break;

      case 'rays':
        var cxr = w * 0.5, cyr = h * 0.55, R = Math.max(w, h);
        for (var a = 0; a < 28; a++) {
          var ang = (a / 28) * Math.PI * 2;
          var ang2 = ang + Math.PI / 34;
          out.push('<path d="M' + cxr + ',' + cyr + ' L' + (cxr + Math.cos(ang) * R).toFixed(0) + ',' + (cyr + Math.sin(ang) * R).toFixed(0) +
            ' L' + (cxr + Math.cos(ang2) * R).toFixed(0) + ',' + (cyr + Math.sin(ang2) * R).toFixed(0) + ' Z" fill="' + p.accent +
            '" opacity="' + (a % 2 ? 0.07 : 0.13) + '"/>');
        }
        break;

      case 'halftone':
        var cols = 26, rows = Math.round(cols * h / w);
        for (var r2 = 0; r2 < rows; r2++) {
          for (var c2 = 0; c2 < cols; c2++) {
            var fx = (c2 + 0.5) / cols, fy = (r2 + 0.5) / rows;
            var rad = (1 - fy) * (Math.min(w, h) / cols) * 0.55 * (0.4 + rnd() * 0.8);
            if (rad < 0.4) continue;
            out.push('<circle cx="' + (fx * w).toFixed(1) + '" cy="' + (fy * h).toFixed(1) + '" r="' + rad.toFixed(1) +
              '" fill="' + p.accent + '" opacity="0.3"/>');
          }
        }
        break;

      case 'strata':
        var y = 0;
        while (y < h) {
          var band = h * (0.03 + rnd() * 0.09);
          out.push('<rect x="0" y="' + y.toFixed(0) + '" width="' + w + '" height="' + band.toFixed(0) +
            '" fill="' + (rnd() > 0.5 ? p.accent : p.muted) + '" opacity="' + (0.06 + rnd() * 0.18).toFixed(2) + '"/>');
          y += band;
        }
        break;
    }
    return out.join('');
  }

  /* ---------- layouts ---------- */
  function layout(kind, o, p, w, h) {
    var out = [];
    var pad = Math.round(Math.min(w, h) * 0.09);
    var font = o.fontStack || 'Georgia, serif';
    var maxChars = Math.max(12, Math.round((w - pad * 2) / (Math.min(w, h) * 0.052)));

    function textBlock(lines, y, size, weight, fill, anchor, x) {
      var lh = size * 1.16;
      return lines.map(function (line, i) {
        return '<text x="' + (x !== undefined ? x : (anchor === 'middle' ? w / 2 : pad)) + '" y="' + (y + i * lh).toFixed(0) +
          '" font-family="' + esc(font) + '" font-size="' + size.toFixed(0) + '" font-weight="' + weight +
          '" fill="' + fill + '" text-anchor="' + (anchor || 'start') + '">' + esc(line) + '</text>';
      }).join('');
    }

    if (kind === 'blank') return '';

    if (kind === 'quote') {
      var qSize = Math.min(w, h) * 0.068;
      var qLines = wrap(o.title, Math.round(maxChars * 0.85));
      var blockH = qLines.length * qSize * 1.16;
      out.push('<text x="' + pad + '" y="' + (h / 2 - blockH / 2 - qSize * 0.6).toFixed(0) + '" font-family="' + esc(font) +
        '" font-size="' + (qSize * 2.4).toFixed(0) + '" fill="' + p.accent + '" opacity="0.55">&#8220;</text>');
      out.push(textBlock(qLines, h / 2 - blockH / 2 + qSize, qSize, '400', p.fg, 'start'));
      if (o.subtitle) {
        out.push(textBlock(['— ' + o.subtitle], h / 2 + blockH / 2 + qSize * 1.4, qSize * 0.45, '600', p.accent, 'start'));
      }
      return out.join('');
    }

    if (kind === 'stat') {
      var statSize = Math.min(w, h) * 0.3;
      out.push('<text x="' + (w / 2) + '" y="' + (h * 0.52).toFixed(0) + '" font-family="' + esc(font) +
        '" font-size="' + statSize.toFixed(0) + '" font-weight="700" fill="' + p.accent +
        '" text-anchor="middle">' + esc(o.stat || o.title || '42%') + '</text>');
      out.push(textBlock(wrap(o.subtitle || o.title, Math.round(maxChars * 1.1)), h * 0.66, Math.min(w, h) * 0.048, '400', p.fg, 'middle'));
      if (o.source) {
        out.push(textBlock(['Source: ' + o.source], h - pad * 0.6, Math.min(w, h) * 0.028, '400', p.muted, 'middle'));
      }
      return out.join('');
    }

    if (kind === 'chapter') {
      out.push('<line x1="' + (w * 0.3) + '" y1="' + (h * 0.44) + '" x2="' + (w * 0.7) + '" y2="' + (h * 0.44) +
        '" stroke="' + p.accent + '" stroke-width="2"/>');
      out.push(textBlock([o.subtitle || 'Chapter'], h * 0.4, Math.min(w, h) * 0.04, '600', p.accent, 'middle'));
      out.push(textBlock(wrap(o.title, Math.round(maxChars * 0.9)), h * 0.56, Math.min(w, h) * 0.07, '400', p.fg, 'middle'));
      return out.join('');
    }

    if (kind === 'cover') {
      out.push('<rect x="' + pad * 0.5 + '" y="' + pad * 0.5 + '" width="' + (w - pad) + '" height="' + (h - pad) +
        '" fill="none" stroke="' + p.accent + '" stroke-width="3" opacity="0.7"/>');
      out.push(textBlock(wrap(o.title, 16), h * 0.3, Math.min(w, h) * 0.085, '700', p.fg, 'middle'));
      if (o.subtitle) out.push(textBlock(wrap(o.subtitle, 30), h * 0.52, Math.min(w, h) * 0.035, '400', p.muted, 'middle'));
      if (o.author) out.push(textBlock([o.author], h * 0.86, Math.min(w, h) * 0.042, '600', p.accent, 'middle'));
      return out.join('');
    }

    /* hero */
    var titleSize = Math.min(w, h) * (h > w ? 0.072 : 0.085);
    var titleLines = wrap(o.title, maxChars);
    var startY = h * 0.5 - (titleLines.length - 1) * titleSize * 0.58;
    if (o.kicker) {
      out.push(textBlock([o.kicker.toUpperCase()], startY - titleSize * 1.3, titleSize * 0.33, '700', p.accent, 'start'));
    }
    out.push(textBlock(titleLines, startY, titleSize, '700', p.fg, 'start'));
    if (o.subtitle) {
      out.push(textBlock(wrap(o.subtitle, Math.round(maxChars * 1.5)),
        startY + titleLines.length * titleSize * 1.16 + titleSize * 0.25, titleSize * 0.4, '400', p.muted, 'start'));
    }
    out.push('<rect x="' + pad + '" y="' + (startY - titleSize * (o.kicker ? 2.3 : 1.1)).toFixed(0) +
      '" width="' + (titleSize * 1.6).toFixed(0) + '" height="' + (titleSize * 0.14).toFixed(0) + '" fill="' + p.accent + '"/>');
    return out.join('');
  }

  function generate(opts) {
    opts = opts || {};
    var size = SIZES.filter(function (s) { return s.id === (opts.size || 'featured'); })[0] || SIZES[0];
    var w = opts.width || size.w, h = opts.height || size.h;
    var p = PALETTES.filter(function (x) { return x.id === (opts.palette || 'ink'); })[0] || PALETTES[0];
    var seedStr = (opts.seed || opts.title || 'quill') + '|' + (opts.pattern || 'mesh') + '|' + (opts.variant || 0);
    var rnd = U.seeded(seedStr);

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(opts.title || 'Generated artwork') + '">' +
      background(opts.pattern || 'mesh', p, w, h, rnd) +
      layout(opts.layout || 'hero', opts, p, w, h) +
      '</svg>';

    return { svg: svg, width: w, height: h, palette: p, seed: seedStr };
  }

  /* Rasterise the SVG in-browser. Returns a Promise<Blob>. */
  function toPng(svg, width, height, scale) {
    return toRaster(svg, width, height, scale, 'image/png');
  }

  /* A download wants a lossless PNG. A picture going into the draft has to live
     in localStorage, be copied into every version snapshot and travel inside
     the .docx, and a generated feature image as PNG runs to about 700 KB — the
     three a brief asks for filled 4.2 MB of a 5 MB store. The same picture as
     JPEG is a tenth of that, and these are flat gradients with no transparency
     to lose. */
  function toRaster(svg, width, height, scale, type, quality) {
    return new Promise(function (resolve, reject) {
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(width * (scale || 1));
      canvas.height = Math.round(height * (scale || 1));
      var ctx = canvas.getContext('2d');
      var img = new Image();
      /* A data: URL keeps the canvas untainted, so toBlob works. */
      img.onload = function () {
        if (type === 'image/jpeg') {
          /* JPEG has no alpha: paint the sheet white first or it comes out black. */
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error('Could not rasterise the image.'));
        }, type || 'image/png', quality);
      };
      img.onerror = function () { reject(new Error('Could not load the generated SVG.')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  function dataUri(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- royalty-free sourcing ---------- */
  function searchLinks(query) {
    return FW.resources.LIBRARIES.images.items.map(function (item) {
      return {
        name: item.name,
        note: item.note,
        url: item.url + encodeURIComponent(query || '')
      };
    });
  }

  function attribution(data, format) {
    var title = data.title || 'Untitled';
    var author = data.author || 'Unknown author';
    var source = data.source || '';
    var licence = data.licence || 'see source page';
    var url = data.url || '';

    switch (format) {
      case 'html':
        return '<p class="image-credit">' +
          (url ? '<a href="' + url + '">' + title + '</a>' : title) +
          ' by ' + author + (source ? ' via ' + source : '') + ' — ' + licence + '</p>';
      case 'markdown':
        return '*' + (url ? '[' + title + '](' + url + ')' : title) + ' by ' + author +
          (source ? ' via ' + source : '') + ' — ' + licence + '*';
      case 'caption':
        return title + ' / ' + author + (source ? ' / ' + source : '') + ' / ' + licence;
      default:
        return '“' + title + '” by ' + author + (source ? ', via ' + source : '') +
          ', licensed under ' + licence + (url ? '. ' + url : '.');
    }
  }

  FW.imagegen = {
    PALETTES: PALETTES, SIZES: SIZES, PATTERNS: PATTERNS, LAYOUTS: LAYOUTS,
    generate: generate, toPng: toPng, toRaster: toRaster, dataUri: dataUri,
    searchLinks: searchLinks, attribution: attribution
  };
})(window.FW);
