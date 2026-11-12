import React, { useEffect, useState, useRef } from 'react';
import { Scan, CheckCircle, ShieldCheck, Zap } from 'lucide-react';
import { FaceCalibrationProfile, FaceTrackingData } from '../../types';

interface FaceScannerCalibrationOverlayProps {
  isScanning: boolean;
  trackingData: FaceTrackingData | null;
  onCalibrationComplete: (profile: FaceCalibrationProfile) => void;
  onProgressUpdate?: (progress: number) => void;
  width: number;
  height: number;
  filterName?: string;
}

export const FaceScannerCalibrationOverlay: React.FC<FaceScannerCalibrationOverlayProps> = ({
  isScanning,
  trackingData,
  onCalibrationComplete,
  onProgressUpdate,
  width,
  height,
  filterName,
}) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('ALIGNING BIOMETRIC SENSORS...');
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play scanning sound effects via Web Audio API
  const playScanBeep = (freq: number, duration: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  useEffect(() => {
    if (!isScanning) {
      setProgress(0);
      onProgressUpdate?.(0.0);
      return;
    }

    setShowSuccessBadge(false);
    setProgress(0);
    onProgressUpdate?.(0.0);
    playScanBeep(600, 0.1);

    const startTime = performance.now();
    const duration = 1200; // 1.2s scan to 100%

    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      onProgressUpdate?.(pct / 100);

      if (pct < 25) {
        setStatusText('SKETCHING 468 FACIAL CRANIAL VERTICES...');
      } else if (pct < 55) {
        setStatusText('EXTRUDING UPPER NECK & THROAT MESH COLLAR...');
      } else if (pct < 85) {
        setStatusText('LOCKING ZERO-LAG BIOMETRIC ANCHOR MATRIX...');
      } else {
        setStatusText('CRYSTALLIZING 100% OPAQUE CHARACTER MASK & SAVING...');
      }

      if (pct % 20 === 0 && pct > 0) {
        playScanBeep(700 + pct * 4, 0.05);
      }

      if (pct < 100) {
        animId = requestAnimationFrame(tick);
      } else {
        // Calibration 100% Complete!
        playScanBeep(1200, 0.25);
        setShowSuccessBadge(true);

        const currentW = trackingData?.facePixelWidth || width * 0.35;
        const currentH = trackingData?.facePixelHeight || height * 0.45;
        const currentX = trackingData?.x || 0.5;
        const currentY = trackingData?.y || 0.5;

        // Compute baseline eye distance
        let eyeDist = currentW * 0.45;
        if (trackingData?.screenLandmarks && trackingData.screenLandmarks.length >= 264) {
          const lEye = trackingData.screenLandmarks[33];
          const rEye = trackingData.screenLandmarks[263];
          if (lEye && rEye) {
            eyeDist = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);
          }
        }

        const profile: FaceCalibrationProfile = {
          calibratedAt: Date.now(),
          anchorX: currentX,
          anchorY: currentY,
          facePixelWidth: currentW,
          facePixelHeight: currentH,
          aspectRatio: currentW / Math.max(1, currentH),
          eyeDistance: eyeDist,
          interOcularRatio: eyeDist / Math.max(1, currentW),
          chinDistanceRatio: currentH / Math.max(1, currentW),
          isLocked: true,
        };

        onCalibrationComplete(profile);

        setTimeout(() => {
          setShowSuccessBadge(false);
        }, 1800);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isScanning]);

  if (!isScanning && !showSuccessBadge) return null;

  const faceX = (trackingData?.x ?? 0.5) * width;
  const faceY = (trackingData?.y ?? 0.5) * height;
  const boxW = Math.max(140, (trackingData?.facePixelWidth ?? width * 0.35) * 1.15);
  const boxH = Math.max(180, (trackingData?.facePixelHeight ?? height * 0.45) * 1.15);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex flex-col items-center justify-center">
      {/* 1. Holographic Laser Scanning Sweep */}
      {isScanning && (
        <div
          className="absolute border-2 border-cyan-400 shadow-[0_0_25px_#22d3ee] rounded-3xl transition-all duration-75 flex items-center justify-center"
          style={{
            left: `${faceX - boxW / 2}px`,
            top: `${faceY - boxH / 2}px`,
            width: `${boxW}px`,
            height: `${boxH}px`,
          }}
        >
          {/* Laser Line Sweeping Top to Bottom */}
          <div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_15px_#38bdf8] animate-bounce"
            style={{ animationDuration: '0.9s' }}
          />

          {/* Corner Targeting Brackets */}
          <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-cyan-400" />
          <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-cyan-400" />
          <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-cyan-400" />
          <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-cyan-400" />

          {/* Center Target Crosshair */}
          <div className="w-12 h-12 rounded-full border border-cyan-400/60 flex items-center justify-center animate-spin">
            <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#38bdf8]" />
          </div>
        </div>
      )}

      {/* 2. Top/Center Holographic HUD Counter Card */}
      <div className="absolute top-16 sm:top-20 z-35 flex flex-col items-center px-4">
        {isScanning && (
          <div className="bg-[#0b081a]/95 border-2 border-cyan-400/80 px-6 py-4 rounded-2xl shadow-[0_0_35px_rgba(6,182,212,0.45)] backdrop-blur-xl flex flex-col items-center text-center animate-in fade-in duration-150">
            {/* Header with Live Counter */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-300">
                <Scan className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-cyan-400 font-mono font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-cyan-400" />
                  <span>BIOMETRIC SCAN IN PROGRESS</span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-wider flex items-center gap-2">
                  <span>{progress}%</span>
                  <span className="text-xs font-semibold text-purple-300 font-sans">
                    {filterName ? `[${filterName}]` : '[ZERO-LAG CALIBRATION]'}
                  </span>
                </div>
              </div>
            </div>

            {/* Glowing Progress Bar */}
            <div className="w-64 sm:w-80 h-2 bg-slate-900 rounded-full mt-3 overflow-hidden border border-cyan-500/30 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-400 rounded-full transition-all duration-75 shadow-[0_0_12px_#38bdf8]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Subtext description */}
            <div className="mt-2 text-[11px] font-mono font-medium text-cyan-200">
              {statusText}
            </div>
          </div>
        )}

        {/* 3. Success Locked Confirmation Badge */}
        {showSuccessBadge && (
          <div className="bg-[#0b081a]/95 border-2 border-emerald-400 px-6 py-3.5 rounded-2xl shadow-[0_0_35px_rgba(52,211,153,0.5)] backdrop-blur-xl flex items-center gap-3 text-left animate-in zoom-in-95 duration-200">
            <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle className="w-6 h-6 fill-emerald-400/20" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% CALIBRATED & SAVED</span>
              </div>
              <div className="text-sm font-extrabold text-white">
                Zero-Lag Real-Time Head Tracking Active!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
