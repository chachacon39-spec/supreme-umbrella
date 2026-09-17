/* Small UI primitives: toasts, modals, confirm dialogs, inline menus. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, el = U.el;

  function toast(message, kind) {
    var host = document.getElementById('toasts');
    if (!host) return;
    var node = el('div', { class: 'toast' + (kind === 'error' ? ' is-error' : ''), text: message });
    host.appendChild(node);
    setTimeout(function () {
      node.style.transition = 'opacity .25s, transform .25s';
      node.style.opacity = '0';
      node.style.transform = 'translateY(6px)';
      setTimeout(function () { node.remove(); }, 260);
    }, kind === 'error' ? 4200 : 2400);
  }

  var openModals = [];

  function modal(opts) {
    opts = opts || {};
    var body = opts.body instanceof Node ? opts.body : el('div', { html: opts.body || '' });

    var closeBtn = el('button', { class: 'btn btn-ghost btn-icon', title: 'Close (Esc)', html: '&#10005;' });
    var head = el('div', { class: 'modal-head' }, [
      el('h2', { text: opts.title || '' }),
      closeBtn
    ]);

    var foot = null;
    if (opts.actions && opts.actions.length) {
      foot = el('div', { class: 'modal-foot' }, opts.actions.map(function (a) {
        return el('button', {
          class: 'btn ' + (a.variant ? 'btn-' + a.variant : ''),
          text: a.label,
          onclick: function () { if (!a.onClick || a.onClick(close) !== false) close(); }
        });
      }));
    }

    var panel = el('div', { class: 'modal ' + (opts.size ? 'modal-' + opts.size : '') },
      [head, el('div', { class: 'modal-body' }, [body]), foot].filter(Boolean));

    var backdrop = el('div', { class: 'modal-backdrop' }, [panel]);

    function close() {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      openModals = openModals.filter(function (m) { return m !== close; });
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === close) { e.stopPropagation(); close(); }
    }

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);
    openModals.push(close);

    var firstInput = panel.querySelector('input, textarea, select');
    if (firstInput && opts.autofocus !== false) setTimeout(function () { firstInput.focus(); }, 30);

    return { close: close, panel: panel, body: body };
  }

  function confirm(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      modal({
        title: opts.title || 'Are you sure?',
        body: el('p', { text: message, style: { margin: 0, lineHeight: '1.55' } }),
        actions: [
          { label: opts.cancelLabel || 'Cancel', onClick: function () { resolve(false); } },
          { label: opts.confirmLabel || 'Confirm', variant: opts.danger ? 'danger' : 'primary', onClick: function () { resolve(true); } }
        ],
        onClose: function () { resolve(false); }
      });
    });
  }

  function prompt(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var input = opts.multiline
        ? el('textarea', { rows: opts.rows || 6, placeholder: opts.placeholder || '' })
        : el('input', { type: 'text', value: opts.value || '', placeholder: opts.placeholder || '' });
      if (opts.multiline && opts.value) input.value = opts.value;
      var m = modal({
        title: opts.title || 'Enter a value',
        body: el('div', {}, [el('p', { class: 'muted small', text: message, style: { marginTop: 0 } }), input]),
        actions: [
          { label: 'Cancel', onClick: function () { resolve(null); } },
          { label: opts.confirmLabel || 'OK', variant: 'primary', onClick: function () { resolve(input.value); } }
        ],
        onClose: function () { resolve(null); }
      });
      if (!opts.multiline) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { resolve(input.value); m.close(); }
        });
      }
    });
  }

  /* A labelled select built from [{value,label}] or [string] */
  function select(options, value, onChange, attrs) {
    var node = el('select', attrs || {}, options.map(function (o) {
      var v = typeof o === 'string' ? o : o.value;
      var l = typeof o === 'string' ? o : o.label;
      return el('option', { value: v, text: l, selected: String(v) === String(value) });
    }));
    if (onChange) node.addEventListener('change', function () { onChange(node.value); });
    return node;
  }

  function field(label, control, hint) {
    return el('div', { class: 'field' }, [
      el('label', { text: label }),
      control,
      hint ? el('div', { class: 'tiny dim', text: hint, style: { marginTop: '4px' } }) : null
    ].filter(Boolean));
  }

  function copyAndToast(text, label) {
    U.copyText(text).then(function (ok) {
      if (ok) { toast((label || 'Copied') + ' to clipboard'); return; }
      manualCopy(text, label);
    });
  }

  /* A browser that refuses clipboard access should not leave the writer with
     nothing. Hand them the text, selected, so they can copy it themselves. */
  function manualCopy(text, label) {
    var area = el('textarea', { readonly: '' });
    area.value = text;
    area.rows = Math.min(14, Math.max(4, text.split('\n').length + 1));
    area.style.cssText = 'width:100%;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace';
    modal({
      title: (label || 'Copy') + ' \u2014 copy it manually',
      body: el('div', {}, [
        el('p', {
          class: 'small muted', style: { marginTop: 0 },
          text: 'This browser would not let the page write to your clipboard. The text is below, already selected.'
        }),
        area
      ]),
      actions: [{ label: 'Done', variant: 'primary' }]
    });
    setTimeout(function () { try { area.focus(); area.select(); } catch (e) {} }, 60);
  }

  /* Render citation markup (our formatters emit <i> only). */
  function richText(str) {
    var span = document.createElement('span');
    span.innerHTML = U.escapeHtml(str).replace(/&lt;i&gt;/g, '<i>').replace(/&lt;\/i&gt;/g, '</i>');
    return span;
  }

  FW.kit = {
    toast: toast, modal: modal, confirm: confirm, prompt: prompt,
    select: select, field: field, copyAndToast: copyAndToast, manualCopy: manualCopy,
    richText: richText
  };
})(window.FW);
