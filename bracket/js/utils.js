/**
 * utils.js — Shared helper functions
 * All exports are attached to window so sibling scripts can use them.
 */

'use strict';

/* ── DOM helpers ──────────────────────────────────────────── */

/**
 * Shorthand for document.getElementById.
 * @param {string} id
 * @returns {HTMLElement}
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * Create a DOM element with an optional class name.
 * @param {string} tag
 * @param {string} [cls]
 * @returns {HTMLElement}
 */
function mk(tag, cls) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

/**
 * Deep-clone a JSON-serialisable object.
 * @param {*} obj
 * @returns {*}
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ── Toast notifications ──────────────────────────────────── */

/**
 * Show a transient toast message.
 * @param {string} msg
 * @param {'ok'|'err'|'inf'} [type='inf']
 * @param {number} [duration=2800] ms before auto-remove
 */
function showToast(msg, type, duration) {
  var t = mk('div', 'toast toast--' + (type || 'inf'));
  t.textContent = msg;
  $('toast-container').appendChild(t);
  setTimeout(function () { t.remove(); }, duration || 2800);
}

/* ── Confirm modal ────────────────────────────────────────── */

/**
 * Show a confirmation modal and return a Promise<boolean>.
 * @param {string} title
 * @param {string} body
 * @returns {Promise<boolean>}
 */
function showConfirm(title, body) {
  return new Promise(function (resolve) {
    $('modal-title').textContent = title;
    $('modal-body').textContent  = body;
    $('modal').classList.add('open');

    function yes() { cleanup(); resolve(true);  }
    function no()  { cleanup(); resolve(false); }

    function cleanup() {
      $('modal').classList.remove('open');
      $('modal-yes').removeEventListener('click', yes);
      $('modal-no').removeEventListener('click',  no);
    }

    $('modal-yes').addEventListener('click', yes);
    $('modal-no').addEventListener('click',  no);

    // Close on backdrop click
    $('modal').addEventListener('click', function onBd(e) {
      if (e.target === $('modal')) { no(); $('modal').removeEventListener('click', onBd); }
    });
  });
}

/* ── DataTransfer helper ──────────────────────────────────── */

/**
 * Set drag data with a safe fallback for older browsers.
 * @param {DragEvent} e
 * @param {*} data - Will be JSON.stringified
 */
function setDragData(e, data) {
  var str = JSON.stringify(data);
  try {
    e.dataTransfer.setData('text/plain', str);
  } catch (_) {
    e.dataTransfer.setData('text', str);
  }
}

/**
 * Get drag data, trying both MIME types.
 * @param {DragEvent} e
 * @returns {*|null} Parsed object or null
 */
function getDragData(e) {
  var raw = '';
  try { raw = e.dataTransfer.getData('text/plain'); } catch (_) {}
  if (!raw) { try { raw = e.dataTransfer.getData('text'); } catch (_) {} }
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}
