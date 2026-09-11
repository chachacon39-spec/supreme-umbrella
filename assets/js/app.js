/* Boot, view routing, global shortcuts. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, el = U.el, K = FW.kit, S = FW.store;

  var views = {}, navButtons = {}, current = 'board';

  function boot() {
    S.hydrate();
    applyTheme();
    buildChrome();

    views.board = document.getElementById('view-board');
    views.studio = document.getElementById('view-studio');
    views.resources = document.getElementById('view-resources');

    FW.board.mount(views.board);
    FW.editor.mount(views.studio);
    FW.resourcesView.mount(views.resources);

    if (S.state.activeTaskId) FW.editor.load(S.state.activeTaskId);
    setView(S.state.tasks.length ? 'board' : 'board');

    S.on('activeTask:changed', updateTopbarTask);
    S.on('tasks:changed', updateTopbarTask);
    updateTopbarTask();

    document.addEventListener('keydown', shortcuts);

    if (!S.state.tasks.length) setTimeout(firstRun, 350);
  }

  function buildChrome() {
    var bar = document.getElementById('topbar');
    U.clear(bar);

    bar.appendChild(el('div', { class: 'brand' }, [
      el('span', { class: 'mark', text: '✒' }),
      el('span', {}, [
        el('span', { text: 'Quill & Ledger' }),
        el('small', { text: 'freelance writing desk' })
      ])
    ]));

    var nav = el('nav', { class: 'viewnav' });
    [['board', 'Board'], ['studio', 'Studio'], ['resources', 'Reference']].forEach(function (v) {
      var btn = el('button', { text: v[1], onclick: function () { setView(v[0]); } });
      navButtons[v[0]] = btn;
      nav.appendChild(btn);
    });
    bar.appendChild(nav);

    bar.appendChild(el('div', { id: 'topbar-task', class: 'topbar-task hidden' }));
    bar.appendChild(el('div', { class: 'grow' }));

    bar.appendChild(el('button', {
      class: 'btn btn-sm btn-ghost', title: 'Keyboard shortcuts', text: '⌘ Shortcuts',
      onclick: showShortcuts
    }));
    bar.appendChild(el('button', {
      class: 'btn btn-sm btn-ghost', id: 'theme-btn', title: 'Toggle light / dark',
      text: S.state.settings.theme === 'dark' ? '☀' : '☾',
      onclick: toggleTheme
    }));
    bar.appendChild(el('button', {
      class: 'btn btn-sm', text: 'Help', onclick: showHelp
    }));
  }

  function updateTopbarTask() {
    var host = document.getElementById('topbar-task');
    if (!host) return;
    var task = S.getTask(S.state.activeTaskId);
    U.clear(host);
    if (!task) { host.classList.add('hidden'); return; }
    host.classList.remove('hidden');
    var persona = FW.personas.get(task.personaId);
    host.appendChild(el('span', { text: persona.icon }));
    host.appendChild(el('strong', { class: 'truncate', text: task.title }));
    if (task.deadline) {
      var days = U.daysUntil(task.deadline);
      host.appendChild(el('span', {
        class: 'chip ' + (days !== null && days < 0 ? 'chip-error' : days !== null && days <= 2 ? 'chip-warning' : ''),
        text: days === null ? U.formatDate(task.deadline) : days < 0 ? 'overdue' : days + 'd left'
      }));
    }
  }

  function setView(name) {
    current = name;
    Object.keys(views).forEach(function (v) {
      views[v].classList.toggle('is-active', v === name);
      if (navButtons[v]) navButtons[v].classList.toggle('is-active', v === name);
    });
    if (name === 'studio') {
      FW.editor.applyTypography();
      setTimeout(function () { FW.editor.runCheck(); }, 30);
    }
    if (name === 'resources') FW.resourcesView.render();
    S.setView(name);
  }

  function openStudio(taskId) {
    if (taskId) S.setActiveTask(taskId);
    FW.editor.load(taskId || S.state.activeTaskId);
    setView('studio');
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.state.settings.theme);
  }

  function toggleTheme() {
    var next = S.state.settings.theme === 'dark' ? 'light' : 'dark';
    S.setSetting('theme', next);
    applyTheme();
    var btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = next === 'dark' ? '☀' : '☾';
  }

  function shortcuts(e) {
    var mod = e.metaKey || e.ctrlKey;
    var inEditable = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;

    if (mod && e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); setView('board'); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); setView('studio'); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'r') { e.preventDefault(); setView('resources'); return; }
    if (mod && e.key === '/') { e.preventDefault(); showShortcuts(); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); FW.board.openTaskDialog(null); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); toggleTheme(); return; }

    if (!inEditable && e.key === 'n' && !mod) { FW.board.openTaskDialog(null); e.preventDefault(); }
  }

  function showShortcuts() {
    var rows = [
      ['Ctrl / ⌘ + Shift + B', 'Go to the board'],
      ['Ctrl / ⌘ + Shift + E', 'Go to the studio'],
      ['Ctrl / ⌘ + Shift + R', 'Go to the reference desk'],
      ['Ctrl / ⌘ + Shift + N', 'New assignment'],
      ['Ctrl / ⌘ + Shift + D', 'Toggle dark mode'],
      ['Ctrl / ⌘ + S', 'Save a version snapshot'],
      ['Ctrl / ⌘ + B / I / U', 'Bold / italic / underline'],
      ['Ctrl / ⌘ + Shift + 1 / 2 / 3', 'Heading level'],
      ['Ctrl / ⌘ + 0', 'Back to body text'],
      ['Ctrl / ⌘ + K', 'Insert a link'],
      ['n', 'New assignment (outside a text field)'],
      ['Esc', 'Close a dialog']
    ];
    K.modal({
      title: 'Keyboard shortcuts',
      body: el('table', { style: { width: '100%', borderCollapse: 'collapse' } },
        rows.map(function (r) {
          return el('tr', {}, [
            el('td', { style: { padding: '6px 10px 6px 0', whiteSpace: 'nowrap' } }, [el('kbd', { text: r[0] })]),
            el('td', { class: 'small muted', style: { padding: '6px 0' }, text: r[1] })
          ]);
        })),
      actions: [{ label: 'Close' }]
    });
  }

  function showHelp() {
    var body = el('div', { class: 'stack' }, [
      el('p', { style: { marginTop: 0 }, text: 'Quill & Ledger runs entirely in this browser. Your assignments, drafts and citations are stored on this device and never uploaded anywhere. Export a backup regularly if the work matters.' }),

      el('h3', { style: { fontSize: '14px' }, text: '1. Board' }),
      el('p', { class: 'small muted', text: 'Create an assignment and paste the whole brief into it. The analyser pulls out word counts, deadlines, keywords, required sections, prohibitions and tone, then proposes three distinct ways to write the piece — each with its own voice, structure, headline options and opening line. Drag cards between columns as the work moves.' }),

      el('h3', { style: { fontSize: '14px' }, text: '2. Studio' }),
      el('p', { class: 'small muted', text: 'Pick an approach and it scaffolds the outline into the editor. As you write, the checker underlines grammar, punctuation, repetition, clichés, passive voice and anything the brief forbade. The left panel scores your draft against the brief line by line.' }),

      el('h3', { style: { fontSize: '14px' }, text: '3. Tools' }),
      el('p', { class: 'small muted', text: 'Summarise, paraphrase in six registers, check originality against your sources and your own back catalogue, generate citations in seven styles, make your own royalty-free artwork, and export to Word, PDF, HTML, Markdown, plain text or email.' }),

      el('h3', { style: { fontSize: '14px' }, text: 'What it does not do' }),
      el('p', { class: 'small muted', text: 'It does not write for you, and the originality check cannot search the web — it compares your draft against material you give it and hands you search links for the rest. Treat every automated suggestion as a prompt to look again, not a verdict.' }),

      el('hr', { class: 'divider' }),
      el('div', { class: 'flex wrap' }, [
        el('button', {
          class: 'btn btn-sm', text: 'Load a sample assignment',
          onclick: function () { FW.board.seedSample(); setView('board'); }
        }),
        el('button', {
          class: 'btn btn-sm btn-danger', text: 'Reset everything',
          onclick: function () {
            K.confirm('Delete every assignment, draft, citation and snippet stored in this browser?', { danger: true, confirmLabel: 'Delete everything' })
              .then(function (ok) { if (ok) { S.resetAll(); location.reload(); } });
          }
        })
      ])
    ]);
    K.modal({ title: 'How this works', size: 'lg', body: body, actions: [{ label: 'Close' }] });
  }

  function firstRun() {
    K.modal({
      title: 'Welcome to your writing desk',
      body: el('div', {}, [
        el('p', { style: { marginTop: 0 }, text: 'Twelve writer personas, a drag-and-drop assignment board, a brief analyser that turns one task into three distinct approaches, a live editor that flags grammar, punctuation and structural problems, and the usual working tools — summariser, paraphraser, originality check, citations, image generator and exports.' }),
        el('p', { class: 'small muted', text: 'Everything stays on this device. Start with a sample assignment to see the whole flow, or create your own.' })
      ]),
      actions: [
        { label: 'Start empty' },
        {
          label: 'Load the sample', variant: 'primary', onClick: function () {
            FW.board.seedSample();
            setView('board');
          }
        }
      ]
    });
  }

  FW.app = { boot: boot, setView: setView, openStudio: openStudio, toggleTheme: toggleTheme };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.FW);
