<div align=center>
<img src=image/mipler.png>


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  [![TypeScript](https://img.shields.io/badge/TypeScript-✓-3178C6?logo=typescript)](https://www.typescriptlang.org/)  [![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)

</div>

---

># Mipler — Investigation Wall

## Features

- **Multi-investigation** — create multiple canvases, rename, combine
- **Card types** — Note, Image, PDF, WHOIS, DNS, Reverse Image, OSINT Framework, Custom URL
- **Easy connections** — handles on all 4 sides of every card, outside the card border
- **Card colors** — click the dot in the card header to change color
- **Connection styles** — double-click any edge to change color, pattern, weight
- **Undo** — Ctrl+Z (or the undo button) steps back mistakes
- **API Workspace** — VSCode-style JS editor with console output + AI chat panel
- **AI Assistant** — OpenAI or Anthropic integration
- **Dot grid** — n8n-style background, togglable
- **Export / Import** — full JSON export includes everything: all investigations, API keys, AI chat history
- **Fresh start** — every new page load is a clean slate (nothing persists in localStorage)

## Getting Started

```bash
npm install
npm run dev
```

## Build for production

```bash
npm run build
npm start
```

## Connecting cards

Each card has 4 connection handles — top, bottom, left, right — positioned **outside** the card border so they're easy to grab without focusing the card first. Drag from any handle to any other handle to create a connection. Double-click any connection line to style it.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Ctrl+Z | Undo |
| Backspace / Delete | Delete selected card or connection |
| Scroll | Zoom canvas |
| Click + drag canvas | Pan |

## Export & Import

Export saves a single JSON file containing every investigation, all card data, edge styles, API keys, and AI history. Import replaces the current workspace with the imported file — everything comes back exactly as left.
