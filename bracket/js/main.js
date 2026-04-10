/**
 * main.js — Application bootstrap and event wiring
 *
 * Wires all DOM events to BracketManager and Guide.
 * Runs after utils.js, bracket.js, and guide.js are loaded.
 */

'use strict';

(function () {

  /* ── Topbar actions ───────────────────────────────────── */

  $('btn-create').addEventListener('click', function () {
    BM.init();
  });

  $('btn-edit').addEventListener('click', function () {
    BM.showSetupView();
  });

  $('btn-undo').addEventListener('click', function () {
    BM.undo();
  });

  $('btn-reset').addEventListener('click', function () {
    showConfirm(
      'Reset Predictions',
      'This will clear all winners and scores, but keep the initial team matchups.'
    ).then(function (confirmed) {
      if (confirmed) {
        BM.saveHistory();
        BM.resetBracket();
        showToast('Predictions reset.', 'inf');
      }
    });
  });

  $('btn-fit').addEventListener('click', function () {
    BM.fitToScreen();
  });

  $('btn-share').addEventListener('click', function () {
    BM.share();
  });

  $('btn-export').addEventListener('click', function () {
    BM.exportHTML();
  });

  /* ── Setup form ───────────────────────────────────────── */

  $('inp-teams').addEventListener('input', function () {
    var n = $('inp-teams').value.trim()
      .split('\n')
      .filter(function (t) { return t.trim(); })
      .length;
    $('team-count').textContent = '(' + n + ' entered)';
  });

  /* ── Sidebar ──────────────────────────────────────────── */

  $('sidebar-search').addEventListener('input', function () {
    var query = this.value.toLowerCase();
    $('sidebar-list').querySelectorAll('.sidebar__item').forEach(function (item) {
      item.style.display = item.dataset.team.toLowerCase().includes(query) ? '' : 'none';
    });
  });

  $('sidebar-list').addEventListener('click', function (e) {
    var item = e.target.closest('.sidebar__item');
    if (!item) return;
    var wasSelected = item.classList.contains('sel');
    // Deselect all
    $('sidebar-list').querySelectorAll('.sidebar__item').forEach(function (i) {
      i.classList.remove('sel');
    });
    // Toggle selected state
    if (!wasSelected) item.classList.add('sel');
  });

  $('sidebar-list').addEventListener('dragstart', function (e) {
    var item = e.target.closest('.sidebar__item');
    if (!item) return;
    setDragData(e, { dt: 'sidebar', team: item.dataset.team });
    e.dataTransfer.effectAllowed = 'copy';
  });

  /* ── Bracket canvas ───────────────────────────────────── */

  var broot = $('bracket-root');

  broot.addEventListener('click',     function (e) { BM.handleClick(e);     });
  broot.addEventListener('input',     function (e) { BM.handleInput(e);     });
  broot.addEventListener('dragstart', function (e) { BM.handleDragStart(e); });
  broot.addEventListener('dragover',  function (e) { BM.handleDragOver(e);  });
  broot.addEventListener('dragleave', function (e) { BM.handleDragLeave(e); });
  broot.addEventListener('drop',      function (e) { BM.handleDrop(e);      });

  // Global drag cleanup
  document.addEventListener('dragend', function () {
    document.querySelectorAll('.dra').forEach(function (el) { el.classList.remove('dra'); });
    document.querySelectorAll('.dov').forEach(function (el) { el.classList.remove('dov'); });
  });

  /* ── Guide ────────────────────────────────────────────── */
  Guide.bind();

  /* ── Boot ─────────────────────────────────────────────── */
  BM.restoreFromHash();

}());

  /* ── Offline download button ──────────────────────────────── */
  Downloader.bind();
