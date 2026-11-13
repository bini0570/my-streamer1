import {
  FaceLandmarkPoint,
  FaceTrackingData,
  FaceCalibrationProfile,
  DetectedFaceFeatures,
  DetectedFeaturePoint,
} from '../types';
import {
  FACEMESH_TESSELATION,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
  FACEMESH_LEFT_EYE,
  FACEMESH_RIGHT_EYE,
  FACEMESH_LEFT_EYEBROW,
  FACEMESH_RIGHT_EYEBROW,
} from '../data/faceMeshConnections';
import { OneEuroFilter, OneEuroFilter3D } from './oneEuroFilter';

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

  // Offscreen canvas for fast fallback
  private fallbackCanvas: HTMLCanvasElement;
  private fallbackCtx: CanvasRenderingContext2D | null;

  // 1€ Filters (One Euro Filter) for jitter-free, zero-lag tracking
  private filterX = new OneEuroFilter(1.2, 0.008);
  private filterY = new OneEuroFilter(1.2, 0.008);
  private filterScale = new OneEuroFilter(1.0, 0.006);
  private filterRotX = new OneEuroFilter(1.5, 0.010);
  private filterRotY = new OneEuroFilter(1.5, 0.010);
  private filterRotZ = new OneEuroFilter(1.5, 0.010);
  private filterMouth = new OneEuroFilter(2.0, 0.015);

  // 1€ Filters for Detected Facial Features (Eyes, Nose, Mouth)
  private filterLeftEye = new OneEuroFilter3D(1.5, 0.008);
  private filterRightEye = new OneEuroFilter3D(1.5, 0.008);
  private filterNose = new OneEuroFilter3D(1.5, 0.008);
  private filterMouthAnchor = new OneEuroFilter3D(1.8, 0.012);
  private filterForehead = new OneEuroFilter3D(1.2, 0.006);
  private filterChin = new OneEuroFilter3D(1.2, 0.006);

  // Cached previous screen landmarks for adaptive smoothing
  private prevScreenLandmarks: FaceLandmarkPoint[] | null = null;

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
    features: undefined,
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
        locateFile: (file: string) => {
          try {
            // First check relative path to handle subfolders, root, and Android assets
            return new URL(`mediapipe/face_mesh/${file}`, window.location.href).href;
          } catch {
            return `./mediapipe/face_mesh/${file}`;
          }
        },
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
      console.warn('Local MediaPipe FaceMesh load notice, trying CDN fallback:', err);
      try {
        const win = window as unknown as { FaceMesh?: unknown };
        if (win.FaceMesh) {
          const CDNConstructor = win.FaceMesh as any;
          const mesh = new CDNConstructor({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
          }) as MediaPipeFaceMeshInstance;
          mesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
          mesh.onResults((results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
              this.rawNormalizedLandmarks = results.multiFaceLandmarks[0].map((pt) => ({ x: pt.x, y: pt.y, z: pt.z }));
            } else {
              this.rawNormalizedLandmarks = null;
            }
          });
          this.faceMeshInstance = mesh;
          this.isModelReady = true;
        }
      } catch (cdnErr) {
        console.warn('MediaPipe fallback active:', cdnErr);
        this.isModelReady = false;
      }
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
        }, 60);
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(win.FaceMesh || null);
        }, 4000);
        return;
      }

      // Try local bundle first (instant & offline)
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = './mediapipe/face_mesh/face_mesh.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        resolve(win.FaceMesh || null);
      };
      script.onerror = () => {
        // Try root path if relative failed
        const altScript = document.createElement('script');
        altScript.src = '/mediapipe/face_mesh/face_mesh.js';
        altScript.onload = () => resolve(win.FaceMesh || null);
        altScript.onerror = () => {
          // Fallback to CDN if local path is unavailable
          const cdnScript = document.createElement('script');
          cdnScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
          cdnScript.crossOrigin = 'anonymous';
          cdnScript.onload = () => resolve(win.FaceMesh || null);
          cdnScript.onerror = () => resolve(null);
          document.head.appendChild(cdnScript);
        };
        document.head.appendChild(altScript);
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
    if (this.isModelReady && this.faceMeshInstance && !this.isProcessing && now - this.lastProcessedTime > 25) {
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

      // Transform normalized video landmarks into exact screen pixel landmarks
      const rawScreenLandmarks: FaceLandmarkPoint[] = raw.map((pt) => {
        // Video is mirrored horizontally via CSS scale-x-[-1] for user-facing camera
        const vx = isUserFacing ? 1.0 - pt.x : pt.x;
        const vy = pt.y;
        return {
          x: offsetX + vx * renderW,
          y: offsetY + vy * renderH,
          z: pt.z !== undefined ? pt.z * renderW : 0,
        };
      });

      // Key landmark references:
      // 234: Left cheek / ear tragus
      // 454: Right cheek / ear tragus
      // 10: Forehead top
      // 152: Chin tip
      // 168: Nose bridge
      // 4: Nose tip
      // 33, 133, 159, 145: Left eye
      // 263, 362, 386, 374: Right eye
      // 13, 14, 61, 291: Mouth (inner upper/lower, left/right corners)

      const leftCheek = rawScreenLandmarks[234];
      const rightCheek = rawScreenLandmarks[454];
      const forehead = rawScreenLandmarks[10];
      const chin = rawScreenLandmarks[152];
      const noseBridge = rawScreenLandmarks[168];
      const noseTip = rawScreenLandmarks[4];
      const leftEyeInner = rawScreenLandmarks[133];
      const leftEyeOuter = rawScreenLandmarks[33];
      const rightEyeInner = rawScreenLandmarks[362];
      const rightEyeOuter = rawScreenLandmarks[263];
      const upperLip = rawScreenLandmarks[13];
      const lowerLip = rawScreenLandmarks[14];
      const leftMouthCorner = rawScreenLandmarks[61];
      const rightMouthCorner = rawScreenLandmarks[291];

      // Exact pixel measurements of user's face on screen
      const facePixelWidth = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);
      const facePixelHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y);

      // Center point: geometric face center
      const centerScreenX = (leftCheek.x + rightCheek.x) * 0.5;
      const centerScreenY = (forehead.y + chin.y) * 0.5;

      const normX = centerScreenX / containerWidth;
      const normY = centerScreenY / containerHeight;

      // Roll: Continuous angle of the eye line in screen space
      const screenLeftEye = isUserFacing ? rightEyeOuter : leftEyeOuter;
      const screenRightEye = isUserFacing ? leftEyeOuter : rightEyeOuter;
      const eyeDeltaX = screenRightEye.x - screenLeftEye.x;
      const eyeDeltaY = screenRightEye.y - screenLeftEye.y;
      const rawRotZ = Math.atan2(eyeDeltaY, Math.max(1e-4, eyeDeltaX));

      // Yaw: horizontal shift of nose tip relative to cheek midpoint
      const cheekMidX = (leftCheek.x + rightCheek.x) * 0.5;
      const yawRatio = (noseTip.x - cheekMidX) / Math.max(1, facePixelWidth);
      const rawRotY = yawRatio * 2.2;

      // Pitch: vertical shift of nose tip relative to bridge and chin
      const pitchMidY = (forehead.y + chin.y) * 0.5;
      const pitchRatio = (noseTip.y - pitchMidY) / Math.max(1, facePixelHeight);
      const rawRotX = pitchRatio * 2.0;

      // Mouth openness: vertical distance between inner upper and lower lip
      const lipDist = Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y);
      const rawMouthOpenness = Math.min(1.0, Math.max(0, (lipDist / (facePixelHeight * 0.16) - 0.15) * 1.8));

      // Target scale factor
      let targetW = facePixelWidth;
      let targetH = facePixelHeight;

      if (this.calibrationProfile) {
        const cal = this.calibrationProfile;
        const currentEyeDist = Math.hypot(rightEyeOuter.x - leftEyeOuter.x, rightEyeOuter.y - leftEyeOuter.y);
        const scaleRatio = currentEyeDist > 0 && cal.eyeDistance > 0 ? currentEyeDist / cal.eyeDistance : 1.0;
        targetW = cal.facePixelWidth * scaleRatio;
        targetH = cal.facePixelHeight * scaleRatio;
      }

      const targetScale = targetH / (containerHeight * 0.42);

      // -------------------------------------------------------------
      // 1€ FILTER (ONE EURO FILTER) - Zero Sensor Jitter, Zero Latency
      // -------------------------------------------------------------
      const smoothedX = this.filterX.filter(normX, now);
      const smoothedY = this.filterY.filter(normY, now);
      const smoothedScale = this.filterScale.filter(targetScale, now);
      const smoothedRotX = this.filterRotX.filter(rawRotX, now);
      const smoothedRotY = this.filterRotY.filter(rawRotY, now);
      const smoothedRotZ = this.filterRotZ.filter(rawRotZ, now);
      const smoothedMouth = this.filterMouth.filter(rawMouthOpenness, now);

      // -------------------------------------------------------------
      // DETECTED FACIAL FEATURE ANCHORS (Eyes, Nose, Mouth First!)
      // -------------------------------------------------------------
      const rawLeftEyeX = (leftEyeOuter.x + leftEyeInner.x) * 0.5;
      const rawLeftEyeY = (rawScreenLandmarks[159].y + rawScreenLandmarks[145].y) * 0.5;
      const smoothLeftEye = this.filterLeftEye.filter(rawLeftEyeX, rawLeftEyeY, leftEyeOuter.z || 0, now);

      const rawRightEyeX = (rightEyeOuter.x + rightEyeInner.x) * 0.5;
      const rawRightEyeY = (rawScreenLandmarks[386].y + rawScreenLandmarks[374].y) * 0.5;
      const smoothRightEye = this.filterRightEye.filter(rawRightEyeX, rawRightEyeY, rightEyeOuter.z || 0, now);

      const smoothNose = this.filterNose.filter(noseTip.x, noseTip.y, noseTip.z || 0, now);

      const rawMouthX = (leftMouthCorner.x + rightMouthCorner.x) * 0.5;
      const rawMouthY = (upperLip.y + lowerLip.y) * 0.5;
      const smoothMouth = this.filterMouthAnchor.filter(rawMouthX, rawMouthY, upperLip.z || 0, now);

      const smoothForehead = this.filterForehead.filter(forehead.x, forehead.y, forehead.z || 0, now);
      const smoothChin = this.filterChin.filter(chin.x, chin.y, chin.z || 0, now);

      const features: DetectedFaceFeatures = {
        leftEye: {
          x: smoothLeftEye.x,
          y: smoothLeftEye.y,
          z: smoothLeftEye.z,
          confidence: 0.99,
          detected: true,
          name: 'Left Eye',
        },
        rightEye: {
          x: smoothRightEye.x,
          y: smoothRightEye.y,
          z: smoothRightEye.z,
          confidence: 0.99,
          detected: true,
          name: 'Right Eye',
        },
        nose: {
          x: smoothNose.x,
          y: smoothNose.y,
          z: smoothNose.z,
          confidence: 0.99,
          detected: true,
          name: 'Nose Tip',
        },
        mouth: {
          x: smoothMouth.x,
          y: smoothMouth.y,
          z: smoothMouth.z,
          confidence: 0.99,
          detected: true,
          name: 'Mouth / Lips',
        },
        forehead: {
          x: smoothForehead.x,
          y: smoothForehead.y,
          z: smoothForehead.z,
          confidence: 0.99,
          detected: true,
          name: 'Forehead',
        },
        chin: {
          x: smoothChin.x,
          y: smoothChin.y,
          z: smoothChin.z,
          confidence: 0.99,
          detected: true,
          name: 'Chin',
        },
        allLocked: true,
      };

      // -------------------------------------------------------------
      // ADAPTIVE SCREEN LANDMARKS SMOOTHING
      // -------------------------------------------------------------
      // Blend landmarks smoothly without micro-jitter
      const finalScreenLandmarks: FaceLandmarkPoint[] = new Array(468);
      const prev = this.prevScreenLandmarks;
      const landmarkAlpha = 0.88; // Fast 88% responsive landmark follow

      for (let i = 0; i < 468; i++) {
        const curr = rawScreenLandmarks[i];
        if (prev && prev[i]) {
          finalScreenLandmarks[i] = {
            x: prev[i].x + (curr.x - prev[i].x) * landmarkAlpha,
            y: prev[i].y + (curr.y - prev[i].y) * landmarkAlpha,
            z: prev[i].z !== undefined && curr.z !== undefined ? prev[i].z! + (curr.z - prev[i].z!) * landmarkAlpha : curr.z,
          };
        } else {
          finalScreenLandmarks[i] = curr;
        }
      }
      this.prevScreenLandmarks = finalScreenLandmarks;

      this.smoothedData = {
        detected: true,
        x: smoothedX,
        y: smoothedY,
        scale: smoothedScale,
        rotationX: smoothedRotX,
        rotationY: smoothedRotY,
        rotationZ: smoothedRotZ,
        mouthOpenness: smoothedMouth,
        eyeLeftOpenness: 1.0,
        eyeRightOpenness: 1.0,
        facePixelWidth: targetW,
        facePixelHeight: targetH,
        confidence: 0.99,
        landmarks: raw,
        screenLandmarks: finalScreenLandmarks,
        features,
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

      const syntheticScreenLandmarks: FaceLandmarkPoint[] = [];
      for (let i = 0; i < 468; i++) {
        const angle = (i / 468) * Math.PI * 2 * 3;
        const radiusFactor = 0.2 + 0.3 * Math.sin(i * 0.4);
        const rx = screenFaceW * radiusFactor * Math.cos(angle);
        const ry = screenFaceH * radiusFactor * Math.sin(angle);
        syntheticScreenLandmarks.push({
          x: screenX + rx,
          y: screenY + ry,
          z: 0,
        });
      }

      const leftEyePt = { x: screenX - screenFaceW * 0.2, y: screenY - screenFaceH * 0.1 };
      const rightEyePt = { x: screenX + screenFaceW * 0.2, y: screenY - screenFaceH * 0.1 };
      const nosePt = { x: screenX, y: screenY + screenFaceH * 0.05 };
      const mouthPt = { x: screenX, y: screenY + screenFaceH * 0.22 };

      syntheticScreenLandmarks[168] = { x: screenX, y: screenY - screenFaceH * 0.05, z: 0 };
      syntheticScreenLandmarks[4] = { x: nosePt.x, y: nosePt.y, z: 0.1 };
      syntheticScreenLandmarks[10] = { x: screenX, y: screenY - screenFaceH * 0.45, z: 0 };
      syntheticScreenLandmarks[152] = { x: screenX, y: screenY + screenFaceH * 0.45, z: 0 };
      syntheticScreenLandmarks[234] = { x: screenX - screenFaceW * 0.45, y: screenY, z: -0.1 };
      syntheticScreenLandmarks[454] = { x: screenX + screenFaceW * 0.45, y: screenY, z: -0.1 };
      syntheticScreenLandmarks[33] = leftEyePt;
      syntheticScreenLandmarks[263] = rightEyePt;
      syntheticScreenLandmarks[13] = mouthPt;
      syntheticScreenLandmarks[14] = { x: screenX, y: screenY + screenFaceH * 0.26, z: 0 };

      const fallbackFeatures: DetectedFaceFeatures = {
        leftEye: { ...leftEyePt, confidence: 0.8, detected: true, name: 'Left Eye' },
        rightEye: { ...rightEyePt, confidence: 0.8, detected: true, name: 'Right Eye' },
        nose: { ...nosePt, confidence: 0.8, detected: true, name: 'Nose Tip' },
        mouth: { ...mouthPt, confidence: 0.8, detected: true, name: 'Mouth / Lips' },
        forehead: { x: screenX, y: screenY - screenFaceH * 0.45, confidence: 0.8, detected: true, name: 'Forehead' },
        chin: { x: screenX, y: screenY + screenFaceH * 0.45, confidence: 0.8, detected: true, name: 'Chin' },
        allLocked: true,
      };

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
        confidence: 0.80,
        screenLandmarks: syntheticScreenLandmarks,
        features: fallbackFeatures,
      };
    } else {
      this.smoothedData.detected = false;
      this.smoothedData.confidence = 0;
      this.smoothedData.screenLandmarks = undefined;
      this.smoothedData.features = undefined;
    }

    return this.smoothedData;
  }
}
