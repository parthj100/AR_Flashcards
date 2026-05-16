# Standardized benchmarking — multi-agent distributed ML

The project's working title is *Standardized Benchmarking of Multi-Agent
Distributed Machine Learning in Augmented Reality*. For Updates 4 and 5 the
benchmarking effort was concentrated on the **YOLO detector alone**. Update
6 expands it to cover **every agent in the pipeline** plus a standardized
per-agent reward decomposition that mirrors the format another team
produced for their multi-agent layout system.

This document is the entry point for the benchmark suite: what scripts
exist, what each one measures, how to run them, and how the outputs map
back to the project title.

## The four levels of benchmarking

We measure four distinct things, each with its own script:

| Level | What it answers | Script | Output |
|---|---|---|---|
| L1 — per-agent perception | "How fast and how accurate is each agent in isolation?" | `YOLOv8-Detection/compare_benchmarks.py`<br>`OCR/benchmark.py`<br>`benchmarks/benchmark_llm.py` | timestamped CSV / MD / JSON in `benchmarks/results/` |
| L2 — end-to-end latency | "How long does the full pipeline take per scan?" | `benchmarks/benchmark_pipeline.py` | `pipeline_<ts>.{csv,md,_summary.csv}` |
| L3 — reward decomposition | "What is each agent contributing to the joint outcome?" | `benchmarks/benchmark_rewards.py` | `rewards_<ts>.{txt,md,csv}` |
| L4 — task quality | "Did the cards we generated actually help learners?" | `RT.quizSessions` in `prototype/app.js` (logged in-session) | not yet aggregated; persistence on the Update-6 backlog |

L1 was where Update 5 lived; L2–L3 are new; L4 is the open work that
[ALGORITHMS.md](ALGORITHMS.md) frames as the offline-RL reward.

## Sidecars the benchmarks talk to

All four agents besides CLIP are exposed as local HTTP services so a
single Python script can drive the whole pipeline:

| Agent | Service | Port | Code |
|---|---|---:|---|
| YOLO   | FastAPI  | 8765  | [YOLOv8-Detection/serve.py](YOLOv8-Detection/serve.py) |
| OCR    | FastAPI  | 8766  | [OCR/ocr_serve.py](OCR/ocr_serve.py) |
| LLM    | Ollama   | 11434 | external — `ollama serve` |
| CLIP   | (browser only) | n/a | [prototype/lib/clip.js](prototype/lib/clip.js) |

The benchmark scripts share a tiny client helper at
[benchmarks/agents.py](benchmarks/agents.py) so each new benchmark only
has to write the *measurement* logic, not HTTP plumbing. If a sidecar is
unreachable the helper returns `{"ok": False, "error": "..."}` instead of
crashing — so the pipeline benchmark with `--skip-llm` is a one-line
change, not a fork of the script.

CLIP is browser-side and does not get a Python sidecar. We benchmark it
in-browser separately (planned: `prototype/benchmarks/benchmark_clip.html`,
not in this drop).

## The scripts, in detail

### L1 — per-agent perception

#### YOLO (existed before Update 5, now multi-model)

```
YOLOv8-Detection/.venv/bin/python YOLOv8-Detection/compare_benchmarks.py \
    --models yolov8n.pt yolov8s.pt yolov8m.pt \
    --images-dir YOLOv8-Detection/dataset/images/raw \
    --classes microscope calculator backpack periodic_table_poster globe_model safety_goggles
```

Reports mean / p50 / p95 / p99 latency, FPS, mean confidence per model
and per class. Latest result:
[YOLOv8-Detection/results/compare_20260514_003147.md](YOLOv8-Detection/results/compare_20260514_003147.md).

#### OCR (new in Update 6)

```
python OCR/ocr_serve.py                      # in another terminal
YOLOv8-Detection/.venv/bin/python OCR/benchmark.py
```

Reports per-image latency, mean text confidence, lines extracted, FPS,
and per-class aggregates. Output mirrors the YOLO benchmark shape so the
two are directly comparable. Latest result on the full Update-5 dataset
(554 images): mean inference 3.94 s / 0.25 FPS / 0.52 mean text conf —
EasyOCR running on CPU, which is the obvious hot spot.

#### LLM (new in Update 6)

```
ollama serve                                  # in another terminal
ollama pull phi3:mini                         # one-time
YOLOv8-Detection/.venv/bin/python benchmarks/benchmark_llm.py
```

Drives Ollama with the topic list at [benchmarks/topics.txt](benchmarks/topics.txt)
(falls back to a built-in 20-topic set), records:
- wall-clock and Ollama-reported latencies (load / prompt-eval / eval)
- tokens generated, tokens/sec
- **schema-validity rate** against the same `FLASHCARD_SCHEMA` the browser uses

The schema check is a faithful port of `normalizeFlashcard` in
[prototype/lib/llm.js](prototype/lib/llm.js); a card "passes" iff it
parses as JSON with all required fields and exactly four facts.

### L2 — end-to-end pipeline

```
YOLOv8-Detection/.venv/bin/python benchmarks/benchmark_pipeline.py --limit 30
```

Walks a folder of images, runs YOLO → OCR → LLM in sequence per image,
records per-agent and end-to-end wall-clock latencies. Each agent can be
skipped (`--skip-yolo`, `--skip-ocr`, `--skip-llm`) so the script gives
useful output even when only one or two sidecars are running.

Important caveat baked into the output: **the e2e latency reported is
the *sum* of per-agent latencies in pipeline order**. The live prototype
runs CLIP and YOLO partly in parallel and starts the LLM as soon as the
topic is decided, so the sum is an upper bound, not a measured wall
clock for the UI. Reporting the upper bound is honest for a benchmark
suite — it's what you'd see if every stage were strictly sequential.

### L3 — per-agent reward decomposition

```
YOLOv8-Detection/.venv/bin/python benchmarks/benchmark_rewards.py --limit 20
```

This is the headline new artifact. It produces a `rewards.txt`-style
report with the same shape another team's multi-agent benchmark used:

```
Multi-Agent Pipeline Rewards (AR Flashcard Tutor)
================================================================
Images processed:   12
...
Agent Trajectory:
  [yolo_agent]    img=microscope/...  top=None       conf=0.000  n_det=0  | 678 ms
  [ocr_agent]     img=microscope/...  lines=9        mean_conf=0.901      | 10897 ms
  [llm_agent]     topic=None          schema=✓       tokens=342  tps=63.4 | 9262 ms
  ...
YOLO Reward (mean):    0.4017   (n=12)
OCR Reward  (mean):    0.5159   (n=12)
LLM Reward  (mean):    1.0000   (n=12, schema-valid rate 100.00%)
Joint Reward (mean):   0.6639   (n=12)
```

Direct side-by-side analog to their `Layout Reward / Style Reward /
Budget Reward` channels.

#### Tier 1 (now) vs Tier 2 (planned)

The current rewards are **self-reported confidences and schema validity**:

- `YOLO_R` = top-box confidence × indicator(any box found)
- `OCR_R`  = mean text confidence
- `LLM_R`  = 1.0 if schema-valid else 0.0
- `Joint`  = weighted mean (default 0.4 / 0.2 / 0.4)

This is honest about its limits: an LLM card with `topic="parking
meter"` for a goggles photo gets `LLM_R = 1.0` because the JSON parses,
even though the card is pedagogically useless. That's exactly the
*credit-assignment* problem AGENTS.md flags as why end-to-end
benchmarking is hard.

**Tier 2** (Update 6 backlog) replaces these with accuracy against a
small labeled evaluation set:

- `YOLO_R` → IoU vs ground-truth box
- `OCR_R`  → 1 − CER vs ground-truth text
- `LLM_R`  → tone-cosine + sampled factuality check
- `Joint`  → quiz-success rate from the persisted `RT.quizSessions`

Same script, different reward functions. The plan is to label ~30
images (one per topic) and swap in `--labels benchmarks/labels.json` to
get Tier-2 numbers for the paper.

## Mapping to the project title

| Title phrase | Where the suite covers it |
|---|---|
| **Standardized** | Same output shape (CSV + MD + JSON, timestamped, in `benchmarks/results/`) for every agent and the joint pipeline. Identical `agents.py` HTTP contract. |
| **Benchmarking** | L1 perception per agent, L2 end-to-end latency, L3 reward decomposition. |
| **Multi-Agent** | Five named agents (yolo / clip / ocr / llm / overlay), each measured separately and credited per-action in the rewards report. |
| **Distributed ML** | Each agent runs in its own process / sidecar; the benchmark talks to the same HTTP contract the browser does. CPU/MPS/CUDA each picked locally. |
| **Augmented Reality** | The benchmark targets the same prototype the AR view uses — identical schema, identical model checkpoints, identical reward signal (quiz outcomes, planned for Tier 2). |

## Reproducing the headline numbers

```
# 1. Bring up sidecars (each in its own terminal)
ollama serve                                                          # LLM
YOLOv8-Detection/.venv/bin/python YOLOv8-Detection/serve.py           # detection
YOLOv8-Detection/.venv/bin/python OCR/ocr_serve.py                    # OCR

# 2. L1 per-agent
YOLOv8-Detection/.venv/bin/python YOLOv8-Detection/compare_benchmarks.py
YOLOv8-Detection/.venv/bin/python OCR/benchmark.py
YOLOv8-Detection/.venv/bin/python benchmarks/benchmark_llm.py

# 3. L2 end-to-end
YOLOv8-Detection/.venv/bin/python benchmarks/benchmark_pipeline.py --limit 30

# 4. L3 reward decomposition (mirror of the other team's rewards.txt)
YOLOv8-Detection/.venv/bin/python benchmarks/benchmark_rewards.py --limit 20
```

Outputs land in `benchmarks/results/` (and `YOLOv8-Detection/results/`
for the YOLO numbers). Every file is timestamped so successive runs
accumulate.

## See also

- [AGENTS.md](AGENTS.md) — what each agent does and why composing them is
  hard to benchmark.
- [ALGORITHMS.md](ALGORITHMS.md) — how the per-agent rewards become the
  credit-assigned reward vector for offline RL / imitation learning.
- [CARDS.md](CARDS.md) — the flashcard schema the LLM agent's reward
  uses.
