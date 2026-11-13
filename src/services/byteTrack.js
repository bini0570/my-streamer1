import { getCocoClass } from '../data/cocoClasses.js';

export class ByteTracker {
  constructor() {
    this.nextTrackId = 1;
    this.tracks = [];

    // Configuration
    this.highScoreThreshold = 0.5;
    this.matchIoUThreshold = 0.3;
    this.maxLostFrames = 30; // ~1-1.5s recovery memory
    this.motionSpeedThreshold = 28; // px/s to classify as moving
    this.maxTrailDurationMs = 4500; // 4.5s fading trail
    this.maxTrailPoints = 50;
    this.smoothingAlpha = 0.72; // EMA smoothing
  }

  /**
   * Update tracker with raw detections from the AI detector.
   */
  update(detections, canvasWidth, canvasHeight, currentTime = performance.now()) {
    // 1. Separate detections into high-score and low-score pools (ByteTrack mechanism)
    const highDets = [];
    const lowDets = [];

    for (const det of detections) {
      if (det.confidence >= this.highScoreThreshold) {
        highDets.push(det);
      } else {
        lowDets.push(det);
      }
    }

    // 2. Advance lost counter for tracks
    for (const track of this.tracks) {
      track.framesSinceDetection++;
    }

    // 3. First association: Match existing tracks with HIGH-confidence detections
    const matchedTrackIndices = new Set();
    const matchedHighDetIndices = new Set();

    this.matchDetectionsToTracks(
      this.tracks,
      highDets,
      this.matchIoUThreshold,
      matchedTrackIndices,
      matchedHighDetIndices,
      canvasWidth,
      canvasHeight,
      currentTime
    );

    // 4. Second association: Match UNMATCHED tracks with LOW-confidence detections
    const unmatchedTracks = [];
    for (let i = 0; i < this.tracks.length; i++) {
      if (!matchedTrackIndices.has(i)) {
        unmatchedTracks.push({ track: this.tracks[i], originalIndex: i });
      }
    }

    if (unmatchedTracks.length > 0 && lowDets.length > 0) {
      const lowMatchedTrackIndices = new Set();
      const lowMatchedDetIndices = new Set();

      const subTracks = unmatchedTracks.map((item) => item.track);
      this.matchDetectionsToTracks(
        subTracks,
        lowDets,
        0.25,
        lowMatchedTrackIndices,
        lowMatchedDetIndices,
        canvasWidth,
        canvasHeight,
        currentTime
      );

      for (const subIndex of lowMatchedTrackIndices) {
        matchedTrackIndices.add(unmatchedTracks[subIndex].originalIndex);
      }
    }

    // 5. Initialize new tracks for unmatched high-confidence detections
    for (let j = 0; j < highDets.length; j++) {
      if (!matchedHighDetIndices.has(j)) {
        const det = highDets[j];
        const classInfo = getCocoClass(det.classId);

        const screenX = det.bbox.x * canvasWidth;
        const screenY = det.bbox.y * canvasHeight;
        const screenW = det.bbox.width * canvasWidth;
        const screenH = det.bbox.height * canvasHeight;

        const centerX = screenX + screenW / 2;
        const centerY = screenY + screenH / 2;

        const newTrack = {
          id: this.nextTrackId++,
          classId: det.classId,
          className: det.className,
          category: det.category,
          confidence: det.confidence,
          color: classInfo.color,
          normBox: {
            x: det.bbox.x,
            y: det.bbox.y,
            w: det.bbox.width,
            h: det.bbox.height,
          },
          screenBox: {
            x: screenX,
            y: screenY,
            width: screenW,
            height: screenH,
          },
          vx: 0,
          vy: 0,
          speed: 0,
          isMoving: false,
          trail: [{ x: centerX, y: centerY, timestamp: currentTime }],
          lastSeenTime: currentTime,
          framesSinceDetection: 0,
        };

        this.tracks.push(newTrack);
      }
    }

    // 6. Clean up dead tracks that exceeded maxLostFrames
    this.tracks = this.tracks.filter((t) => t.framesSinceDetection <= this.maxLostFrames);

    // 7. Prune fading motion trails
    for (const track of this.tracks) {
      track.trail = track.trail.filter((pt) => currentTime - pt.timestamp <= this.maxTrailDurationMs);
      if (track.trail.length > this.maxTrailPoints) {
        track.trail = track.trail.slice(-this.maxTrailPoints);
      }
    }

    return this.getVisibleTracks();
  }

  /**
   * Smoothly interpolate and advance tracks during render frames
   */
  advanceFrame(deltaTimeSec, canvasWidth, canvasHeight) {
    const dt = Math.min(0.06, Math.max(0.001, deltaTimeSec));

    for (const track of this.tracks) {
      if (track.framesSinceDetection > 0) {
        // Linearly extrapolate box position according to velocity
        track.screenBox.x += track.vx * dt;
        track.screenBox.y += track.vy * dt;

        track.screenBox.x = Math.max(0, Math.min(canvasWidth - track.screenBox.width, track.screenBox.x));
        track.screenBox.y = Math.max(0, Math.min(canvasHeight - track.screenBox.height, track.screenBox.y));

        track.normBox.x = track.screenBox.x / canvasWidth;
        track.normBox.y = track.screenBox.y / canvasHeight;

        track.vx *= 0.96;
        track.vy *= 0.96;
        track.speed = Math.sqrt(track.vx * track.vx + track.vy * track.vy);
        track.isMoving = track.speed > this.motionSpeedThreshold;
      }
    }

    return this.getVisibleTracks();
  }

  /**
   * Greedy bipartite IoU matching
   */
  matchDetectionsToTracks(
    tracks,
    detections,
    iouThreshold,
    outMatchedTrackIndices,
    outMatchedDetIndices,
    canvasWidth,
    canvasHeight,
    currentTime
  ) {
    if (tracks.length === 0 || detections.length === 0) return;

    const matches = [];

    for (let t = 0; t < tracks.length; t++) {
      if (outMatchedTrackIndices.has(t)) continue;
      const track = tracks[t];

      for (let d = 0; d < detections.length; d++) {
        if (outMatchedDetIndices.has(d)) continue;
        const det = detections[d];

        if (track.classId !== det.classId) continue;

        const iou = this.calculateBoxIoU(track.normBox, det.bbox);
        if (iou >= iouThreshold) {
          matches.push({ trackIdx: t, detIdx: d, iou });
        }
      }
    }

    matches.sort((a, b) => b.iou - a.iou);

    for (const match of matches) {
      if (outMatchedTrackIndices.has(match.trackIdx) || outMatchedDetIndices.has(match.detIdx)) {
        continue;
      }

      outMatchedTrackIndices.add(match.trackIdx);
      outMatchedDetIndices.add(match.detIdx);

      const track = tracks[match.trackIdx];
      const det = detections[match.detIdx];

      const dt = Math.max(0.016, (currentTime - track.lastSeenTime) / 1000);

      const targetScreenX = det.bbox.x * canvasWidth;
      const targetScreenY = det.bbox.y * canvasHeight;
      const targetScreenW = det.bbox.width * canvasWidth;
      const targetScreenH = det.bbox.height * canvasHeight;

      const currentCenterX = track.screenBox.x + track.screenBox.width / 2;
      const currentCenterY = track.screenBox.y + track.screenBox.height / 2;
      const newCenterX = targetScreenX + targetScreenW / 2;
      const newCenterY = targetScreenY + targetScreenH / 2;

      const instVx = (newCenterX - currentCenterX) / dt;
      const instVy = (newCenterY - currentCenterY) / dt;

      track.vx = track.vx * 0.4 + instVx * 0.6;
      track.vy = track.vy * 0.4 + instVy * 0.6;
      track.speed = Math.sqrt(track.vx * track.vx + track.vy * track.vy);
      track.isMoving = track.speed > this.motionSpeedThreshold;

      const alpha = this.smoothingAlpha;
      track.screenBox.x = track.screenBox.x * (1 - alpha) + targetScreenX * alpha;
      track.screenBox.y = track.screenBox.y * (1 - alpha) + targetScreenY * alpha;
      track.screenBox.width = track.screenBox.width * (1 - alpha) + targetScreenW * alpha;
      track.screenBox.height = track.screenBox.height * (1 - alpha) + targetScreenH * alpha;

      track.normBox.x = track.screenBox.x / canvasWidth;
      track.normBox.y = track.screenBox.y / canvasHeight;
      track.normBox.w = track.screenBox.width / canvasWidth;
      track.normBox.h = track.screenBox.height / canvasHeight;

      track.confidence = det.confidence;
      track.lastSeenTime = currentTime;
      track.framesSinceDetection = 0;

      const bottomCenterX = track.screenBox.x + track.screenBox.width / 2;
      const bottomCenterY = track.screenBox.y + track.screenBox.height;
      track.trail.push({ x: bottomCenterX, y: bottomCenterY, timestamp: currentTime });
    }
  }

  calculateBoxIoU(b1, b2) {
    const x1 = Math.max(b1.x, b2.x);
    const y1 = Math.max(b1.y, b2.y);
    const x2 = Math.min(b1.x + b1.w, b2.x + b2.width);
    const y2 = Math.min(b1.y + b1.h, b2.y + b2.height);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (intersection === 0) return 0;

    const area1 = b1.w * b1.h;
    const area2 = b2.width * b2.height;
    const union = area1 + area2 - intersection;

    return union > 0 ? intersection / union : 0;
  }

  getVisibleTracks() {
    return this.tracks
      .filter((t) => t.framesSinceDetection <= 10)
      .map((t) => ({
        id: t.id,
        classId: t.classId,
        className: t.className,
        category: t.category,
        confidence: t.confidence,
        bbox: {
          x: Math.round(t.screenBox.x),
          y: Math.round(t.screenBox.y),
          width: Math.round(t.screenBox.width),
          height: Math.round(t.screenBox.height),
        },
        velocity: {
          vx: Math.round(t.vx),
          vy: Math.round(t.vy),
          speed: Math.round(t.speed),
        },
        isMoving: t.isMoving,
        trail: t.trail,
        color: t.color,
        lastSeenTime: t.lastSeenTime,
        framesSinceDetection: t.framesSinceDetection,
      }));
  }

  reset() {
    this.tracks = [];
    this.nextTrackId = 1;
  }
}

export const byteTracker = new ByteTracker();
