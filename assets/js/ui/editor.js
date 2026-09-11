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
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow(true); K.toast('Draft saved'); return; }
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

  function onPaste(e) {
    var html = e.clipboardData && e.clipboardData.getData('text/html');
    var text = e.clipboardData && e.clipboardData.getData('text/plain');
    e.preventDefault();
    if (html) {
      document.execCommand('insertHTML', false, sanitize(html));
    } else if (text) {
      var paras = text.split(/\n\s*\n/).map(function (p) {
        return '<p>' + U.escapeHtml(p).replace(/\n/g, '<br>') + '</p>';
      }).join('');
      document.execCommand('insertHTML', false, paras);
    }
    onInput();
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
  function textMap() {
    var text = '', map = [];
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
          walk(child);
          if (BLOCK.test(tag) && !/\n$/.test(text)) text += '\n';
        }
      }
    })(refs.editor);
    return { text: text, map: map };
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

  var saveNow = function (snapshot) {
    if (!currentDoc) return;
    S.saveDoc(currentDoc.id, refs.editor.innerHTML, snapshot ? { snapshot: true, label: 'manual save' } : null);
  };

  var autosave = U.debounce(function () { saveNow(false); }, 900);
  var autosnapshot = U.debounce(function () { saveNow(true); }, 120000);

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
    autosnapshot();
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
      analysis: currentTask ? currentTask.analysis : null
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
    saveNow(false);
    runCheck();
    K.toast('Fix applied');
  }

  function applyAllOfRule(rule) {
    if (!lastResult) return;
    var list = lastResult.issues.filter(function (i) {
      return i.rule === rule && i.fix !== null && i.fix !== undefined && !ignored[issueKey(i)];
    });
    if (!list.length) return;
    /* Work back to front so earlier offsets stay valid. */
    list.sort(function (a, b) { return b.start - a.start; }).forEach(function (issue) {
      var range = rangeFor(lastResult.map, issue.start, issue.end);
      if (!range) return;
      range.deleteContents();
      if (issue.fix !== '') range.insertNode(document.createTextNode(issue.fix));
    });
    refs.editor.normalize();
    saveNow(false);
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
        return h.textContent.trim().toLowerCase();
      });
      chosen.outline.forEach(function (o) {
        var key = o.text.toLowerCase().split(/[:—-]/)[0].trim().slice(0, 18);
        var done = headings.some(function (h) { return h.indexOf(key) !== -1; });
        refs.leftBody.appendChild(el('div', { class: 'check-item' }, [
          el('span', { class: 'dot ' + (done ? 'dot-pass' : 'dot-manual'), text: done ? '✓' : '○' }),
          el('div', { class: 'grow small', text: o.text })
        ]));
      });
    }
  }

  /* Evaluate what the brief demands against what is actually on the page. */
  function evaluate(analysis, text) {
    var out = [];
    var words = U.wordCount(text);
    var lower = text.toLowerCase();
    var headings = refs.editor ? refs.editor.querySelectorAll('h2, h3').length : 0;

    analysis.checks.forEach(function (c) {
      switch (c.type) {
        case 'wordcount': {
          var wc = analysis.meta.wordCount;
          var status = 'pass', detail = words.toLocaleString() + ' words so far';
          if (wc.min && words < wc.min) { status = words > wc.min * 0.6 ? 'warn' : 'fail'; detail += ' — ' + (wc.min - words).toLocaleString() + ' short'; }
          else if (wc.max && words > wc.max) { status = 'fail'; detail += ' — ' + (words - wc.max).toLocaleString() + ' over'; }
          out.push({ label: c.label, detail: detail, status: status });
          break;
        }
        case 'keyword': {
          var term = c.label.replace(/^Use the keyword “|”$/g, '');
          var n = FW.analyzer.phraseCount(text, term);
          out.push({
            label: c.label, status: n > 0 ? 'pass' : 'fail',
            detail: n > 0 ? 'appears ' + n + ' ' + U.pluralize(n, 'time') : 'not used yet'
          });
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
          out.push({
            label: c.label, status: grade === null ? 'manual' : Math.abs(grade - target) <= 1.5 ? 'pass' : 'warn',
            detail: grade === null ? '' : 'currently grade ' + grade.toFixed(1)
          });
          break;
        }
        case 'structure': {
          if (/subheading/i.test(c.label)) {
            var need = analysis.meta.structure.sections || 0;
            out.push({ label: c.label, status: headings >= need ? 'pass' : 'warn', detail: headings + ' of ' + need + ' in the draft' });
          } else if (/FAQ/i.test(c.label)) {
            out.push({ label: c.label, status: /\bfaq\b|frequently asked/i.test(lower) ? 'pass' : 'fail', detail: '' });
          } else if (/call to action/i.test(c.label)) {
            out.push({ label: c.label, status: /\b(sign up|get started|try |download|contact|book a|learn more|calculator|subscribe)\b/i.test(lower) ? 'pass' : 'warn', detail: 'looking for an explicit next step' });
          } else if (/table/i.test(c.label)) {
            out.push({ label: c.label, status: refs.editor.querySelector('table') ? 'pass' : 'fail', detail: '' });
          } else if (/bulleted/i.test(c.label)) {
            out.push({ label: c.label, status: refs.editor.querySelector('ul, ol') ? 'pass' : 'fail', detail: '' });
          } else if (/links/i.test(c.label)) {
            var need2 = analysis.meta.structure.links || 0;
            var have = refs.editor.querySelectorAll('a[href]').length;
            out.push({ label: c.label, status: have >= need2 ? 'pass' : 'warn', detail: have + ' of ' + need2 });
          } else if (/sources/i.test(c.label)) {
            var need3 = analysis.meta.structure.sources || 0;
            var cites = S.state.citations.filter(function (x) { return x.taskId === currentTask.id; }).length;
            out.push({ label: c.label, status: cites >= need3 ? 'pass' : 'warn', detail: cites + ' in the citation list' });
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
        case 'citation':
          out.push({
            label: c.label, status: S.state.citations.length ? 'pass' : 'manual',
            detail: S.state.citations.length + ' citations saved'
          });
          break;
        case 'deliverable':
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
  function openHistory() {
    if (!currentDoc) return;
    var body = el('div', {});
    if (!currentDoc.history.length) {
      body.appendChild(el('div', { class: 'empty', text: 'No earlier versions yet. Snapshots are taken when you save with Ctrl+S and every couple of minutes while you write.' }));
    } else {
      currentDoc.history.forEach(function (h, i) {
        var preview = U.stripHtml(h.html).slice(0, 150);
        body.appendChild(el('div', { class: 'card', style: { marginBottom: '8px' } }, [
          el('div', { class: 'spread' }, [
            el('div', {}, [
              el('strong', { style: { fontSize: '13px' }, text: new Date(h.at).toLocaleString() }),
              el('div', { class: 'tiny dim', text: h.label + ' · ' + U.wordCount(U.stripHtml(h.html)).toLocaleString() + ' words' })
            ]),
            el('button', {
              class: 'btn btn-sm', text: 'Restore',
              onclick: function () {
                S.restoreVersion(currentDoc.id, i);
                refs.editor.innerHTML = currentDoc.html;
                runCheck();
                K.toast('Version restored');
              }
            })
          ]),
          el('p', { class: 'small muted', style: { margin: '8px 0 0' }, text: preview + (preview.length >= 150 ? '…' : '') })
        ]));
      });
    }
    K.modal({ title: 'Version history', size: 'lg', body: body, actions: [{ label: 'Close' }] });
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
      replaceSelection: function (text) {
        refs.editor.focus();
        document.execCommand('insertText', false, text);
        onInput();
      },
      insertHtml: function (html) {
        insertHtmlAt(html);
        onInput();
        runCheck();
      },
      setHtml: function (html, label) {
        if (currentDoc) S.saveDoc(currentDoc.id, refs.editor.innerHTML, { snapshot: true, label: label || 'before tool change' });
        refs.editor.innerHTML = html;
        saveNow(false);
        runCheck();
      },
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
