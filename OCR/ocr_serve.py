"""
EasyOCR text extraction endpoint for the Lens prototype.

Route:
  GET  /health  — server status
  POST /ocr     — EasyOCR text extraction (returns extracted text lines)

Run with:
    pip install fastapi uvicorn easyocr pillow
    python OCR/ocr_serve.py

Defaults to http://localhost:8766. Permits all origins so the prototype
served from http://localhost:5500 can call it from the browser.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import time
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, Field
import easyocr

# --- Config ---------------------------------------------------------------

OCR_CONF = float(os.environ.get("LENS_OCR_CONF", "0.5"))
PORT     = int(os.environ.get("LENS_OCR_PORT", "8766"))

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ocr")

# --- App ------------------------------------------------------------------

app = FastAPI(title="Lens OCR server", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load EasyOCR ---------------------------------------------------------
log.info("Loading EasyOCR…")
reader = easyocr.Reader(["en"], gpu=False, verbose=False)
log.info("EasyOCR ready")


# --- Schema ---------------------------------------------------------------

class OcrRequest(BaseModel):
    image: str             = Field(..., description="data URL or raw base64 JPEG/PNG")
    conf:  Optional[float] = Field(None, ge=0, le=1)


class OcrLine(BaseModel):
    text:       str
    confidence: float
    bbox:       dict


class OcrResponse(BaseModel):
    image_size:   dict
    inference_ms: float
    raw_text:     str
    lines:        List[OcrLine]


# --- Helpers --------------------------------------------------------------

def decode_b64_image(s: str) -> Image.Image:
    if s.startswith("data:"):
        _, b64 = s.split(",", 1)
    else:
        b64 = s
    raw = base64.b64decode(b64)
    return Image.open(io.BytesIO(raw)).convert("RGB")


# --- Routes ---------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True, "ocr": "easyocr · en", "port": PORT}


@app.post("/ocr", response_model=OcrResponse)
def ocr(req: OcrRequest):
    try:
        im = decode_b64_image(req.image)
    except Exception as e:
        raise HTTPException(400, f"invalid image: {e}")

    conf_thresh = req.conf if req.conf is not None else OCR_CONF
    img_np      = np.array(im)

    t0      = time.perf_counter()
    results = reader.readtext(img_np)
    dt_ms   = (time.perf_counter() - t0) * 1000

    lines: list[OcrLine] = []
    for (bbox, text, confidence) in results:
        if confidence < conf_thresh:
            continue
        # Cast to float to avoid numpy.int32 serialization errors
        xs = [float(pt[0]) for pt in bbox]
        ys = [float(pt[1]) for pt in bbox]
        lines.append(OcrLine(
            text=text.strip(),
            confidence=round(float(confidence), 4),
            bbox={
                "x1": round(min(xs), 1),
                "y1": round(min(ys), 1),
                "x2": round(max(xs), 1),
                "y2": round(max(ys), 1),
            },
        ))

    raw_text = " ".join(line.text for line in lines)

    return OcrResponse(
        image_size={"w": im.width, "h": im.height},
        inference_ms=dt_ms,
        raw_text=raw_text,
        lines=lines,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")