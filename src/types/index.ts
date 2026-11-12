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
  filterSensitivity: number; // 0.5 to 2.0
  mouthTrackingSensitivity: number; // 0.5 to 2.0
  showFaceMeshDebug: boolean;
  flipMaskVertical: boolean; // Invert mask vertically if camera requires
}

export interface FaceLandmarkPoint {
  x: number;
  y: number;
  z?: number;
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
  calibrationProfile?: FaceCalibrationProfile | null;
  isCalibrated?: boolean;
}
