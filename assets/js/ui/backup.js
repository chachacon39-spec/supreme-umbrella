/* Backup safety.
 *
 * Everything this app knows lives in one browser's localStorage. Clearing site
 * data, a private window, or a browser reset takes the lot — including paid
 * client work. There is no server to fall back on, so the app has to be the
 * thing that remembers to back up, rather than leaving it to the writer. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';
  var U = FW.util, el = U.el, K = FW.kit, S = FW.store;

  var indicator = null, banner = null, bannerHost = null;

  function filename() {
    return 'quill-ledger-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  }

  /* The one place a backup is actually written, so every route through the UI
     records that it happened. */
  function exportNow(options) {
    options = options || {};
    var status = S.backupStatus();
    if (status.state === 'empty' && !options.force) {
      K.toast('Nothing to back up yet');
      return false;
    }
    try {
      U.download(filename(), JSON.stringify(S.exportAll(), null, 2), 'application/json');
    } catch (e) {
      K.toast('Could not write the backup: ' + e.message, 'error');
      return false;
    }
    S.markBackedUp();
    refresh();
    if (!options.quiet) {
      K.toast('Backed up ' + status.totalWords.toLocaleString() + ' words to your downloads');
    }
    return true;
  }

  function describe(status) {
    if (status.state === 'empty') return 'Nothing written yet';
    if (status.neverBackedUp) {
      return 'Never backed up — ' + status.totalWords.toLocaleString() + ' words live only in this browser';
    }
    var when = status.daysSince === 0 ? 'today'
      : status.daysSince === 1 ? 'yesterday'
        : status.daysSince + ' days ago';
    return 'Last backed up ' + when +
      (status.wordsSince > 0 ? ' · ' + status.wordsSince.toLocaleString() + ' words written since' : '');
  }

  /* ---------- top bar ---------- */
  function mountIndicator(host) {
    indicator = el('button', {
      class: 'btn btn-sm backup-btn',
      onclick: function () { openPanel(); }
    });
    host.appendChild(indicator);
    refresh();
    return indicator;
  }

  function renderIndicator(status) {
    if (!indicator) return;
    U.clear(indicator);
    var tone = status.atRisk || status.state === 'never' ? 'risk'
      : status.state === 'stale' ? 'warn'
        : status.state === 'empty' || status.state === 'new' ? 'idle' : 'ok';

    indicator.className = 'btn btn-sm backup-btn tone-' + tone;
    indicator.title = describe(status) + ' — click for backup options';
    indicator.appendChild(el('span', { class: 'backup-dot' }));
    indicator.appendChild(el('span', { text: 'Backup' }));
  }

  /* ---------- the nudge ---------- */
  function mountBanner(host) {
    bannerHost = host;
    refresh();
  }

  function renderBanner(status) {
    if (banner) { banner.remove(); banner = null; }
    if (!bannerHost || !status.atRisk) return;

    var headline = status.neverBackedUp
      ? 'Your work has never been backed up'
      : 'It has been ' + status.daysSince + ' days since your last backup';

    var detail = status.neverBackedUp
      ? status.totalWords.toLocaleString() + ' words across ' +
        status.tasks + ' ' + U.pluralize(status.tasks, 'assignment') +
        ' exist only in this browser. Clearing site data would delete all of it.'
      : status.wordsSince.toLocaleString() + ' words written since then are not in any backup.';

    banner = el('div', { class: 'backup-banner', role: 'status' }, [
      el('span', { class: 'backup-banner-icon', text: '⚠' }),
      el('div', { class: 'grow' }, [
        el('strong', { text: headline }),
        el('div', { class: 'small', text: detail })
      ]),
      el('div', { class: 'flex wrap', style: { gap: '6px' } }, [
        el('button', {
          class: 'btn btn-sm btn-primary', text: 'Back up now',
          onclick: function () { exportNow(); }
        }),
        el('button', {
          class: 'btn btn-sm', text: 'Remind me in 3 days',
          onclick: function () {
            S.snoozeBackupReminder(S.BACKUP.snoozeDays);
            refresh();
            K.toast('Reminder snoozed for 3 days');
          }
        }),
        el('button', {
          class: 'btn btn-sm btn-ghost', title: 'Stop reminding me about backups',
          text: 'Turn off',
          onclick: function () {
            S.setBackupReminders(false);
            refresh();
            K.toast('Backup reminders turned off — you can re-enable them from the Backup button');
          }
        })
      ])
    ]);
    bannerHost.appendChild(banner);
  }

  /* ---------- the panel ---------- */
  function openPanel() {
    var status = S.backupStatus();
    var body = el('div', {});

    body.appendChild(el('div', { class: 'stat-grid', style: { marginBottom: '14px' } }, [
      el('div', { class: 'stat-tile' }, [
        el('b', { text: status.totalWords.toLocaleString() }), el('span', { text: 'Words stored' })
      ]),
      el('div', { class: 'stat-tile' }, [
        el('b', { text: String(status.tasks) }), el('span', { text: 'Assignments' })
      ]),
      el('div', { class: 'stat-tile' }, [
        el('b', { text: status.neverBackedUp ? 'Never' : status.daysSince === 0 ? 'Today' : status.daysSince + 'd' }),
        el('span', { text: 'Last backup' })
      ])
    ]));

    body.appendChild(el('p', { class: 'small muted', style: { marginTop: 0 },
      text: 'Everything you write here is stored in this browser on this device. It is never uploaded anywhere, which also means nothing else is keeping a copy. A backup is a single JSON file holding every assignment, draft, version history, citation and snippet — import it to restore the lot.' }));

    if (status.wordsSince > 0 && !status.neverBackedUp) {
      body.appendChild(el('div', { class: 'chip chip-warning', text: status.wordsSince.toLocaleString() + ' words written since the last backup' }));
    }

    body.appendChild(el('hr', { class: 'divider' }));

    body.appendChild(el('label', { class: 'check-row' }, [
      el('input', {
        type: 'checkbox', checked: S.state.settings.backupReminders !== false,
        onchange: function (e) { S.setBackupReminders(e.target.checked); refresh(); }
      }),
      el('span', { text: 'Remind me when work is at risk' })
    ]));
    body.appendChild(el('div', { class: 'tiny dim', style: { marginTop: '4px' },
      text: 'You are reminded when there are ' + S.BACKUP.firstBackupWords +
        '+ unbacked words and no backup yet, or after ' + S.BACKUP.staleDays +
        ' days with ' + S.BACKUP.staleWords + '+ new words.' }));

    K.modal({
      title: 'Backup',
      body: body,
      actions: [
        { label: 'Close' },
        { label: 'Import a backup…', onClick: function () { FW.tools.importBackup(); } },
        {
          label: 'Back up now', variant: 'primary',
          onClick: function () { exportNow({ force: true }); }
        }
      ]
    });
  }

  /* ---------- wiring ---------- */
  var refresh = U.debounce(function () {
    var status = S.backupStatus();
    renderIndicator(status);
    renderBanner(status);
  }, 120);

  /* The indicator is mounted by the top bar as it is built; this wires up the
     banner and the refresh triggers once the rest of the shell exists. */
  function start(bannerTarget) {
    mountBanner(bannerTarget);

    S.on('tasks:changed', refresh);
    S.on('doc:saved', refresh);
    S.on('settings:changed', refresh);
    S.on('backup:changed', refresh);

    /* Writing does not fire a settings change, so re-check on a slow timer too. */
    setInterval(refresh, 60000);
    refresh();
  }

  FW.backup = {
    start: start, mountIndicator: mountIndicator, exportNow: exportNow,
    openPanel: openPanel, refresh: function () { refresh(); }, describe: describe
  };
})(window.FW);
