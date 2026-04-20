# AR Flashcard Tutor

An AI-powered augmented reality application that scans physical objects or printed flashcards through a device camera and generates real-time educational overlays — including explanations, quiz questions, and visual annotations.

Built as part of a research project on **Standardized Benchmarking of Multi-Agent Distributed Machine Learning in Augmented Reality**.

---

## Project Scope

The AR Flashcard Tutor explores whether a multi-agent, edge-distributed AR pipeline can deliver accurate, context-aware educational overlays in real time on commodity hardware. The system follows a four-stage pipeline:

1. **Object Detection** — Identify and localize objects or flashcards in the camera feed
2. **OCR Text Extraction** — Read printed text from detected flashcard regions
3. **LLM Explanation + Quiz Generation** — Generate a concise explanation and a multiple-choice question based on the detected content
4. **Visual Annotation & AR Overlay** — Render bounding boxes, labels, explanations, and quiz panels directly on the live camera feed

---

## Tech Stack

### Models

| Component | Model | Source |
|---|---|---|
| Object Detection | YOLOv8-Nano | [Ultralytics GitHub](https://github.com/ultralytics/ultralytics) (Apache 2.0) |
| OCR | PaddleOCR | [PaddlePaddle GitHub](https://github.com/PaddlePaddle/PaddleOCR) (Apache 2.0) |
| Explanation + Quiz Generation | Phi-3-mini (on-device) / GPT-4.1-mini (cloud fallback) | [HuggingFace](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct) / [OpenAI API](https://platform.openai.com/) |
| Visual Annotation | SAM 2 (Segment Anything Model 2) | [Meta AI GitHub](https://github.com/facebookresearch/segment-anything-2) (Apache 2.0) |

### Datasets

| Dataset | Purpose | Source |
|---|---|---|
| ImageNet (ILSVRC) | Object recognition pre-training | [image-net.org](https://image-net.org/) |
| COCO | Object detection & segmentation | [cocodataset.org](https://cocodataset.org/) |
| Open Images V7 | Extended detection with visual relationships | [GitHub](https://github.com/openimages) |
| SQuAD 2.0 / TriviaQA | Quiz generation fine-tuning | [HuggingFace](https://huggingface.co/datasets/rajpurkar/squad_v2) |
| Custom Flashcard Dataset | Domain-specific card recognition | Self-collected, annotated via [Roboflow](https://roboflow.com/) |

### Frontend & Platform

- **Web-based UI** — HTML, CSS, JavaScript
- **TensorFlow.js** — In-browser model inference (COCO-SSD for prototyping)
- **WebXR** — AR camera access and overlay rendering
- **Canvas API / OpenCV.js** — Bounding box and annotation drawing

### Dev Tools

- **Google Colab** — Model training and fine-tuning (free GPU)
- **Roboflow** — Dataset annotation and management
- **Python** — Backend pipeline prototyping and model evaluation

---

## Pipeline Architecture

```
Camera Frame
    │
    ▼
┌──────────────┐
│  YOLOv8-Nano │  ──→  Detected class label + bounding box
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  PaddleOCR   │  ──→  Extracted text from flashcard
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  Phi-3-mini / GPT-4.1│  ──→  Explanation (2-3 sentences) + Quiz (MCQ in JSON)
└──────┬───────────────┘
       │
       ▼
┌──────────────┐
│  SAM 2 + UI  │  ──→  Segmentation mask + overlay (labels, explanation card, quiz panel)
└──────────────┘
```

---

## Project Structure

```
ar-flashcard-tutor/
├── README.md
├── data/                  # Datasets and custom flashcard images
├── models/                # Model weights and configs
├── notebooks/             # Colab notebooks for training and evaluation
├── src/                   # Source code
│   ├── detection/         # YOLOv8 detection pipeline
│   ├── ocr/               # PaddleOCR integration
│   ├── llm/               # LLM prompt templates and API calls
│   ├── overlay/           # AR overlay and annotation rendering
│   └── ui/                # Frontend HTML/CSS/JS
├── results/               # Benchmark tables, accuracy logs, screenshots
└── docs/                  # Research updates and final report
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js (for TensorFlow.js dev server)
- Google Colab account (for training)
- OpenAI API key (for GPT-4.1-mini cloud fallback)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/<your-username>/ar-flashcard-tutor.git
cd ar-flashcard-tutor

# Install Python dependencies
pip install ultralytics paddleocr opencv-python

# Run the web UI locally
cd src/ui
# Open ar_flashcard_detector.html in Chrome
```

---

## Team

| Name | Role |
|---|---|
| **Parthkumar Joshi** | OCR integration, LLM pipeline, UI development, benchmarking |
| **Alexis Juarez Gomez** | Object detection, dataset collection & annotation, SAM 2 integration, fine-tuning |

---

## References

- Jocher, G., et al. (2023). *Ultralytics YOLOv8*. [GitHub](https://github.com/ultralytics/ultralytics)
- PaddlePaddle Authors. (2022). *PaddleOCR*. [GitHub](https://github.com/PaddlePaddle/PaddleOCR)
- Microsoft Research. (2024). *Phi-3 Technical Report*. [HuggingFace](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct)
- Ravi, N., et al. (2024). *SAM 2: Segment Anything in Images and Videos*. [GitHub](https://github.com/facebookresearch/segment-anything-2)
- Lin, T.-Y., et al. (2014). *Microsoft COCO: Common Objects in Context*. ECCV 2014
- Zhu, K., et al. (2025). *MultiAgentBench: Evaluating the Collaboration and Competition of LLM Agents*. arXiv
- Rein, D., et al. (2024). *GAIA: A Benchmark for General AI Assistants*. arXiv

---

## License

This project is for academic/research purposes.
