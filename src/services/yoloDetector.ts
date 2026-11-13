import * as ort from 'onnxruntime-web';
import { COCO_CLASSES, getCocoClass } from '../data/cocoClasses';
import { BoundingBox, RawDetection } from '../types';

export class YoloDetector {
  private session: ort.InferenceSession | null = null;
  private isLoaded: boolean = false;
  private isInferencing: boolean = false;
  private engineMode: 'webgl' | 'wasm' | 'cpu' = 'webgl';

  // Fixed input dimensions for YOLO11n
  private readonly inputWidth: number = 640;
  private readonly inputHeight: number = 640;

  // Offscreen canvas for preprocessing
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  // Pre-allocated Float32Array to avoid garbage collection churn
  private preallocatedTensorData: Float32Array;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.inputWidth;
    this.offscreenCanvas.height = this.inputHeight;
    const ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to create offscreen canvas 2D context');
    }
    this.offscreenCtx = ctx;

    // 1 batch * 3 channels * 640 * 640 pixels
    this.preallocatedTensorData = new Float32Array(1 * 3 * this.inputWidth * this.inputHeight);
  }

  public async loadModel(onProgress?: (msg: string) => void): Promise<boolean> {
    if (this.isLoaded && this.session) return true;

    try {
      onProgress?.('Configuring ONNX Runtime engine...');

      // Configure WASM asset path relative to base URL
      const basePath = import.meta.env.BASE_URL || './';
      const onnxWasmPath = basePath.endsWith('/') ? `${basePath}onnx/` : `${basePath}/onnx/`;
      ort.env.wasm.wasmPaths = onnxWasmPath;
      ort.env.wasm.numThreads = 1; // Safe for WebViews without COOP/COEP SharedArrayBuffer

      const modelUrl = basePath.endsWith('/')
        ? `${basePath}models/yolo11n.onnx`
        : `${basePath}/models/yolo11n.onnx`;

      onProgress?.('Loading YOLO11n neural weights...');

      // Try WebGL first for GPU hardware acceleration (e.g. Mali-G52 GPU on Samsung A06)
      try {
        this.session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['webgl'],
          graphOptimizationLevel: 'all',
        });
        this.engineMode = 'webgl';
        console.log('[YoloDetector] Initialized with WebGL GPU acceleration');
      } catch (webglErr) {
        console.warn('[YoloDetector] WebGL initialization failed, falling back to WASM:', webglErr);
        onProgress?.('WebGL unavailable, switching to WASM engine...');
        this.session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        this.engineMode = 'wasm';
        console.log('[YoloDetector] Initialized with WASM CPU engine');
      }

      this.isLoaded = true;
      onProgress?.('YOLO11n AI engine ready');
      return true;
    } catch (err) {
      console.error('[YoloDetector] Failed to load YOLO11n model:', err);
      this.isLoaded = false;
      return false;
    }
  }

  public getEngineMode(): 'webgl' | 'wasm' | 'cpu' {
    return this.engineMode;
  }

  public isModelReady(): boolean {
    return this.isLoaded && this.session !== null;
  }

  public isBusy(): boolean {
    return this.isInferencing;
  }

  /**
   * Run real-time YOLO11n inference on a video frame.
   * Returns normalized bounding boxes [0..1] relative to the video frame dimensions.
   */
  public async detect(
    video: HTMLVideoElement,
    confidenceThreshold: number = 0.45,
    iouThreshold: number = 0.45
  ): Promise<RawDetection[]> {
    if (!this.session || !this.isLoaded || this.isInferencing) {
      return [];
    }

    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return [];
    }

    this.isInferencing = true;
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

      // 3. Create input tensor and run inference
      const tensor = new ort.Tensor('float32', tensorBuffer, [1, 3, this.inputHeight, this.inputWidth]);
      const results = await this.session.run({ images: tensor });

      // 4. Parse YOLO11 output shape [1, 84, 8400]
      const outputTensor = results.output0 || Object.values(results)[0];
      if (!outputTensor) {
        return [];
      }

      const outputData = outputTensor.data as Float32Array;
      const numChannels = 84;
      const numAnchors = 8400; // 640/8 * 640/8 + 640/16 * 640/16 + 640/32 * 640/32 = 6400 + 1600 + 400

      const candidateDetections: RawDetection[] = [];

      // Loop through candidate anchors
      for (let col = 0; col < numAnchors; col++) {
        // Find best class score among the 80 classes (rows 4..83)
        let maxScore = 0;
        let bestClassId = -1;

        for (let classId = 0; classId < 80; classId++) {
          const score = outputData[(4 + classId) * numAnchors + col];
          if (score > maxScore) {
            maxScore = score;
            bestClassId = classId;
          }
        }

        if (maxScore >= confidenceThreshold && bestClassId >= 0) {
          // Bounding box center coordinates & dimensions in 640x640 space
          const cx = outputData[0 * numAnchors + col];
          const cy = outputData[1 * numAnchors + col];
          const w = outputData[2 * numAnchors + col];
          const h = outputData[3 * numAnchors + col];

          // Top-left x, y in normalized [0..1] range
          const normX = Math.max(0, Math.min(1, (cx - w / 2) / this.inputWidth));
          const normY = Math.max(0, Math.min(1, (cy - h / 2) / this.inputHeight));
          const normW = Math.max(0, Math.min(1 - normX, w / this.inputWidth));
          const normH = Math.max(0, Math.min(1 - normY, h / this.inputHeight));

          // Ensure box has positive dimensions
          if (normW > 0.01 && normH > 0.01) {
            const classInfo = getCocoClass(bestClassId);
            candidateDetections.push({
              classId: bestClassId,
              className: classInfo.name,
              category: classInfo.category,
              confidence: maxScore,
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

      // 5. Apply Non-Maximum Suppression (NMS)
      const filteredDetections = this.applyNMS(candidateDetections, iouThreshold);
      return filteredDetections;
    } catch (err) {
      console.error('[YoloDetector] Error during detection inference:', err);
      return [];
    } finally {
      this.isInferencing = false;
    }
  }

  /**
   * Apply class-aware Non-Maximum Suppression (NMS)
   */
  private applyNMS(detections: RawDetection[], iouThreshold: number): RawDetection[] {
    // Sort descending by confidence
    detections.sort((a, b) => b.confidence - a.confidence);

    const selected: RawDetection[] = [];
    const suppressed = new Uint8Array(detections.length);

    for (let i = 0; i < detections.length; i++) {
      if (suppressed[i] === 1) continue;

      const current = detections[i];
      selected.push(current);

      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed[j] === 1) continue;

        const candidate = detections[j];
        // Only suppress if same class
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
  private calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
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

  public dispose(): void {
    if (this.session) {
      // ONNX session release if supported
      this.session = null;
      this.isLoaded = false;
    }
  }
}

// Singleton instance
export const yoloDetector = new YoloDetector();
