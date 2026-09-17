/* The assignment board: drag-and-drop columns, task creation, brief panel. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, el = U.el, K = FW.kit, S = FW.store;

  var root, boardEl, searchInput, panelHost;
  var filter = { text: '', persona: '' };
  var dragId = null;

  function mount(container) {
    root = container;
    U.clear(root);

    var bar = el('div', { class: 'board-bar' }, [
      el('button', { class: 'btn btn-primary', html: '<span>＋</span> New assignment', onclick: function () { openTaskDialog(null); } }),
      el('input', {
        type: 'search', class: 'board-search', placeholder: 'Search assignments, clients, briefs…',
        oninput: function (e) { filter.text = e.target.value.toLowerCase(); render(); }
      }),
      K.select([{ value: '', label: 'All writers' }].concat(FW.personas.all.map(function (p) {
        return { value: p.id, label: p.icon + '  ' + p.name };
      })), '', function (v) { filter.persona = v; render(); }, { style: { width: 'auto' } }),
      el('div', { class: 'grow' }),
      el('button', { class: 'btn btn-sm', text: 'Sample assignment', onclick: seedSample }),
      el('span', { class: 'tiny dim', id: 'board-count' })
    ]);

    boardEl = el('div', { class: 'board' });
    panelHost = el('aside', { class: 'brief-panel' });

    var wrap = el('div', { class: 'board-wrap' }, [bar, boardEl]);
    root.appendChild(wrap);
    root.appendChild(panelHost);

    searchInput = bar.querySelector('input');
    render();
    renderPanel();

    S.on('tasks:changed', render);
    S.on('activeTask:changed', function () { render(); renderPanel(); });
  }

  function matches(task) {
    if (filter.persona && task.personaId !== filter.persona) return false;
    if (!filter.text) return true;
    return (task.title + ' ' + task.client + ' ' + task.brief + ' ' + (task.tags || []).join(' '))
      .toLowerCase().indexOf(filter.text) !== -1;
  }

  function render() {
    if (!boardEl) return;
    var scroll = boardEl.scrollLeft;
    U.clear(boardEl);
    var total = 0;

    S.COLUMNS.forEach(function (col) {
      var tasks = S.tasksIn(col.id).filter(matches);
      total += tasks.length;

      var body = el('div', { class: 'column-body', dataset: { column: col.id } });
      tasks.forEach(function (t) { body.appendChild(taskCard(t)); });
      if (!tasks.length) {
        body.appendChild(el('div', { class: 'empty tiny', text: col.id === 'inbox' ? 'Drop a brief here' : 'Nothing here yet' }));
      }

      var column = el('section', { class: 'column', dataset: { column: col.id } }, [
        el('div', { class: 'column-head' }, [
          el('div', {}, [
            el('h3', { text: col.label }),
            el('div', { class: 'hint', text: col.hint })
          ]),
          el('span', { class: 'badge', text: String(tasks.length) })
        ]),
        body
      ]);

      wireDropTarget(column, body, col.id);
      boardEl.appendChild(column);
    });

    var count = document.getElementById('board-count');
    if (count) count.textContent = total + ' ' + U.pluralize(total, 'assignment') + ' on the board';
    boardEl.scrollLeft = scroll;
  }

  function taskCard(task) {
    var persona = FW.personas.get(task.personaId);
    var days = U.daysUntil(task.deadline);
    var doc = S.getDoc(task.docId);
    var written = doc ? U.wordCount(U.stripHtml(doc.html)) : 0;

    var dueClass = days === null ? '' : days < 0 ? 'due-late' : days <= 2 ? 'due-soon' : '';
    var meta = [];
    if (task.deadline) {
      meta.push(el('span', { class: 'chip ' + dueClass, text: (days !== null && days < 0 ? 'Overdue · ' : days !== null && days <= 7 ? days + 'd · ' : '') + U.formatDate(task.deadline) }));
    }
    if (task.wordTarget) {
      meta.push(el('span', { class: 'chip', text: written ? written.toLocaleString() + ' / ' + task.wordTarget.toLocaleString() + 'w' : task.wordTarget.toLocaleString() + 'w' }));
    }
    if (task.chosenStyle && task.styles) {
      var chosen = (task.styles.variants || []).filter(function (v) { return v.key === task.chosenStyle; })[0];
      if (chosen) meta.push(el('span', { class: 'chip chip-accent', text: chosen.label }));
    }
    if (task.analysis && task.analysis.checks && task.analysis.checks.length) {
      meta.push(el('span', { class: 'chip', text: task.analysis.checks.length + ' rules' }));
    }

    var card = el('article', {
      class: 'task-card' + (S.state.activeTaskId === task.id ? ' is-active' : ''),
      draggable: 'true',
      dataset: { id: task.id },
      tabindex: '0',
      onclick: function () { S.setActiveTask(task.id); },
      ondblclick: function () { openTaskDialog(task); },
      onkeydown: function (e) {
        if (e.key === 'Enter') { S.setActiveTask(task.id); }
        if (e.key === ' ') { e.preventDefault(); openTaskDialog(task); }
      }
    }, [
      el('div', { class: 'spread' }, [
        el('h4', { class: 'grow', text: task.title }),
        el('span', { class: 'task-persona', title: persona.name, text: persona.icon })
      ]),
      task.client ? el('div', { class: 'client', text: task.client }) : null,
      meta.length ? el('div', { class: 'meta' }, meta) : null
    ].filter(Boolean));

    card.addEventListener('dragstart', function (e) {
      dragId = task.id;
      card.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', task.id); } catch (err) { /* Safari */ }
    });
    card.addEventListener('dragend', function () {
      dragId = null;
      card.classList.remove('is-dragging');
      U.$$('.drop-marker').forEach(function (m) { m.remove(); });
      U.$$('.column.is-over').forEach(function (c) { c.classList.remove('is-over'); });
    });

    return card;
  }

  function wireDropTarget(column, body, columnId) {
    function clearMarkers() { U.$$('.drop-marker', body).forEach(function (m) { m.remove(); }); }

    column.addEventListener('dragover', function (e) {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      column.classList.add('is-over');
      clearMarkers();
      var before = cardBelow(body, e.clientY);
      var marker = el('div', { class: 'drop-marker' });
      if (before) body.insertBefore(marker, before);
      else body.appendChild(marker);
    });

    column.addEventListener('dragleave', function (e) {
      if (column.contains(e.relatedTarget)) return;
      column.classList.remove('is-over');
      clearMarkers();
    });

    column.addEventListener('drop', function (e) {
      e.preventDefault();
      column.classList.remove('is-over');
      var id = dragId || e.dataTransfer.getData('text/plain');
      clearMarkers();
      if (!id) return;
      var before = cardBelow(body, e.clientY);
      S.moveTask(id, columnId, before ? before.dataset.id : null);
      dragId = null;
      var task = S.getTask(id);
      if (task) K.toast(task.title + ' → ' + columnLabel(columnId));
    });
  }

  function columnLabel(id) {
    var c = S.COLUMNS.filter(function (x) { return x.id === id; })[0];
    return c ? c.label : id;
  }

  function cardBelow(body, y) {
    var cards = U.$$('.task-card:not(.is-dragging)', body);
    for (var i = 0; i < cards.length; i++) {
      var box = cards[i].getBoundingClientRect();
      if (y < box.top + box.height / 2) return cards[i];
    }
    return null;
  }

  /* ---------------- task dialog ---------------- */
  function openTaskDialog(task) {
    var isNew = !task;
    var data = task || {
      title: '', client: '', brief: '', deadline: '', wordTarget: 0, rate: '',
      personaId: S.state.settings.defaultPersona, column: 'inbox'
    };

    var title = el('input', { type: 'text', value: data.title, placeholder: 'e.g. Home solar payback guide' });
    var client = el('input', { type: 'text', value: data.client, placeholder: 'Client or publication' });
    var deadline = el('input', { type: 'date', value: data.deadline || '' });
    var words = el('input', { type: 'number', value: data.wordTarget || '', min: '0', step: '50', placeholder: '1500' });
    var rate = el('input', { type: 'text', value: data.rate || '', placeholder: '$0.35/word' });
    var brief = el('textarea', { rows: '11', placeholder: 'Paste the full brief here — every instruction, guideline, word count, keyword, deadline and restriction. The analyzer reads all of it.' });
    brief.value = data.brief || '';

    var personaSel = K.select(FW.personas.all.map(function (p) {
      return { value: p.id, label: p.icon + '  ' + p.name + ' — ' + p.tagline };
    }), data.personaId, null);

    var columnSel = K.select(S.COLUMNS.map(function (c) { return { value: c.id, label: c.label }; }), data.column, null);

    var suggestNote = el('div', { class: 'tiny dim', style: { marginTop: '6px' } });

    /* A brief dropped or pasted into this single-line field is flattened to one
       long line, and everything downstream treats the client's guidelines as
       the name of the piece: the generated headlines, and then the H1 of the
       scaffolded draft. Catch it while it is still one click from fixed. */
    var titleNote = el('div', { class: 'tiny', style: { marginTop: '6px', display: 'none' } });

    function looksLikeBrief(value) {
      var v = String(value || '').trim();
      return v.length > 140 ||
        /(?:^|\s)[*\u2022]\s+\S/.test(v) ||
        /\b\d{2,5}\s*words\b/i.test(v);
    }

    function checkTitle() {
      U.clear(titleNote);
      if (!looksLikeBrief(title.value)) { titleNote.style.display = 'none'; return; }
      titleNote.style.display = '';
      titleNote.appendChild(el('span', { class: 'chip chip-warning', text: 'Looks like a brief' }));
      titleNote.appendChild(el('span', { class: 'dim', text: ' Guidelines belong in the brief box below \u2014 a title this long becomes the headline of the piece. ' }));
      titleNote.appendChild(el('button', {
        class: 'btn btn-sm', type: 'button', text: 'Move it to the brief',
        onclick: function () {
          brief.value = (title.value + (brief.value ? '\n\n' + brief.value : '')).trim();
          title.value = '';
          checkTitle();
          updateSuggestion();
          title.focus();
        }
      }));
    }

    function updateSuggestion() {
      var text = brief.value + ' ' + title.value;
      if (U.wordCount(text) < 8) { suggestNote.textContent = ''; return; }
      var probe = FW.brief.analyze({ title: title.value, brief: brief.value });
      var top = probe.meta.suggestedPersonas[0];
      var bits = [];
      if (top) bits.push('Suggested writer: ' + FW.personas.get(top.id).name);
      if (probe.meta.wordCount) bits.push('word count detected');
      if (probe.meta.deadline) bits.push('deadline detected');
      if (probe.meta.keywords.length) bits.push(probe.meta.keywords.length + ' keyword(s)');
      suggestNote.textContent = bits.join(' · ');
    }
    brief.addEventListener('input', U.debounce(updateSuggestion, 400));
    title.addEventListener('input', checkTitle);
    title.addEventListener('input', U.debounce(updateSuggestion, 400));
    setTimeout(function () { checkTitle(); updateSuggestion(); }, 0);

    var body = el('div', {}, [
      K.field('Assignment title', title),
      titleNote,
      el('div', { class: 'row' }, [K.field('Client', client), K.field('Deadline', deadline)]),
      el('div', { class: 'row' }, [K.field('Word target', words), K.field('Rate (optional)', rate)]),
      K.field('Writer persona', personaSel, 'Sets voice rules, structures and house prohibitions.'),
      K.field('Column', columnSel),
      K.field('The brief', brief),
      suggestNote
    ]);

    K.modal({
      title: isNew ? 'New assignment' : 'Edit assignment',
      size: 'lg',
      body: body,
      actions: [
        !isNew ? {
          label: 'Delete', variant: 'danger', onClick: function (close) {
            K.confirm('Delete “' + data.title + '” and its draft? This cannot be undone.', { danger: true, confirmLabel: 'Delete' })
              .then(function (ok) { if (ok) { S.removeTask(data.id); close(); K.toast('Assignment deleted'); } });
            return false;
          }
        } : null,
        { label: 'Cancel' },
        {
          label: isNew ? 'Create & analyse' : 'Save & re-analyse', variant: 'primary', onClick: function () {
            var patch = {
              title: title.value.trim() || 'Untitled assignment',
              client: client.value.trim(),
              deadline: deadline.value,
              wordTarget: Number(words.value) || 0,
              rate: rate.value.trim(),
              personaId: personaSel.value,
              brief: brief.value
            };
            var saved;
            if (isNew) {
              patch.column = columnSel.value;
              saved = S.addTask(patch);
            } else {
              saved = S.updateTask(data.id, patch);
              if (columnSel.value !== data.column) S.moveTask(data.id, columnSel.value, null);
            }
            analyseTask(saved.id);
            S.setActiveTask(saved.id);
            K.toast(isNew ? 'Assignment created and analysed' : 'Assignment updated');
          }
        }
      ].filter(Boolean)
    });
  }

  /* ---------------- analysis ---------------- */
  function analyseTask(taskId) {
    var task = S.getTask(taskId);
    if (!task) return null;
    var analysis = FW.brief.analyze(task);
    var styles = FW.styles.generate(task, analysis);
    S.updateTask(taskId, { analysis: analysis, styles: styles });
    if (task.column === 'inbox' && task.brief) S.moveTask(taskId, 'analysis', null);
    return { analysis: analysis, styles: styles };
  }

  /* ---------------- brief panel ---------------- */
  function renderPanel() {
    if (!panelHost) return;
    U.clear(panelHost);
    var task = S.getTask(S.state.activeTaskId);

    if (!task) {
      panelHost.appendChild(el('div', { class: 'panel-body' }, [
        el('div', { class: 'empty' }, [
          el('div', { style: { fontSize: '28px', marginBottom: '8px' }, text: '🗂' }),
          el('div', { text: 'Select an assignment to see its analysis, or create one.' }),
          el('div', { class: 'tiny dim', style: { marginTop: '10px' }, text: 'Drag cards between columns to move work along.' })
        ])
      ]));
      return;
    }

    var persona = FW.personas.get(task.personaId);
    panelHost.appendChild(el('div', { class: 'panel-head' }, [
      el('div', { class: 'grow', style: { minWidth: 0 } }, [
        el('h3', { class: 'truncate', text: task.title }),
        el('div', { class: 'tiny dim', text: persona.icon + ' ' + persona.name + (task.client ? ' · ' + task.client : '') })
      ]),
      el('button', { class: 'btn btn-sm', text: 'Edit', onclick: function () { openTaskDialog(task); } }),
      el('button', {
        class: 'btn btn-sm btn-primary', text: 'Open in Studio',
        onclick: function () { FW.app.openStudio(task.id); }
      })
    ]));

    var body = el('div', { class: 'panel-body' });
    panelHost.appendChild(body);

    if (!task.analysis) {
      body.appendChild(el('div', { class: 'empty' }, [
        el('div', { text: 'This assignment has not been analysed yet.' }),
        el('button', {
          class: 'btn btn-primary', style: { marginTop: '12px' }, text: 'Analyse the brief',
          onclick: function () { analyseTask(task.id); renderPanel(); }
        })
      ]));
      return;
    }

    body.appendChild(analysisSummary(task));
    body.appendChild(el('hr', { class: 'divider' }));
    body.appendChild(el('div', { class: 'spread', style: { marginBottom: '10px' } }, [
      el('h3', { style: { fontSize: '14px' }, text: 'Three ways to write this' }),
      el('button', {
        class: 'btn btn-sm', text: '↻ Regenerate',
        onclick: function () { analyseTask(task.id); renderPanel(); K.toast('Approaches regenerated'); }
      })
    ]));

    (task.styles.variants || []).forEach(function (v) {
      body.appendChild(styleCard(task, v));
    });
  }

  function analysisSummary(task) {
    var a = task.analysis, m = a.meta;
    var chips = [];
    function chip(label, cls) { if (label) chips.push(el('span', { class: 'chip ' + (cls || ''), text: label })); }

    chip(m.format ? U.sentenceCase(m.format) : null, 'chip-accent');
    if (m.wordCount) {
      chip(m.wordCount.min && m.wordCount.max ? m.wordCount.min + '–' + m.wordCount.max + ' words'
        : m.wordCount.max ? 'up to ' + m.wordCount.max + ' words'
          : m.wordCount.min + '+ words');
    }
    if (m.deadline) chip('Due ' + (m.deadline.date ? U.formatDate(m.deadline.date) : m.deadline.note || m.deadline.raw));
    if (m.audience) chip('For ' + m.audience);
    m.tone.forEach(function (t) { chip(t); });
    if (m.pov) chip(m.pov);
    if (m.readingLevel) chip('Grade ' + m.readingLevel);
    if (m.citationStyle) chip(m.citationStyle);
    m.keywords.forEach(function (k) { chip('🔑 ' + k.term, k.primary ? 'chip-accent' : ''); });
    m.banned.forEach(function (b) { chip('✕ ' + b, 'chip-error'); });

    var wrap = el('div', {}, [
      el('div', { class: 'spread', style: { marginBottom: '8px' } }, [
        el('h3', { style: { fontSize: '14px' }, text: 'What the brief requires' }),
        el('span', { class: 'chip ' + (a.confidence > 65 ? 'chip-ok' : a.confidence > 35 ? 'chip-warning' : 'chip-error'), text: a.confidence + '% specified' })
      ]),
      chips.length ? el('div', { class: 'flex wrap', style: { gap: '5px' } }, chips)
        : el('div', { class: 'tiny dim', text: 'No structured requirements detected — the brief may be informal.' })
    ]);

    if (a.instructions.required.length) {
      wrap.appendChild(el('details', { class: 'acc', style: { marginTop: '12px' } }, [
        el('summary', {}, [el('span', { text: 'Instructions to follow' }), el('span', { class: 'badge', text: String(a.instructions.required.length) })]),
        el('div', {}, [el('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.6' } },
          a.instructions.required.map(function (r) { return el('li', { text: r }); }))])
      ]));
    }
    if (a.instructions.forbidden.length) {
      wrap.appendChild(el('details', { class: 'acc' }, [
        el('summary', {}, [el('span', { text: 'Prohibitions' }), el('span', { class: 'badge', text: String(a.instructions.forbidden.length) })]),
        el('div', {}, [el('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.6' } },
          a.instructions.forbidden.map(function (r) { return el('li', { text: r }); }))])
      ]));
    }
    if (a.gaps.length) {
      wrap.appendChild(el('details', { class: 'acc' }, [
        el('summary', {}, [el('span', { text: '⚠ Gaps to raise with the client' }), el('span', { class: 'badge', text: String(a.gaps.length) })]),
        el('div', {}, [el('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.6' } },
          a.gaps.map(function (g) { return el('li', { text: g }); }))])
      ]));
    }
    return wrap;
  }

  function styleCard(task, v) {
    var chosen = task.chosenStyle === v.key;

    var outline = el('ol', { class: 'outline-list' }, v.outline.map(function (o) {
      return el('li', {}, [
        el('span', { class: 'grow', text: o.text }),
        o.words ? el('span', { class: 'w', text: '~' + o.words + 'w' }) : null
      ].filter(Boolean));
    }));

    return el('article', { class: 'style-card' + (chosen ? ' is-chosen' : '') }, [
      el('header', {}, [
        el('div', { class: 'grow' }, [
          el('h4', { text: v.label }),
          el('div', { class: 'tiny dim', style: { marginTop: '2px' }, text: v.summary })
        ]),
        el('div', { style: { textAlign: 'right' } }, [
          el('div', { class: 'tiny dim', text: 'fit ' + v.fit }),
          el('div', { class: 'fit-bar' }, [el('span', { style: { width: v.fit + '%' } })])
        ])
      ]),
      el('div', { class: 'body' }, [

        el('details', { class: 'acc' }, [
          el('summary', {}, [el('span', { text: 'Structure' }), el('span', { class: 'badge', text: String(v.outline.length) })]),
          el('div', {}, [outline])
        ]),
        el('details', { class: 'acc' }, [
          el('summary', {}, [el('span', { text: 'Headline options' })]),
          el('div', {}, [el('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: '1.7' } },
            v.headlines.map(function (h) {
              return el('li', {}, [
                el('span', { text: h }),
                el('button', { class: 'btn btn-sm btn-ghost', style: { marginLeft: '6px' }, text: '⧉', title: 'Copy', onclick: function () { K.copyAndToast(h, 'Headline'); } })
              ]);
            }))])
        ]),
        el('details', { class: 'acc' }, [
          el('summary', {}, [el('span', { text: 'Voice & craft notes' })]),
          el('div', {}, [
            el('p', { class: 'small', style: { marginTop: 0 }, text: v.voice }),
            el('div', { class: 'flex wrap', style: { gap: '5px', marginBottom: '8px' } },
              v.devices.map(function (d) { return el('span', { class: 'chip', text: d }); })),
            el('div', { class: 'section-title', text: 'Rules for this persona' }),
            el('ul', { style: { margin: '0 0 10px', paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.6' } },
              v.rules.map(function (r) { return el('li', { text: r }); })),
            v.avoid.length ? el('div', {}, [
              el('div', { class: 'section-title', text: 'Never use' }),
              el('div', { class: 'flex wrap', style: { gap: '4px' } }, v.avoid.map(function (b) {
                return el('span', { class: 'chip chip-error', text: b });
              }))
            ]) : null
          ].filter(Boolean))
        ]),
        el('details', { class: 'acc' }, [
          el('summary', {}, [el('span', { text: 'Why this fits / what could go wrong' })]),
          el('div', {}, [
            el('ul', { style: { margin: '0 0 8px', paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.6' } },
              v.fitReasons.map(function (r) { return el('li', { class: 'muted', text: '✓ ' + r }); })),
            el('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.6' } },
              v.risks.map(function (r) { return el('li', { style: { color: 'var(--warning)' }, text: '⚠ ' + r }); }))
          ])
        ]),

        el('div', { class: 'flex', style: { marginTop: '10px' } }, [
          el('button', {
            class: 'btn btn-sm ' + (chosen ? 'is-active' : ''),
            text: chosen ? '✓ Chosen approach' : 'Choose this approach',
            onclick: function () {
              S.updateTask(task.id, { chosenStyle: chosen ? null : v.key });
              renderPanel();
            }
          }),
          el('button', {
            class: 'btn btn-sm btn-primary', text: 'Start draft →',
            onclick: function () {
              S.updateTask(task.id, { chosenStyle: v.key });
              startDraft(task.id, v);
            }
          }),
          el('button', {
            class: 'btn btn-sm btn-ghost', text: 'Copy brief',
            title: 'Copy the whole approach as a plain-text working brief',
            onclick: function () { K.copyAndToast(styleToText(task, v), 'Approach'); }
          })
        ])
      ])
    ]);
  }

  function styleToText(task, v) {
    var lines = [];
    lines.push(task.title.toUpperCase());
    if (task.client) lines.push('Client: ' + task.client);
    lines.push('Approach: ' + v.label + ' — ' + v.summary);
    lines.push('');
    lines.push('VOICE');
    lines.push(v.voice);
    lines.push('');
    lines.push('HEADLINE OPTIONS');
    v.headlines.forEach(function (h, i) { lines.push('  ' + (i + 1) + '. ' + h); });
    lines.push('');
    lines.push('STRUCTURE');
    v.outline.forEach(function (o, i) {
      lines.push('  ' + (i + 1) + '. ' + o.text + (o.words ? '  (~' + o.words + ' words)' : ''));
    });
    lines.push('');
    lines.push('RULES');
    v.rules.forEach(function (r) { lines.push('  • ' + r); });
    if (v.avoid.length) { lines.push(''); lines.push('NEVER USE: ' + v.avoid.join(', ')); }
    lines.push('');
    lines.push('RISKS');
    v.risks.forEach(function (r) { lines.push('  ⚠ ' + r); });
    return lines.join('\n');
  }

  /* Scaffold the draft from the chosen outline, then hand over to the studio. */
  function startDraft(taskId, variant) {
    var task = S.getTask(taskId);
    var doc = S.docForTask(taskId, true);
    var existing = U.stripHtml(doc.html).trim();

    function scaffold() {
      /* If the guidelines did end up in the title, the "headline" is the whole
         blob. An honest placeholder beats handing the client a document headed
         with their own instructions. */
      var headline = variant.headlines[0] || task.title || '';
      if (headline.length > 120) headline = 'Working title';
      var html = ['<h1>' + U.escapeHtml(headline) + '</h1>'];
      variant.outline.forEach(function (o) {
        html.push('<h2>' + U.escapeHtml(o.text) + '</h2>');
        html.push('<p><em>' + U.escapeHtml((o.words ? '~' + o.words + ' words. ' : '') + 'Draft this section.') + '</em></p>');
      });
      /* Keep whatever was there, then mark the fresh outline as its own
         restore point so a mangled draft can go back to a clean scaffold. */
      if (existing.length > 40) S.snapshotDoc(doc.id, 'before the outline was replaced');
      S.saveDoc(doc.id, html.join('\n'));
      S.snapshotDoc(doc.id, variant.label + ' outline');
      S.moveTask(taskId, 'drafting', null);
      FW.app.openStudio(taskId);
    }

    if (existing.length > 40) {
      K.confirm('This assignment already has a draft. Replace it with the ' + variant.label + ' outline? The current version is kept in history.',
        { confirmLabel: 'Replace draft' }).then(function (ok) {
          if (ok) scaffold(); else { S.moveTask(taskId, 'drafting', null); FW.app.openStudio(taskId); }
        });
    } else scaffold();
  }

  /* ---------------- sample ---------------- */
  function seedSample() {
    var sample = S.addTask({
      title: 'Do home solar panels actually pay for themselves?',
      client: 'Meridian Energy Review',
      deadline: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
      wordTarget: 1500,
      rate: '$0.40/word',
      personaId: 'blog',
      brief: [
        'Topic: whether residential solar pays back in Texas',
        'Audience: suburban homeowners aged 35-60 who are considering a first installation',
        'Tone: friendly, authoritative, never salesy',
        'Length: 1,200-1,500 words. Due in one week.',
        'Primary keyword: home solar payback period',
        'Secondary keywords: solar panel cost Texas, net metering',
        '',
        '- Must include at least 5 H2 subheadings and an FAQ section',
        '- Include a comparison table of upfront cost vs 10-year savings',
        '- Cite at least 4 credible sources in APA format',
        '- Please provide a meta description and 3 headline options',
        '- Write in second person and keep the reading level around grade 8',
        '- Include a call to action pointing at our calculator',
        '',
        'Do not use the phrase "game changer". Avoid hype, exaggeration and any claim of guaranteed returns.',
        'Never imply this is investment advice.'
      ].join('\n')
    });
    analyseTask(sample.id);
    S.setActiveTask(sample.id);
    K.toast('Sample assignment created and analysed');
  }

  FW.board = {
    mount: mount, render: render, renderPanel: renderPanel,
    analyseTask: analyseTask, openTaskDialog: openTaskDialog, seedSample: seedSample
  };
})(window.FW);
