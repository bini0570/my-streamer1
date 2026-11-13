import * as ort from 'onnxruntime-web';
import { getCocoClass } from '../data/cocoClasses.js';

export class YoloDetector {
  constructor() {
    this.session = null;
    this.cachedModelBuffer = null;
    this.isLoaded = false;
    this.isInferencing = false;
    this.engineMode = 'webgl';

    // Fixed input dimensions for YOLO11n
    this.inputWidth = 640;
    this.inputHeight = 640;

    // Offscreen canvas for preprocessing
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.inputWidth;
    this.offscreenCanvas.height = this.inputHeight;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // Pre-allocated Float32Array to avoid garbage collection frame drops
    this.preallocatedTensorData = new Float32Array(1 * 3 * this.inputWidth * this.inputHeight);
  }

  async loadModel(onProgress) {
    if (this.isLoaded && this.session) return true;

    try {
      onProgress?.('Configuring AI Neural Engine...');

      // Single thread prevents SharedArrayBuffer restrictions on Android WebViews
      ort.env.wasm.numThreads = 1;

      onProgress?.('Loading YOLO11n weights...');

      const currentDir = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
      const basePath = import.meta.env.BASE_URL || './';

      const candidateUrls = [
        new URL('models/yolo11n.onnx', currentDir).href,
        `${basePath}models/yolo11n.onnx`,
        './models/yolo11n.onnx',
        'models/yolo11n.onnx',
      ];

      let modelSource = candidateUrls[0];

      for (const url of candidateUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            if (buf.byteLength > 5000000) {
              this.cachedModelBuffer = buf;
              modelSource = buf;
              console.log(`[YoloDetector] Verified model binary (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB)`);
              break;
            }
          }
        } catch {
          // try next candidate
        }
      }

      onProgress?.('Initializing GPU Shaders...');

      // Try WebGL GPU acceleration first
      try {
        this.session = await ort.InferenceSession.create(modelSource, {
          executionProviders: ['webgl'],
          graphOptimizationLevel: 'basic',
        });
        this.engineMode = 'webgl';
        console.log('[YoloDetector] Initialized with WebGL GPU acceleration');
      } catch (webglErr) {
        console.warn('[YoloDetector] WebGL initialization failed, switching to WASM:', webglErr);
        onProgress?.('Switching to WASM engine...');
        this.session = await ort.InferenceSession.create(modelSource, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        this.engineMode = 'wasm';
        console.log('[YoloDetector] Initialized with WASM CPU engine');
      }

      this.isLoaded = true;
      onProgress?.('YOLO11n Ready');
      return true;
    } catch (err) {
      console.error('[YoloDetector] Failed to load YOLO11n model:', err);
      this.isLoaded = false;
      return false;
    }
  }

  getEngineMode() {
    return this.engineMode;
  }

  isModelReady() {
    return this.isLoaded && this.session !== null;
  }

  isBusy() {
    return this.isInferencing;
  }

  /**
   * Run real-time YOLO11n inference on a video frame.
   * Fully safeguarded against memory leaks, hangs, and GPU stalls.
   */
  async detect(video, confidenceThreshold = 0.45, iouThreshold = 0.45) {
    if (!this.session || !this.isLoaded || this.isInferencing) {
      return [];
    }

    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return [];
    }

    this.isInferencing = true;
    let inputTensor = null;
    let outputTensor = null;

    try {
      // 1. Draw video frame into 640x640 offscreen canvas
      this.offscreenCtx.drawImage(
        video,
        0,
        0,
        video.videoWidth,
        video.videoHeight,
        0,
        0,
        this.inputWidth,
        this.inputHeight
      );

      // 2. Preprocess pixels into planar RGB Float32Array [1, 3, 640, 640]
      const imageData = this.offscreenCtx.getImageData(0, 0, this.inputWidth, this.inputHeight);
      const rgbaData = imageData.data;
      const totalPixels = this.inputWidth * this.inputHeight;
      const rOffset = 0;
      const gOffset = totalPixels;
      const bOffset = totalPixels * 2;
      const tensorBuffer = this.preallocatedTensorData;

      for (let i = 0, p = 0; i < totalPixels; i++, p += 4) {
        tensorBuffer[rOffset + i] = rgbaData[p] / 255.0;
        tensorBuffer[gOffset + i] = rgbaData[p + 1] / 255.0;
        tensorBuffer[bOffset + i] = rgbaData[p + 2] / 255.0;
      }

      // 3. Create input tensor and run inference with 1.5s timeout safeguard
      inputTensor = new ort.Tensor('float32', tensorBuffer, [1, 3, this.inputHeight, this.inputWidth]);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Inference timeout')), 1500)
      );

      let results;
      try {
        results = await Promise.race([
          this.session.run({ images: inputTensor }),
          timeoutPromise,
        ]);
      } catch (runErr) {
        console.warn('[YoloDetector] Inference run failed/timed out, auto-healing:', runErr);

        if (this.engineMode === 'webgl' && this.cachedModelBuffer) {
          try {
            this.session = await ort.InferenceSession.create(this.cachedModelBuffer, {
              executionProviders: ['wasm'],
              graphOptimizationLevel: 'all',
            });
            this.engineMode = 'wasm';
          } catch (recreateErr) {
            console.error('[YoloDetector] Auto-healing WASM switch failed:', recreateErr);
          }
        }
        return [];
      }

      // 4. Parse YOLO11 output shape [1, 84, 8400]
      outputTensor = results.output0 || Object.values(results)[0];
      if (!outputTensor) {
        return [];
      }

      const outputData = outputTensor.data;
      const numAnchors = 8400;

      // 5. Blazing-fast sequential contiguous row scan
      const candidateDetections = [];

      for (let classId = 0; classId < 80; classId++) {
        const rowOffset = (4 + classId) * numAnchors;

        for (let col = 0; col < numAnchors; col++) {
          const score = outputData[rowOffset + col];

          if (score >= confidenceThreshold) {
            const cx = outputData[0 * numAnchors + col];
            const cy = outputData[1 * numAnchors + col];
            const w = outputData[2 * numAnchors + col];
            const h = outputData[3 * numAnchors + col];

            const normX = Math.max(0, Math.min(1, (cx - w / 2) / this.inputWidth));
            const normY = Math.max(0, Math.min(1, (cy - h / 2) / this.inputHeight));
            const normW = Math.max(0, Math.min(1 - normX, w / this.inputWidth));
            const normH = Math.max(0, Math.min(1 - normY, h / this.inputHeight));

            if (normW > 0.015 && normH > 0.015) {
              const classInfo = getCocoClass(classId);
              candidateDetections.push({
                classId,
                className: classInfo.name,
                category: classInfo.category,
                confidence: score,
                bbox: {
                  x: normX,
                  y: normY,
                  width: normW,
                  height: normH,
                },
              });
            }
          }
        }
      }

      // Limit candidates before NMS to maintain 60 FPS
      if (candidateDetections.length > 60) {
        candidateDetections.sort((a, b) => b.confidence - a.confidence);
        candidateDetections.length = 60;
      }

      // 6. Apply Non-Maximum Suppression (NMS)
      const filteredDetections = this.applyNMS(candidateDetections, iouThreshold);
      return filteredDetections;
    } catch (err) {
      console.error('[YoloDetector] Error during detection:', err);
      return [];
    } finally {
      // Free GPU textures
      try {
        if (inputTensor && typeof inputTensor.dispose === 'function') {
          inputTensor.dispose();
        }
        if (outputTensor && typeof outputTensor.dispose === 'function') {
          outputTensor.dispose();
        }
      } catch {
        // ignore
      }
      this.isInferencing = false;
    }
  }

  /**
   * Apply class-aware Non-Maximum Suppression (NMS)
   */
  applyNMS(detections, iouThreshold) {
    if (detections.length <= 1) return detections;

    detections.sort((a, b) => b.confidence - a.confidence);

    const selected = [];
    const suppressed = new Uint8Array(detections.length);

    for (let i = 0; i < detections.length; i++) {
      if (suppressed[i] === 1) continue;

      const current = detections[i];
      selected.push(current);

      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed[j] === 1) continue;

        const candidate = detections[j];
        if (current.classId === candidate.classId) {
          const iou = this.calculateIoU(current.bbox, candidate.bbox);
          if (iou >= iouThreshold) {
            suppressed[j] = 1;
          }
        }
      }
    }

    return selected;
  }

  /**
   * Intersection over Union (IoU) between two bounding boxes
   */
  calculateIoU(box1, box2) {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (intersectionArea === 0) return 0;

    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const unionArea = area1 + area2 - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  dispose() {
    if (this.session) {
      this.session = null;
      this.isLoaded = false;
    }
  }
}

export const yoloDetector = new YoloDetector();
