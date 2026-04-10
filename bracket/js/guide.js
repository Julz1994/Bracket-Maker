/**
 * guide.js — Interactive guided tour
 *
 * Renders a step-by-step spotlight walkthrough over the UI.
 * Depends on: utils.js
 */

'use strict';

var Guide = (function () {

  var step   = 0;
  var active = false;

  /* ── Step definitions ─────────────────────────────────── */

  var SETUP_STEPS = [
    {
      sel:   '#inp-name',
      arrow: 'top',
      title: 'Tournament Name',
      body:  'Give your tournament a name. It appears in the header and in any shared links.',
    },
    {
      sel:   '#inp-fmt',
      arrow: 'top',
      title: 'Choose a Format',
      body:  'Single Elimination: one loss and you are out. Double Elimination: losers get a second chance in a separate bracket before being eliminated.',
    },
    {
      sel:   '#inp-seed',
      arrow: 'top',
      title: 'Seeding',
      body:  '"As entered" keeps your list order. "Randomize" shuffles the draw — great for casual events.',
    },
    {
      sel:   '#inp-teams',
      arrow: 'top',
      title: 'Enter Your Teams',
      body:  'One team name per line, up to 64. Duplicates are removed automatically. Byes are inserted if the count is not a power of 2.',
    },
    {
      sel:   '#btn-create',
      arrow: 'top',
      title: 'Create the Bracket',
      body:  'Click this when ready. Your bracket is generated instantly — no sign-up or account required.',
    },
  ];

  var BRACKET_STEPS = [
    {
      sel:   '#sidebar',
      arrow: 'left',
      title: 'Teams Panel',
      body:  'All your teams are listed here. Drag a team onto any bracket slot, or tap to select it (turns gold) then tap a slot to place it.',
    },
    {
      sel:   null,
      arrow: 'none',
      title: 'Click to Advance',
      body:  'Click a team name inside a match card to declare them the winner. They turn green and automatically move to the next round.',
    },
    {
      sel:   null,
      arrow: 'none',
      title: 'Score Inputs',
      body:  'Each team row has a small score box on the right edge. Type the match score there — it is for records only and does not affect who advances.',
    },
    {
      sel:   null,
      arrow: 'none',
      title: 'Drag and Drop',
      body:  'Drag a team slot to swap two teams. Drag an entire match card to swap two matchups within the same round. Useful for reseeding.',
    },
    {
      sel:   '#btn-undo',
      arrow: 'bottom',
      title: 'Undo',
      body:  'Clicked the wrong winner? Undo reverses your last action. Up to 40 steps of history are saved.',
    },
    {
      sel:   '#btn-reset',
      arrow: 'bottom',
      title: 'Reset Predictions',
      body:  'Clears all winners and scores but keeps the initial team matchups. A confirmation dialog will appear first.',
    },
    {
      sel:   '#btn-fit',
      arrow: 'bottom',
      title: 'Fit to Screen',
      body:  'Large brackets can extend off screen. Hit Fit to scale everything down so every round is visible at once.',
    },
    {
      sel:   '#btn-export',
      arrow: 'bottom',
      title: 'Export',
      body:  'Downloads a standalone HTML file of your current bracket — works fully offline, no internet required.',
    },
    {
      sel:   '#btn-share',
      arrow: 'bottom',
      title: 'Share',
      body:  'Encodes the full bracket state into a URL. Anyone who opens it sees your exact bracket with all predictions intact.',
    },
  ];

  function getSteps() {
    return $('bracket-screen').classList.contains('hidden')
      ? SETUP_STEPS
      : BRACKET_STEPS;
  }

  /* ── Public controls ──────────────────────────────────── */

  function openIntro()  { $('guide-intro').classList.add('open'); }
  function closeIntro() { $('guide-intro').classList.remove('open'); }

  function start() {
    active = true;
    step   = 0;
    $('guide-backdrop').classList.add('on');
    show();
  }

  function end() {
    active = false;
    $('guide-backdrop').classList.remove('on');
    $('guide-spotlight').classList.remove('pulse');
    $('guide-spotlight').style.display = '';
    // Restore lifted elements
    document.querySelectorAll('[data-guide-lift]').forEach(function (el) {
      el.style.position = '';
      el.style.zIndex   = '';
      el.removeAttribute('data-guide-lift');
    });
  }

  function next() {
    var steps = getSteps();
    if (step < steps.length - 1) { step++; show(); }
    else end();
  }

  function prev() {
    if (step > 0) { step--; show(); }
  }

  /* ── Rendering ────────────────────────────────────────── */

  function show() {
    var steps  = getSteps();
    var s      = steps[step];
    var total  = steps.length;
    var isLast = step === total - 1;

    // Text content
    $('guide-badge').textContent = 'Step ' + (step + 1) + ' of ' + total;
    $('guide-head').textContent  = s.title;
    $('guide-body').textContent  = s.body;
    $('guide-next-btn').textContent  = isLast ? 'Finish ✓' : 'Next →';
    $('guide-prev-btn').style.visibility = step === 0 ? 'hidden' : 'visible';

    // Progress dots
    var dotsEl = $('guide-dots');
    dotsEl.innerHTML = '';
    steps.forEach(function (_, i) {
      var dot = mk('div', 'guide-dot' + (i === step ? ' on' : ''));
      dot.dataset.i = i;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', i === step ? 'true' : 'false');
      dotsEl.appendChild(dot);
    });

    // Arrow class on tooltip
    var tip       = $('guide-tooltip');
    var arrowClass = 'guide-tooltip--' + (s.arrow || 'none');
    tip.className  = 'guide-tooltip ' + arrowClass;

    // Spotlight and position
    if (s.sel) {
      var target = document.querySelector(s.sel);
      if (target) {
        liftElement(target);
        positionSpotlight(target);
        positionTooltipNear(target, s.arrow);
        $('guide-spotlight').style.display = '';
        $('guide-spotlight').classList.add('pulse');
        return;
      }
    }

    // No target — center tooltip, hide spotlight
    $('guide-spotlight').style.display = 'none';
    $('guide-spotlight').classList.remove('pulse');
    centerTooltip();
  }

  /* ── Positioning helpers ──────────────────────────────── */

  function liftElement(el) {
    // Restore previously lifted element
    document.querySelectorAll('[data-guide-lift]').forEach(function (e) {
      e.style.position = '';
      e.style.zIndex   = '';
      e.removeAttribute('data-guide-lift');
    });
    // Lift the new target above the backdrop (z-index 50001)
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.zIndex = '50003';
    el.setAttribute('data-guide-lift', '1');
  }

  function positionSpotlight(el) {
    var pad = 8;
    var r   = el.getBoundingClientRect();
    var sp  = $('guide-spotlight');
    sp.style.top    = (r.top    - pad) + 'px';
    sp.style.left   = (r.left   - pad) + 'px';
    sp.style.width  = (r.width  + pad * 2) + 'px';
    sp.style.height = (r.height + pad * 2) + 'px';
  }

  function positionTooltipNear(el, arrow) {
    var gap = 12;
    var tip = $('guide-tooltip');
    var r   = el.getBoundingClientRect();
    var tw  = 290;
    var th  = tip.offsetHeight || 190;
    var vw  = window.innerWidth;
    var vh  = window.innerHeight;
    var top, left;

    if (arrow === 'top')    { top = r.bottom + gap; left = r.left; }
    else if (arrow === 'bottom') { top = r.top - th - gap; left = r.left; }
    else if (arrow === 'left')   { top = r.top; left = r.right + gap; }
    else { centerTooltip(); return; }

    left = Math.max(12, Math.min(left, vw - tw - 12));
    top  = Math.max(12, Math.min(top,  vh - th - 12));

    tip.style.top  = top  + 'px';
    tip.style.left = left + 'px';
  }

  function centerTooltip() {
    var tip = $('guide-tooltip');
    var tw  = 290;
    var th  = tip.offsetHeight || 200;
    tip.style.top  = Math.max(12, (window.innerHeight - th) / 2) + 'px';
    tip.style.left = Math.max(12, (window.innerWidth  - tw) / 2) + 'px';
  }

  /* ── Event binding ────────────────────────────────────── */

  function bind() {
    $('btn-guide').addEventListener('click', openIntro);
    $('guide-start-btn').addEventListener('click', function () { closeIntro(); start(); });
    $('guide-skip-btn').addEventListener('click', closeIntro);

    $('guide-next-btn').addEventListener('click', next);
    $('guide-prev-btn').addEventListener('click', prev);
    $('guide-close-btn').addEventListener('click', end);

    // Click on backdrop (outside tooltip) → end tour
    $('guide-backdrop').addEventListener('click', function (e) {
      if (!$('guide-tooltip').contains(e.target)) end();
    });

    // Dot navigation
    $('guide-dots').addEventListener('click', function (e) {
      var dot = e.target.closest('.guide-dot');
      if (dot) { step = +dot.dataset.i; show(); }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
      if (!active) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'Escape')     end();
    });
  }

  /* ── Public API ───────────────────────────────────────── */
  return {
    bind: bind,
  };

}());
