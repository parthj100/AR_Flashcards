# Agents, action spaces, and why benchmarking this thing is hard

The Lens prototype is described as a four-stage pipeline (detect → OCR →
LLM → overlay) in the top README, but that framing collapses several
distinctions that matter once you try to measure it. This document
enumerates each *agent* in the system: what observation it gets, what
action it produces, what metric the action is judged on, and how those
metrics compose into something we'd want to call "system quality."

The point is to make the second piece of the Update-5 feedback concrete:
**benchmarking is hard here because the agents have heterogeneous action
spaces and heterogeneous reward signals, and the end-to-end objective is
partially perceptual.** No single number — not mAP, not latency, not BLEU
— covers it.

## The agents, by stage

### 1. The detector — `yolo` agent

- **Code:** [YOLOv8-Detection/serve.py](YOLOv8-Detection/serve.py),
  [prototype/lib/yolo.js](prototype/lib/yolo.js).
- **Observation:** one camera frame as JPEG, plus a confidence threshold
  and a max-detections cap.
- **Action:** an ordered list of `{class_name, confidence, box, crop}`
  records. Note this is *two* sub-actions:
    1. *Localize:* propose bounding boxes.
    2. *Classify:* assign a label from the model's 80-class COCO vocab.
  Lens treats the localizer as the useful part and re-classifies each
  crop with CLIP — see `README.md → "Why YOLO plus CLIP."`
- **Metric the agent itself optimizes:** mAP@.5:.95 (a perception metric).
- **Metric Lens cares about:** does the chosen box, after CLIP
  re-identification, surface the topic the learner wanted? That's a
  *task* metric, not a *perception* metric, and the two disagree often.
- **Failure modes that matter at the system level:** missed boxes
  (whole-frame fallback hides the subject), over-cropped boxes (CLIP
  loses context), correct localization with wrong COCO label (harmless,
  because CLIP re-labels anyway).

### 2. The recognizer — `clip` agent

- **Code:** [prototype/lib/clip.js](prototype/lib/clip.js), built on
  Transformers.js with an in-browser ViT-B/32.
- **Observation:** a 224×224 cropped image (full frame in single-object
  mode; YOLO crop in multi-object mode).
- **Action:** a probability vector over the Lens vocabulary — the union
  of `flashcards[*].clipPrompts` and `extendedVocab[*].prompts` from
  `data.js`. Top-1 of this distribution is what the rest of the pipeline
  acts on.
- **Metric the agent itself optimizes:** image-text contrastive loss on
  ~400M web pairs. The agent has *no idea* about Lens.
- **Metric Lens cares about:** top-1 accuracy over the closed vocabulary
  the user actually has. CLIP's prompt set is the entire "schema" of
  what Lens can recognize — the agent's calibration is downstream of the
  prompt-engineering done by hand in `data.js`.
- **Failure modes that matter at the system level:** correct topic but
  wrong sub-variant (CLIP picks "maple leaf" when the user meant "oak"),
  silent miscalibration when the true class is outside the vocab (top-1
  confidence stays high for the wrong topic), and prompt-set drift as
  new topics are added.

### 3. The OCR — `ocr` agent (planned for Update 6)

- **Code:** not in the repo yet; reserved for the PaddleOCR integration.
- **Observation:** a cropped image of a printed flashcard.
- **Action:** ordered list of `(text, polygon, confidence)` tuples.
- **Metric:** CER (character error rate) is the obvious one, but it
  doesn't predict downstream LLM behavior — a single wrong character in
  a chemical formula can route the LLM to a different topic entirely.
  We expect to add a "topic-routing accuracy" metric that asks "did the
  OCR output land the LLM in the right card?" rather than reporting raw
  CER.

### 4. The card writer — `llm` agent

- **Code:** [prototype/lib/llm.js](prototype/lib/llm.js).
- **Observation:** `(topic_id, hint_prompt)`. The state defined in
  `ALGORITHMS.md` is exactly this agent's observation.
- **Action:** a JSON object validated against `FLASHCARD_SCHEMA` —
  6 fields, one of which is an array of 4 sub-objects. This is
  *structured generation*. Even a "wrong" card is constrained to the
  schema; the failure modes are semantic, not syntactic.
- **Metric the agent itself optimizes:** next-token cross-entropy on
  pre-training data; nothing card-shaped.
- **Metric Lens cares about:** schema validity (it should always parse),
  factual correctness (hard to automate), style match to the authored
  cards (cosine to authored embeddings), and ultimately whether the
  resulting card produces correct quiz answers from a learner.
- **Failure modes that matter at the system level:** plausible-but-wrong
  facts (the hardest to detect automatically), tone drift toward
  marketing copy (the system prompt fights this explicitly), and
  schema regressions on Phi-3-mini that don't appear on GPT-4.

### 5. The overlay / segmenter — `overlay` agent (partially implemented)

- **Code:** the renderer in [prototype/app.js](prototype/app.js); the
  SAM 2 segmentation hook is planned for Update 6.
- **Observation:** the original frame, the chosen bounding box, the
  flashcard JSON to render.
- **Action:** a rendered composite — mask boundary, label, explanation
  card, quiz panel.
- **Metric the agent itself optimizes:** SAM 2 reports mask IoU; the
  renderer has no learned component.
- **Metric Lens cares about:** *did the human study the card?* The
  rendered overlay is the only artifact the learner perceives, and its
  quality is genuinely perceptual: readability against the live
  background, placement, animation, mask edge fidelity. No metric in
  the perception literature predicts this well.

## Why this is hard to benchmark

The standard recipe — "report mAP, F1, BLEU, and latency, then take the
geometric mean" — fails for at least five reasons specific to this
project.

**(a) Action spaces are heterogeneous.** YOLO emits boxes; CLIP emits a
softmax; the LLM emits structured JSON; the renderer emits pixels. There
is no shared metric space. We can normalize each to "task success,"
but task success is itself defined by the *downstream* user, which is the
next problem.

**(b) Ground truth is staged.** YOLO's truth comes from annotated boxes
(`dataset/labels/*.txt`). CLIP's truth comes from a vocabulary set hand-
authored in `data.js`. The LLM's truth comes from authored cards, which
exist only for 30-ish topics. The renderer's truth is the learner's
attention, for which we have *no labels at all*. The further down the
pipeline you go, the thinner your ground truth gets.

**(c) Errors compose non-linearly.** A 90 %-accurate detector feeding a
90 %-accurate CLIP feeding a 90 %-accurate LLM is not "73 % end-to-end."
Some failure modes are absorbing (a missed box means no card at all),
some are self-correcting (a wrong COCO label is masked by CLIP re-id),
and some amplify (a wrong CLIP topic routes the LLM into the wrong
domain entirely, where its outputs *look* fine — high latent confidence,
plausible JSON — but are useless to the learner).

**(d) The LLM is non-deterministic and externally hosted.** Phi-3-mini
via Ollama uses sampling (`temperature=0.2` in `llm.js`), so the
"same" `(s, a)` is realized differently across runs. Reproducibility for
LLM evaluation requires either fixing the seed (which Ollama does not
expose cleanly) or evaluating distributions of outputs per prompt. Cloud
fallback to GPT-4 makes the policy itself non-stationary across days.

**(e) The overlay quality has no automated metric.** SAM 2 mask IoU is
not what the learner cares about; they care whether the explanation is
legible, the bounding-box highlight is unobtrusive, and the quiz panel
appears at the right moment. The honest answer is *we need user studies
for this stage*; we're saving it for Update 7.

## The benchmark hierarchy we actually report

Because no single number works, the repo's measurements are split into
three layers, and each layer is the right tool for a different
question:

| Layer | Question it answers | Where it lives |
|---|---|---|
| **Per-agent perception** | "How fast and how accurate is this single agent at its own metric?" | [YOLOv8-Detection/results/](YOLOv8-Detection/results/) — comparative latency/FPS/confidence across `yolov8n` / `yolov8s` / `yolov8m` |
| **Composition quality** | "When two agents pass outputs to each other, where does the error budget go?" | Planned for Update 6: a routing-success metric (did the chosen box → CLIP → LLM chain land on the intended card?) |
| **End-to-end task quality** | "Did this card help the learner learn?" | `RT.quizSessions` in [prototype/app.js](prototype/app.js) — the same logs we use as RL reward |

The Update-5 benchmark covers Layer 1 only, on the YOLO agent. Layer 2
needs the OCR integration plus a small labeled routing set. Layer 3 needs
the persistence work called out in the algorithmic-framing doc — the
quiz logs already accumulate, they just don't survive a page reload.

This three-layer view is *the* answer to "why is benchmarking hard?":
you can hit Layer 1 with standard CV tooling, but Layers 2 and 3 require
infrastructure the prototype is still building.

## Concrete metrics, per agent

For the record, here are the metrics we expect to report per agent
once each is fully wired:

| Agent | Speed metric | Quality metric | System metric |
|---|---|---|---|
| YOLO | mean / p50 / p95 ms per frame | mAP@.5:.95 on annotated school-objects | localizer recall on Lens vocabulary |
| CLIP | ms per crop | top-1 over vocab (in-vocab cohort) | routing accuracy to correct flashcard |
| OCR | ms per crop | character error rate (CER) | topic-routing accuracy with OCR errors |
| LLM | tokens / sec, time-to-first-token | schema validity, tone-match cosine, factuality sample | quiz-answer correctness on generated cards |
| Overlay | render ms per frame | mask IoU (SAM 2) | user-study completion + attention (Update 7) |

Numbers in italics are planned; numbers in roman are reportable from
the current repo state.

## Open question for the reviewer

If the reviewer's intent was "report one number," the closest defensible
candidate is **end-to-end quiz-success rate on generated cards**, with
the per-agent perception numbers as supporting diagnostics. We expect
to report that headline in Update 6 once `RT.quizSessions` persists.
