/**
 * bracket.js — BracketManager
 *
 * Handles all tournament data, bracket generation, winner
 * advancement, render, undo history, share, and export.
 *
 * Depends on: utils.js (must load first)
 */

'use strict';

/* ── Constants ────────────────────────────────────────────── */

var BRACKET_TYPE = { MAIN: 'main', LOSERS: 'losers', FINALS: 'finals' };
var SLOT         = { P1: 'p1', P2: 'p2' };
var MAX_TEAMS    = 64;
var MAX_HISTORY  = 40;

/* ── BracketManager ───────────────────────────────────────── */

var BM = (function () {

  /* ── Private state ──────────────────────────────────────── */
  var teams    = [];
  var bracket  = [];   // Winners / Main bracket
  var lBracket = [];   // Losers bracket
  var gfBracket= [];   // Grand Finals
  var type     = 'single';
  var history  = [];
  var renderScheduled = false;

  /* ── Array accessor ─────────────────────────────────────── */
  function arr(t) {
    if (t === BRACKET_TYPE.MAIN)   return bracket;
    if (t === BRACKET_TYPE.LOSERS) return lBracket;
    if (t === BRACKET_TYPE.FINALS) return gfBracket;
    return bracket;
  }

  function getMatch(t, r, m) { return arr(t)[r][m]; }

  /* ── Match factory ──────────────────────────────────────── */
  function newMatch(id, p1name, p2name) {
    return {
      id:     id,
      label:  '',
      winner: null,
      p1:     { name: p1name || null, score: '' },
      p2:     { name: p2name || null, score: '' },
    };
  }

  /* ── Undo history ───────────────────────────────────────── */
  function saveHistory() {
    history.push({
      b: deepClone(bracket),
      l: deepClone(lBracket),
      g: deepClone(gfBracket),
    });
    if (history.length > MAX_HISTORY) history.shift();
    $('btn-undo').style.opacity = '1';
  }

  /* ── Structure generation ───────────────────────────────── */
  function generate() {
    var count = teams.length;
    var size  = Math.pow(2, Math.ceil(Math.log2(count)));
    var half  = size / 2;

    // Round 1 — seed teams sequentially
    var round1 = [];
    for (var i = 0; i < half; i++) {
      round1.push(newMatch(
        'r0_m' + i,
        teams[i * 2]       || 'BYE',
        teams[i * 2 + 1]   || 'BYE'
      ));
    }
    bracket = [round1];

    // Subsequent rounds — empty placeholders
    var n = half, ri = 1;
    while (n > 1) {
      n /= 2;
      var round = [];
      for (var j = 0; j < n; j++) round.push(newMatch('r' + ri + '_m' + j));
      bracket.push(round);
      ri++;
    }

    applyMainLabels();

    if (type === 'double') {
      generateLB();
      generateGF();
    }

    processByes();
  }

  function applyMainLabels() {
    var total = bracket.length;
    bracket.forEach(function (round, r) {
      var fromEnd = total - 1 - r;
      round.forEach(function (m) {
        if (type === 'single') {
          if (fromEnd === 0) m.label = 'Grand Finals';
          else if (fromEnd === 1) m.label = 'Semi Finals';
          else if (fromEnd === 2) m.label = 'Quarter Finals';
        } else {
          if (fromEnd === 0) m.label = 'Winners Finals';
          else if (fromEnd === 1) m.label = 'Winners Semis';
          else if (fromEnd === 2) m.label = 'Winners QF';
        }
      });
    });
  }

  function generateLB() {
    lBracket = [];
    var wbRounds   = bracket.length;
    var size       = Math.pow(2, Math.ceil(Math.log2(teams.length)));
    var lbRndCount = Math.max(0, wbRounds * 2 - 2);
    var mc         = size / 4;

    for (var r = 0; r < lbRndCount; r++) {
      if (r > 0 && r % 2 === 0) mc /= 2;
      var round = [];
      for (var j = 0; j < mc; j++) round.push(newMatch('lb_r' + r + '_m' + j));
      lBracket.push(round);
    }

    var total = lBracket.length;
    lBracket.forEach(function (round, r) {
      var fromEnd = total - 1 - r;
      round.forEach(function (m) {
        if (fromEnd === 0) m.label = 'Losers Finals';
        else if (fromEnd === 1) m.label = 'Losers Semis';
        else if (fromEnd === 2) m.label = 'Losers QF';
      });
    });
  }

  function generateGF() {
    gfBracket = [[newMatch('gf_m0')]];
    gfBracket[0][0].label = 'Grand Finals';
  }

  function processByes() {
    bracket[0].forEach(function (m, i) {
      if (m.p2.name === 'BYE') advance(BRACKET_TYPE.MAIN, 0, i, SLOT.P1, true);
      else if (m.p1.name === 'BYE') advance(BRACKET_TYPE.MAIN, 0, i, SLOT.P2, true);
    });
  }

  /* ── Advancement ────────────────────────────────────────── */
  function advance(bracketType, rIdx, mIdx, winnerKey, silent) {
    var a  = arr(bracketType);
    var m  = a[rIdx][mIdx];
    var wn = m[winnerKey].name;
    var lk = winnerKey === SLOT.P1 ? SLOT.P2 : SLOT.P1;
    var ln = m[lk].name;
    m.winner = winnerKey;

    // Propagate winner forward
    var nextR = rIdx + 1;
    if (nextR < a.length) {
      var nextM, slot;
      if (bracketType === BRACKET_TYPE.LOSERS) {
        var cc = a[rIdx].length, nc = a[nextR].length;
        nextM = cc === nc ? mIdx : Math.floor(mIdx / 2);
        slot  = cc === nc ? SLOT.P1 : (mIdx % 2 === 0 ? SLOT.P1 : SLOT.P2);
      } else {
        nextM = Math.floor(mIdx / 2);
        slot  = mIdx % 2 === 0 ? SLOT.P1 : SLOT.P2;
      }
      updateParticipant(bracketType, nextR, nextM, slot, wn);
    } else {
      if (bracketType === BRACKET_TYPE.MAIN && type === 'double')
        updateParticipant(BRACKET_TYPE.FINALS, 0, 0, SLOT.P1, wn);
      if (bracketType === BRACKET_TYPE.LOSERS && type === 'double')
        updateParticipant(BRACKET_TYPE.FINALS, 0, 0, SLOT.P2, wn);
    }

    // Drop loser to LB in double elim
    if (bracketType === BRACKET_TYPE.MAIN && type === 'double' && ln) {
      dropLoserToLB(rIdx, mIdx, ln);
    }

    if (!silent) scheduleRender();
  }

  function dropLoserToLB(wbR, wbM, loserName) {
    var lbR = wbR === 0 ? 0 : wbR * 2 - 1;
    if (lbR >= lBracket.length) return;

    var lbM, lbSlot;
    if (lbR === 0) {
      lbM    = Math.floor(wbM / 2);
      lbSlot = wbM % 2 === 0 ? SLOT.P1 : SLOT.P2;
    } else {
      lbM    = wbM;
      lbSlot = SLOT.P2;
    }

    updateParticipant(BRACKET_TYPE.LOSERS, lbR, lbM, lbSlot, loserName);

    var mx     = lBracket[lbR][lbM];
    var oppKey = lbSlot === SLOT.P1 ? SLOT.P2 : SLOT.P1;

    if (loserName === 'BYE' && mx[oppKey].name && mx[oppKey].name !== 'BYE') {
      advance(BRACKET_TYPE.LOSERS, lbR, lbM, oppKey, true);
    } else if (loserName !== 'BYE' && mx[oppKey].name === 'BYE') {
      advance(BRACKET_TYPE.LOSERS, lbR, lbM, lbSlot, true);
    }
  }

  function updateParticipant(bracketType, rIdx, mIdx, slot, name) {
    var a = arr(bracketType);
    if (!a[rIdx] || !a[rIdx][mIdx]) return;
    var m = a[rIdx][mIdx];
    if (m[slot].name !== name) {
      m[slot].name  = name;
      m[slot].score = '';
      if (m.winner) resetFuture(bracketType, rIdx, mIdx);
    }
  }

  function resetFuture(bracketType, rIdx, mIdx) {
    var a  = arr(bracketType);
    var m  = a[rIdx][mIdx];
    var pw = m.winner;
    m.winner = null;
    if (!pw) return;

    var nextR = rIdx + 1;
    if (nextR < a.length) {
      var nextM, slot;
      if (bracketType === BRACKET_TYPE.LOSERS) {
        var cc = a[rIdx].length, nc = a[nextR].length;
        nextM = cc === nc ? mIdx : Math.floor(mIdx / 2);
        slot  = cc === nc ? SLOT.P1 : (mIdx % 2 === 0 ? SLOT.P1 : SLOT.P2);
      } else {
        nextM = Math.floor(mIdx / 2);
        slot  = mIdx % 2 === 0 ? SLOT.P1 : SLOT.P2;
      }
      updateParticipant(bracketType, nextR, nextM, slot, null);
    } else {
      if (bracketType === BRACKET_TYPE.MAIN && type === 'double')
        updateParticipant(BRACKET_TYPE.FINALS, 0, 0, SLOT.P1, null);
      if (bracketType === BRACKET_TYPE.LOSERS && type === 'double')
        updateParticipant(BRACKET_TYPE.FINALS, 0, 0, SLOT.P2, null);
    }

    // Reset loser drop path
    if (bracketType === BRACKET_TYPE.MAIN && type === 'double') {
      var lbR  = rIdx === 0 ? 0 : rIdx * 2 - 1;
      var lbM  = lbR === 0 ? Math.floor(mIdx / 2) : mIdx;
      var lbSl = lbR === 0 ? (mIdx % 2 === 0 ? SLOT.P1 : SLOT.P2) : SLOT.P2;
      if (lbR < lBracket.length)
        updateParticipant(BRACKET_TYPE.LOSERS, lbR, lbM, lbSl, null);
    }
  }

  /* ── Render ─────────────────────────────────────────────── */
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(function () {
      doRender();
      renderScheduled = false;
    });
  }

  function doRender() {
    var root = $('bracket-root');
    root.innerHTML = '';
    $('champ-area').innerHTML = '';

    renderSection(bracket,  type === 'double' ? 'Winners Bracket' : 'Bracket', BRACKET_TYPE.MAIN);

    if (type === 'double') {
      renderSection(lBracket,  'Losers Bracket', BRACKET_TYPE.LOSERS);
      renderSection(gfBracket, 'Grand Finals',   BRACKET_TYPE.FINALS);
    }

    renderChampion();
  }

  function renderSection(data, title, bt) {
    if (!data || !data.length) return;

    var section = mk('div');
    var label   = mk('div', 'section-label');
    label.textContent = title;
    section.appendChild(label);

    var row = mk('div', 'rounds-row');

    data.forEach(function (round, rIdx) {
      var col = mk('div', 'round-col');

      var hd = mk('div', 'round-header');
      hd.textContent = getRoundLabel(data, bt, rIdx);
      col.appendChild(hd);

      var maxMatches = data[0].length;
      var numMatches = round.length;
      var gap        = maxMatches / numMatches;

      round.forEach(function (match, mIdx) {
        var isHidden =
          (bt === BRACKET_TYPE.MAIN && rIdx === 0 &&
            (match.p1.name === 'BYE' || match.p2.name === 'BYE')) ||
          (match.p1.name === 'BYE' && match.p2.name === 'BYE');

        var wrap = mk('div', 'match-wrap');
        var marginTop = mIdx === 0 ? (gap - 1) * 28 : (gap - 1) * 56;
        wrap.style.marginTop = marginTop + 'px';

        var matchEl = mk('div', 'match');
        matchEl.setAttribute('draggable', 'true');
        matchEl.dataset.bt  = bt;
        matchEl.dataset.ri  = rIdx;
        matchEl.dataset.mi  = mIdx;
        if (isHidden) matchEl.style.visibility = 'hidden';

        // Label input
        var labelInput = mk('input');
        labelInput.className   = 'match-label';
        labelInput.value       = match.label || '';
        labelInput.placeholder = 'Match';
        matchEl.appendChild(labelInput);

        // Participants
        matchEl.appendChild(buildParticipant(match, SLOT.P1));
        matchEl.appendChild(buildParticipant(match, SLOT.P2));

        wrap.appendChild(matchEl);
        col.appendChild(wrap);
      });

      row.appendChild(col);
    });

    section.appendChild(row);
    $('bracket-root').appendChild(section);
  }

  function getRoundLabel(data, bt, rIdx) {
    if (bt === BRACKET_TYPE.FINALS) return 'Grand Finals';
    if (bt === BRACKET_TYPE.LOSERS) {
      var fe = data.length - 1 - rIdx;
      return fe === 0 ? 'Losers Finals' : 'LB Round ' + (rIdx + 1);
    }
    var teamsInRound = data[rIdx].length * 2;
    if (teamsInRound <= 2) return 'Final';
    if (teamsInRound <= 4) return 'Semi Finals';
    if (teamsInRound <= 8) return 'Quarter Finals';
    return 'Round of ' + teamsInRound;
  }

  function buildParticipant(match, slotKey) {
    var data = match[slotKey];
    var div  = mk('div', 'participant');
    div.dataset.slot = slotKey;
    div.setAttribute('draggable', 'true');

    if (match.winner === slotKey) div.classList.add('participant--win');
    if (match.winner && match.winner !== slotKey) div.classList.add('participant--lose');

    var crown = mk('span', 'participant__crown');
    crown.textContent = '🏆';

    var name = mk('span', 'participant__name');
    if (!data.name) {
      name.textContent = '—';
      name.classList.add('participant__name--placeholder');
    } else {
      name.textContent = data.name;
    }

    var score = document.createElement('input');
    score.className   = 'participant__score';
    score.type        = 'text';
    score.value       = data.score || '';
    score.placeholder = '–';
    score.addEventListener('click', function (e) { e.stopPropagation(); });

    div.appendChild(crown);
    div.appendChild(name);
    if (data.name && data.name !== 'BYE') div.appendChild(score);

    return div;
  }

  function renderChampion() {
    var name = null;

    if (type === 'single') {
      var lr = bracket[bracket.length - 1];
      if (lr && lr[0] && lr[0].winner) name = lr[0][lr[0].winner].name;
    } else {
      var gf = gfBracket[0] && gfBracket[0][0];
      if (gf && gf.winner) name = gf[gf.winner].name;
    }

    if (!name) return;

    var card   = mk('div', 'champion-card');
    var trophy = mk('div', 'champion-card__trophy');
    trophy.textContent = '🏆';

    var text  = mk('div', 'champion-card__text');
    var label = mk('div', 'champion-card__label');
    label.textContent = 'Champion';
    var nm = mk('div', 'champion-card__name');
    nm.textContent = name;

    text.appendChild(label);
    text.appendChild(nm);
    card.appendChild(trophy);
    card.appendChild(text);
    $('champ-area').appendChild(card);
  }

  /* ── Sidebar ────────────────────────────────────────────── */
  function renderSidebar() {
    var list = $('sidebar-list');
    list.innerHTML = '';
    teams.forEach(function (team) {
      var item = mk('div', 'sidebar__item');
      item.setAttribute('draggable', 'true');
      item.dataset.team = team;
      item.title        = team;
      item.textContent  = team;
      list.appendChild(item);
    });
  }

  /* ── Fit to screen ──────────────────────────────────────── */
  function fitToScreen() {
    var canvas = $('canvas-wrap');
    var root   = $('bracket-root');
    root.style.transform = 'scale(1)';
    requestAnimationFrame(function () {
      var cw = root.scrollWidth,  ch = root.scrollHeight;
      var vw = canvas.clientWidth - 56, vh = canvas.clientHeight - 56;
      var s  = Math.min(vw / cw, vh / ch, 1);
      root.style.transform = 'scale(' + (s * 0.96) + ')';
    });
  }

  /* ── Reset ──────────────────────────────────────────────── */
  function resetBracket() {
    function clearArr(a, isMain) {
      a.forEach(function (round, rIdx) {
        round.forEach(function (m) {
          m.winner    = null;
          m.p1.score  = '';
          m.p2.score  = '';
          if (!(isMain && rIdx === 0)) {
            m.p1.name = null;
            m.p2.name = null;
          }
        });
      });
    }
    clearArr(bracket,   true);
    clearArr(lBracket,  false);
    clearArr(gfBracket, false);
    processByes();
    scheduleRender();
  }

  /* ── Drag helpers ───────────────────────────────────────── */
  function swapTeams(s, t) {
    var sa   = arr(s.bt), ta = arr(t.bt);
    var sd   = sa[s.ri][s.mi][s.slot];
    var td   = ta[t.ri][t.mi][t.slot];
    var tmp  = sd.name;
    sd.name  = td.name;
    td.name  = tmp;
    resetFuture(s.bt, s.ri, s.mi);
    resetFuture(t.bt, t.ri, t.mi);
    processByes();
    scheduleRender();
  }

  function swapMatches(s, t) {
    var a  = arr(s.bt);
    var sm = a[s.ri][s.mi], tm = a[t.ri][t.mi];
    var tmp = { p1: sm.p1, p2: sm.p2, label: sm.label, winner: sm.winner };
    sm.p1 = tm.p1; sm.p2 = tm.p2; sm.label = tm.label; sm.winner = tm.winner;
    tm.p1 = tmp.p1; tm.p2 = tmp.p2; tm.label = tmp.label; tm.winner = tmp.winner;
    resetFuture(s.bt, s.ri, s.mi);
    resetFuture(t.bt, t.ri, t.mi);
    processByes();
    scheduleRender();
  }

  /* ── Share / Export ─────────────────────────────────────── */
  function serialize() {
    function collect(a, tp) {
      var out = [];
      a.forEach(function (round, rIdx) {
        round.forEach(function (m, mIdx) {
          if (m.winner || m.p1.score || m.p2.score || m.label) {
            out.push({
              tp: tp, ri: rIdx, mi: mIdx,
              w:  m.winner,
              s1: m.p1.score, s2: m.p2.score,
              l:  m.label,
            });
          }
        });
      });
      return out;
    }
    return {
      nm:  $('inp-name').value,
      tms: teams,
      tp:  type,
      ms:  [].concat(collect(bracket, 'main'), collect(lBracket, 'losers'), collect(gfBracket, 'finals')),
    };
  }

  function share() {
    var encoded = btoa(encodeURIComponent(JSON.stringify(serialize())));
    var url     = location.href.split('#')[0] + '#' + encoded;

    if (url.length > 8000) {
      showToast('Share URL too long — try fewer teams.', 'err');
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: $('tour-title').textContent,
        text:  'Check out my tournament bracket!',
        url:   url,
      }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        showToast('Link copied to clipboard!', 'ok');
      }).catch(function () {
        location.hash = encoded;
        showToast('URL updated — copy from address bar.', 'inf');
      });
    } else {
      location.hash = encoded;
      showToast('URL updated — copy from address bar.', 'inf');
    }
  }

  function restoreFromHash() {
    if (!location.hash || location.hash.length < 2) return;
    try {
      var state = JSON.parse(decodeURIComponent(atob(location.hash.substring(1))));
      $('inp-name').value  = state.nm  || '';
      $('inp-teams').value = state.tms.join('\n');
      $('inp-fmt').value   = state.tp;
      init();
      state.ms.forEach(function (mx) {
        var a = arr(mx.tp);
        if (!a || !a[mx.ri] || !a[mx.ri][mx.mi]) return;
        var m = a[mx.ri][mx.mi];
        m.p1.score = mx.s1 || '';
        m.p2.score = mx.s2 || '';
        if (mx.l) m.label = mx.l;
        if (mx.w) advance(mx.tp, mx.ri, mx.mi, mx.w, true);
      });
      scheduleRender();
    } catch (e) {
      console.warn('[Bracket] Failed to restore shared state:', e);
    }
  }

  function exportHTML() {
    var bHTML  = $('bracket-root').outerHTML;
    var cHTML  = $('champ-area').innerHTML;
    var name   = $('tour-title').textContent;
    var css    = document.querySelector('link[href="css/base.css"]')
                   ? '' // external — included via tags below
                   : (document.querySelector('style') ? document.querySelector('style').textContent : '');

    // Split closing tags to avoid confusing HTML parser
    var sc = '<' + '/style>';
    var hc = '<' + '/head>';
    var bc = '<' + '/body>';
    var xc = '<' + '/html>';

    var parts = [
      '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">',
      '<title>' + name + '</title>',
      '<style>' + css + sc,
      hc + '<body style="background:#09090e;color:#eeeef5;font-family:Segoe UI,system-ui,sans-serif;padding:28px">',
      '<h1 style="font-size:22px;font-weight:900;letter-spacing:2px;color:#f5c842;margin-bottom:20px;text-transform:uppercase">' + name + '</h1>',
      bHTML,
      cHTML ? '<div style="margin-top:16px">' + cHTML + '</div>' : '',
      bc + xc,
    ];

    var blob = new Blob([parts.join('\n')], { type: 'text/html' });
    var a    = document.createElement('a');
    a.href   = URL.createObjectURL(blob);
    a.download = name.replace(/\s+/g, '-').toLowerCase() + '.html';
    a.click();
    showToast('Bracket exported!', 'ok');
  }

  /* ── Public API ─────────────────────────────────────────── */

  function init() {
    var raw = $('inp-teams').value.trim();
    if (!raw) { $('f-teams').classList.add('err'); return; }
    $('f-teams').classList.remove('err');

    var seen = {}, parsed = [];
    raw.split('\n').forEach(function (t) {
      t = t.trim();
      if (t && !seen[t]) { seen[t] = 1; parsed.push(t); }
    });

    if (parsed.length < 2) { $('f-teams').classList.add('err'); return; }
    if (parsed.length > MAX_TEAMS) {
      showToast('Max ' + MAX_TEAMS + ' teams — extras trimmed.', 'err');
      parsed = parsed.slice(0, MAX_TEAMS);
    }

    if ($('inp-seed').value === 'rand') {
      for (var i = parsed.length - 1; i > 0; i--) {
        var j   = Math.floor(Math.random() * (i + 1));
        var tmp = parsed[i]; parsed[i] = parsed[j]; parsed[j] = tmp;
      }
    }

    teams    = parsed;
    type     = $('inp-fmt').value;
    history  = [];

    generate();
    renderSidebar();
    scheduleRender();
    showBracketView();
    setTimeout(fitToScreen, 50);

    var name = $('inp-name').value.trim() || 'Tournament Bracket';
    $('tour-title').textContent = name;
    $('tour-title').classList.add('on');
    $('btn-undo').style.opacity = '.4';
  }

  function showBracketView() {
    $('setup-screen').classList.add('hidden');
    $('bracket-screen').classList.remove('hidden');
    $('topbar-actions').classList.remove('hidden');
  }

  function showSetupView() {
    $('bracket-screen').classList.add('hidden');
    $('setup-screen').classList.remove('hidden');
    $('topbar-actions').classList.add('hidden');
  }

  function undo() {
    if (!history.length) { showToast('Nothing to undo.', 'inf'); return; }
    var snap  = history.pop();
    bracket   = snap.b;
    lBracket  = snap.l;
    gfBracket = snap.g;
    scheduleRender();
    $('btn-undo').style.opacity = history.length ? '1' : '.4';
    showToast('Undone.', 'ok');
  }

  /* ── Event handlers (attached by main.js) ───────────────── */

  function handleClick(e) {
    var pt = e.target.closest('.participant');
    if (!pt || e.target.tagName === 'INPUT') return;
    var matchEl = pt.closest('.match');
    if (!matchEl) return;

    var bt   = matchEl.dataset.bt;
    var ri   = +matchEl.dataset.ri;
    var mi   = +matchEl.dataset.mi;
    var slot = pt.dataset.slot;

    // Sidebar selection placement (mobile tap)
    var sel = $('sidebar-list').querySelector('.sidebar__item.sel');
    if (sel) {
      saveHistory();
      updateParticipant(bt, ri, mi, slot, sel.dataset.team);
      sel.classList.remove('sel');
      scheduleRender();
      return;
    }

    var data = getMatch(bt, ri, mi)[slot];
    if (data.name && data.name !== 'BYE') {
      saveHistory();
      advance(bt, ri, mi, slot);
      renderChampion();
    }
  }

  function handleInput(e) {
    var matchEl = e.target.closest('.match');
    if (!matchEl) return;
    var m = getMatch(matchEl.dataset.bt, +matchEl.dataset.ri, +matchEl.dataset.mi);
    if (e.target.classList.contains('participant__score')) {
      var pt = e.target.closest('.participant');
      if (pt) m[pt.dataset.slot].score = e.target.value;
    } else if (e.target.classList.contains('match-label')) {
      m.label = e.target.value;
    }
  }

  function handleDragStart(e) {
    var matchEl = e.target.closest('.match');
    if (!matchEl) return;

    if (e.target.classList.contains('match')) {
      setDragData(e, { dt: 'match', bt: matchEl.dataset.bt, ri: +matchEl.dataset.ri, mi: +matchEl.dataset.mi });
      e.dataTransfer.effectAllowed = 'move';
      e.target.classList.add('dra');
    } else {
      var pt = e.target.closest('.participant');
      if (!pt) return;
      var data = getMatch(matchEl.dataset.bt, +matchEl.dataset.ri, +matchEl.dataset.mi)[pt.dataset.slot];
      if (!data.name || data.name === 'BYE') { e.preventDefault(); return; }
      setDragData(e, { dt: 'pt', bt: matchEl.dataset.bt, ri: +matchEl.dataset.ri, mi: +matchEl.dataset.mi, slot: pt.dataset.slot });
      e.dataTransfer.effectAllowed = 'copy';
      pt.classList.add('dra');
    }
  }

  function handleDragOver(e) {
    var t = e.target.closest('.match, .participant');
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    t.classList.add('dov');
  }

  function handleDragLeave(e) {
    var t = e.target.closest('.match, .participant');
    if (t && !t.contains(e.relatedTarget)) t.classList.remove('dov');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    var t   = e.target.closest('.match, .participant');
    if (!t) return;
    t.classList.remove('dov');

    var src = getDragData(e);
    if (!src) return;

    if (src.dt === 'sidebar') {
      var pt = e.target.closest('.participant');
      if (!pt) return;
      var mel = pt.closest('.match');
      if (!mel) return;
      saveHistory();
      updateParticipant(mel.dataset.bt, +mel.dataset.ri, +mel.dataset.mi, pt.dataset.slot, src.team);
      scheduleRender();
      return;
    }

    if (src.dt === 'match' && t.classList.contains('match')) {
      if (src.bt === t.dataset.bt && src.ri === +t.dataset.ri && src.mi !== +t.dataset.mi) {
        saveHistory();
        swapMatches(src, { bt: t.dataset.bt, ri: +t.dataset.ri, mi: +t.dataset.mi });
      }
    } else if (src.dt === 'pt' && t.classList.contains('participant')) {
      var mel2 = t.closest('.match');
      var ts   = t.dataset.slot;
      if (src.bt === mel2.dataset.bt && src.ri === +mel2.dataset.ri && src.mi === +mel2.dataset.mi && src.slot === ts) return;
      saveHistory();
      swapTeams(src, { bt: mel2.dataset.bt, ri: +mel2.dataset.ri, mi: +mel2.dataset.mi, slot: ts });
    }
  }

  /* ── Expose public API ──────────────────────────────────── */
  return {
    init:            init,
    showSetupView:   showSetupView,
    undo:            undo,
    resetBracket:    resetBracket,
    fitToScreen:     fitToScreen,
    share:           share,
    exportHTML:      exportHTML,
    restoreFromHash: restoreFromHash,
    saveHistory:     saveHistory,
    // Event handlers
    handleClick:     handleClick,
    handleInput:     handleInput,
    handleDragStart: handleDragStart,
    handleDragOver:  handleDragOver,
    handleDragLeave: handleDragLeave,
    handleDrop:      handleDrop,
  };

}());
