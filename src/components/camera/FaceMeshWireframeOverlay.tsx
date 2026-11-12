import React, { useEffect, useRef } from 'react';
import {
  FACEMESH_TESSELATION,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
  FACEMESH_LEFT_EYE,
  FACEMESH_RIGHT_EYE,
  FACEMESH_LEFT_EYEBROW,
  FACEMESH_RIGHT_EYEBROW,
} from '../../services/faceTracker';
import { FaceTrackingData } from '../../types';

interface FaceMeshWireframeOverlayProps {
  trackingData: FaceTrackingData | null;
  enabled: boolean;
  width: number;
  height: number;
}

export const FaceMeshWireframeOverlay: React.FC<FaceMeshWireframeOverlayProps> = ({
  trackingData,
  enabled,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!trackingData || !trackingData.detected || !trackingData.screenLandmarks) {
      return;
    }

    const pts = trackingData.screenLandmarks;

    if (pts.length >= 468) {
      // 1. Draw Full 468-Landmark Tesselation (Cyan / Violet Holographic Wireframe)
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)'; // Purple neon mesh
      ctx.beginPath();
      for (let i = 0; i < FACEMESH_TESSELATION.length; i++) {
        const [startIdx, endIdx] = FACEMESH_TESSELATION[i];
        const p1 = pts[startIdx];
        const p2 = pts[endIdx];
        if (p1 && p2) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
      ctx.stroke();

      // 2. Draw Face Oval Silhouette Contour (Emerald Green)
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.shadowColor = 'rgba(52, 211, 153, 0.8)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < FACEMESH_FACE_OVAL.length; i++) {
        const [startIdx, endIdx] = FACEMESH_FACE_OVAL[i];
        const p1 = pts[startIdx];
        const p2 = pts[endIdx];
        if (p1 && p2) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
      ctx.stroke();

      // 3. Draw Lips Contour (Magenta / Rose)
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
      ctx.shadowColor = 'rgba(244, 63, 94, 0.8)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < FACEMESH_LIPS.length; i++) {
        const [startIdx, endIdx] = FACEMESH_LIPS[i];
        const p1 = pts[startIdx];
        const p2 = pts[endIdx];
        if (p1 && p2) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
      ctx.stroke();

      // 4. Draw Eyes & Eyebrows (Amber Gold)
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      const eyeContours = [
        ...FACEMESH_LEFT_EYE,
        ...FACEMESH_RIGHT_EYE,
        ...FACEMESH_LEFT_EYEBROW,
        ...FACEMESH_RIGHT_EYEBROW,
      ];
      for (let i = 0; i < eyeContours.length; i++) {
        const [startIdx, endIdx] = eyeContours[i];
        const p1 = pts[startIdx];
        const p2 = pts[endIdx];
        if (p1 && p2) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
      ctx.stroke();

      // 5. Highlight Key Anchor Vertices with Neon Nodes
      const keyPoints = [
        4,   // Nose tip
        152, // Chin
        10,  // Forehead top
        33,  // Left eye
        263, // Right eye
        234, // Left cheek/temple
        454, // Right cheek/temple
        13,  // Upper lip
        14,  // Lower lip
      ];

      ctx.fillStyle = '#38bdf8'; // Sky blue neon node
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      for (const idx of keyPoints) {
        const p = pts[idx];
        if (p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;

      // 5b. Draw Upper Neck & Throat Skirt Lattice (Full Sketched Mesh covering upper neck)
      const jawIndices = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454];
      const neckDrop1 = trackingData.facePixelHeight * 0.22;
      const neckDrop2 = trackingData.facePixelHeight * 0.45;
      const centerScreenX = trackingData.x * width;

      const ring1Pts: Array<{ x: number; y: number }> = [];
      const ring2Pts: Array<{ x: number; y: number }> = [];

      for (const jIdx of jawIndices) {
        const jPt = pts[jIdx];
        if (jPt) {
          ring1Pts.push({ x: jPt.x, y: jPt.y + neckDrop1 });
          ring2Pts.push({ x: jPt.x + (jPt.x - centerScreenX) * 0.16, y: jPt.y + neckDrop2 });
        }
      }

      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)'; // Cyan neon neck lattice
      ctx.beginPath();
      for (let k = 0; k < ring1Pts.length; k++) {
        const jPt = pts[jawIndices[k]];
        const r1 = ring1Pts[k];
        const r2 = ring2Pts[k];
        if (jPt && r1 && r2) {
          ctx.moveTo(jPt.x, jPt.y);
          ctx.lineTo(r1.x, r1.y);
          ctx.lineTo(r2.x, r2.y);
        }
        if (k > 0) {
          ctx.moveTo(ring1Pts[k - 1].x, ring1Pts[k - 1].y);
          ctx.lineTo(r1.x, r1.y);
          ctx.moveTo(ring2Pts[k - 1].x, ring2Pts[k - 1].y);
          ctx.lineTo(r2.x, r2.y);
          // Diagonal lattice strut
          ctx.moveTo(ring1Pts[k - 1].x, ring1Pts[k - 1].y);
          ctx.lineTo(r2.x, r2.y);
        }
      }
      ctx.stroke();
    } else {
      // Fallback oval wireframe loop
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(next.x, next.y);
      }
      ctx.stroke();
    }

    // 6. Face Frame Bounding Box & Target Crosshairs
    const faceW = trackingData.facePixelWidth;
    const faceH = trackingData.facePixelHeight;
    const centerX = trackingData.x * width;
    const centerY = trackingData.y * height;

    const boxX = centerX - faceW / 2;
    const boxY = centerY - faceH / 2;

    // Corner brackets for AR scanning visual
    const cornerSize = Math.min(24, faceW * 0.15);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
    ctx.lineWidth = 2.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + cornerSize);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + cornerSize, boxY);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(boxX + faceW - cornerSize, boxY);
    ctx.lineTo(boxX + faceW, boxY);
    ctx.lineTo(boxX + faceW, boxY + cornerSize);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + faceH - cornerSize);
    ctx.lineTo(boxX, boxY + faceH);
    ctx.lineTo(boxX + cornerSize, boxY + faceH);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(boxX + faceW - cornerSize, boxY + faceH);
    ctx.lineTo(boxX + faceW, boxY + faceH);
    ctx.lineTo(boxX + faceW, boxY + faceH - cornerSize);
    ctx.stroke();
  }, [trackingData, enabled, width, height]);

  if (!enabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-15">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full pointer-events-none"
      />

      {/* Real-Time Detection Accuracy HUD Banner */}
      {trackingData && trackingData.detected && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-950/85 border border-purple-500/50 rounded-xl backdrop-blur-md shadow-xl flex items-center gap-3 text-[11px] font-mono text-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-purple-300">FaceMesh 468</span>
          </div>
          <span className="text-slate-500">|</span>
          <span>
            Frame: <span className="text-white font-bold">{Math.round(trackingData.facePixelWidth)}×{Math.round(trackingData.facePixelHeight)}px</span>
          </span>
          <span className="text-slate-500">|</span>
          <span>
            Fit: <span className="text-emerald-400 font-bold">{Math.round(trackingData.confidence * 100)}%</span>
          </span>
          <span className="text-slate-500">|</span>
          <span>
            Mouth: <span className="text-purple-300 font-bold">{Math.round(trackingData.mouthOpenness * 100)}%</span>
          </span>
        </div>
      )}
    </div>
  );
};
