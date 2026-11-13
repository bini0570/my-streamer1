export type ObjectCategory =
  | 'all'
  | 'people'
  | 'vehicles'
  | 'electronics'
  | 'animals'
  | 'furniture'
  | 'everyday';

export interface BoundingBox {
  x: number;      // top-left screen pixel x
  y: number;      // top-left screen pixel y
  width: number;  // width in pixels
  height: number; // height in pixels
}

export interface RawDetection {
  classId: number;
  className: string;
  category: ObjectCategory;
  confidence: number;
  bbox: BoundingBox;
}

export interface MotionPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface TrackedObject {
  id: number;                 // Persistent ByteTrack ID (e.g. 1, 2, 3...)
  classId: number;            // COCO class index (0..79)
  className: string;          // e.g. "person", "cell phone", "car", "dog"
  category: ObjectCategory;   // Category for filtering & color coding
  confidence: number;         // Detection confidence (0..1)
  bbox: BoundingBox;          // Current smoothed bounding box on screen
  velocity: {
    vx: number;               // pixels/second X
    vy: number;               // pixels/second Y
    speed: number;            // total scalar speed (px/sec)
  };
  isMoving: boolean;          // true if speed > motion threshold
  trail: MotionPoint[];       // Fading motion trajectory history (up to 5s)
  color: string;              // Category accent color
  lastSeenTime: number;       // timestamp of last detection match
  framesSinceDetection: number; // for track persistence across temporary occlusion
}

export interface DetectionMetrics {
  fps: number;
  inferenceMs: number;
  totalDetected: number;
  movingCount: number;
  stationaryCount: number;
  modelLoaded: boolean;
  engineMode: 'webgl' | 'wasm' | 'cpu';
}

export interface AppSettings {
  theme: 'dark' | 'light';
  cameraResolution: '720p' | '1080p' | '480p';
  facingMode: 'user' | 'environment';
  confidenceThreshold: number; // 0.30 to 0.90 (default 0.45)
  selectedCategory: ObjectCategory;
  showMotionTrails: boolean;
  showBoxDimensions: boolean;
  showConfidence: boolean;
  isDetectionPaused: boolean;
}
