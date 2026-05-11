// === Camera helper — getUserMedia wrapper + frame capture ===
// Public API:
//   const cam = new Camera();
//   await cam.start(videoEl);       // attach live stream, returns { width, height }
//   cam.captureFrame(size=224);     // returns an offscreen canvas sized for CLIP
//   cam.stop();
//
// Errors thrown carry a .code so the UI can distinguish permission vs no-device.

export class Camera {
  constructor() {
    this.stream = null;
    this.videoEl = null;
    this._canvas = document.createElement('canvas');
  }

  async start(videoEl, { facingMode = 'environment' } = {}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const e = new Error('Camera API not available (HTTPS or localhost required).');
      e.code = 'unsupported';
      throw e;
    }
    this.videoEl = videoEl;

    // Try rear camera first (mobile); fall back to any camera (laptop webcams
    // ignore facingMode and will just return the default device).
    const attempts = [
      { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: true, audio: false },
    ];

    let lastErr;
    for (const constraints of attempts) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!this.stream) {
      const e = new Error(lastErr?.message || 'Could not open camera.');
      e.code = lastErr?.name === 'NotAllowedError' ? 'denied'
             : lastErr?.name === 'NotFoundError' ? 'no-device'
             : 'unknown';
      throw e;
    }

    videoEl.srcObject = this.stream;
    videoEl.muted = true;
    videoEl.playsInline = true;
    await videoEl.play();

    // Wait for real metadata so we know dimensions
    if (!videoEl.videoWidth) {
      await new Promise((resolve) => {
        const onMeta = () => { videoEl.removeEventListener('loadedmetadata', onMeta); resolve(); };
        videoEl.addEventListener('loadedmetadata', onMeta);
      });
    }

    return { width: videoEl.videoWidth, height: videoEl.videoHeight };
  }

  /**
   * Capture the center-cropped square of the current frame, resized to `size`.
   * This matches what CLIP's processor expects (and also ignores the letterbox
   * bars at the edges of a wide webcam feed, which would otherwise bias the
   * embedding toward "a photo of a dark bar").
   */
  captureFrame(size = 224) {
    const v = this.videoEl;
    if (!v || !v.videoWidth) return null;
    const vw = v.videoWidth, vh = v.videoHeight;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;

    this._canvas.width = size;
    this._canvas.height = size;
    const ctx = this._canvas.getContext('2d');
    ctx.drawImage(v, sx, sy, side, side, 0, 0, size, size);
    return this._canvas;
  }

  stop() {
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
  }
}
