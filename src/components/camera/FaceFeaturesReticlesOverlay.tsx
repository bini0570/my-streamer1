import React, { useEffect, useRef } from 'react';
import { DetectedFaceFeatures } from '../../types';

interface FaceFeaturesReticlesOverlayProps {
  features: DetectedFaceFeatures | undefined;
  detected: boolean;
  visible: boolean;
  width: number;
  height: number;
}

export const FaceFeaturesReticlesOverlay: React.FC<FaceFeaturesReticlesOverlayProps> = ({
  features,
  detected,
  visible,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!visible || !detected || !features || !features.allLocked) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    const { leftEye, rightEye, nose, mouth } = features;
    const time = performance.now() * 0.003;

    // Helper: draw cybernetic circular reticle
    const drawEyeReticle = (x: number, y: number, label: string) => {
      const radius = 18 + Math.sin(time * 3) * 1.5;

      ctx.save();
      ctx.translate(x, y);

      // Outer dashed spinning ring
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)'; // Cyan
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      // Inner solid target circle
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fill();

      // Corner target brackets
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#06b6d4';
      const bSize = 6;
      const bOffset = radius + 4;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(-bOffset, -bOffset + bSize);
      ctx.lineTo(-bOffset, -bOffset);
      ctx.lineTo(-bOffset + bSize, -bOffset);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bOffset - bSize, -bOffset);
      ctx.lineTo(bOffset, -bOffset);
      ctx.lineTo(bOffset, -bOffset + bSize);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(-bOffset, bOffset - bSize);
      ctx.lineTo(-bOffset, bOffset);
      ctx.lineTo(-bOffset + bSize, bOffset);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(bOffset - bSize, bOffset);
      ctx.lineTo(bOffset, bOffset);
      ctx.lineTo(bOffset, bOffset - bSize);
      ctx.stroke();

      // Label
      ctx.shadowBlur = 0;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, -radius - 7);

      ctx.restore();
    };

    // Helper: draw diamond nose reticle
    const drawNoseReticle = (x: number, y: number) => {
      const dSize = 14 + Math.sin(time * 2.5) * 1.5;

      ctx.save();
      ctx.translate(x, y);

      // Diamond outline
      ctx.beginPath();
      ctx.moveTo(0, -dSize);
      ctx.lineTo(dSize, 0);
      ctx.lineTo(0, dSize);
      ctx.lineTo(-dSize, 0);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)'; // Emerald
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 6;
      ctx.stroke();

      // Center crosshair dot
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.fill();

      // Label
      ctx.shadowBlur = 0;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.fillText('NOSE', 0, dSize + 12);

      ctx.restore();
    };

    // Helper: draw mouth tracking bracket
    const drawMouthReticle = (x: number, y: number) => {
      const mW = 38;
      const mH = 14;

      ctx.save();
      ctx.translate(x, y);

      ctx.strokeStyle = 'rgba(232, 121, 249, 0.85)'; // Fuchsia/Purple
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#e879f9';
      ctx.shadowBlur = 6;

      // Left bracket
      ctx.beginPath();
      ctx.moveTo(-mW / 2 + 6, -mH / 2);
      ctx.lineTo(-mW / 2, -mH / 2);
      ctx.lineTo(-mW / 2, mH / 2);
      ctx.lineTo(-mW / 2 + 6, mH / 2);
      ctx.stroke();

      // Right bracket
      ctx.beginPath();
      ctx.moveTo(mW / 2 - 6, -mH / 2);
      ctx.lineTo(mW / 2, -mH / 2);
      ctx.lineTo(mW / 2, mH / 2);
      ctx.lineTo(mW / 2 - 6, mH / 2);
      ctx.stroke();

      // Center cross tick
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();

      // Label
      ctx.shadowBlur = 0;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#e879f9';
      ctx.textAlign = 'center';
      ctx.fillText('MOUTH', 0, mH / 2 + 12);

      ctx.restore();
    };

    // Subtle connecting constellation lines between organs
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Eye to Eye
    ctx.beginPath();
    ctx.moveTo(leftEye.x, leftEye.y);
    ctx.lineTo(rightEye.x, rightEye.y);
    ctx.stroke();

    // Eyes to Nose
    ctx.beginPath();
    ctx.moveTo(leftEye.x, leftEye.y);
    ctx.lineTo(nose.x, nose.y);
    ctx.lineTo(rightEye.x, rightEye.y);
    ctx.stroke();

    // Nose to Mouth
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(mouth.x, mouth.y);
    ctx.stroke();

    ctx.restore();

    // Draw organ reticles
    drawEyeReticle(leftEye.x, leftEye.y, 'L-EYE');
    drawEyeReticle(rightEye.x, rightEye.y, 'R-EYE');
    drawNoseReticle(nose.x, nose.y);
    drawMouthReticle(mouth.x, mouth.y);
  }, [features, detected, visible, width, height]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none z-18"
    />
  );
};
