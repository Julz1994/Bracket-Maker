/**
 * download.js — Offline bundle generator
 *
 * Reads all linked CSS and JS files from the current page,
 * inlines them into a single self-contained HTML file, and
 * triggers a download named "BracketMaker.html".
 *
 * Depends on: nothing (runs standalone, no utils.js needed at call time)
 */

'use strict';

var Downloader = (function () {

  /**
   * Fetch a local file as text.
   * Falls back gracefully if fetch is unavailable.
   * @param {string} url
   * @returns {Promise<string>}
   */
  function fetchText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + url);
      return r.text();
    });
  }

  /**
   * Collect all <link rel="stylesheet"> hrefs in document order.
   * @returns {string[]}
   */
  function getCSSUrls() {
    var sheets = document.querySelectorAll('link[rel="stylesheet"]');
    return Array.prototype.map.call(sheets, function (el) {
      return el.getAttribute('href');
    });
  }

  /**
   * Collect all <script src="..."> srcs in document order,
   * excluding this file itself.
   * @returns {string[]}
   */
  function getJSUrls() {
    var scripts = document.querySelectorAll('script[src]');
    return Array.prototype.map.call(scripts, function (el) {
      return el.getAttribute('src');
    }).filter(function (src) {
      return src.indexOf('download.js') === -1;
    });
  }

  /**
   * Build the full standalone HTML string with all CSS and JS inlined.
   * @param {string} allCSS
   * @param {string} allJS
   * @returns {string}
   */
  function buildHTML(allCSS, allJS) {
    // Get the current body HTML, stripping external link/script tags
    var bodyHTML = document.body.innerHTML;

    // Remove the download button itself — not needed in the offline copy
    bodyHTML = bodyHTML.replace(/<button[^>]*id="btn-download"[^>]*>[\s\S]*?<\/button>/gi, '');

    // Split closing tags to avoid confusing the HTML parser mid-script
    var sc = '<' + '/style>';
    var ss = '<' + '/script>';
    var bc = '<' + '/body>';
    var xc = '<' + '/html>';

    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="UTF-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '  <title>BracketMaker</title>',
      '  <style>',
      allCSS,
      sc,
      '</head>',
      '<body>',
      bodyHTML,
      '<script>',
      allJS,
      ss,
      bc,
      xc,
    ].join('\n');
  }

  /**
   * Trigger a file download in the browser.
   * @param {string} content
   * @param {string} filename
   */
  function triggerDownload(content, filename) {
    var blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  /**
   * Main entry point — fetch all assets, build bundle, download.
   * @returns {Promise<void>}
   */
  function downloadOffline() {
    var btn = document.getElementById('btn-download');
    if (btn) {
      btn.disabled     = true;
      btn.textContent  = '⏳ Bundling…';
    }

    var cssUrls = getCSSUrls();
    var jsUrls  = getJSUrls();

    var cssPromises = cssUrls.map(fetchText);
    var jsPromises  = jsUrls.map(fetchText);

    Promise.all(cssPromises).then(function (cssFiles) {
      return Promise.all(jsPromises).then(function (jsFiles) {
        var allCSS = cssFiles.join('\n\n/* ─────────────────────────────── */\n\n');
        var allJS  = jsFiles.join('\n\n/* ─────────────────────────────── */\n\n');
        var html   = buildHTML(allCSS, allJS);
        triggerDownload(html, 'BracketMaker.html');

        if (btn) {
          btn.disabled    = false;
          btn.textContent = '↓ Download Offline App';
        }

        // Show toast if available
        if (typeof showToast === 'function') {
          showToast('BracketMaker.html downloaded!', 'ok');
        }
      });
    }).catch(function (err) {
      console.error('[Downloader]', err);
      if (btn) {
        btn.disabled    = false;
        btn.textContent = '↓ Download Offline App';
      }
      if (typeof showToast === 'function') {
        showToast('Download failed — try running from a server.', 'err');
      } else {
        alert('Download failed. Make sure you are running this from a web server (not directly from the file system).');
      }
    });
  }

  /* ── Bind button ──────────────────────────────────────────── */
  function bind() {
    var btn = document.getElementById('btn-download');
    if (btn) {
      btn.addEventListener('click', downloadOffline);
    }
  }

  return { bind: bind };

}());
