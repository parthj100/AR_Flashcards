# Lens prototype — running the real pipeline

The scan view now runs real inference:

- **CLIP (Xenova/clip-vit-base-patch32)** via [Transformers.js](https://huggingface.co/docs/transformers.js/en/index) in the browser for object recognition. Model weights (~150 MB) download on first load and are cached by the browser afterward.
- **Ollama + Phi-3-mini** on your machine for on-demand flashcard generation. Totally free, runs locally.

Everything else in the UI still works from mock data, so the prototype is useful even without Ollama running.

---

## One-time setup

### 1. Install Ollama

macOS / Windows: download from [ollama.com](https://ollama.com/download).

Linux:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull the model

```bash
ollama pull phi3:mini
```

Other models that work with the same prompt/schema (swap in `prototype/lib/llm.js`):

| Model          | Size    | Notes                                          |
|----------------|---------|------------------------------------------------|
| `phi3:mini`    | 2.3 GB  | Default. Balanced speed/quality.               |
| `llama3.2:3b`  | 2.0 GB  | Often slightly better at structured JSON.      |
| `gemma2:2b`    | 1.6 GB  | Smallest. Fastest. Good for short explanations.|

### 3. Start Ollama with CORS enabled

The browser will be making requests to `http://localhost:11434` from `http://localhost:5500` (or wherever you serve the prototype). Ollama blocks cross-origin requests by default, so set `OLLAMA_ORIGINS`:

**macOS / Linux:**
```bash
OLLAMA_ORIGINS='*' ollama serve
```

**Windows (PowerShell):**
```powershell
$env:OLLAMA_ORIGINS="*"
ollama serve
```

If Ollama is already running as a background service, stop it first (`killall ollama` on Unix, or quit from the tray icon on Mac/Windows) before running `ollama serve` with the env var — otherwise the new setting has no effect.

> For a stricter setup, replace `*` with the exact origin you're serving from, e.g. `http://localhost:5500`.

---

## Running the prototype

The prototype is static HTML/JS — no build step — but **must be served over http:// or https://**, not opened as a `file://` URL. Browsers block camera access and ES module CORS for file URLs.

Pick any static server. From the repo root:

```bash
# Python (installed on most systems)
python3 -m http.server 5500 --directory prototype

# or npx
npx serve prototype -p 5500

# or VS Code: right-click prototype/index.html → "Open with Live Server"
```

Then open <http://localhost:5500>. Grant camera permission when prompted.

---

## What you should see

1. Click **New scan** (top of the sidebar) or press ⌘S.
2. Top-right of the dark scan view shows two pills:
   - **CLIP · webgpu** (or **wasm**) once the model loads. First run downloads ~150 MB.
   - **Phi-3 · ready** once Ollama is reachable with the configured model.
3. The right-hand panel shows the live top match, cosine score, and inference latency per frame.
4. Aim at any recognizable object from the vocabulary (see `prototype/data.js` → `extendedVocab`).
5. Press **space** (or click the white button) to capture:
   - If the topic has an authored flashcard → navigates straight to it.
   - Otherwise → shows a small "Writing flashcard" overlay, waits for Ollama (~5-20 s), then renders the generated card.

---

## Adding new recognizable topics

Open `prototype/data.js`. To make CLIP recognize a new object, append an entry to `extendedVocab`:

```js
{
  id: 'kangaroo',
  displayName: 'Kangaroo',
  subject: 'ZOOLOGY · MARSUPIAL',
  grad: 'var(--grad-rust)',
  prompts: [
    'a photo of a kangaroo',
    'a large marsupial hopping in the Australian outback',
  ],
},
```

No training. No restart. Reload the page — the vocabulary is re-indexed on mount.

To hand-author rich flashcard content (which overrides LLM generation for that id), add a full entry to the `flashcards` object with a `clipPrompts` array.

---

## Troubleshooting

| Symptom                                      | Fix                                                                                                     |
|----------------------------------------------|---------------------------------------------------------------------------------------------------------|
| "Camera permission denied"                   | Grant camera permission in browser site settings, reload.                                               |
| "Camera requires HTTPS or http://localhost"  | You opened `file://…/index.html`. Use a static server instead (see above).                              |
| CLIP never finishes loading                  | First run downloads ~150 MB. Check the Network tab — should see requests to `huggingface.co`.           |
| "LLM offline" pill stays gray                | Ollama isn't reachable. Confirm `curl http://localhost:11434/api/tags` works from your terminal.        |
| "Pull phi3:mini" pill                        | Ollama is up but the model isn't installed. Run `ollama pull phi3:mini`.                                |
| Capture fails with CORS error                | You started `ollama serve` without `OLLAMA_ORIGINS='*'`. Stop Ollama, re-run with the env var.          |
| Inference is very slow (WASM, >1 s / frame)  | Your browser doesn't have WebGPU. Chrome/Edge on a recent laptop will use WebGPU automatically.         |
| Generated flashcards have missing/odd facts  | Phi-3-mini occasionally drops a field. Try `llama3.2:3b` in `prototype/lib/llm.js` (change `DEFAULT_MODEL`). |

---

## Cost

| Component  | Cost                                       |
|------------|--------------------------------------------|
| CLIP       | $0 — runs in your browser                  |
| Ollama     | $0 — runs on your laptop                   |
| Phi-3 mini | $0 — 2.3 GB one-time download              |
| **Total**  | **$0** after the initial model downloads   |

An equivalent setup on OpenAI's API (GPT-4o-mini) would be roughly **$0.0002 per scan**, i.e. 20¢ per 1,000 scans — still trivial, but Ollama means you can demo offline at a conference or in class without worrying about API keys or quotas.
