# Custom flashcard dataset — format spec

The Update-5 feedback flagged that the format of the custom flashcard
dataset was under-discussed. [DATASET.md](YOLOv8-Detection/DATASET.md)
covers the school-objects *detection* corpus (textbook, microscope,
calculator, …) used to fine-tune and benchmark YOLOv8. This document
covers the **flashcard content corpus** itself: the on-device JSON cards,
the CLIP prompt set that links them to camera input, and the printed-card
capture format used at scan time.

There are three data artifacts at play, and they were previously only
described implicitly through the prototype code:

1. **Authored card content** — JSON objects in
   [prototype/data.js → flashcards](prototype/data.js).
2. **CLIP recognition prompts** — `clipPrompts[]` and `extendedVocab[].prompts[]`
   in the same file. These are what links a camera frame to a card.
3. **Generated card content** — JSON objects produced at runtime by
   Phi-3-mini via [prototype/lib/llm.js](prototype/lib/llm.js), constrained
   to `FLASHCARD_SCHEMA`.

Authored and generated cards share the same on-screen schema. The CLIP
prompts and the printed-card capture spec are inputs to recognition, not
to rendering.

---

## 1. Card schema (`flashcards[id]`)

Every card — whether hand-written or LLM-generated — is one JSON object
with the following fields. The renderer in
[prototype/app.js](prototype/app.js) reads them directly; the LLM is
constrained to them via JSON-schema-mode generation in
[prototype/lib/llm.js → FLASHCARD_SCHEMA](prototype/lib/llm.js).

```json
{
  "id":      "copper-sulfate",
  "name":    "Copper sulfate",
  "subject": "CHEMISTRY · INORGANIC · SALT",
  "formula": "CuSO₄ · 5H₂O",
  "mass":    "M = 249.69 g/mol",
  "oneline": "A vivid blue inorganic salt — used as a fungicide, pigment, and electrolyte in copper plating; loses its water of crystallization above 150°C.",
  "facts": [
    { "num": "01", "label": "CRYSTAL SYSTEM",      "body": "Triclinic — vivid cobalt-blue crystals." },
    { "num": "02", "label": "HEATED ABOVE 150°C", "body": "Loses water of crystallization — turns chalk-white." },
    { "num": "03", "label": "COMMON USES",         "body": "Fungicide on grapes; pigment in glass; electrolyte for copper plating." },
    { "num": "04", "label": "SOLUBILITY IN WATER", "body": "32 g per 100 mL at 20°C — highly soluble." }
  ],

  "clipPrompts": [
    "a photo of bright blue copper sulfate crystals",
    "blue crystalline chemistry compound in a petri dish",
    "vivid blue inorganic salt crystals on a lab bench"
  ],

  "crumbs":        ["Decks", "Chem 101"],
  "grad":          "var(--grad-blue)",
  "scanned":       "SCANNED YESTERDAY",
  "reviewWhen":    "Tomorrow",
  "reviewAt":      "9:14 AM",
  "reviewProgress": { "done": 3, "total": 8 }
}
```

### Required vs optional

| Field | Required | Constraint |
|---|---|---|
| `id` | yes | URL-safe, unique within `flashcards{}`. The CLIP top-1 match returns this id. |
| `name` | yes | Plain title-case string. ≤ 60 chars. |
| `subject` | yes | 2–3 ALL-CAPS tokens joined with ` · `. Used as the breadcrumb header. |
| `formula` | yes | Canonical identifier: chemical formula, scientific name, year+location, etc. May contain unicode (subscripts, superscripts). |
| `mass` | yes | Short quantitative token: mass, dimensions, count. May be `""` for non-scientific topics. |
| `oneline` | yes | 1–2 sentences, ~25–40 words. Renders as the card subtitle. |
| `facts` | yes | Exactly 4 entries. `num` is `"01"`..`"04"`. `label` is ≤ 3 ALL-CAPS words. `body` is one sentence. |
| `clipPrompts` | required for authored cards | 2–4 natural-language sentences describing the visual subject. |
| `crumbs`, `grad`, `scanned`, `reviewWhen`, `reviewAt`, `reviewProgress` | optional | Render-only metadata. Defaults provided by the app when missing. |

Generated cards omit the render-only metadata; the app fills it in at
display time and adds `"generated": true` so the UI can show a small
"Phi-3" badge.

### JSON Schema (machine-readable)

The LLM is constrained at generation time by this exact schema, lifted
verbatim from `llm.js`:

```js
{
  type: 'object',
  required: ['name', 'subject', 'formula', 'mass', 'oneline', 'facts'],
  properties: {
    name:    { type: 'string' },
    subject: { type: 'string' },
    formula: { type: 'string' },
    mass:    { type: 'string' },
    oneline: { type: 'string' },
    facts: {
      type: 'array', minItems: 4, maxItems: 4,
      items: {
        type: 'object',
        required: ['num', 'label', 'body'],
        properties: {
          num:   { type: 'string' },
          label: { type: 'string' },
          body:  { type: 'string' }
        }
      }
    }
  }
}
```

This schema is the contract for *any* future fine-tuning, behavioral
cloning, or evaluation work — it pins the action space referenced in
[ALGORITHMS.md](ALGORITHMS.md).

---

## 2. CLIP prompt set

CLIP cannot see the JSON; it sees an image and a list of candidate
phrases. The `clipPrompts[]` array on each card is therefore *recognition
data*, not display data. The full prompt pool at boot time is:

```
union over flashcards[*].clipPrompts  +  extendedVocab[*].prompts
```

Conventions we've settled on by hand and recommend for future entries:

- **2–4 prompts per card.** One prompt under-specifies (CLIP latches on
  to background); five+ produces near-duplicates and dilutes the index.
- **Vary framing.** At least one close-up and one in-context phrase.
  E.g. for `copper-sulfate`:
  `"vivid blue inorganic salt crystals on a lab bench"` (in-context)
  vs `"blue crystalline chemistry compound in a petri dish"` (close-up).
- **Start with "a photo of"** for at least one prompt — CLIP was trained
  on alt-text that heavily uses that pattern; the prior helps.
- **Avoid the topic name as a bare word.** "Copper sulfate" alone
  triggers on chem-textbook *captions*, not on actual crystals. Always
  wrap with descriptive context.

`extendedVocab` entries (~140 topics at the bottom of `data.js`) follow
the same prompt conventions but skip the full card body; when CLIP
matches an `extendedVocab` id, the LLM writes the card on the fly.

---

## 3. Printed-card capture spec

When the prototype scans a physical printed flashcard (as opposed to a
real-world object), the camera capture pipeline expects the following.
These are conventions the prototype currently *recommends*, not
hard-enforced; the OCR stage planned for Update 6 will add validation.

### Physical format

| Spec | Value | Why |
|---|---|---|
| Card stock | matte, white or pale | Specular highlights blow out CLIP and confuse OCR. |
| Aspect ratio | 3:2 or 5:3 (landscape) | Matches the card preview in the scan view. |
| Print resolution | 300 dpi minimum | OCR begins to fail under 200 dpi on small caption text. |
| Margins | ≥ 8 mm all sides | Gives the YOLO localizer a clean boundary. |
| Recommended fonts | Inter, Source Serif Pro, Helvetica | The Phi-3 generator's training distribution biases toward these; OCR confidence is correspondingly higher. |
| Font size — title | 24–48 pt | |
| Font size — body | 10–14 pt | |
| Reserved color | none | Background may be tinted; foreground text must remain ≥ AA contrast. |

### Capture conditions

| Spec | Value |
|---|---|
| Lighting | even diffuse, ≥ 200 lux |
| Angle | within 15° of normal to the card surface |
| Card occupies | 35 %–80 % of frame area |
| Frame resolution | ≥ 720×480 (browser camera default is fine) |
| Motion blur | none — the prototype rejects frames where the YOLO box jitters > 12 px between consecutive previews |

### What the system captures

At capture time the scan view freezes a frame and records:

```
{
  frame:           <HTMLCanvasElement>,            // the raw capture
  topic_id:        "copper-sulfate",               // CLIP top-1
  hint_prompt:     "vivid blue ...",                // the winning prompt
  scan_mode:       "single" | "multi",
  box:             { x, y, w, h } | null,           // when in multi-object mode
  clip_score:      0.273,                           // similarity to the winning prompt
  capture_time_ms: 18342,
  device:          "mps" | "cuda" | "cpu"            // from YOLO server health
}
```

This tuple is the **state observation** used in [ALGORITHMS.md](ALGORITHMS.md).
The card that gets shown next is the **action**; the quiz outcome that
follows is the **reward**.

---

## 4. Corpus inventory (as of Update 5)

| Bucket | Count | Source | Format |
|---|---:|---|---|
| Authored cards | ~30 | Hand-written in `data.js` | Full card JSON + 2–4 CLIP prompts |
| Extended vocab | ~140 | Hand-written in `data.js` | CLIP prompts only |
| Generated cards | grows with use | Phi-3-mini at capture time | Full card JSON with `generated: true` |
| Quiz sessions | grows with use | `RT.quizSessions` | `(cardId, correct, total, at)` tuples |

Persistence: the authored and extended-vocab entries ship in source.
The generated cards and quiz sessions are session-local today and will
move to `localStorage` (and ultimately a small SQLite file) in Update 6,
along with the JSONL trajectory schema described in `ALGORITHMS.md`.

---

## 5. Licensing

- **Authored card content** is original work by the project team and is
  redistributable under the project license.
- **Generated card content** is produced by Phi-3-mini under MIT; the
  generated cards themselves are project-owned (the model is the tool,
  the outputs are the work).
- **Printed-card source images** captured during user studies will be
  treated as PII when faces or handwriting are present; the corpus we
  retain for offline RL is the *abstract trajectory*, not the raw
  frames, unless the participant has opted into image retention.
