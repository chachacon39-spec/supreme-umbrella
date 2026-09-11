/* Resources view: research libraries, languages, style guides, fonts, saved snippets. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, el = U.el, K = FW.kit, S = FW.store;

  var host, query = '', activeTab = 'libraries';

  function mount(container) {
    host = el('div', { class: 'resources-view' });
    U.clear(container);
    container.appendChild(host);
    render();
    S.on('activeTask:changed', render);
    S.on('snippets:changed', render);
  }

  function render() {
    if (!host) return;
    U.clear(host);
    var inner = el('div', { class: 'inner' });
    host.appendChild(inner);

    var task = S.getTask(S.state.activeTaskId);
    var persona = task ? FW.personas.get(task.personaId) : null;

    inner.appendChild(el('div', { class: 'spread', style: { marginBottom: '14px', flexWrap: 'wrap' } }, [
      el('div', {}, [
        el('h2', { style: { fontSize: '19px' }, text: 'Reference desk' }),
        el('p', { class: 'muted small', style: { margin: '3px 0 0' },
          text: persona ? 'Prioritised for ' + persona.icon + ' ' + persona.name + ' — the libraries that persona actually needs come first.'
            : 'Research libraries, language settings, style guides and craft references.' })
      ]),
      el('input', {
        type: 'search', value: query, placeholder: 'Filter…', style: { maxWidth: '230px' },
        oninput: function (e) { query = e.target.value.toLowerCase(); renderBody(bodyHost, persona, task); }
      })
    ]));

    var tabs = [
      { id: 'libraries', label: 'Research libraries' },
      { id: 'craft', label: 'Craft & word bank' },
      { id: 'language', label: 'Languages' },
      { id: 'guides', label: 'Style guides' },
      { id: 'fonts', label: 'Type library' },
      { id: 'snippets', label: 'Saved snippets' }
    ];
    inner.appendChild(el('div', { class: 'tabs', style: { marginBottom: '16px' } }, tabs.map(function (t) {
      return el('button', {
        class: 'tab' + (t.id === activeTab ? ' is-active' : ''), text: t.label,
        onclick: function () { activeTab = t.id; render(); }
      });
    })));

    var bodyHost = el('div', {});
    inner.appendChild(bodyHost);
    renderBody(bodyHost, persona, task);
  }

  function renderBody(bodyHost, persona, task) {
    U.clear(bodyHost);
    switch (activeTab) {
      case 'libraries': renderLibraries(bodyHost, persona, task); break;
      case 'craft': renderCraft(bodyHost); break;
      case 'language': renderLanguages(bodyHost); break;
      case 'guides': renderGuides(bodyHost); break;
      case 'fonts': renderFonts(bodyHost); break;
      case 'snippets': renderSnippets(bodyHost); break;
    }
  }

  function matches(text) {
    return !query || String(text).toLowerCase().indexOf(query) !== -1;
  }

  function renderLibraries(bodyHost, persona, task) {
    var libs = FW.resources.LIBRARIES;
    var order = Object.keys(libs);
    if (persona) {
      var preferred = persona.resources || [];
      order.sort(function (a, b) {
        var ai = preferred.indexOf(a), bi = preferred.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    }

    var seed = '';
    if (task && task.analysis) {
      seed = task.analysis.meta.topic ||
        (task.analysis.meta.keywords[0] && task.analysis.meta.keywords[0].term) || task.title;
    }

    var searchBox = el('input', {
      type: 'search', value: seed,
      placeholder: 'Search term to send to these libraries…',
      style: { maxWidth: '460px', marginBottom: '14px' }
    });
    bodyHost.appendChild(el('div', { class: 'field' }, [
      el('label', { text: 'Search term' }),
      searchBox,
      el('div', { class: 'tiny dim', text: 'Every link below opens that library pre-loaded with this query.' })
    ]));

    var grid = el('div', { class: 'res-grid' });
    bodyHost.appendChild(grid);

    function build() {
      U.clear(grid);
      order.forEach(function (key) {
        var lib = libs[key];
        var items = lib.items.filter(function (i) { return matches(i.name + ' ' + i.note + ' ' + lib.label); });
        if (!items.length) return;
        var isPreferred = persona && (persona.resources || []).indexOf(key) !== -1;
        grid.appendChild(el('section', { class: 'res-card' }, [
          el('div', { class: 'spread', style: { marginBottom: '6px' } }, [
            el('h4', { text: lib.label }),
            isPreferred ? el('span', { class: 'chip chip-accent', text: 'for this persona' }) : null
          ].filter(Boolean)),
          el('ul', { class: 'res-list' }, items.map(function (item) {
            var url = item.query ? item.url + encodeURIComponent(searchBox.value || '') : item.url;
            return el('li', {}, [
              el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: item.name + ' ↗' }),
              el('span', { class: 'note', text: item.note })
            ]);
          }))
        ]));
      });
      if (!grid.children.length) grid.appendChild(el('div', { class: 'empty', text: 'Nothing matches that filter.' }));
    }
    searchBox.addEventListener('input', U.debounce(build, 200));
    build();
  }

  function renderCraft(bodyHost) {
    var grid = el('div', { class: 'res-grid' });
    bodyHost.appendChild(grid);

    Object.keys(FW.lex.WORD_BANK).forEach(function (name) {
      var words = FW.lex.WORD_BANK[name].filter(function (w) { return matches(w + ' ' + name); });
      if (!words.length) return;
      grid.appendChild(el('section', { class: 'res-card' }, [
        el('h4', { text: name }),
        el('div', { class: 'wordbank' }, words.map(function (w) {
          return el('button', { text: w, onclick: function () { K.copyAndToast(w, '“' + w + '”'); } });
        }))
      ]));
    });

    Object.keys(FW.lex.TRANSITIONS).forEach(function (name) {
      var words = FW.lex.TRANSITIONS[name].filter(function (w) { return matches(w + ' ' + name); });
      if (!words.length) return;
      grid.appendChild(el('section', { class: 'res-card' }, [
        el('h4', { text: 'Transitions — ' + name }),
        el('div', { class: 'wordbank' }, words.map(function (w) {
          return el('button', { text: w, onclick: function () { K.copyAndToast(w, '“' + w + '”'); } });
        }))
      ]));
    });

    var cliches = FW.lex.CLICHES.filter(matches);
    if (cliches.length) {
      grid.appendChild(el('section', { class: 'res-card' }, [
        el('h4', { text: 'Clichés the checker flags' }),
        el('div', { class: 'flex wrap', style: { gap: '4px' } }, cliches.map(function (c) {
          return el('span', { class: 'chip chip-warning', text: c });
        }))
      ]));
    }

    var confusables = FW.lex.CONFUSABLES.filter(function (c) { return matches(c.a + ' ' + c.b + ' ' + c.note); });
    if (confusables.length) {
      grid.appendChild(el('section', { class: 'res-card' }, [
        el('h4', { text: 'Commonly confused' }),
        el('ul', { class: 'res-list' }, confusables.map(function (c) {
          return el('li', {}, [
            el('strong', { text: c.a + ' / ' + c.b }),
            el('span', { class: 'note', text: c.note })
          ]);
        }))
      ]));
    }

    grid.appendChild(el('section', { class: 'res-card' }, [
      el('h4', { text: 'Headline formulas' }),
      el('ul', { class: 'res-list' }, FW.lex.HEADLINE_FORMULAS.filter(matches).map(function (f) {
        return el('li', {}, [
          el('span', { text: f }),
          el('button', { class: 'btn btn-sm btn-ghost', style: { marginLeft: '6px' }, text: '⧉', onclick: function () { K.copyAndToast(f, 'Formula'); } })
        ]);
      }))
    ]));

    /* Persona reference */
    grid.appendChild(el('section', { class: 'res-card' }, [
      el('h4', { text: 'Persona house rules' }),
      el('div', {}, FW.personas.all.filter(function (p) { return matches(p.name + ' ' + p.tagline); }).map(function (p) {
        return el('details', { class: 'acc' }, [
          el('summary', {}, [el('span', { text: p.icon + ' ' + p.name })]),
          el('div', {}, [
            el('p', { class: 'small muted', style: { marginTop: 0 }, text: p.tagline }),
            el('ul', { style: { paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.6', margin: '0 0 8px' } },
              p.rules.map(function (r) { return el('li', { text: r }); })),
            el('div', { class: 'flex wrap', style: { gap: '4px' } },
              p.banned.map(function (b) { return el('span', { class: 'chip chip-error', text: b }); }))
          ])
        ]);
      }))
    ]));
  }

  function renderLanguages(bodyHost) {
    bodyHost.appendChild(el('p', { class: 'muted small', style: { marginTop: 0 },
      text: 'The active language drives spelling variants, quotation conventions and text direction in the editor.' }));

    var grid = el('div', { class: 'res-grid' });
    bodyHost.appendChild(grid);

    FW.resources.LANGUAGES.filter(function (l) { return matches(l.label + ' ' + l.code); }).forEach(function (lang) {
      var active = S.state.settings.language === lang.code;
      grid.appendChild(el('section', { class: 'res-card', style: active ? { borderColor: 'var(--accent)' } : {} }, [
        el('div', { class: 'spread' }, [
          el('h4', { text: lang.label }),
          el('span', { class: 'chip', text: lang.code })
        ]),
        el('div', { class: 'small muted', style: { margin: '8px 0' } , text: 'Quotes ' + lang.quotes[0] + 'like this' + lang.quotes[1] + ' · ' + (lang.dir === 'rtl' ? 'right-to-left' : 'left-to-right') }),
        lang.notes.length ? el('ul', { style: { paddingLeft: '17px', fontSize: '12px', lineHeight: '1.55', margin: '0 0 10px' } },
          lang.notes.map(function (n) { return el('li', { text: n }); })) : null,
        Object.keys(lang.spelling).length ? el('div', { class: 'tiny dim', style: { marginBottom: '10px' },
          text: 'Converts: ' + Object.keys(lang.spelling).slice(0, 6).map(function (k) { return k + ' → ' + lang.spelling[k]; }).join(', ') }) : null,
        el('button', {
          class: 'btn btn-sm ' + (active ? 'is-active' : ''), text: active ? '✓ Active' : 'Use this language',
          onclick: function () {
            S.setSetting('language', lang.code);
            FW.editor.applyTypography();
            FW.editor.runCheck();
            render();
            K.toast(lang.label + ' active');
          }
        })
      ].filter(Boolean)));
    });
  }

  function renderGuides(bodyHost) {
    var grid = el('div', { class: 'res-grid' });
    bodyHost.appendChild(grid);
    Object.keys(FW.lex.STYLE_GUIDES).forEach(function (key) {
      var guide = FW.lex.STYLE_GUIDES[key];
      if (!matches(guide.name + ' ' + guide.notes.join(' '))) return;
      var active = S.state.settings.styleGuide === key;
      grid.appendChild(el('section', { class: 'res-card', style: active ? { borderColor: 'var(--accent)' } : {} }, [
        el('h4', { text: guide.name }),
        el('ul', { style: { paddingLeft: '17px', fontSize: '12.5px', lineHeight: '1.6', margin: '8px 0 10px' } },
          guide.notes.map(function (n) { return el('li', { text: n }); })),
        el('button', {
          class: 'btn btn-sm ' + (active ? 'is-active' : ''), text: active ? '✓ Active' : 'Use this guide',
          onclick: function () { S.setSetting('styleGuide', key); FW.editor.runCheck(); render(); K.toast(guide.name + ' active'); }
        })
      ]));
    });

    grid.appendChild(el('section', { class: 'res-card' }, [
      el('h4', { text: 'Citation styles available' }),
      el('ul', { class: 'res-list' }, FW.citations.STYLES.map(function (s) {
        return el('li', {}, [el('strong', { text: s.label })]);
      })),
      el('div', { class: 'tiny dim', style: { marginTop: '8px' }, text: 'Build and insert them from the Citations tab in the studio.' })
    ]));
  }

  function renderFonts(bodyHost) {
    var byCat = {};
    FW.resources.FONTS.forEach(function (f) { (byCat[f.category] = byCat[f.category] || []).push(f); });
    var grid = el('div', { class: 'res-grid' });
    bodyHost.appendChild(grid);

    Object.keys(byCat).forEach(function (cat) {
      var fonts = byCat[cat].filter(function (f) { return matches(f.label + ' ' + f.use + ' ' + cat); });
      if (!fonts.length) return;
      grid.appendChild(el('section', { class: 'res-card' }, [
        el('h4', { text: cat }),
        el('div', {}, fonts.map(function (f) {
          var active = S.state.settings.font === f.id;
          return el('div', { class: 'font-sample', style: { fontFamily: f.stack } }, [
            el('div', { class: 'spread' }, [
              el('span', { text: 'The quiet hum of a deadline' }),
              el('button', {
                class: 'btn btn-sm ' + (active ? 'is-active' : ''), style: { fontFamily: 'var(--ui)' },
                text: active ? '✓' : 'Use',
                onclick: function () { S.setSetting('font', f.id); FW.editor.applyTypography(); render(); K.toast(f.label + ' applied'); }
              })
            ]),
            el('small', { text: f.label + ' — ' + f.use })
          ]);
        }))
      ]));
    });

    grid.appendChild(el('section', { class: 'res-card' }, [
      el('h4', { text: 'Deliverable presets' }),
      el('ul', { class: 'res-list' }, FW.resources.PRESETS.map(function (p) {
        return el('li', {}, [
          el('div', { class: 'spread' }, [
            el('span', { text: p.label }),
            el('button', {
              class: 'btn btn-sm', text: 'Apply',
              onclick: function () {
                ['font', 'size', 'line', 'width', 'align'].forEach(function (k) { S.setSetting(k, p[k]); });
                FW.editor.applyTypography();
                K.toast(p.label + ' applied');
              }
            })
          ]),
          el('span', { class: 'note', text: FW.resources.font(p.font).label + ' · ' + p.size + 'px · ' + p.line + ' line height · ' + p.width + 'px wide' })
        ]);
      }))
    ]));
  }

  function renderSnippets(bodyHost) {
    bodyHost.appendChild(el('div', { class: 'spread', style: { marginBottom: '12px' } }, [
      el('p', { class: 'muted small', style: { margin: 0 },
        text: 'Keep client voice sheets, boilerplate bios, disclaimers and passages you reuse.' }),
      el('button', { class: 'btn btn-sm btn-primary', text: '+ New snippet', onclick: newSnippet })
    ]));

    var items = S.state.snippets.filter(function (s) { return matches(s.title + ' ' + s.body + ' ' + (s.tag || '')); });
    if (!items.length) {
      bodyHost.appendChild(el('div', { class: 'empty', text: 'No snippets yet.' }));
      return;
    }
    var grid = el('div', { class: 'res-grid' });
    bodyHost.appendChild(grid);
    items.forEach(function (s) {
      grid.appendChild(el('section', { class: 'res-card' }, [
        el('div', { class: 'spread' }, [
          el('h4', { text: s.title }),
          s.tag ? el('span', { class: 'chip', text: s.tag }) : null
        ].filter(Boolean)),
        el('p', { class: 'small muted', style: { whiteSpace: 'pre-wrap', maxHeight: '150px', overflow: 'auto' }, text: s.body }),
        el('div', { class: 'flex wrap' }, [
          el('button', { class: 'btn btn-sm', text: 'Copy', onclick: function () { K.copyAndToast(s.body, s.title); } }),
          el('button', { class: 'btn btn-sm btn-ghost', text: 'Edit', onclick: function () { newSnippet(s); } }),
          el('button', {
            class: 'btn btn-sm btn-ghost', text: 'Delete',
            onclick: function () { S.removeSnippet(s.id); }
          })
        ])
      ]));
    });
  }

  function newSnippet(existing) {
    var title = el('input', { type: 'text', value: existing ? existing.title : '', placeholder: 'e.g. Meridian voice sheet' });
    var tag = el('input', { type: 'text', value: existing ? existing.tag || '' : '', placeholder: 'client, bio, disclaimer…' });
    var body = el('textarea', { rows: '10' });
    body.value = existing ? existing.body : '';

    K.modal({
      title: existing ? 'Edit snippet' : 'New snippet',
      size: 'lg',
      body: el('div', {}, [K.field('Title', title), K.field('Tag', tag), K.field('Content', body)]),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Save', variant: 'primary', onClick: function () {
            if (!title.value.trim()) { K.toast('Give it a title', 'error'); return false; }
            if (existing) S.removeSnippet(existing.id);
            S.addSnippet({ title: title.value.trim(), tag: tag.value.trim(), body: body.value });
            K.toast('Snippet saved');
          }
        }
      ]
    });
  }

  FW.resourcesView = { mount: mount, render: render };
})(window.FW);
