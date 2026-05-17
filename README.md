# AR Flashcard Tutor

Camera-driven study app. Point a phone or laptop camera at a real object
or a printed flashcard; a multi-agent pipeline recognises the subject,
generates a study card on the fly, and lets you quiz yourself on it.

Built as a research project on **Standardized Benchmarking of
Multi-Agent Distributed Machine Learning in Augmented Reality**. The
benchmarking story is the academic contribution — the prototype is the
artifact we benchmark against.

---

## What's in this repo

| Path | What it is |
|---|---|
| [`prototype/`](prototype/) | Vanilla-JS web prototype (Lens UI). Hash-routed dashboard / decks / scan / flashcard views. Loads CLIP in the browser via Transformers.js; talks to the YOLO and OCR sidecars over HTTP. |
| [`YOLOv8-Detection/`](YOLOv8-Detection/) | YOLO detection agent — FastAPI sidecar ([`serve.py`](YOLOv8-Detection/serve.py)), single-image CLI ([`detect.py`](YOLOv8-Detection/detect.py)), comparative benchmark ([`compare_benchmarks.py`](YOLOv8-Detection/compare_benchmarks.py)), dataset collector ([`collect_dataset.py`](YOLOv8-Detection/collect_dataset.py)). |
| [`OCR/`](OCR/) | OCR agent — FastAPI sidecar ([`ocr_serve.py`](OCR/ocr_serve.py)) on EasyOCR, per-mode pipeline benchmark ([`pipeline_benchmark.py`](OCR/pipeline_benchmark.py)) with accuracy metrics, visualisation scripts. |
| [`benchmarks/`](benchmarks/) | Cross-pipeline benchmarks — LLM ([`benchmark_llm.py`](benchmarks/benchmark_llm.py)), end-to-end ([`benchmark_pipeline.py`](benchmarks/benchmark_pipeline.py)), per-agent reward decomposition ([`benchmark_rewards.py`](benchmarks/benchmark_rewards.py)), Tier-2 labels scaffolding, figures generator. |
| [`Research Updates/`](Research%20Updates/) | Per-milestone PDFs (Updates 1–5). |
| [`AGENTS.md`](AGENTS.md), [`ALGORITHMS.md`](ALGORITHMS.md), [`BENCHMARKS.md`](BENCHMARKS.md), [`CARDS.md`](CARDS.md), [`DATASET.md`](YOLOv8-Detection/DATASET.md) | Methodology docs the paper draws from. |

---

## The pipeline (four agents)

```
                        Camera frame
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  ┌────────────┐       ┌────────────┐         ┌────────────┐
  │  YOLOv8n   │       │   CLIP     │         │  EasyOCR   │
  │ (FastAPI   │       │ (in-browser│         │  (FastAPI  │
  │  :8765)    │       │  via tfjs) │         │   :8766)   │
  └─────┬──────┘       └─────┬──────┘         └─────┬──────┘
        │ box +              │ top-1 topic          │ text + box
        │ COCO label         │ over Lens vocab      │
        └─────────────┬──────┴──────────────────────┘
                      ▼
              ┌───────────────┐
              │  Phi-3-mini   │
              │   (Ollama     │
              │   :11434)     │
              └───────┬───────┘
                      │ flashcard JSON
                      ▼
              ┌───────────────┐
              │  Lens UI      │   render card, quiz,
              │  (prototype/) │   persist to localStorage
              └───────────────┘
```

The three scan modes the prototype exposes (`Single` = CLIP only,
`Multi` = YOLO + CLIP, `OCR` = EasyOCR + LLM) traverse different paths
through this graph. See [`AGENTS.md`](AGENTS.md) for what each agent's
observation, action space, and reward are.

---

## Tech stack — what's actually running

| Layer | Implementation |
|---|---|
| Detection | **YOLOv8-Nano** via Ultralytics, MPS / CUDA / CPU autodetect |
| Recognition | **CLIP ViT-B/32** in-browser via `@xenova/transformers` (Transformers.js) |
| OCR | **EasyOCR** (English) running on CPU as a FastAPI sidecar |
| LLM | **Phi-3-mini** via Ollama, JSON-mode generation pinned to a strict schema (see [`prototype/lib/llm.js`](prototype/lib/llm.js)) |
| Frontend | Vanilla HTML / CSS / JS, hash-routed SPA, no build step |
| Benchmark / training tooling | Python 3.13, the venv at `YOLOv8-Detection/.venv/` |

Cloud fallback (GPT-4.1-mini) and SAM 2 segmentation are spec'd in
[`AGENTS.md`](AGENTS.md) but not currently wired.

---

## Datasets

Two image sets live in the repo; see [`DATASET.md`](YOLOv8-Detection/DATASET.md)
and [`CARDS.md`](CARDS.md) for full specs.

| Set | Size | Source | Used for |
|---|---:|---|---|
| School-objects detection set | 554 images / 6 classes | Self-collected via [`collect_dataset.py`](YOLOv8-Detection/collect_dataset.py) (Bing + MD5 dedupe), annotated in Roboflow | YOLO + recognition benchmarks |
| OCR test images | 5 | Hand-picked text-heavy images (algebra, chemistry, physics, whiteboard, derivative) | OCR + LLM benchmarks |
| Authored flashcards | ~30 | Hand-written in [`prototype/data.js`](prototype/data.js) | Expert demonstrations for the IL / offline-RL framing in [`ALGORITHMS.md`](ALGORITHMS.md) |
| Extended CLIP vocab | ~140 topics | Hand-written prompts in [`prototype/data.js`](prototype/data.js) | What CLIP can recognise out of the box |

COCO is also used indirectly because YOLO ships pretrained on it.

---

## Benchmarks — what we measure

Four layers, all scripts auto-pick the latest CSV in `benchmarks/results/`:

| Layer | Question | Script | Latest result |
|---|---|---|---|
| L1 per-agent perception | "How fast / how accurate in isolation?" | `compare_benchmarks.py`, `OCR/benchmark.py`, `benchmarks/benchmark_llm.py` | n=554, all four agents covered |
| L2 end-to-end latency | "How long does the full pipeline take per scan?" | `benchmarks/benchmark_pipeline.py`, `OCR/pipeline_benchmark.py` | YOLO 54 ms · CLIP 78 ms · OCR 667 ms · LLM 4872 ms |
| L3 reward decomposition | "What is each agent contributing to the joint outcome?" | `benchmarks/benchmark_rewards.py` | n=554, Tier-1 joint reward **0.7234** |
| L4 task quality | "Did the cards help the learner learn?" | `RT.quizSessions` persisted from the prototype | data starts accumulating as soon as you do a quiz |

Eight paper-ready figures are committed at
[`benchmarks/figures/`](benchmarks/figures/); regenerate via
`python benchmarks/make_figures.py`.

Full methodology + reproduction commands in
[`BENCHMARKS.md`](BENCHMARKS.md).

---

## Getting started

### Prerequisites

- Python 3.10+ (3.13 known good)
- [Ollama](https://ollama.com/) installed, with `phi3:mini` pulled:
  ```bash
  ollama pull phi3:mini
  ```
- A browser with camera permissions (Chrome / Edge recommended)

### Set up the venv

```bash
cd YOLOv8-Detection
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pip install easyocr fastapi uvicorn pillow transformers
cd ..
```

The first run downloads YOLOv8n weights (~6 MB), the EasyOCR detection
+ recognition models (~64 MB), and CLIP-ViT-B/32 (~340 MB) on first use.

### Bring up the four sidecars

Each in its own terminal:

```bash
# 1. LLM
ollama serve

# 2. YOLO detection
YOLOv8-Detection/.venv/bin/python YOLOv8-Detection/serve.py     # :8765

# 3. OCR
YOLOv8-Detection/.venv/bin/python OCR/ocr_serve.py              # :8766

# 4. Static web server for the prototype
python3 -m http.server 5500 --directory prototype
```

Open [http://localhost:5500](http://localhost:5500) and click *New scan*.
The dashboard, decks page, and quiz flow all read from real data — see
the live-UI section below.

### Run a benchmark

```bash
# Per-agent perception (all four)
YOLOv8-Detection/.venv/bin/python YOLOv8-Detection/compare_benchmarks.py
YOLOv8-Detection/.venv/bin/python OCR/benchmark.py
YOLOv8-Detection/.venv/bin/python benchmarks/benchmark_llm.py

# End-to-end + reward decomposition
YOLOv8-Detection/.venv/bin/python benchmarks/benchmark_pipeline.py --limit 30
YOLOv8-Detection/.venv/bin/python benchmarks/benchmark_rewards.py --limit 20

# Regenerate the eight paper figures
YOLOv8-Detection/.venv/bin/python benchmarks/make_figures.py
```

Outputs land in `benchmarks/results/`, `YOLOv8-Detection/results/`, and
`OCR/results/` — all timestamped.

---

## Live UI

The prototype's dashboard, decks page, due-today panel, sidebar deck
list, and KPI cards all read from a single live source: authored cards
in `prototype/data.js` plus runtime state in `window.LENS_RUNTIME` (the
camera captures, LLM-generated cards, and quiz outcomes). Quiz sessions
and generated cards persist to `localStorage` between page reloads;
`window.lensExportTrajectories()` downloads the full history as JSONL
matching the schema in [`ALGORITHMS.md`](ALGORITHMS.md).

---

## Team

| Name | Role |
|---|---|
| **Parthkumar Joshi** | Recognition (CLIP), LLM pipeline, UI development, benchmarking framework |
| **Alexis Juarez Gomez** | Detection (YOLO), OCR pipeline, dataset collection & annotation, visualisations |

---

## References

- Jocher, G., et al. (2023). *Ultralytics YOLOv8*. [GitHub](https://github.com/ultralytics/ultralytics)
- Radford, A., et al. (2021). *Learning Transferable Visual Models From Natural Language Supervision* (CLIP). ICML.
- JaidedAI. *EasyOCR*. [GitHub](https://github.com/JaidedAI/EasyOCR)
- Microsoft Research. (2024). *Phi-3 Technical Report*. [HuggingFace](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct)
- Ollama. *Local LLM runtime*. [ollama.com](https://ollama.com/)
- Xenova. *Transformers.js — run Transformers in the browser*. [HuggingFace](https://huggingface.co/docs/transformers.js)
- Lin, T.-Y., et al. (2014). *Microsoft COCO: Common Objects in Context*. ECCV 2014
- Levine, S., et al. (2020). *Offline Reinforcement Learning: Tutorial, Review, and Perspectives*. arXiv:2005.01643.
- Sunehag, P., et al. (2017). *Value-Decomposition Networks for Cooperative Multi-Agent Learning*. arXiv:1706.05296.
- Zhu, K., et al. (2025). *MultiAgentBench: Evaluating the Collaboration and Competition of LLM Agents*. arXiv.
- Rein, D., et al. (2024). *GAIA: A Benchmark for General AI Assistants*. arXiv.

---

## License

Research / academic use. Scraped third-party images in
`YOLOv8-Detection/dataset/images/raw/` are not redistributed (see
[`DATASET.md`](YOLOv8-Detection/DATASET.md)). Generated cards, authored
cards, code, and benchmark results are project-owned.
