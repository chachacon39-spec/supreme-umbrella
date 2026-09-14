/* Central state: tasks, documents, citations, settings. Persisted to localStorage. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util;

  var COLUMNS = [
    { id: 'inbox', label: 'Inbox', hint: 'Unread briefs land here' },
    { id: 'analysis', label: 'Analysed', hint: 'Guidelines extracted, styles generated' },
    { id: 'drafting', label: 'Drafting', hint: 'Words on the page' },
    { id: 'editing', label: 'Editing', hint: 'Running the checks' },
    { id: 'review', label: 'Client review', hint: 'Sent, awaiting feedback' },
    { id: 'delivered', label: 'Delivered', hint: 'Invoiced and done' }
  ];

  var DEFAULT_SETTINGS = {
    theme: 'light',
    font: 'georgia',
    size: 19,
    line: 1.7,
    width: 720,
    align: 'left',
    letter: 0,
    language: 'en-US',
    styleGuide: 'chicago',
    defaultPersona: 'blog',
    checks: {
      grammar: true, punctuation: true, structure: true,
      style: true, inclusive: true, readability: true, spelling: true
    },
    autoCheck: true,
    focusMode: false,

    /* Backup safety. Everything lives in this browser, so the app has to be
       the thing that remembers — the writer should not have to. */
    lastBackupAt: 0,
    lastBackupWords: 0,
    backupSnoozedUntil: 0,
    backupReminders: true
  };

  var state = {
    tasks: [],
    docs: {},
    citations: [],
    snippets: [],
    settings: Object.assign({}, DEFAULT_SETTINGS),
    activeTaskId: null,
    activeView: 'board'
  };

  var listeners = {};

  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function off() {
      listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; });
    };
  }

  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('listener error on ' + evt, e); }
    });
    if (evt !== '*') emit('*', { type: evt, payload: payload });
  }

  /* ---------- persistence ---------- */
  var persist = U.debounce(function () {
    U.save('tasks', state.tasks);
    U.save('citations', state.citations);
    U.save('snippets', state.snippets);
    U.save('settings', state.settings);
    U.save('activeTaskId', state.activeTaskId);

    /* Documents carry version history and are by far the largest value. If the
       browser refuses it, shed old versions and retry — losing history is
       recoverable, losing the draft is not. */
    if (U.save('docs', state.docs)) return;

    /* Shed version history in escalating steps. The draft outranks its history:
       history is a convenience, an unsaved draft is lost work. */
    var budgets = [HISTORY_MAX_BYTES / 4, HISTORY_MAX_BYTES / 16];
    for (var i = 0; i < budgets.length; i++) {
      var budget = budgets[i];
      Object.keys(state.docs).forEach(function (id) { trimHistory(state.docs[id], budget); });
      if (U.save('docs', state.docs)) { emit('storage:trimmed', state.docs); return; }
    }

    Object.keys(state.docs).forEach(function (id) { state.docs[id].history = []; });
    if (U.save('docs', state.docs)) { emit('storage:trimmed', state.docs); return; }

    /* Last resort: persist the drafts alone, stripped of everything optional. */
    var minimal = {};
    Object.keys(state.docs).forEach(function (id) {
      var d = state.docs[id];
      minimal[id] = { id: d.id, taskId: d.taskId, title: d.title, html: d.html, updatedAt: d.updatedAt, history: [] };
    });
    if (U.save('docs', minimal)) { emit('storage:trimmed', state.docs); return; }

    emit('storage:full', state.docs);
  }, 300);

  /* The browser can be closed inside the autosave window, so flush on the way out. */
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pagehide', function () { persist.flush(); });
    window.addEventListener('beforeunload', function () { persist.flush(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') persist.flush();
    });
  }

  function hydrate() {
    state.tasks = U.load('tasks', []) || [];
    state.docs = U.load('docs', {}) || {};
    state.citations = U.load('citations', []) || [];
    state.snippets = U.load('snippets', []) || [];
    state.settings = Object.assign({}, DEFAULT_SETTINGS, U.load('settings', {}) || {});
    state.settings.checks = Object.assign({}, DEFAULT_SETTINGS.checks, state.settings.checks || {});
    state.activeTaskId = U.load('activeTaskId', null);
    if (state.activeTaskId && !getTask(state.activeTaskId)) state.activeTaskId = null;
  }

  /* ---------- tasks ---------- */
  function getTask(id) {
    for (var i = 0; i < state.tasks.length; i++) if (state.tasks[i].id === id) return state.tasks[i];
    return null;
  }

  function tasksIn(column) {
    return state.tasks.filter(function (t) { return t.column === column; })
      .sort(function (a, b) { return a.order - b.order; });
  }

  function nextOrder(column) {
    var list = tasksIn(column);
    return list.length ? list[list.length - 1].order + 1 : 0;
  }

  function addTask(data) {
    var task = Object.assign({
      id: U.uid('task'),
      title: 'Untitled assignment',
      client: '',
      brief: '',
      deadline: '',
      wordTarget: 0,
      rate: '',
      personaId: state.settings.defaultPersona,
      column: 'inbox',
      order: 0,
      tags: [],
      chosenStyle: null,
      analysis: null,
      styles: null,
      docId: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, data || {});
    task.order = nextOrder(task.column);
    state.tasks.push(task);
    persist();
    emit('tasks:changed', state.tasks);
    emit('task:added', task);
    return task;
  }

  function updateTask(id, patch) {
    var t = getTask(id);
    if (!t) return null;
    Object.assign(t, patch, { updatedAt: Date.now() });
    persist();
    emit('tasks:changed', state.tasks);
    emit('task:updated', t);
    return t;
  }

  function removeTask(id) {
    var t = getTask(id);
    if (!t) return;
    state.tasks = state.tasks.filter(function (x) { return x.id !== id; });
    if (t.docId) delete state.docs[t.docId];
    if (state.activeTaskId === id) state.activeTaskId = null;
    persist();
    emit('tasks:changed', state.tasks);
    emit('task:removed', t);
  }

  function duplicateTask(id) {
    var t = getTask(id);
    if (!t) return null;
    var copy = JSON.parse(JSON.stringify(t));
    copy.id = U.uid('task');
    copy.title = t.title + ' (copy)';
    copy.docId = null;
    copy.createdAt = copy.updatedAt = Date.now();
    copy.order = nextOrder(copy.column);
    state.tasks.push(copy);
    persist();
    emit('tasks:changed', state.tasks);
    return copy;
  }

  /* Move a task to a column, inserting before `beforeId` (or at the end). */
  function moveTask(id, column, beforeId) {
    var t = getTask(id);
    if (!t) return;
    var target = tasksIn(column).filter(function (x) { return x.id !== id; });
    var idx = target.length;
    if (beforeId) {
      for (var i = 0; i < target.length; i++) if (target[i].id === beforeId) { idx = i; break; }
    }
    target.splice(idx, 0, t);
    t.column = column;
    target.forEach(function (x, i) { x.order = i; });
    t.updatedAt = Date.now();
    persist();
    emit('tasks:changed', state.tasks);
    emit('task:moved', { task: t, column: column });
  }

  /* ---------- documents ---------- */
  function getDoc(id) { return id ? state.docs[id] || null : null; }

  function docForTask(taskId, createIfMissing) {
    var t = getTask(taskId);
    if (!t) return null;
    if (t.docId && state.docs[t.docId]) return state.docs[t.docId];
    if (!createIfMissing) return null;
    var doc = {
      id: U.uid('doc'),
      taskId: taskId,
      title: t.title,
      html: '',
      updatedAt: Date.now(),
      history: []
    };
    state.docs[doc.id] = doc;
    t.docId = doc.id;
    persist();
    emit('docs:changed', state.docs);
    return doc;
  }

  /* Version history is bounded by entry count AND bytes: localStorage is a shared
     ~5MB budget, and a long draft snapshotted 30 times would evict the whole
     workspace rather than just old versions. */
  var HISTORY_MAX_ENTRIES = 30;
  var HISTORY_MAX_BYTES = 400000;
  var HISTORY_MIN_KEEP = 3;

  function historyBytes(doc) {
    return (doc.history || []).reduce(function (n, h) { return n + (h.html || '').length; }, 0);
  }

  function trimHistory(doc, maxBytes) {
    if (!doc.history) { doc.history = []; return; }
    if (doc.history.length > HISTORY_MAX_ENTRIES) doc.history.length = HISTORY_MAX_ENTRIES;
    var budget = maxBytes === undefined ? HISTORY_MAX_BYTES : maxBytes;
    var bytes = 0;
    for (var i = 0; i < doc.history.length; i++) {
      bytes += (doc.history[i].html || '').length;
      if (bytes > budget && i >= HISTORY_MIN_KEEP) { doc.history.length = i; return; }
    }
  }

  /* Capture the document as it stands right now. Callers snapshot *before* a
     destructive change ("before …") or *after* a milestone ("outline scaffold"). */
  function snapshotDoc(docId, label, html) {
    var doc = state.docs[docId];
    if (!doc) return null;
    var content = html === undefined ? doc.html : html;
    if (!content || !U.stripHtml(content).trim()) return null;

    var newest = doc.history[0];
    if (newest && newest.html === content) {
      /* Same content already captured — relabel rather than store it twice. */
      newest.at = Date.now();
      if (label) newest.label = label;
      persist();
      return newest;
    }

    var entry = {
      at: Date.now(),
      html: content,
      label: label || 'snapshot',
      words: U.wordCount(U.stripHtml(content))
    };
    doc.history.unshift(entry);
    trimHistory(doc);
    persist();
    emit('doc:snapshot', { doc: doc, entry: entry });
    return entry;
  }

  function saveDoc(docId, html) {
    var doc = state.docs[docId];
    if (!doc) return null;
    if (doc.html === html) return doc;
    doc.html = html;
    doc.updatedAt = Date.now();
    persist();
    emit('doc:saved', doc);
    return doc;
  }

  function restoreVersion(docId, index) {
    var doc = state.docs[docId];
    if (!doc || !doc.history[index]) return null;
    var entry = doc.history[index];
    /* Restoring is itself undoable. */
    snapshotDoc(docId, 'before restoring an earlier version');
    doc.html = entry.html;
    doc.updatedAt = Date.now();
    persist();
    emit('doc:saved', doc);
    emit('doc:restored', doc);
    return doc;
  }

  function historyStats(docId) {
    var doc = state.docs[docId];
    if (!doc) return { entries: 0, bytes: 0 };
    return { entries: (doc.history || []).length, bytes: historyBytes(doc) };
  }

  /* ---------- citations ---------- */
  function addCitation(c) {
    c.id = c.id || U.uid('cite');
    c.createdAt = Date.now();
    state.citations.unshift(c);
    persist();
    emit('citations:changed', state.citations);
    return c;
  }

  function removeCitation(id) {
    state.citations = state.citations.filter(function (c) { return c.id !== id; });
    persist();
    emit('citations:changed', state.citations);
  }

  /* ---------- snippets (voice sheets, saved passages) ---------- */
  function addSnippet(s) {
    s.id = s.id || U.uid('snip');
    s.createdAt = Date.now();
    state.snippets.unshift(s);
    persist();
    emit('snippets:changed', state.snippets);
    return s;
  }

  function removeSnippet(id) {
    state.snippets = state.snippets.filter(function (s) { return s.id !== id; });
    persist();
    emit('snippets:changed', state.snippets);
  }

  /* ---------- settings ---------- */
  function setSetting(key, value) {
    if (key === 'checks') state.settings.checks = Object.assign({}, state.settings.checks, value);
    else state.settings[key] = value;
    persist();
    emit('settings:changed', state.settings);
  }

  function setActiveTask(id) {
    state.activeTaskId = id;
    persist();
    emit('activeTask:changed', id);
  }

  function setView(view) {
    state.activeView = view;
    emit('view:changed', view);
  }

  /* ---------- backup safety ----------
     Nudging is based on work at risk, not just elapsed time: a writer who has
     not touched the app in a month has nothing new to lose, and one who wrote
     3,000 words this morning has a great deal. */
  var BACKUP = {
    firstBackupWords: 400,   /* never backed up: nudge once there is real work */
    staleDays: 7,            /* backed up before: how long counts as stale */
    staleWords: 250,         /* ...and how much new writing counts as at risk */
    snoozeDays: 3
  };

  function totalWords() {
    var total = 0;
    Object.keys(state.docs).forEach(function (id) {
      total += U.wordCount(U.stripHtml(state.docs[id].html || ''));
    });
    return total;
  }

  function backupStatus() {
    var settings = state.settings;
    var words = totalWords();
    var wordsSince = Math.max(0, words - (settings.lastBackupWords || 0));
    var daysSince = settings.lastBackupAt
      ? Math.floor((Date.now() - settings.lastBackupAt) / 86400000) : null;

    var status = {
      totalWords: words,
      wordsSince: wordsSince,
      daysSince: daysSince,
      lastBackupAt: settings.lastBackupAt || 0,
      neverBackedUp: !settings.lastBackupAt,
      tasks: state.tasks.length,
      snoozed: Date.now() < (settings.backupSnoozedUntil || 0),
      remindersOff: settings.backupReminders === false,
      state: 'ok',
      atRisk: false
    };

    if (!words) { status.state = 'empty'; return status; }

    if (status.neverBackedUp) {
      status.state = words >= BACKUP.firstBackupWords ? 'never' : 'new';
      status.atRisk = words >= BACKUP.firstBackupWords;
    } else if (daysSince >= BACKUP.staleDays && wordsSince >= BACKUP.staleWords) {
      status.state = 'stale';
      status.atRisk = true;
    } else if (wordsSince >= BACKUP.staleWords * 4) {
      /* A lot of new writing since the last backup, whatever the date. */
      status.state = 'stale';
      status.atRisk = true;
    }

    if (status.snoozed || status.remindersOff) status.atRisk = false;
    return status;
  }

  function markBackedUp() {
    state.settings.lastBackupAt = Date.now();
    state.settings.lastBackupWords = totalWords();
    state.settings.backupSnoozedUntil = 0;
    persist();
    emit('settings:changed', state.settings);
    emit('backup:changed', backupStatus());
  }

  function snoozeBackupReminder(days) {
    state.settings.backupSnoozedUntil = Date.now() + (days || BACKUP.snoozeDays) * 86400000;
    persist();
    emit('backup:changed', backupStatus());
  }

  function setBackupReminders(on) {
    state.settings.backupReminders = !!on;
    persist();
    emit('settings:changed', state.settings);
    emit('backup:changed', backupStatus());
  }

  /* ---------- import / export of the whole workspace ---------- */
  function exportAll() {
    return {
      app: 'quill-and-ledger',
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: state.tasks, docs: state.docs, citations: state.citations,
      snippets: state.snippets, settings: state.settings
    };
  }

  function importAll(data, mode) {
    if (!data || !data.tasks) throw new Error('That file does not look like a Quill & Ledger backup.');
    if (mode === 'replace') {
      state.tasks = data.tasks || [];
      state.docs = data.docs || {};
      state.citations = data.citations || [];
      state.snippets = data.snippets || [];
    } else {
      var existing = {};
      state.tasks.forEach(function (t) { existing[t.id] = true; });
      (data.tasks || []).forEach(function (t) {
        if (existing[t.id]) t.id = U.uid('task');
        t.order = nextOrder(t.column || 'inbox');
        state.tasks.push(t);
      });
      Object.assign(state.docs, data.docs || {});
      state.citations = (data.citations || []).concat(state.citations);
      state.snippets = (data.snippets || []).concat(state.snippets);
    }
    if (data.settings) state.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
    persist();
    emit('tasks:changed', state.tasks);
    emit('docs:changed', state.docs);
    emit('settings:changed', state.settings);
  }

  function resetAll() {
    state.tasks = []; state.docs = {}; state.citations = []; state.snippets = [];
    state.settings = Object.assign({}, DEFAULT_SETTINGS);
    state.activeTaskId = null;
    ['tasks', 'docs', 'citations', 'snippets', 'settings', 'activeTaskId'].forEach(U.remove);
    emit('tasks:changed', state.tasks);
    emit('settings:changed', state.settings);
  }

  FW.store = {
    COLUMNS: COLUMNS, DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    state: state, on: on, emit: emit, hydrate: hydrate, flush: function () { persist.flush(); },
    getTask: getTask, tasksIn: tasksIn, addTask: addTask, updateTask: updateTask,
    removeTask: removeTask, duplicateTask: duplicateTask, moveTask: moveTask,
    getDoc: getDoc, docForTask: docForTask, saveDoc: saveDoc, restoreVersion: restoreVersion,
    snapshotDoc: snapshotDoc, historyStats: historyStats, trimHistory: trimHistory,
    addCitation: addCitation, removeCitation: removeCitation,
    addSnippet: addSnippet, removeSnippet: removeSnippet,
    setSetting: setSetting, setActiveTask: setActiveTask, setView: setView,
    backupStatus: backupStatus, markBackedUp: markBackedUp,
    snoozeBackupReminder: snoozeBackupReminder, setBackupReminders: setBackupReminders,
    totalWords: totalWords, BACKUP: BACKUP,
    exportAll: exportAll, importAll: importAll, resetAll: resetAll
  };
})(window.FW);
