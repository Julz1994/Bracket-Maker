# Bracket Predictor

A fast, offline-capable tournament bracket generator with single and double elimination support. No dependencies, no sign-up, no server — just open `index.html` and go.

![Bracket Predictor](https://img.shields.io/badge/version-2.0.0-gold) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

- **Single & Double Elimination** — full losers bracket with correct drop logic
- **Click to advance** — click a team name to declare the winner; they propagate automatically
- **Drag & drop** — rearrange teams or entire match cards within a round
- **Score tracking** — optional score inputs per match, stored with the bracket
- **Undo** — up to 40 steps of history
- **Shareable URL** — the entire bracket state is encoded in the hash; share the link with anyone
- **Export** — download a standalone `.html` snapshot that works offline
- **Interactive guide** — step-by-step spotlight tour covering every feature
- **No external dependencies** — zero npm packages, zero CDN requests, works fully offline

---

## Project Structure

```
bracket/
├── index.html          # App shell — markup only, no inline JS or CSS
├── css/
│   ├── base.css        # Design tokens, reset, buttons, forms, toasts, modal
│   ├── layout.css      # Topbar, setup screen, sidebar, canvas layout
│   ├── bracket.css     # Match cards, participants, sections, champion
│   └── guide.css       # Guided tour overlay, spotlight, tooltip
└── js/
    ├── utils.js        # Shared helpers: $, mk, deepClone, showToast, showConfirm, drag data
    ├── bracket.js      # BracketManager — all data logic and rendering (IIFE, no globals)
    ├── guide.js        # Guide — step-by-step spotlight tour (IIFE, no globals)
    └── main.js         # Bootstrap — wires all DOM events, loads last
```

---

## Getting Started

### Local (offline)

1. Clone or download the repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
3. No build step, no server required

### GitHub Pages

1. Push the repository to GitHub
2. Go to **Settings → Pages → Source → main branch / root**
3. Your bracket will be live at `https://<username>.github.io/<repo>/`

---

## How to Use

### Setup

1. Enter a **Tournament Name** (optional — used in exports and share links)
2. Choose a **Format** — Single or Double Elimination
3. Choose **Seeding** — keep your entry order, or randomize
4. Enter **Team Names**, one per line (max 64)
5. Click **Create Bracket**

### Making Predictions

| Action | How |
|---|---|
| Advance a team | Click their name in a match card |
| Enter a score | Click the small score box on the right of each team row |
| Rearrange teams | Drag a team slot onto another team slot to swap |
| Rearrange matches | Drag a match card onto another in the same round |
| Place from sidebar | Tap a team in the sidebar (turns gold), then tap a bracket slot |

### Toolbar

| Button | Action |
|---|---|
| **Guide** | Opens the interactive step-by-step tour |
| **Edit** | Returns to the setup screen |
| **Undo** | Reverses the last action (up to 40 steps) |
| **Reset** | Clears all winners and scores (with confirmation) |
| **Fit** | Scales the bracket to fit your screen |
| **Export** | Downloads a standalone `.html` snapshot |
| **Share** | Copies a shareable URL with the full bracket state encoded |

---

## Browser Support

Any modern browser with ES5+ support:

- Chrome 60+
- Firefox 60+
- Edge 79+
- Safari 12+

---

## License

MIT — see [LICENSE](LICENSE) for details.

Copyright © 2026 Julleven Mendoza
