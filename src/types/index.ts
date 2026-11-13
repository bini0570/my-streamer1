export type FilmMaskId = 
  | 'joker'         // Heath Ledger / Joaquin Phoenix
  | 'batman'        // Christian Bale / Robert Pattinson
  | 'spiderman'     // Tobey Maguire / Tom Holland
  | 'ironman'       // Robert Downey Jr.
  | 'blackpanther'  // Chadwick Boseman
  | 'deadpool'      // Ryan Reynolds
  | 'ghostface'     // Scream
  | 'darthvader';   // Star Wars

export type AnimalFilterId = 
  | 'hyena'    // ጅቦ
  | 'gorilla'  // ጎሪ
  | 'tiger'
  | 'lion'
  | 'wolf'
  | 'monkey'
  | 'bear'
  | 'fox';

export type FilterId = FilmMaskId | AnimalFilterId;

export type FilterCategory = 'film_characters' | 'animals';

export interface FaceCalibrationProfile {
  calibratedAt: number;
  anchorX: number; // normalized center 0..1
  anchorY: number; // normalized center 0..1
  facePixelWidth: number;
  facePixelHeight: number;
  aspectRatio: number;
  eyeDistance: number;
  interOcularRatio: number;
  chinDistanceRatio: number;
  isLocked: boolean;
}

export interface AnimalFilter {
  id: FilterId;
  nameAmharic: string;
  nameEnglish: string;
  actorOrOrigin?: string;
  icon: string;
  accentColor: string;
  description: string;
  badgeLabel: string;
  category?: FilterCategory;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  cameraResolution: '720p' | '1080p' | '480p';
  facingMode: 'user' | 'environment';
  maskFitScale: number; // 0.85 to 1.35 (Mask & Mesh Fit)
  show3DShadedMesh: boolean; // 3D Shaded Mesh
  meshShadeOpacity: number; // 0.20 to 1.00 (Mesh Shade Transparency / Opacity)
  showFeatureReticles?: boolean; // Real-time Eye, Nose, Mouth detection reticles
  smoothingFilter?: 'one_euro' | 'exponential'; // Industry standard 1€ filter
  filterSensitivity?: number; // legacy optional
  mouthTrackingSensitivity?: number; // legacy optional
  showFaceMeshDebug?: boolean; // legacy optional
  flipMaskVertical?: boolean; // legacy optional
}

export interface FaceLandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface DetectedFeaturePoint {
  x: number; // screen pixel x
  y: number; // screen pixel y
  z?: number;
  confidence: number;
  detected: boolean;
  name: string;
}

export interface DetectedFaceFeatures {
  leftEye: DetectedFeaturePoint;
  rightEye: DetectedFeaturePoint;
  nose: DetectedFeaturePoint;
  mouth: DetectedFeaturePoint;
  forehead: DetectedFeaturePoint;
  chin: DetectedFeaturePoint;
  allLocked: boolean;
}

export interface FaceTrackingData {
  detected: boolean;
  x: number; // normalized screen center 0..1
  y: number; // normalized screen center 0..1
  scale: number;
  rotationX: number; // pitch in radians
  rotationY: number; // yaw in radians
  rotationZ: number; // roll in radians
  mouthOpenness: number; // 0..1
  eyeLeftOpenness: number; // 0..1
  eyeRightOpenness: number; // 0..1
  facePixelWidth: number; // calibrated pixel width on screen
  facePixelHeight: number; // calibrated pixel height on screen
  confidence: number; // 0..1
  landmarks?: FaceLandmarkPoint[]; // 468 MediaPipe normalized mesh points
  screenLandmarks?: FaceLandmarkPoint[]; // Transformed directly into canvas pixel space
  features?: DetectedFaceFeatures; // Exact detected Eye, Nose, Mouth feature coordinates
  calibrationProfile?: FaceCalibrationProfile | null;
  isCalibrated?: boolean;
}
