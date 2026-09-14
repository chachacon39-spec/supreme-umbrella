/* Quill & Ledger — shared utilities
 * Global namespace so the app runs from file:// with no build step. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';

  /* ---------- DOM ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function escapeAttr(s) { return escapeHtml(s); }

  /* ---------- misc ---------- */
  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function debounce(fn, wait) {
    var t, pending = null;
    function wrapped() {
      var args = arguments, ctx = this;
      pending = function () { fn.apply(ctx, args); };
      clearTimeout(t);
      t = setTimeout(function () { t = null; var run = pending; pending = null; run(); }, wait || 200);
    }
    /* Run any queued call right now — used before the page unloads. */
    wrapped.flush = function () {
      if (!pending) return;
      clearTimeout(t); t = null;
      var run = pending; pending = null; run();
    };
    wrapped.cancel = function () { clearTimeout(t); t = null; pending = null; };
    return wrapped;
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function titleCase(s) {
    var small = /^(a|an|and|as|at|but|by|for|in|nor|of|on|or|per|the|to|vs|via|with)$/i;
    return String(s || '').split(/\s+/).map(function (w, i, arr) {
      /* "SaaS" and "B2B" are spelled that way on purpose. Lowercasing a word
         before recapitalising its first letter turns them into "Saas" and "B2b". */
      if (/[A-Z]/.test(w.slice(1))) return w;
      var lower = w.toLowerCase();
      if (i !== 0 && i !== arr.length - 1 && small.test(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join(' ');
  }

  function sentenceCase(s) {
    s = String(s || '').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function pluralize(n, one, many) { return n === 1 ? one : (many || one + 's'); }

  function formatDate(ts) {
    if (!ts) return '';
    var d = typeof ts === 'string' ? new Date(ts) : new Date(Number(ts));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr + 'T23:59:59');
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  }

  /* Deterministic pseudo-random so regenerating the same brief is stable. */
  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function seeded(seed) {
    var state = typeof seed === 'string' ? hashString(seed) : (seed >>> 0) || 1;
    return function () {
      state ^= state << 13; state >>>= 0;
      state ^= state >> 17;
      state ^= state << 5; state >>>= 0;
      return state / 4294967296;
    };
  }

  function pick(arr, rnd) {
    if (!arr || !arr.length) return '';
    return arr[Math.floor((rnd ? rnd() : Math.random()) * arr.length) % arr.length];
  }

  function pickN(arr, n, rnd) {
    var copy = arr.slice(), out = [];
    while (copy.length && out.length < n) {
      out.push(copy.splice(Math.floor((rnd ? rnd() : Math.random()) * copy.length), 1)[0]);
    }
    return out;
  }

  function unique(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }

  /* ---------- text ---------- */
  var ABBREV = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'e.g', 'i.e', 'inc', 'ltd', 'co', 'fig', 'no', 'approx', 'dept', 'est'];

  function splitSentences(text) {
    var out = [], buf = '', i = 0;
    text = String(text || '');
    while (i < text.length) {
      var ch = text[i];
      buf += ch;
      if (ch === '.' || ch === '!' || ch === '?') {
        // swallow trailing quotes/brackets
        while (i + 1 < text.length && /["'”’\)\]]/.test(text[i + 1])) { buf += text[++i]; }
        var next = text[i + 1];
        var lastWord = (buf.match(/([A-Za-z\.]+)[\.!\?]["'”’\)\]]*$/) || [])[1] || '';
        var isAbbrev = ABBREV.indexOf(lastWord.replace(/\.$/, '').toLowerCase()) !== -1;
        var isInitial = /\b[A-Z]\.$/.test(buf);
        var isDecimal = /\d\.$/.test(buf) && /^\d/.test(next || '');
        if (!isAbbrev && !isInitial && !isDecimal && (next === undefined || /\s/.test(next))) {
          if (buf.trim()) out.push(buf.trim());
          buf = '';
        }
      }
      i++;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function splitParagraphs(text) {
    return String(text || '').split(/\n\s*\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function words(text) {
    var m = String(text || '').toLowerCase().match(/[a-z0-9][a-z0-9'’\-]*/g);
    return m || [];
  }

  function wordCount(text) { return words(text).length; }

  function countSyllables(word) {
    word = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return 0;
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    var m = word.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }

  function stripHtml(html) {
    var d = document.createElement('div');
    d.innerHTML = String(html || '');
    return d.textContent || '';
  }

  function normalizeQuotes(s) {
    return String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-');
  }

  /* ---------- storage ---------- */
  var NS = 'quill-ledger:';
  function save(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
    catch (e) { console.warn('save failed', e); return false; }
  }
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(NS + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function remove(key) { try { localStorage.removeItem(NS + key); } catch (e) {} }

  /* ---------- files ---------- */
  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return true;
  }

  function slugify(s) {
    return String(s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';
  }

  FW.util = {
    $: $, $$: $$, el: el, clear: clear, escapeHtml: escapeHtml, escapeAttr: escapeAttr,
    uid: uid, debounce: debounce, clamp: clamp, titleCase: titleCase, sentenceCase: sentenceCase,
    pluralize: pluralize, formatDate: formatDate, daysUntil: daysUntil,
    hashString: hashString, seeded: seeded, pick: pick, pickN: pickN, unique: unique,
    splitSentences: splitSentences, splitParagraphs: splitParagraphs, words: words,
    wordCount: wordCount, countSyllables: countSyllables, stripHtml: stripHtml, normalizeQuotes: normalizeQuotes,
    save: save, load: load, remove: remove, download: download, copyText: copyText, slugify: slugify
  };
})(window.FW);
