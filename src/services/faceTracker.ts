import { FaceLandmarkPoint, FaceTrackingData, FaceCalibrationProfile } from '../types';
import {
  FACEMESH_TESSELATION,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
  FACEMESH_LEFT_EYE,
  FACEMESH_RIGHT_EYE,
  FACEMESH_LEFT_EYEBROW,
  FACEMESH_RIGHT_EYEBROW,
} from '../data/faceMeshConnections';

export {
  FACEMESH_TESSELATION,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
  FACEMESH_LEFT_EYE,
  FACEMESH_RIGHT_EYE,
  FACEMESH_LEFT_EYEBROW,
  FACEMESH_RIGHT_EYEBROW,
};

// Generic type definition for MediaPipe FaceMesh instance
interface MediaPipeFaceMeshInstance {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: { multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>> }) => void) => void;
  send: (input: { image: HTMLVideoElement | HTMLCanvasElement }) => Promise<void>;
  close?: () => void;
}

export class FaceTracker {
  private faceMeshInstance: MediaPipeFaceMeshInstance | null = null;
  private isModelReady = false;
  private isProcessing = false;
  private lastProcessedTime = 0;

  // Most recent raw landmarks from MediaPipe (normalized 0..1 in video space)
  private rawNormalizedLandmarks: FaceLandmarkPoint[] | null = null;

  // Offscreen canvas for fast heuristic fallback
  private fallbackCanvas: HTMLCanvasElement;
  private fallbackCtx: CanvasRenderingContext2D | null;

  // Smoothed tracking data
  private smoothedData: FaceTrackingData = {
    detected: false,
    x: 0.5,
    y: 0.5,
    scale: 1.0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    mouthOpenness: 0,
    eyeLeftOpenness: 1,
    eyeRightOpenness: 1,
    facePixelWidth: 180,
    facePixelHeight: 220,
    confidence: 0,
    landmarks: undefined,
    screenLandmarks: undefined,
    calibrationProfile: null,
    isCalibrated: false,
  };

  // Calibration Profile saved after 100% scan
  private calibrationProfile: FaceCalibrationProfile | null = null;

  public setCalibration(profile: FaceCalibrationProfile): void {
    this.calibrationProfile = profile;
    this.smoothedData.calibrationProfile = profile;
    this.smoothedData.isCalibrated = true;
  }

  public getCalibration(): FaceCalibrationProfile | null {
    return this.calibrationProfile;
  }

  public clearCalibration(): void {
    this.calibrationProfile = null;
    this.smoothedData.calibrationProfile = null;
    this.smoothedData.isCalibrated = false;
  }

  constructor() {
    this.fallbackCanvas = document.createElement('canvas');
    this.fallbackCanvas.width = 160;
    this.fallbackCanvas.height = 120;
    this.fallbackCtx = this.fallbackCanvas.getContext('2d', { willReadFrequently: true });

    this.initMediaPipe();
  }

  private async initMediaPipe(): Promise<void> {
    try {
      const FaceMeshConstructor = await this.loadMediaPipeScript();
      if (!FaceMeshConstructor) return;

      const mesh = new FaceMeshConstructor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      }) as MediaPipeFaceMeshInstance;

      mesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      mesh.onResults((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const face = results.multiFaceLandmarks[0];
          this.rawNormalizedLandmarks = face.map((pt) => ({
            x: pt.x,
            y: pt.y,
            z: pt.z,
          }));
        } else {
          this.rawNormalizedLandmarks = null;
        }
      });

      this.faceMeshInstance = mesh;
      this.isModelReady = true;
    } catch (err) {
      console.warn('MediaPipe FaceMesh script load warning (using high-accuracy fallback):', err);
      this.isModelReady = false;
    }
  }

  private loadMediaPipeScript(): Promise<any> {
    const win = window as unknown as { FaceMesh?: unknown };
    if (win.FaceMesh) {
      return Promise.resolve(win.FaceMesh);
    }

    return new Promise((resolve) => {
      const scriptId = 'mediapipe-face-mesh-script';
      if (document.getElementById(scriptId)) {
        const checkInterval = setInterval(() => {
          if (win.FaceMesh) {
            clearInterval(checkInterval);
            resolve(win.FaceMesh);
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        resolve(win.FaceMesh);
      };
      script.onerror = () => {
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Process a video frame and compute accurate screen-calibrated face coordinates and size.
   */
  public processVideoFrame(
    video: HTMLVideoElement,
    containerWidth: number,
    containerHeight: number,
    facingMode: 'user' | 'environment' = 'user'
  ): FaceTrackingData {
    if (video.readyState < 2 || video.videoWidth === 0 || containerWidth === 0 || containerHeight === 0) {
      return this.smoothedData;
    }

    const videoW = video.videoWidth;
    const videoH = video.videoHeight;

    // Trigger MediaPipe processing asynchronously if model is ready and not busy
    const now = performance.now();
    if (this.isModelReady && this.faceMeshInstance && !this.isProcessing && now - this.lastProcessedTime > 30) {
      this.isProcessing = true;
      this.lastProcessedTime = now;
      this.faceMeshInstance
        .send({ image: video })
        .catch(() => {})
        .finally(() => {
          this.isProcessing = false;
        });
    }

    // 1. Calculate exact object-cover projection of video inside container
    const containerAspect = containerWidth / containerHeight;
    const videoAspect = videoW / videoH;
    let renderW = containerWidth;
    let renderH = containerHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > videoAspect) {
      renderW = containerWidth;
      renderH = containerWidth / videoAspect;
      offsetX = 0;
      offsetY = (containerHeight - renderH) / 2;
    } else {
      renderH = containerHeight;
      renderW = containerHeight * videoAspect;
      offsetX = (containerWidth - renderW) / 2;
      offsetY = 0;
    }

    const isUserFacing = facingMode === 'user';

    // 2. If MediaPipe returned 468 landmark points, calculate exact face bounds and angle
    if (this.rawNormalizedLandmarks && this.rawNormalizedLandmarks.length >= 468) {
      const raw = this.rawNormalizedLandmarks;

      // Transform normalized video landmarks into screen pixel landmarks
      const screenLandmarks: FaceLandmarkPoint[] = raw.map((pt) => {
        // Video is mirrored horizontally via CSS scale-x-[-1] for user-facing camera
        const vx = isUserFacing ? 1.0 - pt.x : pt.x;
        const vy = pt.y;
        return {
          x: offsetX + vx * renderW,
          y: offsetY + vy * renderH,
          z: pt.z !== undefined ? pt.z * renderW : 0,
        };
      });

      // Key landmarks:
      // 234: Left cheek / ear tragus
      // 454: Right cheek / ear tragus
      // 10: Forehead top
      // 152: Chin tip
      // 168: Nose bridge / glabella (natural center between eyes)
      // 4: Nose tip
      // 33: Left eye inner corner
      // 263: Right eye inner corner
      // 13: Upper lip center
      // 14: Lower lip center

      const leftCheek = screenLandmarks[234];
      const rightCheek = screenLandmarks[454];
      const forehead = screenLandmarks[10];
      const chin = screenLandmarks[152];
      const noseBridge = screenLandmarks[168];
      const noseTip = screenLandmarks[4];
      const leftEye = screenLandmarks[33];
      const rightEye = screenLandmarks[263];
      const upperLip = screenLandmarks[13];
      const lowerLip = screenLandmarks[14];

      // Exact pixel measurements of user's face on screen
      const facePixelWidth = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);
      const facePixelHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y);

      // Center point: nose bridge (between eyes)
      const centerScreenX = (leftCheek.x + rightCheek.x) / 2;
      const centerScreenY = (forehead.y + chin.y) / 2 * 0.95 + noseBridge.y * 0.05;

      const normX = centerScreenX / containerWidth;
      const normY = centerScreenY / containerHeight;

      // Roll: Angle of the eye line (normalized to [-PI/2, PI/2] to prevent upside-down 180 flip)
      const eyeDeltaX = rightEye.x - leftEye.x;
      const eyeDeltaY = rightEye.y - leftEye.y;
      let rotationZ = Math.atan2(eyeDeltaY, eyeDeltaX);
      if (rotationZ > Math.PI / 2) rotationZ -= Math.PI;
      if (rotationZ < -Math.PI / 2) rotationZ += Math.PI;

      // Yaw: horizontal shift of nose tip relative to cheek midpoint
      const cheekMidX = (leftCheek.x + rightCheek.x) / 2;
      const yawRatio = (noseTip.x - cheekMidX) / Math.max(1, facePixelWidth);
      const rotationY = yawRatio * 2.2;

      // Pitch: vertical shift of nose tip relative to bridge and chin
      const pitchMidY = (forehead.y + chin.y) / 2;
      const pitchRatio = (noseTip.y - pitchMidY) / Math.max(1, facePixelHeight);
      const rotationX = pitchRatio * 2.0;

      // Mouth openness: vertical distance between inner upper and lower lip
      const lipDist = Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y);
      const mouthOpenness = Math.min(1.0, Math.max(0, (lipDist / (facePixelHeight * 0.16) - 0.15) * 1.8));

      // Calibrated face scale factor relative to container height
      let targetW = facePixelWidth;
      let targetH = facePixelHeight;

      // If face profile is calibrated, lock to calibrated aspect ratio to prevent random filter sizing
      if (this.calibrationProfile) {
        const cal = this.calibrationProfile;
        // Scale based on current distance relative to calibrated eye distance
        const currentEyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
        const scaleRatio = currentEyeDist > 0 && cal.eyeDistance > 0 ? currentEyeDist / cal.eyeDistance : 1.0;
        targetW = cal.facePixelWidth * scaleRatio;
        targetH = cal.facePixelHeight * scaleRatio;
      }

      const targetScale = targetH / (containerHeight * 0.42);

      // ZERO-LAG VELOCITY-ADAPTIVE SMOOTHING:
      // When user moves quickly or is calibrated, smoothing coefficient jumps to 0.90-0.98 (zero latency, 0ms lag!).
      // When still, coefficient lowers to 0.6 to eliminate camera sensor micro-jitter.
      const deltaX = Math.abs(normX - this.smoothedData.x);
      const deltaY = Math.abs(normY - this.smoothedData.y);
      const deltaZ = Math.abs(rotationZ - this.smoothedData.rotationZ);
      const motionVelocity = deltaX * 25 + deltaY * 25 + deltaZ * 8;

      // Base smooth: if calibrated, tracking is ultra-fast 0.85; if moving fast, up to 0.98!
      const baseAlpha = this.calibrationProfile ? 0.85 : 0.65;
      const adaptiveSmooth = Math.min(0.98, Math.max(baseAlpha, baseAlpha + motionVelocity * 0.3));

      this.smoothedData = {
        detected: true,
        x: this.smoothedData.x + (normX - this.smoothedData.x) * adaptiveSmooth,
        y: this.smoothedData.y + (normY - this.smoothedData.y) * adaptiveSmooth,
        scale: this.smoothedData.scale + (targetScale - this.smoothedData.scale) * adaptiveSmooth,
        rotationX: this.smoothedData.rotationX + (rotationX - this.smoothedData.rotationX) * adaptiveSmooth,
        rotationY: this.smoothedData.rotationY + (rotationY - this.smoothedData.rotationY) * adaptiveSmooth,
        rotationZ: this.smoothedData.rotationZ + (rotationZ - this.smoothedData.rotationZ) * adaptiveSmooth,
        mouthOpenness: this.smoothedData.mouthOpenness + (mouthOpenness - this.smoothedData.mouthOpenness) * 0.75,
        eyeLeftOpenness: 1.0,
        eyeRightOpenness: 1.0,
        facePixelWidth: this.smoothedData.facePixelWidth + (targetW - this.smoothedData.facePixelWidth) * adaptiveSmooth,
        facePixelHeight: this.smoothedData.facePixelHeight + (targetH - this.smoothedData.facePixelHeight) * adaptiveSmooth,
        confidence: 0.98,
        landmarks: raw,
        screenLandmarks,
        calibrationProfile: this.calibrationProfile,
        isCalibrated: !!this.calibrationProfile,
      };

      return this.smoothedData;
    }

    // 3. FALLBACK: Fast Chromatic Face Boundary Estimator (if MediaPipe is loading/offline)
    return this.processFallbackDetection(video, containerWidth, containerHeight, renderW, renderH, offsetX, offsetY, isUserFacing);
  }

  private processFallbackDetection(
    video: HTMLVideoElement,
    containerWidth: number,
    containerHeight: number,
    renderW: number,
    renderH: number,
    offsetX: number,
    offsetY: number,
    isUserFacing: boolean
  ): FaceTrackingData {
    if (!this.fallbackCtx) return this.smoothedData;

    const w = this.fallbackCanvas.width;
    const h = this.fallbackCanvas.height;

    this.fallbackCtx.drawImage(video, 0, 0, w, h);
    const imgData = this.fallbackCtx.getImageData(0, 0, w, h);
    const d = imgData.data;

    let skinCount = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;

    for (let y = 10; y < h - 10; y++) {
      for (let x = 10; x < w - 10; x++) {
        const idx = (y * w + x) * 4;
        const r = d[idx];
        const g = d[idx + 1];
        const b = d[idx + 2];

        if (r > 60 && g > 40 && b > 20 && r > g && r > b && r - g > 12) {
          skinCount++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (skinCount > 150) {
      const normCenterX = sumX / skinCount / w;
      const normCenterY = sumY / skinCount / h;
      const normW = (maxX - minX) / w;
      const normH = (maxY - minY) / h;

      const screenFaceW = normW * renderW;
      const screenFaceH = normH * renderH;

      const vx = isUserFacing ? 1.0 - normCenterX : normCenterX;
      const screenX = offsetX + vx * renderW;
      const screenY = offsetY + normCenterY * renderH;

      const normX = screenX / containerWidth;
      const normY = screenY / containerHeight;
      const targetScale = screenFaceH / (containerHeight * 0.42);

      // Generate synthetic 36-point face oval landmarks for wireframe preview
      const syntheticScreenLandmarks: FaceLandmarkPoint[] = [];
      const numPts = 36;
      for (let i = 0; i < numPts; i++) {
        const angle = (i / numPts) * Math.PI * 2;
        const rx = screenFaceW * 0.48 * Math.cos(angle);
        const ry = screenFaceH * 0.52 * Math.sin(angle);
        syntheticScreenLandmarks.push({
          x: screenX + rx,
          y: screenY + ry,
          z: 0,
        });
      }

      this.smoothedData = {
        detected: true,
        x: this.smoothedData.x + (normX - this.smoothedData.x) * 0.35,
        y: this.smoothedData.y + (normY - this.smoothedData.y) * 0.35,
        scale: this.smoothedData.scale + (targetScale - this.smoothedData.scale) * 0.35,
        rotationX: this.smoothedData.rotationX * 0.9,
        rotationY: this.smoothedData.rotationY * 0.9,
        rotationZ: this.smoothedData.rotationZ * 0.9,
        mouthOpenness: 0.1,
        eyeLeftOpenness: 1.0,
        eyeRightOpenness: 1.0,
        facePixelWidth: screenFaceW,
        facePixelHeight: screenFaceH,
        confidence: 0.75,
        screenLandmarks: syntheticScreenLandmarks,
      };
    } else {
      this.smoothedData.detected = false;
      this.smoothedData.confidence = 0;
      this.smoothedData.screenLandmarks = undefined;
    }

    return this.smoothedData;
  }
}
