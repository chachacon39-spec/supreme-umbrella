/* Right-pane tools: summarise, paraphrase, originality, citations, images, export. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, el = U.el, K = FW.kit, S = FW.store;

  function sectionHead(title, subtitle) {
    return el('div', { style: { marginBottom: '9px' } }, [
      el('div', { class: 'section-title', style: { marginBottom: '3px' }, text: title }),
      subtitle ? el('div', { class: 'tiny dim', text: subtitle }) : null
    ].filter(Boolean));
  }

  function sourceText(api) {
    var sel = api.getSelection();
    return { text: sel || api.getText(), isSelection: !!sel };
  }

  /* =================== TOOLS TAB =================== */
  function renderTools(host, api) {
    U.clear(host);
    var pane = el('div', { class: 'tool-pane' });
    host.appendChild(pane);

    pane.appendChild(buildSummarizer(api));
    pane.appendChild(el('hr', { class: 'divider' }));
    pane.appendChild(buildParaphraser(api));
    pane.appendChild(el('hr', { class: 'divider' }));
    pane.appendChild(buildOriginality(api));
    pane.appendChild(el('hr', { class: 'divider' }));
    pane.appendChild(buildWordBank(api));
  }

  /* ---------- summariser ---------- */
  function buildSummarizer(api) {
    var wrap = el('div', {});
    var out = el('div', { class: 'tool-out', style: { display: 'none' } });
    var ratio = 25;
    var ratioOut = el('output', { text: '25%' });

    var modeSel = K.select([
      { value: 'summary', label: 'Paragraph summary' },
      { value: 'bullets', label: 'Key points' },
      { value: 'tldr', label: 'One-line TL;DR' },
      { value: 'outline', label: 'Paragraph-by-paragraph outline' }
    ], 'summary', null);

    function run() {
      var src = sourceText(api);
      if (U.wordCount(src.text) < 40) {
        K.toast('Write at least 40 words before summarising', 'error');
        return;
      }
      var keywords = [];
      var task = api.getTask();
      if (task && task.analysis) keywords = task.analysis.meta.keywords.map(function (k) { return k.term; });
      var result = FW.summarize.summarize(src.text, { ratio: ratio / 100, keywords: keywords });

      U.clear(out);
      out.style.display = '';
      out.appendChild(el('div', { class: 'tiny dim', style: { marginBottom: '8px' }, text: (src.isSelection ? 'Selection · ' : 'Whole draft · ') + result.compression + '% shorter (' + result.summaryWords + ' of ' + result.originalWords + ' words)' }));

      var body;
      var mode = modeSel.value;
      if (mode === 'tldr') body = el('p', { style: { margin: 0 }, text: result.tldr });
      else if (mode === 'bullets') body = el('ul', {}, result.bullets.map(function (b) { return el('li', { text: b }); }));
      else if (mode === 'outline') body = el('ul', {}, result.outline.map(function (o) { return el('li', { text: '¶' + o.paragraph + ' — ' + o.text }); }));
      else body = el('p', { style: { margin: 0 }, text: result.summary });
      out.appendChild(body);

      var payload = mode === 'tldr' ? result.tldr
        : mode === 'bullets' ? result.bullets.map(function (b) { return '• ' + b; }).join('\n')
          : mode === 'outline' ? result.outline.map(function (o) { return '¶' + o.paragraph + ' — ' + o.text; }).join('\n')
            : result.summary;

      out.appendChild(el('div', { class: 'flex wrap', style: { marginTop: '10px' } }, [
        el('button', { class: 'btn btn-sm', text: 'Copy', onclick: function () { K.copyAndToast(payload, 'Summary'); } }),
        el('button', {
          class: 'btn btn-sm', text: 'Insert at cursor', onclick: function () {
            var html = mode === 'bullets' || mode === 'outline'
              ? '<ul>' + payload.split('\n').map(function (l) { return '<li>' + U.escapeHtml(l.replace(/^[•]\s*/, '')) + '</li>'; }).join('') + '</ul>'
              : '<p>' + U.escapeHtml(payload) + '</p>';
            api.insertHtml(html, 'before the summary was inserted');
            K.toast('Inserted');
          }
        }),
        el('button', {
          class: 'btn btn-sm btn-ghost', text: 'Save as meta description',
          title: 'Trim to 155 characters for SEO',
          onclick: function () {
            var meta = result.tldr.slice(0, 155).replace(/\s+\S*$/, '');
            K.copyAndToast(meta, 'Meta description (' + meta.length + ' chars)');
          }
        })
      ]));
      out.appendChild(el('div', { class: 'flex wrap', style: { marginTop: '8px', gap: '4px' } },
        result.keyTerms.slice(0, 10).map(function (t) { return el('span', { class: 'chip', text: t }); })));
    }

    wrap.appendChild(sectionHead('Summariser', 'Extractive — it selects your own strongest sentences, it does not invent new ones.'));
    wrap.appendChild(modeSel);
    wrap.appendChild(el('div', { class: 'flex', style: { margin: '9px 0' } }, [
      el('span', { class: 'tiny dim nowrap', text: 'Length' }),
      el('input', {
        type: 'range', min: '5', max: '50', value: '25',
        oninput: function (e) { ratio = Number(e.target.value); ratioOut.textContent = ratio + '%'; }
      }),
      ratioOut
    ]));
    wrap.appendChild(el('button', { class: 'btn btn-primary btn-sm', text: 'Summarise', onclick: run }));
    wrap.appendChild(out);
    return wrap;
  }

  /* ---------- paraphraser ---------- */
  function buildParaphraser(api) {
    var wrap = el('div', {});
    var out = el('div', { style: { display: 'none' } });
    var mode = 'standard';

    var modeButtons = el('div', { class: 'flex wrap', style: { gap: '4px', marginBottom: '9px' } },
      FW.paraphrase.MODES.map(function (m) {
        return el('button', {
          class: 'btn btn-sm' + (m.id === mode ? ' is-active' : ''), text: m.label, title: m.note,
          onclick: function (e) {
            mode = m.id;
            U.$$('.btn', modeButtons).forEach(function (b) { b.classList.toggle('is-active', b === e.target); });
          }
        });
      }));

    function run() {
      var src = sourceText(api);
      if (U.wordCount(src.text) < 8) { K.toast('Select a passage, or write more first', 'error'); return; }
      if (!src.isSelection && U.wordCount(src.text) > 1200) {
        K.toast('Select a passage — paraphrasing a whole long draft at once rarely reads well', 'error');
        return;
      }
      var result = FW.paraphrase.paraphrase(src.text, mode, api.getTask() ? api.getTask().id : 'x');

      U.clear(out);
      out.style.display = '';

      /* Say plainly when nothing applied, rather than presenting the input back
         as though it were a rewrite. */
      if (!result.changedSentences) {
        out.appendChild(el('div', { class: 'empty', style: { marginBottom: '9px' } }, [
          el('div', { text: 'Nothing to rewrite in ' + mode + ' mode.' }),
          el('div', { class: 'tiny dim', style: { marginTop: '6px' },
            text: 'No passive voice, buried verbs, wordy constructions or movable clauses in these ' +
              result.totalSentences + ' ' + U.pluralize(result.totalSentences, 'sentence') +
              '. Try a different mode, or take it as a sign the passage is already tight.' })
        ]));
        out.appendChild(el('div', { class: 'flex wrap' }, [
          el('button', { class: 'btn btn-sm btn-ghost', text: 'Try another mode', onclick: run })
        ]));
        return;
      }

      out.appendChild(el('div', { class: 'tiny dim', style: { marginBottom: '8px' }, text:
        result.changedSentences + ' of ' + result.totalSentences + ' ' +
        U.pluralize(result.totalSentences, 'sentence') + ' rewritten · ' +
        result.wordsBefore + ' → ' + result.wordsAfter + ' words' }));

      out.appendChild(el('div', { class: 'tool-out', text: result.text }));

      /* Structural changes are the ones worth reviewing, so surface them. */
      var structural = result.notes.filter(function (n) { return n.indexOf('“') === -1; });
      if (structural.length) {
        out.appendChild(el('div', { class: 'flex wrap', style: { gap: '4px', marginTop: '8px' } },
          U.unique(structural).slice(0, 6).map(function (n) {
            return el('span', { class: 'chip chip-accent', text: n });
          })));
      }

      if (result.pairs.length) {
        var diffBox = el('div', {});
        result.pairs.slice(0, 6).forEach(function (pair) {
          var parts = FW.paraphrase.diff(pair.before, pair.after);
          var line = el('p', { class: 'small', style: { margin: '0 0 8px', lineHeight: '1.6' } });
          parts.forEach(function (p) {
            line.appendChild(el('span', { class: p.type === 'ins' ? 'diff-ins' : p.type === 'del' ? 'diff-del' : '', text: p.text }));
          });
          diffBox.appendChild(line);
        });
        out.appendChild(el('details', { class: 'acc', style: { marginTop: '9px' } }, [
          el('summary', {}, [el('span', { text: 'What changed' }), el('span', { class: 'badge', text: String(result.pairs.length) })]),
          el('div', {}, [diffBox])
        ]));
      }

      out.appendChild(el('div', { class: 'flex wrap', style: { marginTop: '9px' } }, [
        el('button', { class: 'btn btn-sm', text: 'Copy', onclick: function () { K.copyAndToast(result.text, 'Paraphrase'); } }),
        src.isSelection ? el('button', {
          class: 'btn btn-sm btn-primary', text: 'Replace selection',
          onclick: function () {
            api.replaceSelection(result.text, 'before the ' + mode + ' paraphrase');
            K.toast('Selection replaced');
          }
        }) : null,
        el('button', { class: 'btn btn-sm btn-ghost', text: 'Try again', onclick: run })
      ].filter(Boolean)));

      out.appendChild(el('p', { class: 'tiny dim', style: { marginTop: '8px' },
        text: 'Rule-based rewriting. Read every sentence before you keep it — synonyms can shift meaning.' }));
    }

    wrap.appendChild(sectionHead('Paraphraser', 'Select a passage first, or it works on the whole draft.'));
    wrap.appendChild(modeButtons);
    wrap.appendChild(el('button', { class: 'btn btn-primary btn-sm', text: 'Rewrite', onclick: run }));
    wrap.appendChild(out);
    return wrap;
  }

  /* ---------- originality ---------- */
  function buildOriginality(api) {
    var wrap = el('div', {});
    var out = el('div', { style: { display: 'none' } });
    var sources = [];
    var sourceList = el('div', { class: 'stack', style: { marginBottom: '8px' } });

    function renderSources() {
      U.clear(sourceList);
      sources.forEach(function (s, i) {
        sourceList.appendChild(el('div', { class: 'flex', style: { fontSize: '12px' } }, [
          el('span', { class: 'chip grow truncate', text: s.label + ' · ' + U.wordCount(s.text).toLocaleString() + 'w' }),
          el('button', {
            class: 'btn btn-sm btn-ghost', text: '✕',
            onclick: function () { sources.splice(i, 1); renderSources(); }
          })
        ]));
      });
    }

    function addSource() {
      K.prompt('Paste the source text you researched from. It stays on this machine.', {
        title: 'Add a source to compare against', multiline: true, rows: 10, confirmLabel: 'Add source'
      }).then(function (text) {
        if (!text || U.wordCount(text) < 10) return;
        var label = U.splitSentences(text)[0] || 'Source';
        sources.push({ label: label.slice(0, 40) + (label.length > 40 ? '…' : ''), text: text });
        renderSources();
      });
    }

    function run() {
      var text = api.getText();
      if (U.wordCount(text) < 30) { K.toast('Not enough text to check yet', 'error'); return; }

      var task = api.getTask();
      var others = Object.keys(S.state.docs).map(function (id) {
        var d = S.state.docs[id];
        if (!task || d.taskId === task.id) return null;
        var t = S.getTask(d.taskId);
        return { label: t ? t.title : 'Untitled draft', text: U.stripHtml(d.html) };
      }).filter(Boolean);

      var result = FW.originality.check(text, { sources: sources, otherDrafts: others });

      U.clear(out);
      out.style.display = '';

      var riskClass = { high: 'chip-error', medium: 'chip-warning', low: 'chip-suggest', clear: 'chip-ok' }[result.risk.level];
      out.appendChild(el('div', { class: 'card', style: { marginBottom: '10px' } }, [
        el('div', { class: 'spread' }, [
          el('strong', { text: result.risk.label }),
          el('span', { class: 'chip ' + riskClass, text: result.worstSimilarity + '% overlap' })
        ]),
        el('p', { class: 'small muted', style: { margin: '6px 0 0' }, text: result.risk.note })
      ]));

      if (result.sources.length) {
        out.appendChild(el('div', { class: 'section-title', text: 'Against your pasted sources' }));
        result.sources.forEach(function (r) {
          var card = el('div', { class: 'card', style: { marginBottom: '8px' } }, [
            el('div', { class: 'spread' }, [
              el('span', { class: 'small truncate grow', text: r.label }),
              el('span', { class: 'chip ' + (r.similarity > 20 ? 'chip-error' : r.similarity > 8 ? 'chip-warning' : 'chip-ok'), text: r.similarity + '%' })
            ]),
            el('div', { class: 'tiny dim', style: { marginTop: '4px' }, text: r.matchedWords + ' matched words · longest run ' + r.longest + ' words' })
          ]);
          if (r.spans.length) {
            var spanList = el('div', { style: { marginTop: '6px' } }, r.spans.slice(0, 6).map(function (s) {
              return el('div', { class: 'small', style: { padding: '4px 0', borderTop: '1px dashed var(--border)' } }, [
                el('span', { style: { background: 'var(--error-soft)', color: 'var(--error)', padding: '1px 3px', borderRadius: '3px' }, text: s.text.slice(0, 130) })
              ]);
            }));
            card.appendChild(spanList);
            card.appendChild(el('button', {
              class: 'btn btn-sm', style: { marginTop: '6px' }, text: 'Highlight in draft',
              onclick: function () { api.highlightSpans(r.spans); K.toast(r.spans.length + ' passages highlighted'); }
            }));
          }
          out.appendChild(card);
        });
      } else {
        out.appendChild(el('p', { class: 'tiny dim', text: 'No sources pasted. Add the material you researched from to check how close your paraphrasing sits.' }));
      }

      if (result.otherDrafts.length) {
        out.appendChild(el('div', { class: 'section-title', style: { marginTop: '10px' }, text: 'Against your other drafts (self-plagiarism)' }));
        result.otherDrafts.forEach(function (r) {
          out.appendChild(el('div', { class: 'flex', style: { padding: '5px 0', fontSize: '12px' } }, [
            el('span', { class: 'grow truncate', text: r.label }),
            el('span', { class: 'chip ' + (r.similarity > 15 ? 'chip-warning' : 'chip-ok'), text: r.similarity + '%' })
          ]));
        });
      }

      out.appendChild(el('div', { class: 'section-title', style: { marginTop: '10px' }, text: 'Internal repetition' }));
      out.appendChild(el('p', { class: 'small muted', style: { margin: 0 },
        text: result.internal.spans.length ? result.internal.pct + '% of the draft repeats itself across ' + result.internal.spans.length + ' passages.' : 'No repeated passages found inside the draft.' }));

      if (result.stock.length) {
        out.appendChild(el('div', { class: 'section-title', style: { marginTop: '10px' }, text: 'Stock phrasing (' + result.stock.length + ')' }));
        out.appendChild(el('div', { class: 'flex wrap', style: { gap: '4px' } },
          U.unique(result.stock.map(function (s) { return s.phrase; })).map(function (p) {
            return el('span', { class: 'chip chip-warning', text: p });
          })));
      }

      out.appendChild(el('div', { class: 'section-title', style: { marginTop: '12px' }, text: 'Verify these against the live web' }));
      result.distinctive.forEach(function (d) {
        out.appendChild(el('div', { style: { padding: '7px 0', borderBottom: '1px dashed var(--border)' } }, [
          el('div', { class: 'small', text: '“' + d.text.slice(0, 150) + (d.text.length > 150 ? '…' : '') + '”' }),
          el('div', { class: 'flex', style: { marginTop: '5px', gap: '6px' } }, d.links.map(function (l) {
            return el('a', { class: 'btn btn-sm btn-ghost', href: l.url, target: '_blank', rel: 'noopener noreferrer', text: l.name + ' ↗' });
          }))
        ]));
      });

      out.appendChild(el('p', { class: 'tiny dim', style: { marginTop: '10px' }, text: result.disclaimer }));
    }

    wrap.appendChild(sectionHead('Originality check', 'Compares against your sources, your other drafts and itself — offline.'));
    wrap.appendChild(sourceList);
    wrap.appendChild(el('div', { class: 'flex wrap' }, [
      el('button', { class: 'btn btn-sm', text: '+ Add source text', onclick: addSource }),
      el('button', { class: 'btn btn-sm btn-primary', text: 'Run check', onclick: run })
    ]));
    wrap.appendChild(out);
    return wrap;
  }

  /* ---------- word bank ---------- */
  function buildWordBank(api) {
    var wrap = el('div', {});
    wrap.appendChild(sectionHead('Word bank', 'Click a word to drop it in at the cursor.'));

    var groups = Object.assign({}, FW.lex.WORD_BANK);
    var transitionGroups = {};
    Object.keys(FW.lex.TRANSITIONS).forEach(function (k) {
      transitionGroups['Transitions — ' + k] = FW.lex.TRANSITIONS[k];
    });
    Object.assign(groups, transitionGroups);

    Object.keys(groups).forEach(function (name) {
      wrap.appendChild(el('details', { class: 'acc' }, [
        el('summary', {}, [el('span', { text: name }), el('span', { class: 'badge', text: String(groups[name].length) })]),
        el('div', {}, [
          el('div', { class: 'wordbank' }, groups[name].map(function (w) {
            return el('button', {
              text: w,
              onclick: function () { api.replaceSelection(w); }
            });
          }))
        ])
      ]));
    });
    return wrap;
  }

  /* =================== CITATIONS TAB =================== */
  function renderCitations(host, api) {
    U.clear(host);
    var pane = el('div', { class: 'tool-pane' });
    host.appendChild(pane);

    var task = api.getTask();
    var defaultStyle = (task && task.analysis && task.analysis.meta.citationStyle) || '';
    var styleId = { 'APA 7': 'apa', 'MLA 9': 'mla', 'Chicago': 'chicago-nb', 'Harvard': 'harvard', 'IEEE': 'ieee', 'Vancouver': 'vancouver' }[defaultStyle] || 'apa';

    var listHost = el('div', {});
    var formHost = el('div', {});

    var styleSel = K.select(FW.citations.STYLES.map(function (s) { return { value: s.id, label: s.label }; }), styleId, function (v) {
      styleId = v; renderList();
    });

    pane.appendChild(sectionHead('Citations', defaultStyle ? 'The brief asks for ' + defaultStyle + '.' : 'Pick the style the client uses.'));
    pane.appendChild(K.field('Style', styleSel));
    pane.appendChild(formHost);
    pane.appendChild(el('hr', { class: 'divider' }));
    pane.appendChild(listHost);

    function buildForm() {
      U.clear(formHost);
      var typeSel = K.select(FW.citations.TYPES.map(function (t) { return { value: t.id, label: t.label }; }), 'website', function () { fields(); });
      var fieldHost = el('div', {});
      var inputs = {};

      function fields() {
        U.clear(fieldHost);
        inputs = {};
        var type = FW.citations.TYPES.filter(function (t) { return t.id === typeSel.value; })[0];
        type.fields.forEach(function (f) {
          var input = el('input', { type: f === 'url' ? 'url' : 'text', placeholder: FW.citations.FIELD_LABELS[f] || f });
          inputs[f] = input;
          fieldHost.appendChild(K.field(FW.citations.FIELD_LABELS[f] || f, input));
        });
      }

      var paste = el('input', { type: 'text', placeholder: 'Paste a URL or DOI to pre-fill…' });
      paste.addEventListener('input', U.debounce(function () {
        if (!paste.value.trim()) return;
        var sniffed = FW.citations.sniff(paste.value);
        Object.keys(sniffed).forEach(function (k) {
          if (inputs[k] && !inputs[k].value) inputs[k].value = sniffed[k];
        });
        K.toast('Pre-filled what could be read from the link');
      }, 500));

      formHost.appendChild(K.field('Quick fill', paste));
      formHost.appendChild(K.field('Source type', typeSel));
      formHost.appendChild(fieldHost);
      fields();

      formHost.appendChild(el('button', {
        class: 'btn btn-primary btn-sm', text: 'Add citation',
        onclick: function () {
          var entry = { type: typeSel.value, taskId: task ? task.id : null };
          Object.keys(inputs).forEach(function (k) { entry[k] = inputs[k].value.trim(); });
          if (!entry.title && !entry.url) { K.toast('Give it at least a title or a URL', 'error'); return; }
          S.addCitation(entry);
          Object.keys(inputs).forEach(function (k) { inputs[k].value = ''; });
          paste.value = '';
          renderList();
          K.toast('Citation saved');
        }
      }));
    }

    function renderList() {
      U.clear(listHost);
      var items = S.state.citations;
      listHost.appendChild(el('div', { class: 'spread', style: { marginBottom: '8px' } }, [
        el('div', { class: 'section-title', style: { margin: 0 }, text: FW.citations.headingFor(styleId) + ' (' + items.length + ')' }),
        items.length ? el('div', { class: 'flex', style: { gap: '5px' } }, [
          el('button', {
            class: 'btn btn-sm', text: 'Copy list',
            onclick: function () {
              var lines = FW.citations.bibliography(items, styleId).map(function (l) { return l.replace(/<\/?i>/g, ''); });
              K.copyAndToast(FW.citations.headingFor(styleId) + '\n\n' + lines.join('\n\n'), 'Reference list');
            }
          }),
          el('button', {
            class: 'btn btn-sm btn-primary', text: 'Insert list',
            onclick: function () {
              var lines = FW.citations.bibliography(items, styleId);
              var html = '<h2>' + FW.citations.headingFor(styleId) + '</h2>' +
                lines.map(function (l) {
                  return '<p style="text-indent:-2em;margin-left:2em">' +
                    U.escapeHtml(l).replace(/&lt;i&gt;/g, '<em>').replace(/&lt;\/i&gt;/g, '</em>') + '</p>';
                }).join('');
              api.insertHtml(html, 'before the reference list was inserted');
              K.toast('Reference list inserted');
            }
          })
        ]) : null
      ].filter(Boolean)));

      if (!items.length) {
        listHost.appendChild(el('div', { class: 'empty tiny', text: 'No citations yet. Add sources as you research, not at the end.' }));
        return;
      }

      FW.citations.bibliography(items, styleId).forEach(function (formatted, i) {
        var entry = items[i];
        listHost.appendChild(el('div', { class: 'card', style: { marginBottom: '8px' } }, [
          el('div', { class: 'small', style: { lineHeight: '1.5' } }, [K.richText(formatted)]),
          el('div', { class: 'flex wrap', style: { marginTop: '8px', gap: '5px' } }, [
            el('button', {
              class: 'btn btn-sm', text: 'Insert in-text',
              onclick: function () {
                api.insertHtml('<mark class="cite-marker">' + U.escapeHtml(FW.citations.inText(entry, styleId)) + '</mark> ', null);
                K.toast('In-text citation inserted');
              }
            }),
            el('button', {
              class: 'btn btn-sm btn-ghost', text: 'Copy',
              onclick: function () { K.copyAndToast(formatted.replace(/<\/?i>/g, ''), 'Citation'); }
            }),
            entry.url ? el('a', { class: 'btn btn-sm btn-ghost', href: entry.url, target: '_blank', rel: 'noopener noreferrer', text: 'Open ↗' }) : null,
            el('button', {
              class: 'btn btn-sm btn-ghost', text: 'Delete',
              onclick: function () { S.removeCitation(entry.id); renderList(); }
            })
          ].filter(Boolean))
        ]));
      });
    }

    buildForm();
    renderList();
  }

  /* =================== IMAGES TAB =================== */
  function renderImages(host, api) {
    U.clear(host);
    var pane = el('div', { class: 'tool-pane' });
    host.appendChild(pane);

    var task = api.getTask();
    var state = {
      title: task ? task.title : 'Your headline here',
      subtitle: '', kicker: '', stat: '', author: '', source: '',
      palette: 'ink', pattern: 'mesh', layout: 'hero', size: 'featured', variant: 0
    };

    var preview = el('div', { class: 'img-preview' });
    var current = null;

    function draw() {
      current = FW.imagegen.generate(state);
      preview.innerHTML = current.svg;
    }

    function textField(label, key, placeholder) {
      var input = el('input', { type: 'text', value: state[key], placeholder: placeholder || '' });
      input.addEventListener('input', function () { state[key] = input.value; draw(); });
      return K.field(label, input);
    }

    pane.appendChild(sectionHead('Image generator', 'Generated locally — you own the output, no licence to track.'));
    pane.appendChild(preview);

    pane.appendChild(el('div', { class: 'flex wrap', style: { margin: '10px 0' } }, [
      el('button', {
        class: 'btn btn-sm', text: '↻ Variation',
        onclick: function () { state.variant++; draw(); }
      }),
      el('button', {
        class: 'btn btn-sm', text: 'Download SVG',
        onclick: function () {
          U.download(U.slugify(state.title) + '.svg', current.svg, 'image/svg+xml');
          K.toast('SVG downloaded');
        }
      }),
      el('button', {
        class: 'btn btn-sm btn-primary', text: 'Download PNG',
        onclick: function () {
          FW.imagegen.toPng(current.svg, current.width, current.height, 1)
            .then(function (blob) { U.download(U.slugify(state.title) + '.png', blob); K.toast('PNG downloaded'); })
            .catch(function (e) { K.toast(e.message, 'error'); });
        }
      }),
      el('button', {
        class: 'btn btn-sm', text: 'Insert in draft',
        onclick: function () {
          api.insertHtml('<p><img src="' + FW.imagegen.dataUri(current.svg) + '" alt="' + U.escapeAttr(state.title) + '" width="' + current.width + '"></p>', 'before the image was inserted');
          K.toast('Image inserted');
        }
      })
    ]));

    pane.appendChild(K.field('Layout', K.select(FW.imagegen.LAYOUTS.map(function (l) { return { value: l.id, label: l.label }; }), state.layout, function (v) { state.layout = v; draw(); })));
    pane.appendChild(K.field('Size', K.select(FW.imagegen.SIZES.map(function (s) { return { value: s.id, label: s.label }; }), state.size, function (v) { state.size = v; draw(); })));
    pane.appendChild(K.field('Pattern', K.select(FW.imagegen.PATTERNS.map(function (p) { return { value: p.id, label: p.label }; }), state.pattern, function (v) { state.pattern = v; draw(); })));

    pane.appendChild(el('div', { class: 'field' }, [
      el('label', { text: 'Palette' }),
      el('div', { class: 'swatches' }, FW.imagegen.PALETTES.map(function (p) {
        return el('button', {
          class: 'swatch' + (p.id === state.palette ? ' is-active' : ''),
          title: p.label,
          style: { background: 'linear-gradient(135deg,' + p.bg + ' 0 50%,' + p.accent + ' 50% 100%)' },
          onclick: function (e) {
            state.palette = p.id;
            U.$$('.swatch', e.target.parentNode).forEach(function (s) { s.classList.toggle('is-active', s === e.target); });
            draw();
          }
        });
      }))
    ]));

    pane.appendChild(textField('Main text', 'title'));
    pane.appendChild(textField('Secondary text', 'subtitle'));
    pane.appendChild(textField('Kicker / label', 'kicker', 'e.g. ANALYSIS'));
    pane.appendChild(textField('Stat (for stat layout)', 'stat', 'e.g. 71%'));
    pane.appendChild(textField('Attribution line', 'author', 'e.g. by A. Writer'));

    pane.appendChild(el('hr', { class: 'divider' }));

    /* ---- royalty-free finder ---- */
    pane.appendChild(sectionHead('Royalty-free photo finder', 'Opens a search on each library. Read the licence on the file page before you use anything.'));
    var q = el('input', { type: 'search', placeholder: 'What do you need a photo of?', value: task ? (task.analysis && task.analysis.meta.topic) || '' : '' });
    var links = el('div', { class: 'stack', style: { marginTop: '9px' } });

    function renderLinks() {
      U.clear(links);
      FW.imagegen.searchLinks(q.value).forEach(function (l) {
        links.appendChild(el('div', { style: { padding: '6px 0', borderBottom: '1px dashed var(--border)' } }, [
          el('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer', class: 'small', text: l.name + ' ↗' }),
          el('div', { class: 'tiny dim', text: l.note })
        ]));
      });
    }
    q.addEventListener('input', U.debounce(renderLinks, 250));
    pane.appendChild(q);
    pane.appendChild(links);
    renderLinks();

    pane.appendChild(el('hr', { class: 'divider' }));

    /* ---- attribution builder ---- */
    pane.appendChild(sectionHead('Attribution builder', 'Paste the details from the file page; it writes the credit line.'));
    var attr = { title: '', author: '', source: '', licence: 'CC BY', url: '' };
    var attrOut = el('div', { class: 'tool-out', style: { minHeight: '44px' } });

    function attrField(label, key, placeholder) {
      var input = el('input', { type: 'text', placeholder: placeholder || '' });
      input.addEventListener('input', function () { attr[key] = input.value; renderAttr(); });
      return K.field(label, input);
    }

    var licenceSel = K.select(FW.resources.LICENCES.map(function (l) { return { value: l.name, label: l.name }; }), attr.licence, function (v) {
      attr.licence = v; renderAttr();
    });

    var formatSel = K.select([
      { value: 'plain', label: 'Plain text' }, { value: 'html', label: 'HTML' },
      { value: 'markdown', label: 'Markdown' }, { value: 'caption', label: 'Short caption' }
    ], 'plain', renderAttr);

    function renderAttr() {
      var text = FW.imagegen.attribution(attr, formatSel.value);
      attrOut.textContent = text;
      var lic = FW.resources.LICENCES.filter(function (l) { return l.name === attr.licence; })[0];
      if (lic && !lic.commercial) {
        attrOut.appendChild(el('div', { class: 'chip chip-error', style: { marginTop: '8px' }, text: '⚠ Not licensed for commercial client work' }));
      }
    }

    pane.appendChild(attrField('Image title', 'title'));
    pane.appendChild(attrField('Photographer / creator', 'author'));
    pane.appendChild(attrField('Source site', 'source', 'e.g. Unsplash'));
    pane.appendChild(attrField('File URL', 'url'));
    pane.appendChild(K.field('Licence', licenceSel));
    pane.appendChild(K.field('Output format', formatSel));
    pane.appendChild(attrOut);
    pane.appendChild(el('div', { class: 'flex', style: { marginTop: '8px' } }, [
      el('button', { class: 'btn btn-sm', text: 'Copy credit', onclick: function () { K.copyAndToast(attrOut.textContent, 'Credit line'); } }),
      el('button', {
        class: 'btn btn-sm', text: 'Insert credit',
        onclick: function () { api.insertHtml('<p class="small"><em>' + U.escapeHtml(attrOut.textContent) + '</em></p>'); K.toast('Credit inserted'); }
      })
    ]));

    draw();
    renderAttr();
  }

  /* =================== EXPORT TAB =================== */
  /* The scaffold's placeholder lines read as a finished document to everything
     except a human: they are real paragraphs, they convert cleanly, and the
     file reaches the client looking complete. Nothing checked whether the
     writer had written anything yet. */
  var PLACEHOLDER = /draft this section|^~\s*\d+\s*words\./i;

  function draftState(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    var written = 0, placeholder = 0;
    Array.prototype.forEach.call(div.querySelectorAll('p, li, blockquote'), function (node) {
      var text = (node.textContent || '').trim();
      if (!text) return;
      if (PLACEHOLDER.test(text)) placeholder++; else written++;
    });
    return { words: U.wordCount(U.stripHtml(html || '')), written: written, placeholder: placeholder };
  }

  function readyToSend(api) {
    var state = draftState(api.getHtml());
    if (!state.words) {
      return K.confirm('This draft is empty \u2014 the exported file will have nothing in it. Export anyway?',
        { confirmLabel: 'Export anyway' });
    }
    if (state.placeholder && !state.written) {
      return K.confirm('This draft is still the outline: ' + state.placeholder + ' ' +
        U.pluralize(state.placeholder, 'section', 'sections') +
        ' still say \u201cDraft this section.\u201d and nothing has been written yet. Export anyway?',
        { confirmLabel: 'Export anyway' });
    }
    return Promise.resolve(true);
  }

  function renderExport(host, api) {
    U.clear(host);
    var pane = el('div', { class: 'tool-pane' });
    host.appendChild(pane);

    var task = api.getTask();
    var settings = S.state.settings;
    var submission = (task && task.analysis && task.analysis.meta && task.analysis.meta.submission) || {};
    var meta = {
      title: task ? task.title : 'Untitled draft',
      author: '', client: task ? task.client : '',
      date: new Date().toLocaleDateString(),
      fontStack: FW.resources.font(settings.font).stack,
      size: settings.size, line: settings.line, width: settings.width,
      lang: settings.language, showMeta: true,
      /* The studio font is for reading on screen. The Word file has to match
         what the client asked for, which the brief analyser has already read. */
      docxFont: submission.fontFamily || FW.exporter.docxFamily(FW.resources.font(settings.font).stack),
      docxSize: submission.fontSize || FW.exporter.DOCX_DEFAULT_PT
    };

    function metaField(label, key, placeholder) {
      var input = el('input', { type: 'text', value: meta[key] || '', placeholder: placeholder || '' });
      input.addEventListener('input', function () { meta[key] = input.value; });
      return K.field(label, input);
    }

    pane.appendChild(sectionHead('Export', 'Everything is produced locally — nothing is uploaded.'));
    pane.appendChild(metaField('Document title', 'title'));
    pane.appendChild(metaField('Your name (byline)', 'author'));
    pane.appendChild(metaField('Client', 'client'));
    pane.appendChild(el('label', { class: 'check-row' }, [
      el('input', {
        type: 'checkbox', checked: true,
        onchange: function (e) { meta.showMeta = e.target.checked; }
      }),
      el('span', { text: 'Include a byline block in HTML and PDF' })
    ]));

    var docxFontInput = el('input', { type: 'text', value: meta.docxFont });
    docxFontInput.addEventListener('input', function () { meta.docxFont = docxFontInput.value.trim() || 'Calibri'; });
    var docxSizeInput = el('input', { type: 'number', value: String(meta.docxSize), min: '6', max: '36', step: '1' });
    docxSizeInput.addEventListener('input', function () { meta.docxSize = Number(docxSizeInput.value) || FW.exporter.DOCX_DEFAULT_PT; });
    pane.appendChild(el('div', { class: 'row' }, [
      K.field('Word font', docxFontInput),
      K.field('Word size (pt)', docxSizeInput)
    ]));
    if (submission.fontFamily || submission.fontSize || submission.fileFormat) {
      pane.appendChild(el('div', { class: 'tiny dim', style: { marginTop: '-4px', marginBottom: '10px' } , text:
        'From the brief: ' + [submission.fileFormat, submission.fontFamily,
          submission.fontSize ? submission.fontSize + 'pt' : null].filter(Boolean).join(' · ') }));
    }

    function filename(ext) { return U.slugify(meta.title) + '.' + ext; }

    var buttons = [
      {
        label: '📄  Word (.docx)', primary: true, run: function () {
          var blob = FW.exporter.toDocx(api.getHtml(), meta);
          U.download(filename('docx'), blob);
          K.toast('Word document downloaded');
        }
      },
      {
        label: '🖨  PDF (via print)', run: function () {
          var ok = FW.exporter.printPdf(api.getHtml(), meta);
          if (!ok) K.toast('Allow pop-ups for this page, then try again', 'error');
          else K.toast('Choose “Save as PDF” in the print dialog');
        }
      },
      {
        label: '🌐  HTML', run: function () {
          U.download(filename('html'), FW.exporter.standaloneHtml(api.getHtml(), meta), 'text/html;charset=utf-8');
          K.toast('HTML downloaded');
        }
      },
      {
        label: '⌨  Markdown', run: function () {
          U.download(filename('md'), FW.exporter.htmlToMarkdown(api.getHtml()), 'text/markdown;charset=utf-8');
          K.toast('Markdown downloaded');
        }
      },
      {
        label: '📝  Plain text', run: function () {
          U.download(filename('txt'), FW.exporter.htmlToText(api.getHtml()), 'text/plain;charset=utf-8');
          K.toast('Text file downloaded');
        }
      },
      {
        label: '✉️  Email draft', run: function () { emailDialog(api, meta); }
      }
    ];

    pane.appendChild(el('div', { class: 'stack', style: { marginTop: '12px' } }, buttons.map(function (b) {
      return el('button', {
        class: 'btn ' + (b.primary ? 'btn-primary' : '') , style: { width: '100%', justifyContent: 'flex-start' },
        text: b.label,
        onclick: function () { readyToSend(api).then(function (ok) { if (ok) b.run(); }); }
      });
    })));

    pane.appendChild(el('hr', { class: 'divider' }));
    pane.appendChild(sectionHead('Copy to clipboard'));
    pane.appendChild(el('div', { class: 'flex wrap' }, [
      el('button', { class: 'btn btn-sm', text: 'Markdown', onclick: function () { K.copyAndToast(FW.exporter.htmlToMarkdown(api.getHtml()), 'Markdown'); } }),
      el('button', { class: 'btn btn-sm', text: 'Plain text', onclick: function () { K.copyAndToast(FW.exporter.htmlToText(api.getHtml()), 'Text'); } }),
      el('button', { class: 'btn btn-sm', text: 'HTML', onclick: function () { K.copyAndToast(api.getHtml(), 'HTML'); } }),
      el('button', {
        class: 'btn btn-sm', text: 'Email-safe HTML',
        onclick: function () { K.copyAndToast(FW.exporter.emailHtml(api.getHtml(), meta), 'Email HTML'); }
      })
    ]));

    pane.appendChild(el('hr', { class: 'divider' }));
    pane.appendChild(sectionHead('Delivery pack', 'Everything a client usually asks for, in one text block.'));
    pane.appendChild(el('button', {
      class: 'btn btn-sm', style: { width: '100%' }, text: 'Build delivery note',
      onclick: function () { deliveryPack(api, meta); }
    }));

    pane.appendChild(el('hr', { class: 'divider' }));
    pane.appendChild(sectionHead('Workspace backup'));
    pane.appendChild(el('div', { class: 'flex wrap' }, [
      el('button', {
        class: 'btn btn-sm', text: 'Export everything (.json)',
        onclick: function () { FW.backup.exportNow({ force: true }); }
      }),
      el('button', { class: 'btn btn-sm', text: 'Import backup…', onclick: importBackup })
    ]));
  }

  function importBackup() {
    var input = el('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          K.confirm('Merge this backup into your workspace, or replace everything currently here?', {
            title: 'Import backup', confirmLabel: 'Replace', cancelLabel: 'Merge'
          }).then(function (replace) {
            S.importAll(data, replace ? 'replace' : 'merge');
            /* The workspace now matches a file the writer holds, so the
               reminder clock starts again from here. */
            S.markBackedUp();
            K.toast('Backup imported');
          });
        } catch (e) {
          K.toast('That file could not be read: ' + e.message, 'error');
        }
        input.remove();
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function emailDialog(api, meta) {
    var to = el('input', { type: 'email', placeholder: 'editor@publication.com' });
    var subject = el('input', { type: 'text', value: 'Draft: ' + meta.title });
    var intro = el('textarea', { rows: '4' });
    intro.value = 'Hi,\n\nDraft attached below for review. Word count ' +
      U.wordCount(api.getText()).toLocaleString() + '. Happy to take another pass.\n\nBest,\n' + (meta.author || '');

    var body = el('div', {}, [
      K.field('To', to),
      K.field('Subject', subject),
      K.field('Message', intro),
      el('p', { class: 'tiny dim', text: 'Mail clients cap how much text a link can carry, so long drafts are truncated. For anything over ~300 words, send the Word or PDF export as an attachment and use the email-safe HTML for the body.' })
    ]);

    K.modal({
      title: 'Email this draft', body: body, actions: [
        { label: 'Cancel' },
        {
          label: 'Copy email body', onClick: function () {
            K.copyAndToast(intro.value + '\n\n' + FW.exporter.htmlToText(api.getHtml()), 'Email body');
            return false;
          }
        },
        {
          label: 'Open mail client', variant: 'primary', onClick: function () {
            window.location.href = FW.exporter.mailto({
              to: to.value, subject: subject.value, intro: intro.value, title: meta.title
            }, FW.exporter.htmlToText(api.getHtml()));
          }
        }
      ]
    });
  }

  function deliveryPack(api, meta) {
    var task = api.getTask();
    var result = api.getResult();
    var lines = [];
    lines.push(meta.title);
    lines.push('='.repeat(Math.min(60, meta.title.length)));
    if (meta.client) lines.push('Client: ' + meta.client);
    if (meta.author) lines.push('Writer: ' + meta.author);
    lines.push('Delivered: ' + new Date().toLocaleDateString());
    lines.push('');
    if (result) {
      lines.push('Word count: ' + result.stats.words.toLocaleString());
      lines.push('Reading time: ' + result.stats.readingMinutes + ' minutes');
      lines.push('Reading level: grade ' + result.stats.grade.toFixed(1) + ' (' + result.stats.gradeLabel + ')');
    }
    if (task && task.analysis) {
      var m = task.analysis.meta;
      if (m.keywords.length) {
        lines.push('');
        lines.push('KEYWORD USE');
        m.keywords.forEach(function (k) {
          lines.push('  ' + k.term + ': ' + FW.analyzer.phraseCount(api.getText(), k.term) + ' uses');
        });
      }
      lines.push('');
      lines.push('BRIEF COMPLIANCE');
      task.analysis.checks.slice(0, 25).forEach(function (c) { lines.push('  • ' + c.label); });
    }
    var cites = S.state.citations;
    if (cites.length) {
      lines.push('');
      lines.push('SOURCES');
      FW.citations.bibliography(cites, 'apa').forEach(function (c) { lines.push('  ' + c.replace(/<\/?i>/g, '')); });
    }
    lines.push('');
    lines.push('NOTES FOR THE EDITOR');
    lines.push('  - ');

    var text = lines.join('\n');
    K.modal({
      title: 'Delivery note',
      size: 'lg',
      body: el('div', {}, [
        el('textarea', { rows: '18', style: { fontFamily: 'var(--mono)', fontSize: '12px' } }, [text])
      ]),
      actions: [
        { label: 'Close' },
        { label: 'Copy', variant: 'primary', onClick: function () { K.copyAndToast(text, 'Delivery note'); } }
      ]
    });
  }

  FW.tools = {
    renderTools: renderTools, renderCitations: renderCitations,
    renderImages: renderImages, renderExport: renderExport,
    importBackup: importBackup
  };
})(window.FW);
