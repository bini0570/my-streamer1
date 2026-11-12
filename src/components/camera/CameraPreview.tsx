import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Maximize2,
  Minimize2,
  Sparkles,
  CameraOff,
  Sliders,
  CheckCircle2,
  Volume2,
  Scan,
  Eye,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { AnimalFilter, FilterId, AppSettings, FaceTrackingData, FaceCalibrationProfile } from '../../types';
import { ACTIVE_FILTERS, ANIMAL_FILTERS, FILM_CHARACTER_FILTERS } from '../../data/filtersCatalog';
import { ARFaceMeshShaderEngine } from './filters/ARFaceMeshShaderEngine';
import { FaceTracker } from '../../services/faceTracker';
import { FaceMeshWireframeOverlay } from './FaceMeshWireframeOverlay';
import { FaceScannerCalibrationOverlay } from './FaceScannerCalibrationOverlay';

interface CameraPreviewProps {
  activeFilterId: FilterId | null;
  onSelectFilter: (id: FilterId) => void;
  onClearFilter: () => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  activeFilterId,
  onSelectFilter,
  onClearFilter,
  settings,
  onOpenSettings,
  onUpdateSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const filterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(settings.facingMode || 'user');
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [fps, setFps] = useState(60);
  const [faceDetected, setFaceDetected] = useState(false);
  const [mouthOpenVal, setMouthOpenVal] = useState(0);
  const [showFaceMeshWireframe, setShowFaceMeshWireframe] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 640, height: 480 });
  const [currentTrackingData, setCurrentTrackingData] = useState<FaceTrackingData | null>(null);

  // 100% Face Scan Calibration State
  const [isScanning, setIsScanning] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibratedProfile, setCalibratedProfile] = useState<FaceCalibrationProfile | null>(null);

  const filterEngineRef = useRef<ARFaceMeshShaderEngine | null>(null);
  const faceTrackerRef = useRef<FaceTracker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    setShowFaceMeshWireframe(settings.showFaceMeshDebug);
  }, [settings.showFaceMeshDebug]);

  // Category State: 'animals' (ጎሪ እና ጅቦ) or 'film_characters'
  const [filterCategory, setFilterCategory] = useState<'animals' | 'film_characters'>('animals');
  const allFilters = [...ANIMAL_FILTERS, ...FILM_CHARACTER_FILTERS];

  // Split selected category filters: 4 on Left, 4 on Right
  const currentCategoryFilters = filterCategory === 'animals' ? ANIMAL_FILTERS : FILM_CHARACTER_FILTERS;
  const leftFilters = currentCategoryFilters.slice(0, 4);
  const rightFilters = currentCategoryFilters.slice(4, 8);

  // Initialize camera stream
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    setPermissionStatus('requesting');
    setErrorMessage(null);

    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: facing,
          width: settings.cameraResolution === '1080p' ? { ideal: 1920 } : settings.cameraResolution === '720p' ? { ideal: 1280 } : { ideal: 640 },
          height: settings.cameraResolution === '1080p' ? { ideal: 1080 } : settings.cameraResolution === '720p' ? { ideal: 720 } : { ideal: 480 },
        },
      };

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback to generic constraints if ideal resolution is unavailable
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: facing },
        });
      }

      setStream(mediaStream);
      setPermissionStatus('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setPermissionStatus('denied');
      setErrorMessage(
        err instanceof Error ? err.message : 'Camera permission was denied or device not found'
      );
    }
  }, [settings.cameraResolution]);

  // Request camera on mount
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (filterEngineRef.current) {
        filterEngineRef.current.dispose();
      }
    };
  }, [startCamera, facingMode]);

  // Initialize 3D Filter Engine & Face Tracker
  useEffect(() => {
    if (!filterCanvasRef.current) return;

    if (!filterEngineRef.current) {
      filterEngineRef.current = new ARFaceMeshShaderEngine(filterCanvasRef.current);
      if (activeFilterId) {
        filterEngineRef.current.setFilter(activeFilterId);
      }
    }

    if (!faceTrackerRef.current) {
      faceTrackerRef.current = new FaceTracker();
    }
  }, []);

  // Update active 3D filter when activeFilterId changes
  useEffect(() => {
    if (filterEngineRef.current) {
      if (activeFilterId) {
        filterEngineRef.current.setFilter(activeFilterId);
      } else {
        filterEngineRef.current.clearFilter();
      }
    }
  }, [activeFilterId]);

  // Synchronize vertical orientation flip with AR shader engine
  useEffect(() => {
    if (filterEngineRef.current) {
      filterEngineRef.current.setFlipVertical(!!settings.flipMaskVertical);
    }
  }, [settings.flipMaskVertical]);

  // Handle Resize of canvas overlay
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && filterCanvasRef.current && filterEngineRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          filterCanvasRef.current.width = rect.width;
          filterCanvasRef.current.height = rect.height;
          filterEngineRef.current.resize(rect.width, rect.height);
          setContainerDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  // Main Render & Tracking Loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;

    const renderLoop = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = time;
      }

      if (videoRef.current && filterEngineRef.current && faceTrackerRef.current && containerRef.current) {
        const cWidth = containerRef.current.clientWidth || 640;
        const cHeight = containerRef.current.clientHeight || 480;

        const trackingData: FaceTrackingData = faceTrackerRef.current.processVideoFrame(
          videoRef.current,
          cWidth,
          cHeight,
          facingMode
        );

        setCurrentTrackingData(trackingData);
        setFaceDetected(trackingData.detected);
        setMouthOpenVal(Math.round(trackingData.mouthOpenness * 100));

        // High-Fidelity 3D Face Mesh Mask with Custom AR Shaders (100% face coverage & Zero Lag)
        if (filterEngineRef.current && activeFilterId) {
          filterEngineRef.current.update(
            trackingData,
            settings.filterSensitivity,
            settings.mouthTrackingSensitivity
          );
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [settings.filterSensitivity, settings.mouthTrackingSensitivity, facingMode, activeFilterId]);

  // Trigger Biometric 100% Face Scan Calibration
  const triggerFaceScan = () => {
    setIsScanning(true);
    if (filterEngineRef.current) {
      filterEngineRef.current.setScanState(true, 0.0);
    }
  };

  // Handle Scan Progress for 3D Cyber Animated Sketch Mesh
  const handleScanProgress = (prog: number) => {
    if (filterEngineRef.current) {
      filterEngineRef.current.setScanState(true, prog);
    }
  };

  // Handle selecting a filter: immediately initiates face scan and saves face geometry
  const handleSelectFilterWithScan = (id: FilterId) => {
    onSelectFilter(id);
    triggerFaceScan();
  };

  // Save calibrated facial geometry into FaceTracker and 3D Face Mesh Shader Engine
  const handleCalibrationComplete = (profile: FaceCalibrationProfile) => {
    setIsScanning(false);
    setIsCalibrated(true);
    setCalibratedProfile(profile);
    if (faceTrackerRef.current) {
      faceTrackerRef.current.setCalibration(profile);
    }
    if (filterEngineRef.current) {
      filterEngineRef.current.setCalibration(profile);
      filterEngineRef.current.setScanState(false, 1.0);
    }
  };

  // Flip camera toggle
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  // Shutter Snapshot Photo
  const handleTakeSnapshot = () => {
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 300);

    // Merge video frame and WebGL 3D filter canvas matching container crop
    if (videoRef.current && filterCanvasRef.current && containerRef.current) {
      const cWidth = containerRef.current.clientWidth || 1280;
      const cHeight = containerRef.current.clientHeight || 720;
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = cWidth;
      snapCanvas.height = cHeight;
      const ctx = snapCanvas.getContext('2d');
      if (ctx) {
        const videoW = videoRef.current.videoWidth || cWidth;
        const videoH = videoRef.current.videoHeight || cHeight;
        const containerAspect = cWidth / cHeight;
        const videoAspect = videoW / videoH;

        let renderW = cWidth;
        let renderH = cHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (containerAspect > videoAspect) {
          renderW = cWidth;
          renderH = cWidth / videoAspect;
          offsetY = (cHeight - renderH) / 2;
        } else {
          renderH = cHeight;
          renderW = cHeight * videoAspect;
          offsetX = (cWidth - renderW) / 2;
        }

        ctx.save();
        if (facingMode === 'user') {
          ctx.translate(cWidth, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, offsetX, offsetY, renderW, renderH);
        } else {
          ctx.drawImage(videoRef.current, offsetX, offsetY, renderW, renderH);
        }
        ctx.restore();

        // Draw 3D AR filter layer directly 1:1 on top!
        ctx.drawImage(filterCanvasRef.current, 0, 0, cWidth, cHeight);

        // Download snapshot
        const dataUrl = snapCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Gori_ena_Jibo_${activeFilterId || 'camera'}_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center select-none ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* 1. Camera Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-300 ${
          facingMode === 'user' ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* 2. Face-Mesh Wireframe Overlay Canvas */}
      <FaceMeshWireframeOverlay
        trackingData={currentTrackingData}
        enabled={showFaceMeshWireframe}
        width={containerDimensions.width}
        height={containerDimensions.height}
      />

      {/* 4. 0 -> 100% Face Scanner & Zero-Lag Calibration Overlay */}
      <FaceScannerCalibrationOverlay
        isScanning={isScanning}
        trackingData={currentTrackingData}
        onCalibrationComplete={handleCalibrationComplete}
        onProgressUpdate={handleScanProgress}
        width={containerDimensions.width}
        height={containerDimensions.height}
        filterName={ACTIVE_FILTERS.find((f) => f.id === activeFilterId)?.nameEnglish}
      />

      {/* 5. 3D Face Mesh Mask AR Shader Canvas (Full 3D WebGL Mesh Covering Entire Original Face Area) */}
      <canvas
        ref={filterCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-15"
      />

      {/* Shutter Flash Animation */}
      {isShutterActive && (
        <div className="absolute inset-0 bg-white z-40 pointer-events-none animate-out fade-out duration-300" />
      )}

      {/* 6. Subtle Vignette & Neon Scanlines Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-radial from-transparent via-black/20 to-black/60" />

      {/* 7. LIVESTREAM HUD: Top Status Bar (Matching Reference Screenshot) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between text-xs font-medium">
        {/* Left: • LIVE + 👁 12.5K Pills + Zero-Lag Lock Badge */}
        <div className="flex items-center gap-2">
          {/* • LIVE Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ff1744] text-white rounded-full font-bold tracking-wider uppercase text-[11px] shadow-lg shadow-red-900/50">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>LIVE</span>
          </div>

          {/* 👁 12.5K Viewer Counter Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 border border-white/10 text-white rounded-full font-semibold text-[11px] backdrop-blur-md shadow-md">
            <Eye className="w-3.5 h-3.5 text-slate-300" />
            <span>12.5K</span>
          </div>

          {/* ZERO-LAG 100% LOCKED BADGE */}
          {isCalibrated && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/80 border border-cyan-400/80 text-cyan-200 rounded-full font-bold text-[11px] shadow-[0_0_12px_rgba(6,182,212,0.4)] backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>ZERO-LAG 100%</span>
            </div>
          )}

          {activeFilterId && (
            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-purple-900/80 text-purple-200 border border-purple-500/40 rounded-full backdrop-blur-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span className="font-semibold text-[11px]">
                {allFilters.find((f) => f.id === activeFilterId)?.nameEnglish}
              </span>
            </div>
          )}
        </div>

        {/* Right: Scan 100% Button + Mesh Toggle + Circular Tuning Slider + Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Scan 100% Zero-Lag Calibration Button */}
          <button
            onClick={triggerFaceScan}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-full font-bold text-[11px] shadow-lg glow-purple-sm transition-all active:scale-95"
            title="Scan Face to 100% & Lock Zero-Lag Tracker"
            aria-label="Scan Face"
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ፊት ቃኝ</span>
            <span>100% Scan</span>
          </button>

          {/* Face-Mesh Wireframe Toggle */}
          <button
            onClick={() => setShowFaceMeshWireframe((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md border transition-all ${
              showFaceMeshWireframe
                ? 'bg-purple-600 border-purple-300 text-white shadow-sm glow-purple-sm'
                : 'bg-black/60 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="Toggle Real-Time MediaPipe Face-Mesh Wireframe"
            aria-label="Toggle Face Mesh Wireframe"
          >
            <Scan className={`w-3 h-3 ${showFaceMeshWireframe ? 'text-white' : 'text-purple-400'}`} />
            <span>Mesh</span>
          </button>

          {/* Flip Mask Y Toggle Button */}
          <button
            onClick={() => onUpdateSettings({ flipMaskVertical: !settings.flipMaskVertical })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border transition-all ${
              settings.flipMaskVertical
                ? 'bg-amber-600/90 border-amber-300 text-white shadow-sm'
                : 'bg-black/60 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="Invert / Flip 3D Mask Vertically (ገልብጥ)"
            aria-label="Flip Mask Vertically"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">ገልብጥ</span>
            <span>Flip Y</span>
          </button>

          {/* Circular Tuning Slider Button (From Screenshot) */}
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-full bg-black/60 border border-white/15 hover:border-purple-500 text-white flex items-center justify-center transition-all backdrop-blur-md shadow-md active:scale-95"
            title="Application Settings & Filter Tuning"
            aria-label="Settings"
          >
            <SlidersHorizontal className="w-4 h-4 text-white" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="w-9 h-9 rounded-full bg-black/60 border border-white/15 hover:border-purple-500 text-white flex items-center justify-center transition-all backdrop-blur-md shadow-md active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Camera Preview'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {/* Category Tabs: ጎሪ እና ጅቦ (Animals) vs Cinema Masks */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center bg-black/65 border border-purple-500/40 rounded-full p-1 backdrop-blur-md shadow-xl max-w-[95vw]">
        <button
          onClick={() => setFilterCategory('animals')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            filterCategory === 'animals'
              ? 'bg-gradient-to-r from-purple-600 to-amber-600 text-white shadow-md glow-purple-sm'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <span>🐾 ጎሪ እና ጅቦ</span>
          <span className="hidden sm:inline">(8 Animals)</span>
        </button>
        <button
          onClick={() => setFilterCategory('film_characters')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            filterCategory === 'film_characters'
              ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md glow-purple-sm'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <span>🎭 Cinema Masks</span>
          <span className="hidden sm:inline">(8 Characters)</span>
        </button>
      </div>

      {/* 8. EIGHT SELECTABLE FILM CHARACTER MASKS (4 on Left, 4 on Right) */}
      {/* LEFT COLUMN: Joker, Batman, Spider-Man, Iron Man */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
        {leftFilters.map((filter) => {
          const isSelected = activeFilterId === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => handleSelectFilterWithScan(filter.id)}
              className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                isSelected
                  ? 'bg-purple-600/90 border-2 border-cyan-300 text-white shadow-lg shadow-purple-900/60 scale-110'
                  : 'bg-slate-900/80 hover:bg-slate-800/90 border border-purple-500/30 text-slate-200 backdrop-blur-md hover:scale-105'
              }`}
              title={`${filter.nameEnglish} (${filter.actorOrOrigin})`}
              aria-label={`Select ${filter.nameEnglish} mask`}
            >
              <span className="text-xl">{filter.icon}</span>

              {/* Tooltip on hover */}
              <div className="absolute left-14 px-2.5 py-1.5 bg-[#0e0a1a]/95 border border-purple-500/40 rounded-xl text-xs whitespace-nowrap text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl backdrop-blur-md flex flex-col z-30">
                <span className="font-bold text-cyan-300">{filter.nameEnglish}</span>
                <span className="text-[11px] text-purple-200">{filter.nameAmharic}</span>
                {filter.actorOrOrigin && (
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">{filter.actorOrOrigin}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* RIGHT COLUMN: Black Panther, Deadpool, Ghostface, Darth Vader */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
        {rightFilters.map((filter) => {
          const isSelected = activeFilterId === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => handleSelectFilterWithScan(filter.id)}
              className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                isSelected
                  ? 'bg-purple-600/90 border-2 border-cyan-300 text-white shadow-lg shadow-purple-900/60 scale-110'
                  : 'bg-slate-900/80 hover:bg-slate-800/90 border border-purple-500/30 text-slate-200 backdrop-blur-md hover:scale-105'
              }`}
              title={`${filter.nameEnglish} (${filter.actorOrOrigin})`}
              aria-label={`Select ${filter.nameEnglish} mask`}
            >
              <span className="text-xl">{filter.icon}</span>

              {/* Tooltip on hover */}
              <div className="absolute right-14 px-2.5 py-1.5 bg-[#0e0a1a]/95 border border-purple-500/40 rounded-xl text-xs whitespace-nowrap text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl backdrop-blur-md flex flex-col items-end z-30">
                <span className="font-bold text-cyan-300">{filter.nameEnglish}</span>
                <span className="text-[11px] text-purple-200">{filter.nameAmharic}</span>
                {filter.actorOrOrigin && (
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">{filter.actorOrOrigin}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 9. BOTTOM CAMERA CONTROLS STRIP */}
      <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-3">
        {/* Flip camera button */}
        <button
          onClick={toggleCameraFacing}
          className="p-3 bg-slate-900/80 hover:bg-purple-900/60 text-slate-200 rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-95"
          title="Switch Front / Rear Camera"
          aria-label="Switch Camera"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* Flip Mask Y Button */}
        <button
          onClick={() => onUpdateSettings({ flipMaskVertical: !settings.flipMaskVertical })}
          className={`p-3 rounded-full border backdrop-blur-md transition-all active:scale-95 ${
            settings.flipMaskVertical
              ? 'bg-amber-600/90 border-amber-300 text-white shadow-md'
              : 'bg-slate-900/80 hover:bg-purple-900/60 border-white/10 text-slate-200'
          }`}
          title="Invert Mask Vertically (ጭምብል ገልብጥ)"
          aria-label="Flip Mask Y"
        >
          <ArrowUpDown className="w-5 h-5" />
        </button>

        {/* Snapshot Shutter Button */}
        <button
          onClick={handleTakeSnapshot}
          className="relative group p-1 rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500 shadow-lg glow-purple-sm active:scale-95 transition-transform"
          title="Capture Snapshot Photo"
          aria-label="Take Photo"
        >
          <div className="w-14 h-14 rounded-full bg-white group-hover:bg-slate-100 flex items-center justify-center text-slate-950 transition-colors">
            <Camera className="w-6 h-6 text-purple-950" />
          </div>
        </button>

        {/* Recalibrate (100% Scan) Button */}
        <button
          onClick={triggerFaceScan}
          className="px-3.5 py-2.5 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-400/60 text-cyan-200 rounded-2xl text-xs font-bold backdrop-blur-md transition-all flex items-center gap-1.5 active:scale-95 shadow-md"
          title="Re-Scan Face & Lock Zero-Lag Tracker"
        >
          <Scan className="w-3.5 h-3.5 text-cyan-300" />
          <span>Recalibrate (100%)</span>
        </button>

        {/* Clear Filter button */}
        {activeFilterId && (
          <button
            onClick={onClearFilter}
            className="px-3 py-2 bg-slate-900/80 hover:bg-red-950/70 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold backdrop-blur-md transition-colors active:scale-95"
            title="Reset Mask Filter"
            aria-label="Clear Filter"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* 7. PERMISSION / ERROR FALLBACK OVERLAY */}
      {permissionStatus !== 'granted' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-lg text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4 shadow-xl glow-purple-sm">
            <CameraOff className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">ካሜራ ፈቃድ (Camera Access)</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {errorMessage ||
              'ጎሪ እና ጅቦ requires camera permission to display your real-time camera preview and project 3D animal masks onto your face.'}
          </p>

          <button
            onClick={() => startCamera(facingMode)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-semibold rounded-xl shadow-lg glow-purple transition-all flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>ካሜራ አንቃ (Enable Camera)</span>
          </button>
        </div>
      )}
    </div>
  );
};
