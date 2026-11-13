import React, { useEffect, useRef } from 'react';

export const VisionBoundingBoxOverlay = ({
  tracks,
  width,
  height,
  showMotionTrails = true,
  showBoxDimensions = true,
  showConfidence = true,
  selectedCategory = 'all',
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const now = performance.now();

    const activeTracks =
      selectedCategory === 'all'
        ? tracks
        : tracks.filter((t) => t.category === selectedCategory);

    // 1. Draw Sleek Fading Motion Trails
    if (showMotionTrails) {
      for (const track of activeTracks) {
        if (!track.trail || track.trail.length < 2) continue;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = track.color;

        for (let i = 1; i < track.trail.length; i++) {
          const ptPrev = track.trail[i - 1];
          const ptCurr = track.trail[i];
          const ageMs = now - ptCurr.timestamp;
          const alpha = Math.max(0, 1 - ageMs / 4200);

          if (alpha <= 0.02) continue;

          ctx.strokeStyle = track.color;
          ctx.globalAlpha = alpha * 0.8;
          ctx.lineWidth = Math.max(1.5, 3.2 * alpha);

          ctx.beginPath();
          ctx.moveTo(ptPrev.x, ptPrev.y);
          ctx.lineTo(ptCurr.x, ptCurr.y);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // 2. Draw Precision Kinetic Bounding Reticles
    for (const track of activeTracks) {
      const { bbox, color, className, id, confidence, isMoving, velocity } = track;
      const { x, y, width: bw, height: bh } = bbox;

      if (bw <= 6 || bh <= 6) continue;

      ctx.save();

      // Soft interior tint
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.05;
      ctx.fillRect(x, y, bw, bh);

      // Fine boundary outline
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, bw, bh);

      // Precision Corner L-Brackets with Micro-Dots
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = color;
      const cornerLen = Math.min(16, Math.max(8, Math.min(bw, bh) * 0.22));

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x + bw - cornerLen, y);
      ctx.lineTo(x + bw, y);
      ctx.lineTo(x + bw, y + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x, y + bh - cornerLen);
      ctx.lineTo(x, y + bh);
      ctx.lineTo(x + cornerLen, y + bh);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(x + bw - cornerLen, y + bh);
      ctx.lineTo(x + bw, y + bh);
      ctx.lineTo(x + bw, y + bh - cornerLen);
      ctx.stroke();

      // Precision Corner Micro-Anchor Dots
      ctx.fillStyle = '#ffffff';
      const dotRadius = 1.8;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.arc(x + bw, y, dotRadius, 0, Math.PI * 2);
      ctx.arc(x, y + bh, dotRadius, 0, Math.PI * 2);
      ctx.arc(x + bw, y + bh, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle Center Reticle
      const cx = x + bw / 2;
      const cy = y + bh / 2;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy);
      ctx.lineTo(cx + 3, cy);
      ctx.moveTo(cx, cy - 3);
      ctx.lineTo(cx, cy + 3);
      ctx.stroke();

      // 3. Top Floating Glass Capsule Badge [ OBJECT #ID CONF% ]
      const labelText = showConfidence
        ? `${className.toUpperCase()} #${id} • ${Math.round(confidence * 100)}%`
        : `${className.toUpperCase()} #${id}`;

      ctx.font = '600 10.5px "Plus Jakarta Sans", -apple-system, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const badgeH = 20;
      const badgeW = textMetrics.width + 20;

      const badgeY = y >= 26 ? y - badgeH - 4 : y + 4;
      const badgeX = Math.max(6, Math.min(width - badgeW - 6, x));

      // Frosted Glass Capsule Background
      ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
      ctx.fill();

      // Capsule Accent Border
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Status Beacon Dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(badgeX + 8, badgeY + badgeH / 2, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Badge Text
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.95;
      ctx.fillText(labelText, badgeX + 16, badgeY + 14);

      // 4. Bottom Dimension & Motion Vector Pill
      if (showBoxDimensions) {
        let dimText = `${Math.round(bw)}×${Math.round(bh)} px`;
        if (isMoving) {
          const arrow = velocity.vx >= 0 ? '➔' : '⬅';
          dimText += ` • MOVING ${arrow} ${velocity.speed}px/s`;
        } else {
          dimText += ` • STABLE`;
        }

        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        const dimMetrics = ctx.measureText(dimText);
        const dimW = dimMetrics.width + 14;
        const dimH = 17;
        const dimY = y + bh + dimH + 4 <= height ? y + bh + 4 : y + bh - dimH - 4;
        const dimX = Math.max(6, Math.min(width - dimW - 6, x));

        ctx.fillStyle = isMoving ? 'rgba(5, 30, 20, 0.88)' : 'rgba(10, 15, 25, 0.82)';
        ctx.beginPath();
        ctx.roundRect(dimX, dimY, dimW, dimH, 8);
        ctx.fill();

        ctx.strokeStyle = isMoving ? '#10b981' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = isMoving ? '#34d399' : '#94a3b8';
        ctx.fillText(dimText, dimX + 7, dimY + 12);
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
