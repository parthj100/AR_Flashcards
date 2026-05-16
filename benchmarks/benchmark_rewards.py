"""
Per-agent reward decomposition (Tier 1) — the direct analog to the
`rewards.txt` benchmark another team produced for their layout/style/budget
multi-agent system.

Their setup credits each agent for its placements and reports a per-channel
reward (Layout, Style, Budget) plus joint outcomes (utilization %, spend $).
Our pipeline is sequential rather than concurrent, so the reward shape is
different — but we can produce the same KIND of report:

  - one trajectory line per agent action
  - per-agent scalar reward
  - joint reward (the only thing the learner ultimately cares about)

# Tier 1 vs Tier 2

This is **Tier 1**: rewards are derived from each agent's own
self-reported confidence and from schema validity. No ground-truth labels
required — runnable today against whichever sidecars are up.

  YOLO    = top-box confidence  (×1 if any box found else ×0)
  OCR     = mean text confidence
  LLM     = 1.0 if FLASHCARD_SCHEMA parses else 0.0
  Joint   = 0.4·YOLO + 0.2·OCR + 0.4·LLM   (default weights, override w/ flags)

**Tier 2** (planned for Update 6) replaces these with accuracy against a
labeled evaluation set: IoU vs ground-truth boxes, correct/incorrect
routing, CER vs ground-truth text, factuality on a sampled subset, and
quiz outcomes for the joint reward. Same script, different reward
function.

Output mimics the other team's `rewards.txt` for direct side-by-side
comparison in the paper.

Run:
  python benchmarks/benchmark_rewards.py --limit 20

  # Tier-2 hook (when labels exist):
  python benchmarks/benchmark_rewards.py --labels benchmarks/labels.json
"""

from __future__ import annotations

import argparse
import csv
import json
import time
from collections import defaultdict
from pathlib import Path
from statistics import mean

from agents import (
    DEFAULT_YOLO, DEFAULT_OCR, DEFAULT_OLLAMA, DEFAULT_LLM_MODEL,
    yolo_health, yolo_detect,
    ocr_health, ocr_extract,
    ollama_health, llm_generate,
)

DEFAULT_IMAGES_DIR = "YOLOv8-Detection/dataset/images/raw"
DEFAULT_CLASSES = [
    "microscope", "calculator", "backpack",
    "periodic_table_poster", "globe_model", "safety_goggles",
]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def collect_images(images_dir: Path, classes: list[str], limit: int, *,
                   flat: bool = False) -> list[tuple[str, Path]]:
    """Collect images for the benchmark.

    flat=False (default): expects images_dir/<class>/*.jpg layout.
    flat=True: takes every image directly under images_dir, using the file
    stem as the class label (handy for OCR/test_images and other small
    labelled-by-filename sets).
    """
    out: list[tuple[str, Path]] = []
    if flat:
        for p in sorted(Path(images_dir).iterdir()):
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                out.append((p.stem, p))
    else:
        for cls in classes:
            d = images_dir / cls
            if not d.is_dir():
                continue
            for p in sorted(d.iterdir()):
                if p.suffix.lower() in IMAGE_EXTS:
                    out.append((cls, p))
    if limit and limit > 0:
        per_class: dict[str, list[Path]] = defaultdict(list)
        for cls, p in out:
            per_class[cls].append(p)
        n_per = max(1, limit // max(1, len(per_class)))
        balanced = []
        for cls, paths in per_class.items():
            balanced.extend((cls, p) for p in paths[:n_per])
            if len(balanced) >= limit:
                break
        return balanced[:limit]
    return out


# ----------- Tier 1 reward functions ---------------------------------------

def reward_yolo(yolo_result: dict | None) -> float:
    if not yolo_result or not yolo_result.get("ok"):
        return 0.0
    if yolo_result["n_detections"] == 0:
        return 0.0
    return float(yolo_result["top_conf"])


def reward_ocr(ocr_result: dict | None) -> float:
    if not ocr_result or not ocr_result.get("ok"):
        return 0.0
    return float(ocr_result["mean_conf"])


def reward_llm(llm_result: dict | None) -> float:
    if not llm_result or not llm_result.get("ok"):
        return 0.0
    return 1.0 if llm_result["schema_valid"] else 0.0


def joint_reward(weights: dict[str, float], rewards: dict[str, float]) -> float:
    total_w = sum(weights[k] for k in rewards if rewards[k] is not None)
    if total_w == 0:
        return 0.0
    s = sum(weights[k] * rewards[k] for k in rewards if rewards[k] is not None)
    return s / total_w


# ----------- Run -----------------------------------------------------------

def run(args):
    print("=" * 64)
    print("  Per-agent reward decomposition (Tier 1)")
    print("=" * 64)

    enabled = {"yolo": not args.skip_yolo, "ocr": not args.skip_ocr, "llm": not args.skip_llm}
    if enabled["yolo"]:
        h = yolo_health(args.yolo)
        if not h.get("ok"):
            print(f"  yolo : DOWN  ({h.get('error', '')[:80]})  — skipping")
            enabled["yolo"] = False
        else:
            print(f"  yolo : UP    {h}")
    if enabled["ocr"]:
        h = ocr_health(args.ocr)
        if not h.get("ok"):
            print(f"  ocr  : DOWN  ({h.get('error', '')[:80]})  — skipping")
            enabled["ocr"] = False
        else:
            print(f"  ocr  : UP    {h}")
    if enabled["llm"]:
        h = ollama_health(args.ollama, args.llm_model)
        if not h.get("ok"):
            print(f"  llm  : DOWN  ({h.get('error', '')[:80]})  — skipping")
            enabled["llm"] = False
        else:
            print(f"  llm  : UP    {h}")

    weights = {"yolo": args.w_yolo, "ocr": args.w_ocr, "llm": args.w_llm}

    images = collect_images(Path(args.images_dir), args.classes, args.limit,
                            flat=args.flat)
    if not images:
        print(f"\n  ERROR: no images under {args.images_dir}")
        return 1
    print(f"\n  Images : {len(images)}")
    print(f"  Weights: yolo={weights['yolo']}  ocr={weights['ocr']}  llm={weights['llm']}\n")

    trajectory_lines: list[str] = []
    per_agent_rewards = {"yolo": [], "ocr": [], "llm": []}
    joint_rewards: list[float] = []
    rows = []

    t_wall = time.perf_counter()
    for i, (cls, p) in enumerate(images, 1):
        rewards = {"yolo": None, "ocr": None, "llm": None}
        latencies = {"yolo": None, "ocr": None, "llm": None}
        details: dict[str, str] = {}

        if enabled["yolo"]:
            r = yolo_detect(p, conf=args.yolo_conf, endpoint=args.yolo)
            if r.get("ok"):
                rewards["yolo"] = reward_yolo(r)
                latencies["yolo"] = r["wall_ms"]
                trajectory_lines.append(
                    f"  [yolo_agent]    img={cls}/{p.name}  "
                    f"top={r['top_class']!s:<14}  conf={r['top_conf']:.3f}  "
                    f"n_det={r['n_detections']:<2} | {r['wall_ms']:.1f} ms"
                )
                details["yolo_top"] = str(r["top_class"])
                details["yolo_conf"] = f"{r['top_conf']:.4f}"
            else:
                trajectory_lines.append(
                    f"  [yolo_agent]    img={cls}/{p.name}  ERROR {r.get('error','')[:60]}"
                )

        if enabled["ocr"]:
            r = ocr_extract(p, conf=args.ocr_conf, endpoint=args.ocr)
            if r.get("ok"):
                rewards["ocr"] = reward_ocr(r)
                latencies["ocr"] = r["wall_ms"]
                trajectory_lines.append(
                    f"  [ocr_agent]     img={cls}/{p.name}  "
                    f"lines={r['n_lines']:<3}  mean_conf={r['mean_conf']:.3f}"
                    f"            | {r['wall_ms']:.0f} ms"
                )
                details["ocr_lines"] = str(r["n_lines"])
                details["ocr_conf"] = f"{r['mean_conf']:.4f}"
            else:
                trajectory_lines.append(
                    f"  [ocr_agent]     img={cls}/{p.name}  ERROR {r.get('error','')[:60]}"
                )

        if enabled["llm"]:
            topic = (details.get("yolo_top") or cls).replace("_", " ")
            r = llm_generate(topic, host=args.ollama, model=args.llm_model)
            if r.get("ok"):
                rewards["llm"] = reward_llm(r)
                latencies["llm"] = r["wall_ms"]
                ok_marker = "✓" if r["schema_valid"] else "✗"
                trajectory_lines.append(
                    f"  [llm_agent]     topic={topic!s:<22}  schema={ok_marker}  "
                    f"tokens={r['tokens']:<3}  tps={r['tokens_per_sec']:.1f} | {r['wall_ms']:.0f} ms"
                )
                details["llm_topic"] = topic
                details["llm_schema_valid"] = str(r["schema_valid"])
            else:
                trajectory_lines.append(
                    f"  [llm_agent]     topic={topic!s:<22}  ERROR {r.get('error','')[:60]}"
                )

        joint = joint_reward(weights, {k: v for k, v in rewards.items() if v is not None})
        joint_rewards.append(joint)
        for k in per_agent_rewards:
            if rewards[k] is not None:
                per_agent_rewards[k].append(rewards[k])

        rows.append({
            "image":        f"{cls}/{p.name}",
            "yolo_reward":  "" if rewards["yolo"] is None else round(rewards["yolo"], 4),
            "ocr_reward":   "" if rewards["ocr"]  is None else round(rewards["ocr"],  4),
            "llm_reward":   "" if rewards["llm"]  is None else round(rewards["llm"],  4),
            "joint_reward": round(joint, 4),
            "yolo_ms":      "" if latencies["yolo"] is None else round(latencies["yolo"], 1),
            "ocr_ms":       "" if latencies["ocr"]  is None else round(latencies["ocr"],  1),
            "llm_ms":       "" if latencies["llm"]  is None else round(latencies["llm"],  1),
            **details,
        })

        if i % 5 == 0 or i == len(images):
            print(f"    [{i}/{len(images)}] {cls}/{p.name}  joint={joint:.3f}")

    total_wall_s = time.perf_counter() - t_wall

    # ------------------------------------------------------------------
    # Aggregate + write
    # ------------------------------------------------------------------
    out_dir = Path(args.results_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    stem = out_dir / f"rewards_{ts}"

    # CSV (per image)
    fieldnames = sorted({k for r in rows for k in r.keys()})
    with stem.with_suffix(".csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    # rewards.txt-style report (matches the other team's format)
    txt = []
    txt.append("Multi-Agent Pipeline Rewards (AR Flashcard Tutor)")
    txt.append("=" * 64)
    txt.append("")
    txt.append(f"Images processed:   {len(images)}")
    txt.append(f"Wall clock:         {total_wall_s:.2f} s")
    txt.append(f"Mean per-image:     {(total_wall_s * 1000 / max(1, len(images))):.0f} ms")
    txt.append(f"Reward weights:     yolo={weights['yolo']}  ocr={weights['ocr']}  llm={weights['llm']}")
    txt.append(f"Tier:               1 (self-reported confidence + schema validity; no labels)")
    txt.append("")
    txt.append("Agent Trajectory:")
    for line in trajectory_lines:
        txt.append(line)
    txt.append("")
    if per_agent_rewards["yolo"]:
        txt.append(f"YOLO Reward (mean):    {mean(per_agent_rewards['yolo']):.4f}   "
                   f"(n={len(per_agent_rewards['yolo'])})")
    else:
        txt.append("YOLO Reward:           SKIPPED")
    if per_agent_rewards["ocr"]:
        txt.append(f"OCR Reward  (mean):    {mean(per_agent_rewards['ocr']):.4f}   "
                   f"(n={len(per_agent_rewards['ocr'])})")
    else:
        txt.append("OCR Reward:            SKIPPED")
    if per_agent_rewards["llm"]:
        txt.append(f"LLM Reward  (mean):    {mean(per_agent_rewards['llm']):.4f}   "
                   f"(n={len(per_agent_rewards['llm'])}, "
                   f"schema-valid rate {sum(per_agent_rewards['llm'])/len(per_agent_rewards['llm']):.2%})")
    else:
        txt.append("LLM Reward:            SKIPPED")
    txt.append(f"Joint Reward (mean):   {mean(joint_rewards):.4f}   (n={len(joint_rewards)})")
    txt.append("")
    txt.append("Total Spend:           $0.00 (all-local inference, no cloud calls)")
    txt.append(f"Schema-validity rate:  "
               f"{(sum(per_agent_rewards['llm'])/len(per_agent_rewards['llm'])*100 if per_agent_rewards['llm'] else 0):.1f}%")
    (stem.with_suffix(".txt")).write_text("\n".join(txt) + "\n")

    # Markdown summary
    md = []
    md.append(f"# Per-agent reward decomposition\n")
    md.append(f"- images : `{len(images)}`\n")
    md.append(f"- tier   : `1` (self-reported confidence + schema validity)\n")
    md.append(f"- wall_s : `{total_wall_s:.2f}`\n")
    md.append(f"- timestamp: `{ts}`\n\n")
    md.append("## Per-agent mean reward\n\n")
    md.append("| agent | n | mean reward |\n|---|---:|---:|\n")
    for k in ("yolo", "ocr", "llm"):
        if per_agent_rewards[k]:
            md.append(f"| {k} | {len(per_agent_rewards[k])} | {mean(per_agent_rewards[k]):.4f} |\n")
        else:
            md.append(f"| {k} | 0 | — (skipped) |\n")
    md.append(f"| **joint** | {len(joint_rewards)} | **{mean(joint_rewards):.4f}** |\n\n")
    md.append("## Per-image rewards (first 20)\n\n")
    md.append("| image | yolo R | ocr R | llm R | joint R |\n|---|---:|---:|---:|---:|\n")
    for r in rows[:20]:
        md.append(f"| `{r['image']}` | {r['yolo_reward']} | {r['ocr_reward']} "
                  f"| {r['llm_reward']} | {r['joint_reward']} |\n")
    md.append("\nFull trajectory in the .txt sibling.\n")
    (stem.with_suffix(".md")).write_text("".join(md))

    print("\n" + "=" * 64)
    print(f"  Done. {len(images)} images, joint reward mean = {mean(joint_rewards):.4f}")
    for k in ("yolo", "ocr", "llm"):
        if per_agent_rewards[k]:
            print(f"    {k:<5} mean reward = {mean(per_agent_rewards[k]):.4f}  "
                  f"(n={len(per_agent_rewards[k])})")
    print(f"  rewards.txt-style: {stem.with_suffix('.txt')}")
    print(f"  Markdown summary : {stem.with_suffix('.md')}")
    print("=" * 64)
    return 0


def main():
    p = argparse.ArgumentParser(description="Per-agent reward decomposition (Tier 1)")
    p.add_argument("--images-dir", default=DEFAULT_IMAGES_DIR)
    p.add_argument("--classes",    nargs="+", default=DEFAULT_CLASSES)
    p.add_argument("--flat",       action="store_true",
                   help="treat --images-dir as a flat folder of images "
                        "(file stem becomes the class label). Use for "
                        "OCR/test_images and similar small labelled sets.")
    p.add_argument("--limit",      type=int, default=20)
    p.add_argument("--yolo",       default=DEFAULT_YOLO)
    p.add_argument("--ocr",        default=DEFAULT_OCR)
    p.add_argument("--ollama",     default=DEFAULT_OLLAMA)
    p.add_argument("--llm-model",  default=DEFAULT_LLM_MODEL)
    p.add_argument("--yolo-conf",  type=float, default=0.25)
    p.add_argument("--ocr-conf",   type=float, default=0.5)
    p.add_argument("--w-yolo",     type=float, default=0.4)
    p.add_argument("--w-ocr",      type=float, default=0.2)
    p.add_argument("--w-llm",      type=float, default=0.4)
    p.add_argument("--skip-yolo",  action="store_true")
    p.add_argument("--skip-ocr",   action="store_true")
    p.add_argument("--skip-llm",   action="store_true")
    p.add_argument("--results-dir", default="benchmarks/results")
    args = p.parse_args()
    raise SystemExit(run(args))


if __name__ == "__main__":
    main()
