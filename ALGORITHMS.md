# Algorithmic framing — imitation learning + offline RL

This document situates the AR Flashcard Tutor inside the class taxonomy of
sequential-decision learning. It is the discussion the reviewer asked for in
the Update-5 feedback; concrete results are deferred to Update 6.

## Why this framing is natural for the project

The system already collects two complementary streams of supervision on its
own. We did not design the data pipeline with RL/IL in mind, but the shape
of what gets logged makes the mapping almost mechanical:

| Stream | Where it comes from | What it looks like |
|---|---|---|
| **Expert demonstrations** | Hand-authored flashcards in `prototype/data.js → flashcards[id]` | `(topic, full card JSON)` — every field filled by a human author who knew what a good card looks like |
| **Sub-optimal trajectories** | LLM-generated cards (`RT.generatedCards`) plus subsequent quiz outcomes (`RT.quizSessions` — `{ cardId, correct, total, at }`) | `(topic, card JSON, scalar reward)` — the model picked the action, the learner graded it |

The authored cards in `data.js` are an *expert policy rollout* over the set
of recognizable topics. The generated cards are a *behavior policy* whose
quality is mixed, and whose value we observe only through downstream quiz
success — i.e. a classic logged-bandit / offline-RL setting.

## The MDP, made concrete

The decision step happens at **capture time**, once per scan:

- **State `s`**: the recognized topic identifier (CLIP top-1 from
  [prototype/lib/clip.js](prototype/lib/clip.js)) plus the winning prompt as
  visual hint. In the multi-object scan path it also includes the YOLO box
  that the user picked. State is therefore a tuple
  `(topic_id, hint_prompt, box_feature?, learner_id)`.
- **Action `a`**: the flashcard JSON the system shows. The action space is
  *structured generation* — a `name / subject / formula / mass / oneline /
  facts[4]` object whose schema is fixed by
  [prototype/lib/llm.js → FLASHCARD_SCHEMA](prototype/lib/llm.js). Two coarse
  modes — `serve the authored card` (when `flashcards[id]` exists) vs
  `generate via Phi-3` (otherwise) — are themselves a discrete choice.
- **Reward `r`**: the per-card quiz signal recorded in
  [prototype/app.js → RT.quizSessions](prototype/app.js). Today this is
  `correct / total` on the next quiz session that references the card. A
  richer version would include time-to-answer and a "save to deck" implicit
  signal. The reward is **delayed** and **noisy**: a single quiz tick is a
  weak estimate of a card's true pedagogical value, and the learner sees
  the card before answering, so the reward depends on both card quality
  and learner ability.
- **Discount / horizon**: episodes are one-step at capture time (bandit
  view), but if we want to credit cards for long-term retention the horizon
  extends to the spaced-repetition schedule and the formulation becomes
  multi-step contextual.

We treat this as a **logged, off-policy** problem from the start. Running
an online RL loop against learners would be a data-collection liability
(noisy individual rewards × identifiable trajectories) and a UX one
(experimentally bad cards would degrade study sessions). The whole point
of the offline-RL framing is that we can keep generating with the current
behavior policy in production while training a better policy on the logs.

## Algorithm picks, justified

### Imitation learning on the authored cards

The authored cards are tiny in count (~30 hand-written entries in
`data.js`) but high in quality. Plain **behavioral cloning** is the
appropriate starting point: maximize `log π_θ(a* | s)` where `a*` is the
expert card and `π_θ` is the LLM-shaped policy. Because actions are
structured text under a JSON schema, BC is effectively a supervised
fine-tune on `(topic → card JSON)` pairs.

This is the natural way to bootstrap a fine-tuned Phi-3 — start by
matching the expert authors' style, *then* improve on top of that with
reward signal. It also addresses an under-discussed problem with LLM
flashcards: small models drift in tone (the system prompt in `llm.js`
spends most of its budget pushing back against marketing-fluff defaults).
BC pins the policy near the authored style for free.

Caveats specific to our setup:

- Action space is high-dimensional structured output, so BC on raw
  token-level cross-entropy will over-fit on surface form. Schema-aware
  losses (per-field) or KL-against-base regularization (LoRA-style) help.
- The expert distribution is biased toward the topics the authors found
  interesting. We need to be honest about coverage when reporting BC
  performance on out-of-distribution topics — i.e. report `(in-vocab,
  extendedVocab, generated-only)` cohorts separately.

### Offline RL on the generated + feedback subset

Once the logs include enough `(state, generated card, reward)` triples,
the natural extension is **conservative offline RL**. Three candidates,
in increasing complexity:

1. **CQL (Conservative Q-Learning)** — penalize Q-values on out-of-data
   actions so the learned policy does not exploit extrapolation. For text
   actions this means a Q-head over the LLM's generation distribution and
   a regularizer that pulls down Q for low-density continuations.
2. **IQL (Implicit Q-Learning)** — fit `V(s)` with an expectile loss,
   advantage-weight the policy update. Avoids the explicit Q-over-action
   max that text spaces make ugly. Works well with weak/delayed rewards
   like ours.
3. **AWAC (Advantage-Weighted Actor-Critic)** — practical, BC-anchored,
   easy to bolt onto the same model used for BC. Probably the most
   defensible first choice given the data scale.

We expect to start with **AWAC anchored to the BC policy**, then evaluate
CQL/IQL when the logs grow.

### Why not online RL, PPO from feedback, or pure DPO

- **Online RL on learners** is ruled out for the reasons above.
- **RLHF / PPO** requires a separate preference labeling pipeline that we
  don't have a budget to staff. Our reward already exists — quiz outcomes
  — just not as pairwise preferences. Converting them to preferences
  throws information away.
- **DPO** is tempting and could be used on `(authored, generated)` pairs
  for the same topic, but most of our generated cards have no matching
  authored card, so DPO would only cover a small slice. Worth doing as a
  side experiment, not the main track.

## Data accounting

Currently logged in-memory by [prototype/app.js → RT](prototype/app.js):

- `RT.captures` — `(id, topic, subject, when, isGenerated)`. Identifies
  *which* topics got scanned and whether the served card was authored or
  generated.
- `RT.generatedCards` — `id → full card JSON`. The action taken.
- `RT.quizSessions` — `(cardId, correct, total, at)`. The reward.

Persistence is the *one* blocker between framing and training: today this
is session-local. The Update-5 next-steps list already calls out
`localStorage` or a small SQLite sidecar for this; we plan a 4-tuple
schema:

```jsonl
{"t": "2026-05-13T22:11:04Z", "learner_id": "...", "state": {"topic": "copper-sulfate", "hint": "...", "box": null}, "action": {...card JSON...}, "reward": {"correct": 5, "total": 6, "answered_in_ms": 18342}}
```

JSONL is intentional: streaming-friendly and easy to convert to the
trajectories format any of the algorithms above expect.

## What a minimum-viable result would look like

The reviewer noted no result is required yet. For Update 6 we plan two:

1. **BC on authored cards → offline eval against a held-out 20 % of
   authored cards.** Metric: schema validity (% of generations that parse
   under `FLASHCARD_SCHEMA`), tone-match (cosine vs author embeddings),
   and a tiny human-graded factuality check on a sample.
2. **AWAC on the BC policy using the logged (s, a, r) triples** once we
   have ~500+ rewarded generations. Metric: off-policy estimator (WIS or
   doubly-robust) on a frozen evaluation log.

Both fit a couple of Colab GPU-hours and stay inside the project's
"no live experimentation on learners" constraint.

## References

- Levine, S., et al. (2020). *Offline Reinforcement Learning: Tutorial,
  Review, and Perspectives on Open Problems*. arXiv:2005.01643.
- Kumar, A., et al. (2020). *Conservative Q-Learning for Offline RL*.
  NeurIPS.
- Kostrikov, I., et al. (2021). *Offline Reinforcement Learning with
  Implicit Q-Learning*. ICLR 2022.
- Nair, A., et al. (2020). *AWAC: Accelerating Online Reinforcement
  Learning with Offline Datasets*. arXiv:2006.09359.
- Rafailov, R., et al. (2023). *Direct Preference Optimization*. NeurIPS.
