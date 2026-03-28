# Mipler v2 — Local OSINT Investigation Wall

> A fully **local**, **offline-first**, **Ollama-powered** OSINT investigation canvas.  
> No API keys. No cloud. No data leaves your machine.

---

## What's New in v2

| Change | Details |
|--------|---------|
| **Ollama only** | OpenAI and Custom API options have been completely removed. The app uses [Ollama](https://ollama.com) exclusively — free, local, private. |
| **File Analysis Panel** | Upload any file type (JSON, CSV, TXT, PDF, images, etc.), ask a natural-language question, and get an AI answer **plus a downloadable mindmap JSON**. |
| **Mindmap export** | After each file analysis, the AI generates a structured mindmap. Click **↓ JSON** to download it for external use or import into other tools. |
| **Two separate workspaces** | "Workspace A" and "Workspace B" are completely independent canvases. Importing a JSON into one workspace does **not** affect the other. |
| **Clear only active workspace** | "Clear Workspace" now only clears whichever workspace is currently active — the other is untouched. |
| **`start.sh`** | One-command launcher: checks Node.js version, installs deps, builds if needed, checks Ollama, and starts the server bound to `localhost` only. |
| **Security** | Server is hardcoded to bind `127.0.0.1` — it cannot be reached from other machines on your network. |

---

## Requirements

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **Ollama** — [ollama.com](https://ollama.com)
- A pulled Ollama model (e.g. `llama3`, `mistral`, `gemma2`)

No API keys. No internet connection required after initial model download.

---

## Quick Start

```bash
# 1. Clone or unzip Mipler
cd mipler-main

# 2. Start Ollama in a separate terminal (with CORS enabled)
OLLAMA_ORIGINS=* ollama serve

# 3. Pull a model (first time only)
ollama pull llama3

# 4. Start Mipler
bash start.sh
```

Then open your browser at **http://localhost:3000**

---

## What `start.sh` Does

The startup script handles everything automatically:

1. **Checks Node.js version** — exits with a clear message if below v18.
2. **Installs dependencies** — runs `npm install` only if `node_modules` is missing.
3. **Builds the app** — runs `npm run build` only if `dist/` is missing or source files are newer.
4. **Checks Ollama** — warns (but does not block) if Ollama is not running. Lists available models.
5. **Starts the server** — binds to `127.0.0.1:3000` (localhost only).

To use a different port:
```bash
PORT=8080 bash start.sh
```

---

## Features

### Investigation Canvases (Two Separate Workspaces)

Mipler starts with two workspaces: **Workspace A** and **Workspace B**. They are completely independent:

- Each workspace has its own nodes, edges, and viewport.
- Importing a JSON file into Workspace A does **not** merge into Workspace B.
- "Clear Workspace" only clears the currently active one.
- You can add more workspaces with **+ New Investigation** in the workspace picker.

**Switching workspaces:** Click the investigation name in the top-left toolbar to open the workspace picker.

### Cards You Can Add

| Button | Card Type | Description |
|--------|-----------|-------------|
| `N` | Note | Free-text note card |
| `Img` | Image | Paste or embed an image |
| `PDF` | PDF | Embed a PDF document |
| `WH` | WHOIS | WHOIS domain lookup |
| `DNS` | DNS | DNS record lookup |
| `RI` | Reverse Image | Reverse image search |
| `OS` | OSINT Framework | OSINT methodology viewer |
| `URL` | Custom URL | Embed any web tool in an iframe |

### AI File Analysis Panel

Click **AI** in the toolbar to open the File Analysis Panel.

1. **Upload files** — drag-and-drop or click to browse. All file types accepted:
   - JSON, CSV, TXT, MD, LOG, XML, YAML — read as text
   - PDF, images — metadata used; content summarized
   - Any other file — best-effort text read
2. **Ask a question** — type what you want to know from the files.
3. **Analyze** — Mipler sends the files and question to your local Ollama model.
4. **Get results:**
   - **Answer** — AI's written response to your question.
   - **Mindmap** — Interactive collapsible mindmap tree based on the analysis.
   - **↓ JSON** — Download the full mindmap + answer as a structured JSON file.

The downloaded JSON format:
```json
{
  "answer": "AI's written answer...",
  "mindmap": {
    "root": "Your question",
    "nodes": [
      {
        "id": "1",
        "label": "Main finding",
        "children": [
          { "id": "1-1", "label": "Sub-point", "children": [] }
        ]
      }
    ]
  }
}
```

### API Workspace (Ollama Chat)

Click **API** in the toolbar to open the Ollama chat workspace. This is a direct, conversation-style interface to your local Ollama model — useful for freeform OSINT queries, brainstorming, or research.

- **Chat tab** — send messages and get responses from Ollama.
- **Settings tab** — configure the Ollama URL and select from available models (auto-detected).

### Ollama Settings

Click the **⋮ menu → Ollama Settings** to configure:

- **Base URL** — default `http://localhost:11434`
- **Model** — default `llama3`; type any model name or choose from detected ones
- **Test Connection** — verifies Ollama is reachable

### Export & Import

- **Export** — saves the current workspace state as a `.json` file (all investigations, nodes, edges, AI history).
- **Import** — loads a workspace JSON. It loads into the **current active workspace** only — it does not overwrite other workspaces.
- **AI Mindmap export** — separate JSON download from the File Analysis Panel.

---

## Security

- **Localhost only** — The server is bound to `127.0.0.1`. It cannot be accessed from other devices.
- **No outbound network calls** — All AI requests go to your local Ollama instance. No data is sent to any cloud.
- **No API keys stored** — The v2 app does not ask for or store any API keys.
- **No persistent storage** — Workspace data lives in browser memory only. It is cleared when you close or refresh the tab. Use Export to save your work.
- **No telemetry** — Mipler does not collect, log, or transmit any usage data.

---

## Ollama Setup Guide

### Install Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download installer from https://ollama.com/download
```

### Start with CORS enabled (required for browser access)

```bash
OLLAMA_ORIGINS=* ollama serve
```

### Pull a model

```bash
ollama pull llama3      # Good general model (~4GB)
ollama pull mistral     # Fast, good quality (~4GB)
ollama pull gemma2      # Google's model (~5GB)
ollama pull phi3        # Lightweight (~2GB)
```

### Verify it's working

```bash
curl http://localhost:11434/api/tags
```

---

## Development

```bash
# Install dependencies
npm install

# Start dev server (hot-reload)
npm run dev

# Build for production
npm run build

# Serve production build
npm start
# or
bash start.sh
```

---

## Project Structure

```
mipler-main/
├── start.sh                        # One-command launcher
├── server.js                       # Express server (localhost only)
├── src/
│   ├── App.tsx                     # Root component
│   ├── components/
│   │   ├── FileAnalysisPanel.tsx   # NEW: file upload + AI analysis + mindmap
│   │   ├── ApiWorkspace.tsx        # Ollama chat workspace
│   │   ├── Toolbar.tsx             # Top toolbar
│   │   ├── WallCanvas.tsx          # ReactFlow canvas
│   │   ├── MiplerCardNode.tsx      # Card node renderer
│   │   ├── cards/                  # Individual card components
│   │   ├── edges/                  # Edge components
│   │   ├── modals/
│   │   │   ├── ApiSettingsModal.tsx  # Ollama settings (renamed)
│   │   │   ├── ExportModal.tsx
│   │   │   ├── ImportModal.tsx
│   │   │   └── ...
│   │   └── ui/                     # Button, Input, Modal
│   ├── store/
│   │   └── useWorkspaceStore.ts    # Zustand store (Ollama-only, 2 workspaces)
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   └── utils/
│       ├── aiApi.ts                # Ollama API calls + file analysis
│       ├── fileSystem.ts
│       └── osintApi.ts
└── README.md
```

---

## Troubleshooting

**"Ollama not detected"**
- Run `OLLAMA_ORIGINS=* ollama serve` in a terminal.
- Make sure the URL in Ollama Settings matches where Ollama is running.

**"Ollama error 404"**
- The model you specified may not be pulled yet. Run `ollama pull llama3`.

**"AI analysis returns no mindmap"**
- Try a smaller, faster model like `phi3` or `mistral`.
- Make sure your question is specific enough for the model to structure a response.

**Workspace data lost after refresh**
- This is by design — all data is in-memory. Use **Export** before closing the tab.

**Port already in use**
- Run `PORT=8080 bash start.sh`

---

## License

MIT — see `LICENSE`
