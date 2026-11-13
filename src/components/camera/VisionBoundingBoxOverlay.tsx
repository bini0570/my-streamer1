import React, { useEffect, useRef } from 'react';
import { TrackedObject, ObjectCategory } from '../../types';

interface VisionBoundingBoxOverlayProps {
  tracks: TrackedObject[];
  width: number;
  height: number;
  showMotionTrails: boolean;
  showBoxDimensions: boolean;
  showConfidence: boolean;
  selectedCategory: ObjectCategory;
}

export const VisionBoundingBoxOverlay: React.FC<VisionBoundingBoxOverlayProps> = ({
  tracks,
  width,
  height,
  showMotionTrails,
  showBoxDimensions,
  showConfidence,
  selectedCategory,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle HiDPI displays smoothly
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const now = performance.now();

    // Filter tracks by selected category
    const activeTracks =
      selectedCategory === 'all'
        ? tracks
        : tracks.filter((t) => t.category === selectedCategory);

    // 1. Draw Fading Neon Motion Trails (if enabled)
    if (showMotionTrails) {
      for (const track of activeTracks) {
        if (track.trail.length < 2) continue;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = track.color;

        for (let i = 1; i < track.trail.length; i++) {
          const ptPrev = track.trail[i - 1];
          const ptCurr = track.trail[i];
          const ageMs = now - ptCurr.timestamp;
          const alpha = Math.max(0, 1 - ageMs / 4500); // 4.5s decay

          if (alpha <= 0.02) continue;

          ctx.strokeStyle = track.color;
          ctx.globalAlpha = alpha * 0.75;
          ctx.lineWidth = Math.max(1.5, 3.5 * alpha);

          ctx.beginPath();
          ctx.moveTo(ptPrev.x, ptPrev.y);
          ctx.lineTo(ptCurr.x, ptCurr.y);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // 2. Draw Cyber Tactical Reticles for Tracked Objects
    for (const track of activeTracks) {
      const { bbox, color, className, id, confidence, isMoving, velocity } = track;
      const { x, y, width: bw, height: bh } = bbox;

      if (bw <= 5 || bh <= 5) continue;

      ctx.save();

      // Semi-transparent box interior tint
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(x, y, bw, bh);

      // Box border outline
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x, y, bw, bh);

      // Tactical 4-Corner Brackets
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = color;
      const cornerLen = Math.min(18, Math.max(8, Math.min(bw, bh) * 0.25));

      // Top-Left corner
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top-Right corner
      ctx.beginPath();
      ctx.moveTo(x + bw - cornerLen, y);
      ctx.lineTo(x + bw, y);
      ctx.lineTo(x + bw, y + cornerLen);
      ctx.stroke();

      // Bottom-Left corner
      ctx.beginPath();
      ctx.moveTo(x, y + bh - cornerLen);
      ctx.lineTo(x, y + bh);
      ctx.lineTo(x + cornerLen, y + bh);
      ctx.stroke();

      // Bottom-Right corner
      ctx.beginPath();
      ctx.moveTo(x + bw - cornerLen, y + bh);
      ctx.lineTo(x + bw, y + bh);
      ctx.lineTo(x + bw, y + bh - cornerLen);
      ctx.stroke();

      // Center crosshair / optical center reticle
      const cx = x + bw / 2;
      const cy = y + bh / 2;
      const crossSize = 4;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - crossSize, cy);
      ctx.lineTo(cx + crossSize, cy);
      ctx.moveTo(cx, cy - crossSize);
      ctx.lineTo(cx, cy + crossSize);
      ctx.stroke();

      // 3. Top Cyber Label Badge [ CLASS #ID CONF% ]
      const labelText = showConfidence
        ? `${className.toUpperCase()} #${id}  ${Math.round(confidence * 100)}%`
        : `${className.toUpperCase()} #${id}`;

      ctx.font = 'bold 11px "JetBrains Mono", monospace, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const badgePaddingX = 8;
      const badgeH = 20;
      const badgeW = textMetrics.width + badgePaddingX * 2;

      // Position badge above box, or inside box if too close to top
      const badgeY = y >= 24 ? y - badgeH - 3 : y + 3;
      const badgeX = Math.max(4, Math.min(width - badgeW - 4, x));

      // Badge background pill
      ctx.fillStyle = 'rgba(10, 15, 24, 0.88)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
      ctx.fill();

      // Badge accent border
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.9;
      ctx.stroke();

      // Status indicator dot (cyan/emerald if live)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(badgeX + 6, badgeY + badgeH / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Badge text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, badgeX + 13, badgeY + 14);

      // 4. Bottom Tactical Dimension & Motion Badge [ WxH px | MOVING / STATIONARY ]
      if (showBoxDimensions) {
        let motionBadgeText = `${Math.round(bw)}×${Math.round(bh)} px`;
        if (isMoving) {
          const arrow = velocity.vx >= 0 ? '➔' : '⬅';
          motionBadgeText += ` | MOVING ${arrow} ${velocity.speed}px/s`;
        } else {
          motionBadgeText += ` | STATIONARY`;
        }

        ctx.font = '9px "JetBrains Mono", monospace, sans-serif';
        const dimMetrics = ctx.measureText(motionBadgeText);
        const dimW = dimMetrics.width + 12;
        const dimH = 16;
        const dimY = y + bh + dimH + 4 <= height ? y + bh + 3 : y + bh - dimH - 3;
        const dimX = Math.max(4, Math.min(width - dimW - 4, x));

        ctx.fillStyle = isMoving ? 'rgba(0, 40, 30, 0.85)' : 'rgba(15, 20, 30, 0.82)';
        ctx.beginPath();
        ctx.roundRect(dimX, dimY, dimW, dimH, 3);
        ctx.fill();

        ctx.strokeStyle = isMoving ? '#00ff88' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = isMoving ? '#00ff88' : '#94a3b8';
        ctx.fillText(motionBadgeText, dimX + 6, dimY + 11.5);
      }

      ctx.restore();
    }

    ctx.restore();
  }, [tracks, width, height, showMotionTrails, showBoxDimensions, showConfidence, selectedCategory]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      className="absolute inset-0 pointer-events-none z-20"
    />
  );
};
