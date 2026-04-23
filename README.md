# Mipler — Swarm Investigation + Personal Assistant

> A swarm-based investigation wall plus a persistent personal AI assistant.  
> Local-first storage, encrypted provider keys, model-provider switching, and scheduled automation.


---

## Requirements

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **Ollama** for local-only use, or API keys for OpenAI / Anthropic / OpenRouter.

Cloud providers are optional. Local Ollama still works without external APIs.

---

## Quick Start

```bash
# 1. Clone or unzip Mipler
cd mipler-main

# 2. Install once
npm install

# 3. Optional: make the launcher global
npm install -g .

# 4. Start Mipler
mipler
```

If you do not want the global command, run `npm start` inside the project folder instead.

On Windows, `npm install -g .` creates the `mipler.cmd` launcher automatically. For a local repo checkout you can also run `start.cmd`.

Then open your browser at **http://localhost:3000**

---

## What The Launcher Does

The `mipler` launcher handles everything automatically:

1. **Checks Node.js version** — exits with a clear message if below v18.
2. **Installs dependencies** — runs `npm install` only if `node_modules` is missing.
3. **Builds the app** — runs `npm run build` when a rebuild is needed and build tooling is available.
4. **Starts the Python backend** — launches `backend.api.server` automatically when Python + FastAPI are installed.
5. **Starts the frontend server** — binds to `127.0.0.1:3000` (localhost only).

To use a different port:
```bash
PORT=8080 mipler
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

### API Workspace (Ollama Chat)

Click **API** in the toolbar to open the Ollama chat workspace. This is a direct, conversation-style interface to your local Ollama model — useful for freeform OSINT queries, brainstorming, or research.

- **Chat tab** — send messages and get responses from Ollama.
- **Settings tab** — configure the Ollama URL and select from available models (auto-detected).

### Assistant Settings

Click the **⋮ menu → Assistant Settings** to configure:

- **Provider** — `ollama`, `openai`, `anthropic`, or `openrouter`
- **Base URL** — optional override per provider
- **Model** — any model ID supported by the provider
- **API key** — encrypted in backend local storage

### Export & Import

- **Export** — saves the current workspace state as a `.json` file (all investigations, nodes, edges, AI history).
- **Import** — loads a workspace JSON. It loads into the **current active workspace** only — it does not overwrite other workspaces.
- **AI Mindmap export** — separate JSON download from the File Analysis Panel.

---

## Troubleshooting

**"Ollama not detected"**
- Run `OLLAMA_ORIGINS=* ollama serve` in a terminal.
- Make sure the URL in Assistant Settings matches where Ollama is running.

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
