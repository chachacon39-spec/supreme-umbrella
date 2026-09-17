/* The writing studio: rich-text editor, live checking, highlighting, compliance. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, el = U.el, K = FW.kit, S = FW.store;

  var refs = {};
  var currentTask = null, currentDoc = null;
  var lastResult = null, selectedIssue = null;
  var issueFilter = 'all';
  var ignored = {};
  var supportsHighlight = typeof CSS !== 'undefined' && CSS.highlights;

  /* ================= mount ================= */
  function mount(container) {
    U.clear(container);

    refs.left = el('aside', { class: 'pane-left' });
    refs.center = el('div', { class: 'pane-center' });
    refs.right = el('aside', { class: 'pane-right' });

    refs.studio = el('div', { class: 'studio' }, [refs.left, refs.center, refs.right]);
    container.appendChild(refs.studio);

    buildCenter();
    buildRight();
    buildLeft();

    if (!supportsHighlight) document.body.classList.add('no-highlight-api');

    S.on('activeTask:changed', function () { load(S.state.activeTaskId); });
    S.on('settings:changed', applyTypography);
    S.on('storage:trimmed', function () {
      K.toast('Storage was full — older draft versions were discarded to keep your work safe');
    });
    S.on('storage:full', function () {
      K.toast('This browser will not store any more. Export a backup now (Export → Export everything).', 'error');
    });
    return refs;
  }

  /* ================= centre: toolbar + editor ================= */
  function buildCenter() {
    refs.toolbar = el('div', { class: 'toolbar' });
    refs.editor = el('div', {
      class: 'editor', contenteditable: 'true', spellcheck: 'true',
      'data-placeholder': 'Start writing, or generate an outline from the board…'
    });
    refs.page = el('div', { class: 'editor-page' }, [refs.editor]);
    refs.scroll = el('div', { class: 'editor-scroll' }, [refs.page]);
    refs.status = el('div', { class: 'statusbar' });

    refs.center.appendChild(refs.toolbar);
    refs.center.appendChild(refs.scroll);
    refs.center.appendChild(refs.status);

    buildToolbar();

    refs.editor.addEventListener('input', onInput);
    refs.editor.addEventListener('keydown', onKeyDown);
    refs.editor.addEventListener('paste', onPaste);
    refs.editor.addEventListener('drop', onDrop);
    refs.editor.addEventListener('mouseup', updateToolbarState);
    document.addEventListener('selectionchange', rememberCaret);
    refs.editor.addEventListener('keyup', updateToolbarState);
  }

  /* Clicking a tool button moves focus out of the editor, so remember where the
     writer's caret was — "insert at cursor" should mean their cursor, not the top. */
  var lastRange = null;

  function rememberCaret() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    if (refs.editor && refs.editor.contains(range.commonAncestorContainer)) {
      lastRange = range.cloneRange();
    }
  }

  function cmd(command, value) {
    refs.editor.focus();
    try { document.execCommand(command, false, value || null); } catch (e) { /* unsupported */ }
    onInput();
    updateToolbarState();
  }

  function tbButton(label, title, command, value, key) {
    return el('button', {
      class: 'tb-btn', title: title + (key ? '  (' + key + ')' : ''), html: label,
      dataset: { command: command || '', value: value || '' },
      onmousedown: function (e) { e.preventDefault(); },
      onclick: function () { cmd(command, value); }
    });
  }

  function buildToolbar() {
    var t = refs.toolbar;
    U.clear(t);

    var blockSel = K.select([
      { value: 'p', label: 'Body text' },
      { value: 'h1', label: 'Heading 1' },
      { value: 'h2', label: 'Heading 2' },
      { value: 'h3', label: 'Heading 3' },
      { value: 'blockquote', label: 'Quote' },
      { value: 'pre', label: 'Code block' }
    ], 'p', function (v) { cmd('formatBlock', v); }, { class: 'tb-select' });
    refs.blockSel = blockSel;
    t.appendChild(blockSel);

    t.appendChild(el('span', { class: 'sep' }));
    t.appendChild(tbButton('<b>B</b>', 'Bold', 'bold', null, 'Ctrl+B'));
    t.appendChild(tbButton('<i>I</i>', 'Italic', 'italic', null, 'Ctrl+I'));
    t.appendChild(tbButton('<u>U</u>', 'Underline', 'underline', null, 'Ctrl+U'));
    t.appendChild(tbButton('<s>S</s>', 'Strikethrough', 'strikeThrough'));

    t.appendChild(el('span', { class: 'sep' }));
    t.appendChild(tbButton('•&nbsp;—', 'Bulleted list', 'insertUnorderedList'));
    t.appendChild(tbButton('1.&nbsp;—', 'Numbered list', 'insertOrderedList'));
    t.appendChild(tbButton('❝', 'Block quote', 'formatBlock', 'blockquote'));
    t.appendChild(el('button', {
      class: 'tb-btn', title: 'Insert link', html: '🔗',
      onmousedown: function (e) { e.preventDefault(); },
      onclick: function () {
        K.prompt('Paste the destination URL.', { title: 'Insert link', placeholder: 'https://' }).then(function (url) {
          if (url) cmd('createLink', url);
        });
      }
    }));
    t.appendChild(el('button', {
      class: 'tb-btn', title: 'Insert table', html: '▦',
      onmousedown: function (e) { e.preventDefault(); },
      onclick: insertTable
    }));
    t.appendChild(tbButton('—', 'Horizontal rule', 'insertHorizontalRule'));

    t.appendChild(el('span', { class: 'sep' }));
    t.appendChild(tbButton('⟸', 'Align left', 'justifyLeft'));
    t.appendChild(tbButton('⟺', 'Align centre', 'justifyCenter'));
    t.appendChild(tbButton('⟹', 'Justify', 'justifyFull'));
    t.appendChild(tbButton('⌫', 'Clear formatting', 'removeFormat'));

    t.appendChild(el('span', { class: 'sep' }));
    t.appendChild(tbButton('↶', 'Undo', 'undo', null, 'Ctrl+Z'));
    t.appendChild(tbButton('↷', 'Redo', 'redo', null, 'Ctrl+Shift+Z'));

    t.appendChild(el('div', { class: 'grow' }));

    t.appendChild(el('button', {
      class: 'btn btn-sm', text: 'Aa Typography', title: 'Fonts, size, spacing and page width',
      onclick: openTypography
    }));
    t.appendChild(el('button', {
      class: 'btn btn-sm', text: '🕘 History', title: 'Version history', onclick: openHistory
    }));
    refs.focusBtn = el('button', {
      class: 'btn btn-sm', text: '⛶ Focus', title: 'Hide the side panels',
      onclick: function () {
        var on = !S.state.settings.focusMode;
        S.setSetting('focusMode', on);
        refs.studio.classList.toggle('focus-mode', on);
        refs.focusBtn.classList.toggle('is-active', on);
      }
    });
    t.appendChild(refs.focusBtn);
  }

  function insertTable() {
    K.prompt('How many columns and rows? (e.g. 3x4)', { title: 'Insert table', value: '3x3' }).then(function (v) {
      if (!v) return;
      var m = String(v).match(/(\d+)\s*[x×]\s*(\d+)/i);
      var cols = m ? U.clamp(Number(m[1]), 1, 10) : 3;
      var rows = m ? U.clamp(Number(m[2]), 1, 30) : 3;
      var html = '<table><thead><tr>';
      for (var c = 0; c < cols; c++) html += '<th>Column ' + (c + 1) + '</th>';
      html += '</tr></thead><tbody>';
      for (var r = 0; r < rows; r++) {
        html += '<tr>';
        for (c = 0; c < cols; c++) html += '<td>&nbsp;</td>';
        html += '</tr>';
      }
      html += '</tbody></table><p><br></p>';
      cmd('insertHTML', html);
    });
  }

  function updateToolbarState() {
    ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].forEach(function (c) {
      var btn = refs.toolbar.querySelector('[data-command="' + c + '"]');
      if (!btn) return;
      var on = false;
      try { on = document.queryCommandState(c); } catch (e) { }
      btn.classList.toggle('is-active', on);
    });
    try {
      var block = document.queryCommandValue('formatBlock');
      if (block && refs.blockSel) {
        var v = String(block).toLowerCase();
        refs.blockSel.value = /^(h1|h2|h3|blockquote|pre)$/.test(v) ? v : 'p';
      }
    } catch (e) { }
  }

  function onKeyDown(e) {
    var mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      takeSnapshot('manual save');
      K.toast('Saved — version added to history');
      return;
    }
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); refs.toolbar.querySelector('[title="Insert link"]').click(); return; }
    if (mod && e.shiftKey && /^[123]$/.test(e.key)) { e.preventDefault(); cmd('formatBlock', 'h' + e.key); return; }
    if (mod && e.key === '0') { e.preventDefault(); cmd('formatBlock', 'p'); return; }
    /* Enter inside a heading should drop back to body text. */
    if (e.key === 'Enter' && !e.shiftKey) {
      setTimeout(function () {
        try {
          var block = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
          if (/^h[1-6]$/.test(block)) document.execCommand('formatBlock', false, 'p');
        } catch (err) { }
      }, 0);
    }
  }

  /* A paste we cannot complete must never be swallowed. This called
     preventDefault() first and then leaned on execCommand('insertHTML'), whose
     return value it ignored — so on any engine that does not support the
     command (mobile among them) the text disappeared with no error, no
     insertion and nothing to retry. Now nothing is cancelled until the content
     is actually in the document; anything we cannot place ourselves is handed
     back to the browser, which still knows how to paste. */
  function onPaste(e) {
    var cd = e.clipboardData || window.clipboardData;
    if (!cd) return;
    var html = readData(cd, 'text/html');
    var text = readData(cd, 'text/plain') || readData(cd, 'Text');
    if (!html && !text) return;
    if (!insertPayload(html, text, null)) return;
    e.preventDefault();
    onInput();
  }

  /* Dropped markup reached the draft without ever passing through sanitize():
     drop was the one input path with no handler, so a drag out of a web page
     carried its classes, ids, inline styles and scripts into the document and
     on into the exported file. It is cleaned now, and as with paste a drop we
     cannot place ourselves is left to the browser. */
  function onDrop(e) {
    var dt = e.dataTransfer;
    if (!dt || (dt.files && dt.files.length)) return;
    var html = readData(dt, 'text/html');
    var text = readData(dt, 'text/plain');
    if (!html && !text) return;
    if (!insertPayload(html, text, caretFromPoint(e.clientX, e.clientY))) return;
    e.preventDefault();
    onInput();
  }

  function readData(source, type) {
    try { return source.getData(type) || ''; } catch (err) { return ''; }
  }

  function textToHtml(text) {
    var paras = text.split(/\n\s*\n/);
    /* One run of text belongs inline, where the caret is. Giving it a paragraph
       of its own splits the sentence the writer is pasting into. */
    if (paras.length === 1) return U.escapeHtml(paras[0]).replace(/\n/g, '<br>');
    return paras.map(function (p) {
      return '<p>' + U.escapeHtml(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function caretFromPoint(x, y) {
    var range = null;
    if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
    else if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    return range && refs.editor.contains(range.commonAncestorContainer) ? range : null;
  }

  /* Returns false when the content could not be placed, so the caller knows to
     leave the event alone rather than cancel it and lose the payload. */
  function insertPayload(html, text, at) {
    var markup = html ? sanitize(html) : textToHtml(text);
    if (!markup) return false;
    if (at) {
      var sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(at); }
    }
    var placed = false;
    try { placed = document.execCommand('insertHTML', false, markup) !== false; } catch (err) { placed = false; }
    if (!placed) placed = rangeInsert(markup);
    if (placed) stripInsertionNoise();
    return placed;
  }

  /* The Range fallback for engines without insertHTML. */
  function rangeInsert(markup) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    var range = sel.getRangeAt(0);
    if (!refs.editor.contains(range.commonAncestorContainer)) return false;
    var template = document.createElement('div');
    template.innerHTML = markup;
    var fragment = document.createDocumentFragment();
    var last = null;
    while (template.firstChild) { last = fragment.appendChild(template.firstChild); }
    if (!last) return false;
    try {
      range.deleteContents();
      range.insertNode(fragment);
    } catch (err) { return false; }
    var after = document.createRange();
    after.setStartAfter(last);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    return true;
  }

  /* insertHTML stamps the caret's own letter-spacing onto what it inserts —
     sometimes as a wrapper span, sometimes onto an element the payload already
     had, so pasted bold text arrives as <b style="letter-spacing:0px">. It is
     invisible on screen and meaningless in the delivered file. Drop the
     declaration wherever it landed, and unwrap a span left holding nothing. */
  function stripInsertionNoise() {
    U.$$('[style]', refs.editor).forEach(function (node) {
      if (!/^\s*letter-spacing\s*:[^;]*;?\s*$/i.test(node.getAttribute('style') || '')) return;
      node.removeAttribute('style');
      if (node.tagName.toLowerCase() !== 'span' || node.attributes.length) return;
      var parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
    });
  }

  /* Strip scripts, styles, events and inline colour noise from pasted markup. */
  function sanitize(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('script, style, meta, link, iframe, object, embed, form, input').forEach(function (n) { n.remove(); });
    tmp.querySelectorAll('*').forEach(function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        if (name.indexOf('on') === 0 || name === 'class' || name === 'id' || name === 'style') n.removeAttribute(attr.name);
        if (name === 'href' && /^\s*javascript:/i.test(attr.value)) n.removeAttribute(attr.name);
      });
    });
    return tmp.innerHTML;
  }

  /* ================= document plumbing ================= */
  var BLOCK = /^(p|div|h[1-6]|li|blockquote|pre|tr|section|article|figure|figcaption|td|th)$/i;

  /* Walk the editor, building plain text plus a text-node offset map. */
  /* The client's format is "introductory heading in bold", so a paragraph whose
     whole content is bold is a heading too, whatever tag it uses. */
  function isHeadingLike(node) {
    var tag = node.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return true;
    if (tag !== 'p' && tag !== 'div') return false;
    var text = node.textContent.trim();
    if (!text || text.length > 120) return false;
    var strong = node.querySelector('strong, b');
    return !!strong && strong.textContent.trim() === text;
  }

  /* The outline scaffold writes its own instructions into the draft, and they
     were being read as the writer's prose: counted toward the word target, and
     scanned for repetition, which on a fresh outline produces a page of
     warnings about how often the writer has used the word "section". They are
     furniture. Leave them out until they are written over — matching on the
     text rather than a marker attribute, so a line stops being a placeholder
     the moment it is replaced. */
  var PLACEHOLDER_LINE = /^(?:~\s*\d+\s*words\.\s*)?draft this section\.$/i;

  function isPlaceholder(node) {
    if (!node || node.nodeType !== 1) return false;
    return PLACEHOLDER_LINE.test((node.textContent || '').trim());
  }

  /* Headings stay in the text map, so an untouched scaffold is not empty — it
     is a stack of headings with nothing under them. */
  function hasProse() {
    return Array.prototype.some.call(refs.editor.querySelectorAll('p, li, blockquote'), function (node) {
      return !isPlaceholder(node) && (node.textContent || '').trim() !== '';
    });
  }

  function textMap() {
    var text = '', map = [], headings = [];
    (function walk(node) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3) {
          var data = child.nodeValue;
          if (data) {
            map.push({ node: child, start: text.length, end: text.length + data.length });
            text += data;
          }
        } else if (child.nodeType === 1) {
          var tag = child.tagName.toLowerCase();
          if (tag === 'br') { text += '\n'; continue; }
          if (isPlaceholder(child)) continue;
          var headStart = text.length, isHead = isHeadingLike(child);
          walk(child);
          if (isHead && text.length > headStart) headings.push({ start: headStart, end: text.length });
          if (BLOCK.test(tag) && !/\n$/.test(text)) text += '\n';
        }
      }
    })(refs.editor);
    return { text: text, map: map, headings: headings };
  }

  function positionAt(map, offset) {
    for (var i = 0; i < map.length; i++) {
      if (offset >= map[i].start && offset <= map[i].end) {
        return { node: map[i].node, offset: offset - map[i].start };
      }
    }
    var last = map[map.length - 1];
    return last ? { node: last.node, offset: last.node.nodeValue.length } : null;
  }

  function rangeFor(map, start, end) {
    var a = positionAt(map, start), b = positionAt(map, end);
    if (!a || !b) return null;
    var range = document.createRange();
    try {
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
    } catch (e) { return null; }
    return range;
  }

  /* ================= load / save ================= */
  function load(taskId) {
    currentTask = S.getTask(taskId);
    if (!currentTask) {
      currentDoc = null;
      refs.editor.innerHTML = '';
      renderEmpty();
      return;
    }
    currentDoc = S.docForTask(taskId, true);
    refs.editor.innerHTML = currentDoc.html || '';
    ignored = {};
    lastRange = null;

    /* Opening a draft that has content but no history leaves nothing to fall
       back to, so lay down a baseline before the writer touches it. */
    lastSnapshotAt = Date.now();
    lastSnapshotWords = editorWords();
    if (!currentDoc.history.length && lastSnapshotWords > 0) {
      S.snapshotDoc(currentDoc.id, 'opened');
    }
    startSnapshotTimer();
    applyTypography();
    refs.studio.classList.toggle('focus-mode', !!S.state.settings.focusMode);
    if (refs.focusBtn) refs.focusBtn.classList.toggle('is-active', !!S.state.settings.focusMode);
    runCheck();
    buildLeft();
  }

  function renderEmpty() {
    U.clear(refs.left);
    refs.left.appendChild(el('div', { class: 'panel-body' }, [
      el('div', { class: 'empty', text: 'No assignment selected. Pick one on the board.' })
    ]));
    U.clear(refs.status);
  }

  function saveNow() {
    if (!currentDoc) return;
    S.saveDoc(currentDoc.id, refs.editor.innerHTML);
  }

  var autosave = U.debounce(saveNow, 900);

  /* ---- version snapshots ----
     A debounce here would be wrong: it fires once writing *stops*, so a long
     uninterrupted session would never be captured. This is a throttle — at most
     one automatic snapshot per interval, and only once enough has actually
     changed to be worth a restore point. */
  var SNAPSHOT_INTERVAL = 90000;
  var SNAPSHOT_MIN_WORDS = 25;
  var SNAPSHOT_TICK = 15000;

  var lastSnapshotAt = 0, lastSnapshotWords = 0, snapshotTimer = null;

  function editorWords() { return U.wordCount(refs.editor ? refs.editor.textContent : ''); }

  /* Capture the draft as it stands. `label` describes the entry. */
  function takeSnapshot(label) {
    if (!currentDoc) return null;
    saveNow();
    var entry = S.snapshotDoc(currentDoc.id, label);
    lastSnapshotAt = Date.now();
    lastSnapshotWords = editorWords();
    return entry;
  }

  /* Capture the state *before* a destructive edit, so the edit can be undone. */
  function snapshotBefore(label) {
    if (!currentDoc) return null;
    return takeSnapshot(label);
  }

  function maybeAutoSnapshot() {
    if (!currentDoc || !refs.editor) return;
    if (Date.now() - lastSnapshotAt < SNAPSHOT_INTERVAL) return;
    var words = editorWords();
    if (Math.abs(words - lastSnapshotWords) < SNAPSHOT_MIN_WORDS) return;
    var delta = words - lastSnapshotWords;
    takeSnapshot('while writing (' + (delta > 0 ? '+' : '') + delta + ' words)');
  }

  function startSnapshotTimer() {
    if (snapshotTimer) return;
    snapshotTimer = setInterval(maybeAutoSnapshot, SNAPSHOT_TICK);
  }

  function onInput() {
    /* Deleting everything can leave an empty <h1> behind; reset to body text. */
    if (!refs.editor.textContent.trim() && !refs.editor.querySelector('img, table, hr')) {
      var only = refs.editor.firstElementChild;
      if (only && /^h[1-6]$|^blockquote$|^pre$/i.test(only.tagName)) {
        refs.editor.innerHTML = '<p><br></p>';
        placeCaretAtStart();
      }
    }
    autosave();
    if (S.state.settings.autoCheck) scheduleCheck();
    updateStatus();
  }

  var scheduleCheck = U.debounce(function () { runCheck(); }, 650);

  function placeCaretAtStart() {
    var first = refs.editor.firstElementChild || refs.editor;
    var range = document.createRange();
    range.setStart(first, 0);
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', function () { autosave.flush(); S.flush(); });
    window.addEventListener('beforeunload', function () { autosave.flush(); S.flush(); });
  }

  /* ================= checking ================= */
  function runCheck() {
    if (!refs.editor) return;
    var tm = textMap();
    var opts = {
      checks: S.state.settings.checks,
      language: S.state.settings.language,
      styleGuide: S.state.settings.styleGuide,
      personaId: currentTask ? currentTask.personaId : null,
      analysis: currentTask ? currentTask.analysis : null,
      headingRanges: tm.headings,
      skipRanges: referenceRanges(tm.text)
    };
    lastResult = FW.analyzer.analyze(tm.text, opts);
    lastResult.text = tm.text;
    lastResult.map = tm.map;
    paintHighlights();
    renderIssues();
    renderCompliance();
    updateStatus();
    FW.store.emit('analysis:done', lastResult);
  }

  function paintHighlights() {
    if (!supportsHighlight || !lastResult) return;
    var buckets = { error: [], warning: [], suggestion: [] };
    lastResult.issues.forEach(function (issue) {
      if (ignored[issueKey(issue)]) return;
      if (issueFilter !== 'all' && issue.type !== issueFilter && issue.severity !== issueFilter) return;
      var range = rangeFor(lastResult.map, issue.start, issue.end);
      if (range) buckets[issue.severity].push(range);
    });
    Object.keys(buckets).forEach(function (sev) {
      try {
        CSS.highlights.set('fw-' + sev, new Highlight(...buckets[sev]));
      } catch (e) {
        CSS.highlights.delete('fw-' + sev);
      }
    });
  }

  function issueKey(issue) { return issue.rule + '|' + issue.excerpt; }

  /* A human label for a rule id, for version-history entries. */
  function describeRule(issue) {
    var map = {
      spelling: 'spelling fix', grammar: 'grammar fix', punctuation: 'punctuation fix',
      style: 'style edit', structure: 'structure edit', inclusive: 'wording change'
    };
    return map[issue.type] || 'edit';
  }

  /* execCommand('insertHTML') rewrites markup (it turns <mark> into a styled span),
     so build the nodes ourselves and drop them in through the Range API. */
  function insertHtmlAt(html) {
    var template = document.createElement('div');
    template.innerHTML = html;
    var fragment = document.createDocumentFragment();
    var lastNode = null;
    while (template.firstChild) { lastNode = template.firstChild; fragment.appendChild(lastNode); }

    var range = lastRange && refs.editor.contains(lastRange.commonAncestorContainer)
      ? lastRange.cloneRange() : null;
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(refs.editor);
      range.collapse(false);
    }
    range.deleteContents();
    range.insertNode(fragment);

    if (lastNode) {
      var after = document.createRange();
      after.setStartAfter(lastNode);
      after.collapse(true);
      lastRange = after.cloneRange();
      refs.editor.focus();
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(after);
    }
    refs.editor.normalize();
  }

  function focusIssue(issue) {
    selectedIssue = issue;
    var range = rangeFor(lastResult.map, issue.start, issue.end);
    if (!range) return;
    if (supportsHighlight) {
      try { CSS.highlights.set('fw-focus', new Highlight(range)); } catch (e) { }
    }
    var rect = range.getBoundingClientRect();
    var scrollRect = refs.scroll.getBoundingClientRect();
    refs.scroll.scrollTop += rect.top - scrollRect.top - scrollRect.height / 2.4;
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    renderIssues();
  }

  function applyFix(issue) {
    if (issue.fix === null || issue.fix === undefined) return;
    var range = rangeFor(lastResult.map, issue.start, issue.end);
    if (!range) return;
    range.deleteContents();
    if (issue.fix !== '') range.insertNode(document.createTextNode(issue.fix));
    else {
      /* Removing a word: tidy the doubled space it leaves behind. */
      var node = range.startContainer;
      if (node.nodeType === 3) node.nodeValue = node.nodeValue.replace(/ {2,}/g, ' ');
    }
    refs.editor.normalize();
    saveNow();
    runCheck();
    K.toast('Fix applied');
  }

  function applyAllOfRule(rule) {
    if (!lastResult) return;
    var list = lastResult.issues.filter(function (i) {
      return i.rule === rule && i.fix !== null && i.fix !== undefined && !ignored[issueKey(i)];
    });
    if (!list.length) return;
    snapshotBefore('before fixing ' + list.length + ' × ' + describeRule(list[0]));
    /* Work back to front so earlier offsets stay valid. */
    list.sort(function (a, b) { return b.start - a.start; }).forEach(function (issue) {
      var range = rangeFor(lastResult.map, issue.start, issue.end);
      if (!range) return;
      range.deleteContents();
      if (issue.fix !== '') range.insertNode(document.createTextNode(issue.fix));
    });
    refs.editor.normalize();
    saveNow();
    runCheck();
    K.toast('Applied ' + list.length + ' ' + U.pluralize(list.length, 'fix', 'fixes'));
  }

  /* ================= right pane ================= */
  function buildRight() {
    refs.rightTabs = el('div', { class: 'tabs' });
    refs.rightBody = el('div', { class: 'grow', style: { overflowY: 'auto', minHeight: 0 } });
    refs.right.appendChild(refs.rightTabs);
    refs.right.appendChild(refs.rightBody);

    var tabs = [
      { id: 'issues', label: 'Checks' },
      { id: 'stats', label: 'Readability' },
      { id: 'tools', label: 'Tools' },
      { id: 'citations', label: 'Citations' },
      { id: 'images', label: 'Images' },
      { id: 'export', label: 'Export' }
    ];
    refs.activeTab = 'issues';
    tabs.forEach(function (t) {
      var btn = el('button', {
        class: 'tab' + (t.id === refs.activeTab ? ' is-active' : ''), text: t.label,
        onclick: function () {
          refs.activeTab = t.id;
          U.$$('.tab', refs.rightTabs).forEach(function (b) { b.classList.toggle('is-active', b === btn); });
          renderRight();
        }
      });
      if (t.id === 'issues') refs.issuesTab = btn;
      refs.rightTabs.appendChild(btn);
    });
    renderRight();
  }

  function renderRight() {
    U.clear(refs.rightBody);
    switch (refs.activeTab) {
      case 'issues': renderIssues(); break;
      case 'stats': renderStats(); break;
      case 'tools': FW.tools.renderTools(refs.rightBody, api()); break;
      case 'citations': FW.tools.renderCitations(refs.rightBody, api()); break;
      case 'images': FW.tools.renderImages(refs.rightBody, api()); break;
      case 'export': FW.tools.renderExport(refs.rightBody, api()); break;
    }
  }

  function renderIssues() {
    if (refs.activeTab !== 'issues') { updateIssueBadge(); return; }
    U.clear(refs.rightBody);
    if (!lastResult) { refs.rightBody.appendChild(el('div', { class: 'empty', text: 'Nothing to check yet.' })); return; }
    if (!hasProse() && refs.editor.textContent.trim()) {
      refs.rightBody.appendChild(el('div', { class: 'empty' }, [
        el('div', { style: { fontSize: '22px' }, text: '\u25CB' }),
        el('div', { text: 'This is still the outline. Its placeholder lines are not yours, so they are not checked or counted \u2014 write over one and the checks begin.' })
      ]));
      return;
    }

    var visible = lastResult.issues.filter(function (i) {
      if (ignored[issueKey(i)]) return false;
      if (issueFilter === 'all') return true;
      return i.type === issueFilter || i.severity === issueFilter;
    });

    var counts = lastResult.counts;
    var filters = [
      { id: 'all', label: 'All ' + lastResult.issues.length },
      { id: 'error', label: 'Errors ' + counts.error },
      { id: 'grammar', label: 'Grammar ' + (counts.grammar || 0) },
      { id: 'punctuation', label: 'Punctuation ' + (counts.punctuation || 0) },
      { id: 'structure', label: 'Structure ' + (counts.structure || 0) },
      { id: 'style', label: 'Style ' + (counts.style || 0) },
      { id: 'spelling', label: 'Spelling ' + (counts.spelling || 0) },
      { id: 'inclusive', label: 'Inclusive ' + (counts.inclusive || 0) }
    ];

    refs.rightBody.appendChild(el('div', { class: 'issue-filters' }, filters.map(function (f) {
      return el('button', {
        class: 'btn btn-sm' + (issueFilter === f.id ? ' is-active' : ''), text: f.label,
        onclick: function () { issueFilter = f.id; paintHighlights(); renderIssues(); }
      });
    })));

    refs.rightBody.appendChild(el('div', { class: 'flex', style: { padding: '8px 13px', borderBottom: '1px solid var(--border)' } }, [
      el('label', { class: 'check-row grow' }, [
        el('input', {
          type: 'checkbox', checked: S.state.settings.autoCheck,
          onchange: function (e) { S.setSetting('autoCheck', e.target.checked); if (e.target.checked) runCheck(); }
        }),
        el('span', { text: 'Check as I type' })
      ]),
      el('button', { class: 'btn btn-sm', text: 'Re-check', onclick: runCheck }),
      el('button', { class: 'btn btn-sm btn-ghost', text: 'Rules', title: 'Choose which checks run', onclick: openCheckSettings })
    ]));

    if (!visible.length) {
      refs.rightBody.appendChild(el('div', { class: 'empty', style: { margin: '14px' } }, [
        el('div', { style: { fontSize: '22px' }, text: '✓' }),
        el('div', { text: lastResult.issues.length ? 'Nothing matching this filter.' : 'No issues found. Read it aloud once before you send it.' })
      ]));
      updateIssueBadge();
      return;
    }

    var list = el('ul', { class: 'issue-list' });
    visible.slice(0, 300).forEach(function (issue) {
      var sameRule = lastResult.issues.filter(function (i) {
        return i.rule === issue.rule && i.fix !== null && i.fix !== undefined && !ignored[issueKey(i)];
      }).length;

      list.appendChild(el('li', {
        class: 'issue sev-' + issue.severity + (selectedIssue && selectedIssue.id === issue.id ? ' is-selected' : ''),
        onclick: function () { focusIssue(issue); }
      }, [
        el('div', { class: 'flex wrap', style: { gap: '6px' } }, [
          el('span', { class: 'chip chip-' + (issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'suggest'), text: issue.type }),
          el('span', { class: 'excerpt', text: issue.excerpt.replace(/\n/g, '⏎').slice(0, 64) })
        ]),
        el('p', { class: 'msg', text: issue.message }),
        el('div', { class: 'actions' }, [
          issue.fix !== null && issue.fix !== undefined ? el('button', {
            class: 'btn btn-sm btn-primary',
            text: issue.fix === '' ? 'Delete' : 'Fix → ' + String(issue.fix).slice(0, 22),
            onclick: function (e) { e.stopPropagation(); applyFix(issue); }
          }) : null,
          sameRule > 1 ? el('button', {
            class: 'btn btn-sm', text: 'Fix all ' + sameRule,
            onclick: function (e) { e.stopPropagation(); applyAllOfRule(issue.rule); }
          }) : null,
          el('button', {
            class: 'btn btn-sm btn-ghost', text: 'Ignore',
            onclick: function (e) {
              e.stopPropagation();
              ignored[issueKey(issue)] = true;
              paintHighlights(); renderIssues();
            }
          })
        ].filter(Boolean))
      ]));
    });
    refs.rightBody.appendChild(list);

    if (visible.length > 300) {
      refs.rightBody.appendChild(el('div', { class: 'tiny dim center', style: { padding: '10px' }, text: 'Showing the first 300 of ' + visible.length + '.' }));
    }
    updateIssueBadge();
  }

  function updateIssueBadge() {
    if (!refs.issuesTab || !lastResult) return;
    var errors = lastResult.counts.error || 0;
    refs.issuesTab.textContent = 'Checks' + (lastResult.issues.length ? ' (' + lastResult.issues.length + ')' : '');
    refs.issuesTab.style.color = errors ? 'var(--error)' : '';
  }

  function openCheckSettings() {
    var checks = S.state.settings.checks;
    var labels = {
      grammar: 'Grammar and agreement', punctuation: 'Punctuation and spacing',
      structure: 'Structure, repetition and rhythm', style: 'Style, clichés and wordiness',
      spelling: 'Spelling and locale variants', inclusive: 'Inclusive language', readability: 'Readability scoring'
    };
    var body = el('div', {}, Object.keys(labels).map(function (k) {
      return el('label', { class: 'check-row' }, [
        el('input', {
          type: 'checkbox', checked: checks[k] !== false,
          onchange: function (e) {
            var patch = {}; patch[k] = e.target.checked;
            S.setSetting('checks', patch);
            runCheck();
          }
        }),
        el('span', { text: labels[k] })
      ]);
    }));
    body.appendChild(el('hr', { class: 'divider' }));
    body.appendChild(K.field('Language & locale', K.select(FW.resources.LANGUAGES.map(function (l) {
      return { value: l.code, label: l.label };
    }), S.state.settings.language, function (v) {
      S.setSetting('language', v);
      refs.editor.setAttribute('lang', v);
      refs.editor.setAttribute('dir', FW.resources.language(v).dir);
      runCheck();
    }), 'Drives spelling variants and quotation conventions.'));
    body.appendChild(K.field('Style guide', K.select(Object.keys(FW.lex.STYLE_GUIDES).map(function (g) {
      return { value: g, label: FW.lex.STYLE_GUIDES[g].name };
    }), S.state.settings.styleGuide, function (v) { S.setSetting('styleGuide', v); runCheck(); })));
    body.appendChild(el('div', { class: 'tiny dim', style: { marginTop: '10px' } },
      [el('span', { text: 'Ignored items reset when you reopen the assignment.' })]));

    K.modal({ title: 'Checking rules', body: body, actions: [{ label: 'Done', variant: 'primary' }] });
  }

  /* ================= readability ================= */
  function renderStats() {
    U.clear(refs.rightBody);
    if (!lastResult) return;
    var s = lastResult.stats;
    var host = el('div', { class: 'tool-pane' });

    host.appendChild(el('div', { class: 'stat-grid' }, [
      tile(s.words.toLocaleString(), 'Words'),
      tile(s.sentences.toLocaleString(), 'Sentences'),
      tile(s.paragraphs.toLocaleString(), 'Paragraphs'),
      tile(s.readingMinutes + ' min', 'Read time'),
      tile(s.speakingMinutes + ' min', 'Spoken'),
      tile(s.charactersNoSpaces.toLocaleString(), 'Characters')
    ]));

    host.appendChild(el('hr', { class: 'divider' }));
    host.appendChild(el('div', { class: 'section-title', text: 'Readability' }));
    host.appendChild(el('div', { class: 'stat-grid' }, [
      tile(s.grade.toFixed(1), 'Grade level'),
      tile(s.flesch.toFixed(0), 'Flesch ease'),
      tile(s.fleschKincaid.toFixed(1), 'F–K grade'),
      tile(s.gunningFog.toFixed(1), 'Gunning fog'),
      tile(s.smog.toFixed(1), 'SMOG'),
      tile(s.ari.toFixed(1), 'ARI')
    ]));
    host.appendChild(el('p', { class: 'small muted', style: { marginTop: '10px' } }, [
      el('strong', { text: s.gradeLabel + '. ' }), el('span', { text: s.gradeNote })
    ]));

    var target = currentTask && currentTask.analysis && currentTask.analysis.meta.readingLevel;
    if (target) {
      var delta = s.grade - target;
      host.appendChild(el('div', {
        class: 'chip ' + (Math.abs(delta) <= 1.5 ? 'chip-ok' : 'chip-warning'),
        text: 'Brief asks for grade ' + target + ' — you are ' +
          (Math.abs(delta) <= 1.5 ? 'on target' : (delta > 0 ? delta.toFixed(1) + ' grades too dense' : Math.abs(delta).toFixed(1) + ' grades below'))
      }));
    }

    host.appendChild(el('hr', { class: 'divider' }));
    host.appendChild(el('div', { class: 'section-title', text: 'Rhythm & voice' }));
    host.appendChild(el('div', { class: 'stat-grid' }, [
      tile(s.avgSentenceLength.toFixed(1), 'Avg sentence'),
      tile(s.sentenceStdev.toFixed(1), 'Length variance'),
      tile(s.passivePct + '%', 'Passive'),
      tile(s.adverbPct + '%', 'Adverbs'),
      tile(s.longWordPct + '%', 'Long words'),
      tile(s.avgWordLength.toFixed(1), 'Avg word')
    ]));
    host.appendChild(el('p', { class: 'small muted' }, [
      el('span', { text: 'Sentence rhythm reads as ' }), el('strong', { text: s.rhythm }),
      el('span', { text: s.rhythm === 'monotonous' ? '. Vary your sentence lengths — alternate a long one with something short.' : '. That variation is doing good work.' })
    ]));

    if (currentTask) {
      var persona = FW.personas.get(currentTask.personaId);
      var band = persona.voice.readingGrade;
      host.appendChild(el('div', { class: 'card', style: { marginTop: '10px' } }, [
        el('div', { class: 'section-title', text: persona.icon + ' ' + persona.name + ' targets' }),
        el('div', { class: 'small muted', text: 'Reading grade ' + band[0] + '–' + band[1] + ' · average sentence ≈ ' + persona.voice.sentenceTarget + ' words · ' + (persona.voice.contractions ? 'contractions fine' : 'no contractions') })
      ]));
    }

    host.appendChild(el('hr', { class: 'divider' }));
    host.appendChild(el('div', { class: 'section-title', text: 'Keyword density' }));
    var density = FW.analyzer.keywordDensity(lastResult.text, 14);
    var max = density.length ? density[0].count : 1;
    density.forEach(function (d) {
      host.appendChild(el('div', { class: 'density-row' }, [
        el('span', { style: { width: '112px' }, class: 'truncate', text: d.term }),
        el('span', { class: 'density-bar' }, [el('span', { style: { width: (d.count / max * 100) + '%' } })]),
        el('span', { class: 'tiny dim nowrap', text: d.count + ' · ' + d.pct + '%' })
      ]));
    });

    refs.rightBody.appendChild(host);
  }

  function tile(value, label) {
    return el('div', { class: 'stat-tile' }, [el('b', { text: String(value) }), el('span', { text: label })]);
  }

  /* ================= left pane: brief compliance ================= */
  function buildLeft() {
    U.clear(refs.left);
    if (!currentTask) { renderEmpty(); return; }

    refs.left.appendChild(el('div', { class: 'panel-head' }, [
      el('div', { class: 'grow', style: { minWidth: 0 } }, [
        el('h3', { class: 'truncate', style: { fontSize: '14px' }, text: currentTask.title }),
        el('div', { class: 'tiny dim truncate', text: FW.personas.get(currentTask.personaId).icon + ' ' + FW.personas.get(currentTask.personaId).name + (currentTask.client ? ' · ' + currentTask.client : '') })
      ]),
      el('button', { class: 'btn btn-sm btn-ghost', title: 'Back to board', text: '⬒', onclick: function () { FW.app.setView('board'); } })
    ]));

    refs.leftBody = el('div', { class: 'panel-body' });
    refs.left.appendChild(refs.leftBody);
    renderCompliance();
  }

  function renderCompliance() {
    if (!refs.leftBody || !currentTask) return;
    U.clear(refs.leftBody);

    var analysis = currentTask.analysis;
    if (!analysis) {
      refs.leftBody.appendChild(el('div', { class: 'empty' }, [
        el('div', { text: 'No brief analysis yet.' }),
        el('button', {
          class: 'btn btn-sm btn-primary', style: { marginTop: '10px' }, text: 'Analyse the brief',
          onclick: function () { FW.board.analyseTask(currentTask.id); currentTask = S.getTask(currentTask.id); renderCompliance(); }
        })
      ]));
      return;
    }

    var text = lastResult ? lastResult.text : U.stripHtml(refs.editor.innerHTML);
    var results = evaluate(analysis, text);
    var auto = results.filter(function (r) { return r.status !== 'manual'; });
    var passed = auto.filter(function (r) { return r.status === 'pass'; }).length;

    refs.leftBody.appendChild(el('div', { class: 'spread', style: { marginBottom: '10px' } }, [
      el('h3', { style: { fontSize: '13px' }, text: 'Brief compliance' }),
      el('span', {
        class: 'chip ' + (passed === auto.length ? 'chip-ok' : 'chip-warning'),
        text: passed + '/' + auto.length + ' automatic'
      })
    ]));

    var chosen = currentTask.chosenStyle && currentTask.styles
      ? (currentTask.styles.variants || []).filter(function (v) { return v.key === currentTask.chosenStyle; })[0] : null;
    if (chosen) {
      refs.leftBody.appendChild(el('div', { class: 'card', style: { marginBottom: '12px' } }, [
        el('div', { class: 'section-title', text: 'Chosen approach' }),
        el('strong', { style: { fontSize: '13px' }, text: chosen.label }),
        el('p', { class: 'small muted', style: { margin: '4px 0 0' }, text: chosen.voice })
      ]));
    }

    results.forEach(function (r) {
      var dot = r.status === 'pass' ? ['dot-pass', '✓'] : r.status === 'fail' ? ['dot-fail', '✕']
        : r.status === 'warn' ? ['dot-warn', '!'] : ['dot-manual', '○'];
      refs.leftBody.appendChild(el('div', { class: 'check-item' }, [
        el('span', { class: 'dot ' + dot[0], text: dot[1] }),
        el('div', { class: 'grow' }, [
          el('div', { text: r.label }),
          r.detail ? el('div', { class: 'tiny dim', text: r.detail }) : null
        ].filter(Boolean))
      ]));
    });

    if (chosen) {
      refs.leftBody.appendChild(el('hr', { class: 'divider' }));
      refs.leftBody.appendChild(el('div', { class: 'section-title', text: 'Outline progress' }));
      var headings = Array.prototype.map.call(refs.editor.querySelectorAll('h1,h2,h3'), function (h) {
        var prose = '', node = h.nextElementSibling;
        while (node && !/^h[1-6]$/i.test(node.tagName)) {
          if (!isPlaceholder(node)) prose += ' ' + (node.textContent || '');
          node = node.nextElementSibling;
        }
        return { text: h.textContent.trim().toLowerCase(), words: U.wordCount(prose) };
      });
      chosen.outline.forEach(function (o) {
        var key = o.text.toLowerCase().split(/[:—-]/)[0].trim().slice(0, 18);
        /* Every section ticked green on a scaffold nobody had written into: a
           heading the app wrote itself was being read as work done. It counts
           once there is prose underneath it. */
        var hit = headings.filter(function (h) { return h.text.indexOf(key) !== -1; })[0];
        var done = !!hit && hit.words >= 10;
        refs.leftBody.appendChild(el('div', { class: 'check-item outline-item' }, [
          el('span', { class: 'dot ' + (done ? 'dot-pass' : 'dot-manual'), text: done ? '✓' : '○' }),
          el('div', { class: 'grow small', text: o.text })
        ]));
      });
    }
  }

  /* Evaluate what the brief demands against what is actually on the page. */
  /* "Citations do not count toward the total word count" — so when the brief
     says that, everything from the reference heading down is not copy. */
  var REFERENCE_HEADING = /(?:^|\n)[ \t]*(?:references?|works cited|bibliography|citations?|sources?)[ \t]*:?[ \t]*(?:\n|$)/i;
  function countedText(analysis, text) {
    if (!analysis || !analysis.meta || !analysis.meta.countExcludesCitations) return text;
    var m = text.match(REFERENCE_HEADING);
    if (!m || m.index < text.length * 0.4) return text;
    return text.slice(0, m.index);
  }

  /* Everything from a reference heading to the end is a bibliography. Checking
     it for repetition, filler or passive voice reports the citation style back
     to the writer as a writing problem. */
  function referenceRanges(text) {
    var m = String(text).match(REFERENCE_HEADING);
    if (!m || m.index < text.length * 0.4) return [];
    return [{ start: m.index, end: text.length }];
  }

  /* A section runs from one heading to the next. Long-form briefs cap section
     length so a reader can skim; nothing shorter than 1,000 words ever has. */
  function longestSection() {
    if (!refs.editor) return { words: 0, heading: '' };
    var best = { words: 0, heading: '' };
    var current = { words: 0, heading: '' };
    Array.prototype.forEach.call(refs.editor.children, function (node) {
      if (/^H[1-3]$/.test(node.tagName)) {
        if (current.words > best.words) best = current;
        current = { words: 0, heading: node.textContent.trim() };
      } else {
        current.words += U.wordCount(node.textContent || '');
      }
    });
    if (current.words > best.words) best = current;
    return best;
  }

  /* Questions inside the FAQ block, which ends at the next plain H2 so a
     reference list underneath it is not counted as an answer. */
  function faqQuestions() {
    if (!refs.editor) return 0;
    var inFaq = false, count = 0;
    Array.prototype.forEach.call(refs.editor.children, function (node) {
      var t = (node.textContent || '').trim();
      var isHeading = /^H[1-3]$/.test(node.tagName);
      if (isHeading && /\bfaqs?\b|frequently asked/i.test(t)) { inFaq = true; return; }
      if (inFaq && node.tagName === 'H2' && t.indexOf('?') === -1) { inFaq = false; return; }
      if (inFaq) count += (t.match(/\?/g) || []).length;
    });
    return count;
  }

  function evaluate(analysis, text) {
    var out = [];
    var fullText = text;
    text = countedText(analysis, text);
    var excludedCitations = text !== fullText;
    var words = U.wordCount(text);
    var lower = text.toLowerCase();
    var headings = refs.editor ? refs.editor.querySelectorAll('h2, h3').length : 0;

    analysis.checks.forEach(function (c) {
      switch (c.type) {
        case 'wordcount': {
          var wc = analysis.meta.wordCount;
          var status = 'pass', detail = words.toLocaleString() + ' words so far' +
            (excludedCitations ? ' (references excluded)' : '');
          if (wc.min && words < wc.min) { status = words > wc.min * 0.6 ? 'warn' : 'fail'; detail += ' — ' + (wc.min - words).toLocaleString() + ' short'; }
          else if (wc.max && words > wc.max) { status = 'fail'; detail += ' — ' + (words - wc.max).toLocaleString() + ' over'; }
          out.push({ label: c.label, detail: detail, status: status });
          break;
        }
        case 'keyword': {
          var term = c.label.replace(/^Use the keyword “|”$/g, '');
          var n = FW.analyzer.phraseCount(text, term);
          var band = analysis.meta.keywordDensity;
          var kwStatus = n > 0 ? 'pass' : 'fail';
          var kwDetail = n > 0 ? 'appears ' + n + ' ' + U.pluralize(n, 'time') : 'not used yet';
          /* Density is the count weighted by phrase length: a three-word phrase
             used twice occupies six of the piece's words, not two. */
          if (band && words) {
            var termWords = term.trim().split(/\s+/).length;
            var pct = (n * termWords / words) * 100;
            /* One use of a five-word phrase in a 300-word piece is 1.67%. If that
               already breaks the cap, the target is unreachable and amber would
               send the writer hunting for a fix that does not exist. */
            var ceiling = analysis.meta.wordCount && analysis.meta.wordCount.max;
            var floorPct = ceiling ? (termWords / ceiling) * 100 : 0;
            var unreachable = floorPct > band.max;
            kwDetail += ' — ' + pct.toFixed(2) + '% of ' + band.min + '–' + band.max + '%';
            if (n === 0) kwStatus = 'fail';
            else if (unreachable) {
              kwStatus = 'manual';
              kwDetail += ' — unreachable: ' + termWords + ' words in ' + ceiling +
                ' is ' + floorPct.toFixed(2) + '% at a single use. Raise it with the client.';
            } else if (pct < band.min || pct > band.max) {
              kwStatus = 'warn';
              kwDetail += pct < band.min ? ' (thin)' : ' (stuffed)';
              /* Adding a mention is not always the fix. Density moves in steps,
                 so sometimes the only setting that lands in band is a shorter
                 piece — say which, rather than leaving the writer to oscillate. */
              var windows = FW.brief.densityWindows(termWords, band, ceiling || 0);
              var usable = windows.filter(function (w) { return words < w.minWords || words > w.maxWords; });
              if (windows.length && usable.length === windows.length) {
                /* Point at the nearest workable length, not the first one. At 300
                   words the fix is to reach 320, not to cut back to 266. */
                var w0 = windows.slice().sort(function (a, b) {
                  function gap(w) { return words < w.minWords ? w.minWords - words : words - w.maxWords; }
                  return gap(a) - gap(b);
                })[0];
                kwDetail += ' — ' + w0.uses + ' use' + (w0.uses === 1 ? '' : 's') +
                  ' lands in band at ' + w0.minWords + '–' + w0.maxWords + ' words';
              }
            }
          }
          out.push({ label: c.label, status: kwStatus, detail: kwDetail });
          break;
        }
        case 'banned': {
          var b = c.label.replace(/^Never use “|”$/g, '');
          var hits = FW.analyzer.phraseCount(text, b);
          out.push({ label: c.label, status: hits ? 'fail' : 'pass', detail: hits ? hits + ' occurrence(s) — remove them' : 'clear' });
          break;
        }
        case 'reading': {
          var target = analysis.meta.readingLevel;
          var grade = lastResult ? lastResult.stats.grade : null;
          var ceiling = analysis.meta.readingLevelCeiling;
          var meets = ceiling ? grade <= target + 0.5 : Math.abs(grade - target) <= 1.5;
          out.push({
            label: c.label, status: grade === null ? 'manual' : meets ? 'pass' : 'warn',
            detail: grade === null ? '' : 'currently grade ' + grade.toFixed(1)
          });
          break;
        }
        case 'structure': {
          if (/^Cover \d+ /.test(c.label)) {
            /* A "breakdown of 5 schools" is delivered as five subheads or five
               list items. Counting them is rough, but a piece covering four of
               five is short, and nothing else in the app would notice. */
            var want = (analysis.meta.items && analysis.meta.items.count) || 0;
            var subheads = refs.editor.querySelectorAll('h2, h3').length;
            var listItems = refs.editor.querySelectorAll('li').length;
            var boldLeads = Array.prototype.filter.call(
              refs.editor.querySelectorAll('p > strong:first-child'),
              function (b) { return b.parentElement.textContent.trim() === b.textContent.trim(); }).length;
            var found = Math.max(subheads, listItems, boldLeads);
            out.push({
              label: c.label,
              status: found >= want ? 'pass' : found ? 'warn' : 'manual',
              detail: found + ' subheading' + (found === 1 ? '' : 's') +
                ', list items or bold leads in the draft — the brief asks for ' + want
            });
          } else if (/subheading/i.test(c.label)) {
            var need = analysis.meta.structure.sections || 0;
            out.push({ label: c.label, status: headings >= need ? 'pass' : 'warn', detail: headings + ' of ' + need + ' in the draft' });
          } else if (/^Title of no more than/i.test(c.label)) {
            var maxChars = analysis.meta.structure.titleMaxChars || 60;
            var h1 = refs.editor ? refs.editor.querySelector('h1') : null;
            var titleText = h1 ? h1.textContent.trim() : '';
            out.push({
              label: c.label,
              status: !titleText ? 'fail' : titleText.length <= maxChars ? 'pass' : 'warn',
              detail: titleText ? titleText.length + ' of ' + maxChars + ' characters' : 'no H1 in the draft'
            });
          } else if (/^No section longer than/i.test(c.label)) {
            var cap = analysis.meta.structure.sectionMaxWords || 0;
            var longest = longestSection();
            out.push({
              label: c.label,
              status: !longest.words ? 'manual' : longest.words <= cap ? 'pass' : 'warn',
              detail: longest.words
                ? 'longest is ' + longest.words + ' words' + (longest.heading ? ' under “' + longest.heading + '”' : '')
                : ''
            });
          } else if (/FAQ/i.test(c.label)) {
            var hasFaq = /\bfaqs?\b|frequently asked/i.test(lower);
            var wantQ = analysis.meta.structure.faqQuestions || 0;
            if (!wantQ) {
              out.push({ label: c.label, status: hasFaq ? 'pass' : 'fail', detail: '' });
            } else {
              var askedQ = faqQuestions();
              out.push({
                label: c.label,
                status: !hasFaq ? 'fail' : askedQ >= wantQ ? 'pass' : 'warn',
                detail: askedQ + ' of ' + wantQ + ' questions in the FAQ block'
              });
            }
          } else if (/call to action/i.test(c.label)) {
            out.push({ label: c.label, status: /\b(sign up|get started|try |download|contact|book a|learn more|calculator|subscribe)\b/i.test(lower) ? 'pass' : 'warn', detail: 'looking for an explicit next step' });
          } else if (/table/i.test(c.label)) {
            out.push({ label: c.label, status: refs.editor.querySelector('table') ? 'pass' : 'fail', detail: '' });
          } else if (/bulleted/i.test(c.label)) {
            out.push({ label: c.label, status: refs.editor.querySelector('ul, ol') ? 'pass' : 'fail', detail: '' });
          } else if (/links/i.test(c.label)) {
            var need2 = analysis.meta.structure.links || 0;
            var anchors = Array.prototype.slice.call(refs.editor.querySelectorAll('a[href]'));
            /* A brief asking for internal links means links into the client's
               own site, so an outbound citation does not count toward them. */
            var wantInternal = analysis.meta.structure.linksInternal;
            var counted = wantInternal
              ? anchors.filter(function (a) { return !/^(?:https?:|mailto:)/i.test(a.getAttribute('href') || ''); })
              : anchors;
            out.push({
              label: c.label, status: counted.length >= need2 ? 'pass' : 'warn',
              detail: counted.length + ' of ' + need2 + (wantInternal ? ' internal (' + anchors.length + ' links in all)' : '')
            });
          } else if (/^Link (?:the keyword )?out/i.test(c.label)) {
            var wantsKeyword = /the keyword/i.test(c.label);
            var need4 = (analysis.meta.structure.externalLinks) || 1;
            var terms = (analysis.meta.keywords || []).map(function (k) { return String(k.term).toLowerCase(); });
            var outbound = Array.prototype.filter.call(
              refs.editor.querySelectorAll('a[href]'),
              function (a) { return /^https?:/i.test(a.getAttribute('href') || ''); });
            var onKeyword = outbound.filter(function (a) {
              var t = a.textContent.toLowerCase();
              return terms.some(function (term) { return term && t.indexOf(term) !== -1; });
            });
            var have4 = wantsKeyword ? onKeyword.length : outbound.length;
            out.push({
              label: c.label, status: have4 >= need4 ? 'pass' : outbound.length ? 'warn' : 'fail',
              detail: wantsKeyword
                ? onKeyword.length + ' of ' + need4 + ' with the keyword as anchor text' +
                  (outbound.length && !onKeyword.length ? ' (' + outbound.length + ' outbound link(s), none on a keyword)' : '')
                : outbound.length + ' of ' + need4 + ' outbound links'
            });
          } else if (/sources/i.test(c.label)) {
            out.push({ label: c.label, status: 'manual', detail: 'Check these yourself before sending.' });
          } else if (/introduction/i.test(c.label)) {
            out.push({ label: c.label, status: words > 80 ? 'pass' : 'manual', detail: '' });
          } else if (/conclusion/i.test(c.label)) {
            out.push({ label: c.label, status: /\b(in closing|to sum|the takeaway|bottom line|what to do next|conclusion)\b/i.test(lower) ? 'pass' : 'manual', detail: 'checked by keyword' });
          } else if (/quotes/i.test(c.label)) {
            out.push({ label: c.label, status: /[“"][^”"]{25,}[”"]/.test(text) || refs.editor.querySelector('blockquote') ? 'pass' : 'warn', detail: '' });
          } else {
            out.push({ label: c.label, status: 'manual', detail: c.detail });
          }
          break;
        }
        case 'voice': {
          if (/first person|second person|third person/.test(c.label)) {
            var pov = analysis.meta.pov;
            var firstP = (text.match(/\b(I|we|my|our)\b/g) || []).length;
            var secondP = (text.match(/\b(you|your)\b/g) || []).length;
            var ok = pov === 'second person' ? secondP > firstP
              : pov === 'first person' ? firstP > 0
                : firstP + secondP < Math.max(3, words / 200);
            out.push({ label: c.label, status: words < 60 ? 'manual' : ok ? 'pass' : 'warn', detail: firstP + ' first-person, ' + secondP + ' second-person markers' });
          } else out.push({ label: c.label, status: 'manual', detail: c.detail });
          break;
        }
        case 'coverage': {
          /* The client will look for these words by name. "course structure/
             overview" counts either way round, and a draft writing "course
             structures" has met the same requirement, so count each stem with
             its inflection in one pass instead of picking one spelling. */
          var point = c.label.replace(/^Cover “|”$/g, '');

          /* Some briefs name a topic ("rates"), others state a whole clause
             ("a comparison to the differences in legislation prior to the 2026
             updates"). No draft contains the second one verbatim, so searching
             for it would report a gap that is not there. State it instead. */
          if (point.trim().split(/\s+/).length > 3) {
            out.push({ label: c.label, status: 'manual', detail: 'Too long to check automatically — confirm it yourself.' });
            break;
          }

          var stems = [point].concat(point.split(/\s*\/\s*/));
          var head = point.split(/\s+/).slice(-1)[0];
          if (head && head.length > 3) stems.push(head);

          var mentions = 0;
          U.unique(stems).forEach(function (stem) {
            if (!stem) return;
            var base = stem.replace(/s$/i, '');
            var re = new RegExp('\\b' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b', 'gi');
            var n = (text.match(re) || []).length;
            if (n > mentions) mentions = n;
          });

          /* When the brief asks for this on each of N items, one mention across
             the whole piece means the other items are missing it. */
          var perItem = analysis.meta.items && analysis.meta.items.count;
          var coverStatus = mentions ? 'pass' : 'fail';
          var coverDetail = mentions ? mentions + ' mention' + (mentions === 1 ? '' : 's') : 'not mentioned yet';
          if (perItem) {
            coverDetail += ' across ' + perItem + ' items';
            if (mentions && mentions < perItem) { coverStatus = 'warn'; coverDetail += ' — some are missing it'; }
          }
          out.push({ label: c.label, status: coverStatus, detail: coverDetail });
          break;
        }
        case 'citation':
          /* The app cannot tell a correct citation from a plausible one, and
             grading typed references against its own list only ever produced a
             warning on work that was already right. State the rule, no verdict. */
          out.push({ label: c.label, status: 'manual', detail: c.detail });
          break;
        case 'deliverable':
          if (/images/i.test(c.label)) {
            /* The panel measures the editor and the client receives the export,
               so say here what the export will do with what is on the page: a
               pasted image travels inside the file, a linked one can only be
               named for whoever places it. */
            var imgs = refs.editor ? Array.prototype.slice.call(refs.editor.querySelectorAll('img')) : [];
            var embedded = imgs.filter(function (im) { return /^data:image\//i.test(im.getAttribute('src') || ''); }).length;
            var linked = imgs.length - embedded;
            out.push({
              label: c.label, status: 'manual',
              detail: imgs.length
                ? imgs.length + ' in the draft: ' + embedded + ' travel inside the .docx, ' +
                  linked + ' listed by name and URL for the client to place. ' + c.detail
                : c.detail
            });
            break;
          }
          out.push({ label: c.label, status: 'manual', detail: c.detail });
          break;
        default:
          out.push({ label: c.label, status: 'manual', detail: c.detail });
      }
    });
    return out;
  }

  /* ================= status bar ================= */
  function updateStatus() {
    if (!refs.status) return;
    U.clear(refs.status);
    var text = lastResult ? lastResult.text : U.stripHtml(refs.editor.innerHTML);
    var words = U.wordCount(text);

    refs.status.appendChild(stat(words.toLocaleString(), 'words'));
    refs.status.appendChild(stat(text.replace(/\s/g, '').length.toLocaleString(), 'chars'));
    if (lastResult) {
      refs.status.appendChild(stat(lastResult.stats.readingMinutes + ' min', 'read'));
      refs.status.appendChild(stat(lastResult.stats.grade.toFixed(1), 'grade'));
      refs.status.appendChild(el('span', {
        class: 'chip ' + (lastResult.counts.error ? 'chip-error' : lastResult.issues.length ? 'chip-warning' : 'chip-ok'),
        text: lastResult.counts.error ? lastResult.counts.error + ' to fix'
          : lastResult.issues.length ? lastResult.issues.length + ' suggestions' : 'clean'
      }));
    }

    var target = currentTask && (currentTask.wordTarget ||
      (currentTask.analysis && currentTask.analysis.meta.wordCount && (currentTask.analysis.meta.wordCount.max || currentTask.analysis.meta.wordCount.min)));
    if (target) {
      var pct = U.clamp(Math.round(words / target * 100), 0, 100);
      var cls = words > target * 1.05 ? 'over' : words < target * 0.9 ? 'under' : '';
      refs.status.appendChild(el('div', { class: 'stat' }, [
        el('div', { class: 'progress ' + cls }, [el('span', { style: { width: pct + '%' } })]),
        el('span', { text: pct + '% of ' + target.toLocaleString() })
      ]));
    }

    refs.status.appendChild(el('div', { class: 'grow' }));
    refs.status.appendChild(el('span', {
      class: 'tiny dim',
      text: currentDoc ? 'Saved ' + new Date(currentDoc.updatedAt).toLocaleTimeString() : ''
    }));
  }

  function stat(value, label) {
    return el('div', { class: 'stat' }, [el('b', { text: value }), el('span', { text: label })]);
  }

  /* ================= typography ================= */
  function applyTypography() {
    if (!refs.editor) return;
    var s = S.state.settings;
    var font = FW.resources.font(s.font);
    refs.editor.style.fontFamily = font.stack;
    refs.editor.style.fontSize = s.size + 'px';
    refs.editor.style.lineHeight = String(s.line);
    refs.editor.style.textAlign = s.align;
    refs.editor.style.letterSpacing = (s.letter || 0) + 'px';
    refs.page.style.maxWidth = (s.width + 116) + 'px';
    refs.editor.setAttribute('lang', s.language);
    refs.editor.setAttribute('dir', FW.resources.language(s.language).dir);
  }

  function openTypography() {
    var s = S.state.settings;
    var body = el('div', {});

    body.appendChild(K.field('Preset', K.select(
      [{ value: '', label: 'Custom' }].concat(FW.resources.PRESETS.map(function (p) { return { value: p.id, label: p.label }; })),
      '', function (v) {
        var preset = FW.resources.PRESETS.filter(function (p) { return p.id === v; })[0];
        if (!preset) return;
        ['font', 'size', 'line', 'width', 'align'].forEach(function (k) { S.setSetting(k, preset[k]); });
        applyTypography();
        K.toast('Applied the ' + preset.label + ' preset');
      })));

    var byCategory = {};
    FW.resources.FONTS.forEach(function (f) { (byCategory[f.category] = byCategory[f.category] || []).push(f); });
    var fontSel = el('select', {
      onchange: function (e) { S.setSetting('font', e.target.value); applyTypography(); }
    }, Object.keys(byCategory).map(function (cat) {
      return el('optgroup', { label: cat }, byCategory[cat].map(function (f) {
        return el('option', { value: f.id, text: f.label, selected: f.id === s.font });
      }));
    }));
    body.appendChild(K.field('Typeface', fontSel, FW.resources.font(s.font).use));

    function slider(label, key, min, max, step, suffix) {
      var out = el('output', { text: s[key] + (suffix || '') });
      var input = el('input', {
        type: 'range', min: min, max: max, step: step, value: s[key],
        oninput: function (e) {
          var v = Number(e.target.value);
          out.textContent = v + (suffix || '');
          S.setSetting(key, v);
          applyTypography();
        }
      });
      return K.field(label, el('div', { class: 'flex' }, [input, out]));
    }

    body.appendChild(slider('Text size', 'size', 13, 30, 1, 'px'));
    body.appendChild(slider('Line height', 'line', 1.2, 2.4, 0.05, ''));
    body.appendChild(slider('Page width', 'width', 440, 1040, 10, 'px'));
    body.appendChild(slider('Letter spacing', 'letter', -0.5, 2, 0.1, 'px'));

    body.appendChild(K.field('Alignment', el('div', { class: 'btn-group' },
      ['left', 'center', 'right', 'justify'].map(function (a) {
        return el('button', {
          class: 'btn btn-sm' + (s.align === a ? ' is-active' : ''), text: U.sentenceCase(a),
          onclick: function (e) {
            S.setSetting('align', a); applyTypography();
            U.$$('.btn', e.target.parentNode).forEach(function (b) { b.classList.toggle('is-active', b === e.target); });
          }
        });
      }))));

    body.appendChild(el('hr', { class: 'divider' }));
    body.appendChild(el('div', { class: 'section-title', text: 'Preview' }));
    FW.resources.FONTS.forEach(function (f) {
      body.appendChild(el('div', {
        class: 'font-sample', style: { fontFamily: f.stack, cursor: 'pointer' },
        onclick: function () { S.setSetting('font', f.id); fontSel.value = f.id; applyTypography(); }
      }, [
        el('span', { text: 'The quiet hum of a deadline at 4 a.m.' }),
        el('small', { text: f.label + ' — ' + f.use })
      ]));
    });

    K.modal({ title: 'Typography', size: 'lg', body: body, actions: [{ label: 'Done', variant: 'primary' }] });
  }

  /* ================= history ================= */
  function relativeTime(ts) {
    var secs = Math.round((Date.now() - ts) / 1000);
    if (secs < 45) return 'just now';
    var mins = Math.round(secs / 60);
    if (mins < 60) return mins + ' ' + U.pluralize(mins, 'minute') + ' ago';
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + ' ' + U.pluralize(hours, 'hour') + ' ago';
    var days = Math.round(hours / 24);
    if (days < 7) return days + ' ' + U.pluralize(days, 'day') + ' ago';
    return new Date(ts).toLocaleDateString();
  }

  function openHistory() {
    if (!currentDoc) { K.toast('Open an assignment first', 'error'); return; }

    var body = el('div', {});

    function draw() {
      U.clear(body);
      var currentWords = editorWords();
      var stats = S.historyStats(currentDoc.id);

      body.appendChild(el('div', { class: 'spread', style: { marginBottom: '12px', flexWrap: 'wrap' } }, [
        el('div', { class: 'small muted' }, [
          el('span', { text: 'A version is kept every ' + Math.round(SNAPSHOT_INTERVAL / 60000) +
            ' minutes of active writing, whenever you press Ctrl+S, and before anything that rewrites the draft.' })
        ]),
        el('button', {
          class: 'btn btn-sm btn-primary', text: 'Save a version now',
          onclick: function () {
            var entry = takeSnapshot('manual save');
            K.toast(entry ? 'Version saved' : 'Nothing to save yet', entry ? undefined : 'error');
            draw();
          }
        })
      ]));

      body.appendChild(el('div', { class: 'stat-grid', style: { marginBottom: '14px' } }, [
        tile(currentWords.toLocaleString(), 'Words now'),
        tile(String(stats.entries), 'Versions kept'),
        tile(Math.max(1, Math.round(stats.bytes / 1024)) + ' KB', 'History size')
      ]));

      if (!currentDoc.history.length) {
        body.appendChild(el('div', { class: 'empty' }, [
          el('div', { text: 'No earlier versions yet.' }),
          el('div', { class: 'tiny dim', style: { marginTop: '6px' },
            text: 'Keep writing and one will be kept automatically, or save a version now.' })
        ]));
        return;
      }

      currentDoc.history.forEach(function (h, i) {
        var words = h.words !== undefined ? h.words : U.wordCount(U.stripHtml(h.html));
        var delta = words - currentWords;
        var preview = U.stripHtml(h.html).replace(/\s+/g, ' ').trim().slice(0, 190);
        var isCurrent = h.html === refs.editor.innerHTML;

        body.appendChild(el('div', {
          class: 'card',
          style: { marginBottom: '8px', borderColor: isCurrent ? 'var(--accent)' : '' }
        }, [
          el('div', { class: 'spread', style: { flexWrap: 'wrap', gap: '8px' } }, [
            el('div', { class: 'grow', style: { minWidth: '180px' } }, [
              el('div', { class: 'flex wrap', style: { gap: '6px' } }, [
                el('strong', { style: { fontSize: '13px' }, text: U.sentenceCase(h.label) }),
                isCurrent ? el('span', { class: 'chip chip-ok', text: 'matches the draft' }) : null
              ].filter(Boolean)),
              el('div', { class: 'tiny dim', style: { marginTop: '3px' },
                text: relativeTime(h.at) + ' · ' + new Date(h.at).toLocaleTimeString() +
                  ' · ' + words.toLocaleString() + ' words' +
                  (delta === 0 ? '' : ' (' + (delta > 0 ? '+' : '') + delta.toLocaleString() + ' vs now)') })
            ]),
            el('div', { class: 'flex', style: { gap: '5px' } }, [
              el('button', {
                class: 'btn btn-sm btn-ghost', text: 'Preview',
                onclick: function () { previewVersion(h, i); }
              }),
              el('button', {
                class: 'btn btn-sm', text: 'Restore', disabled: isCurrent || null,
                onclick: function () { restore(i); }
              })
            ])
          ]),
          el('p', { class: 'small muted', style: { margin: '8px 0 0' },
            text: preview + (preview.length >= 190 ? '…' : '') })
        ]));
      });
    }

    function restore(index) {
      S.restoreVersion(currentDoc.id, index);
      refs.editor.innerHTML = currentDoc.html;
      lastSnapshotAt = Date.now();
      lastSnapshotWords = editorWords();
      runCheck();
      draw();
      K.toast('Version restored — the draft you had is in history too');
    }

    function previewVersion(entry, index) {
      var pane = el('div', {
        style: {
          maxHeight: '58vh', overflowY: 'auto', padding: '16px',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          background: 'var(--surface)', fontFamily: FW.resources.font(S.state.settings.font).stack,
          lineHeight: '1.6'
        }
      });
      pane.innerHTML = entry.html;
      K.modal({
        title: U.sentenceCase(entry.label) + ' — ' + relativeTime(entry.at),
        size: 'lg',
        body: pane,
        actions: [
          { label: 'Close' },
          {
            label: 'Restore this version', variant: 'primary',
            onClick: function () { restore(index); }
          }
        ]
      });
    }

    draw();
    K.modal({ title: 'Version history', size: 'lg', body: body, actions: [{ label: 'Done' }] });
  }

  /* ================= public API for the tools pane ================= */
  function api() {
    return {
      getTask: function () { return currentTask; },
      getDoc: function () { return currentDoc; },
      getHtml: function () { return refs.editor.innerHTML; },
      getText: function () { return lastResult ? lastResult.text : U.stripHtml(refs.editor.innerHTML); },
      getSelection: function () {
        var sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) return '';
        if (!refs.editor.contains(sel.anchorNode)) return '';
        return sel.toString();
      },
      replaceSelection: function (text, label) {
        if (label) snapshotBefore(label);
        refs.editor.focus();
        document.execCommand('insertText', false, text);
        onInput();
      },
      insertHtml: function (html, label) {
        if (label) snapshotBefore(label);
        insertHtmlAt(html);
        onInput();
        runCheck();
      },
      setHtml: function (html, label) {
        snapshotBefore(label || 'before a tool replaced the draft');
        refs.editor.innerHTML = html;
        saveNow();
        runCheck();
      },
      snapshot: function (label) { return takeSnapshot(label); },
      snapshotBefore: snapshotBefore,
      getResult: function () { return lastResult; },
      recheck: runCheck,
      highlightSpans: function (spans) {
        if (!supportsHighlight || !lastResult) return;
        var ranges = spans.map(function (s) { return rangeFor(lastResult.map, s.start, s.end); }).filter(Boolean);
        try { CSS.highlights.set('fw-match', new Highlight(...ranges)); } catch (e) { }
      },
      clearMatchHighlight: function () {
        if (supportsHighlight) CSS.highlights.delete('fw-match');
      }
    };
  }

  FW.editor = { mount: mount, load: load, runCheck: runCheck, api: api, applyTypography: applyTypography };
})(window.FW);
