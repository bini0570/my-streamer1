import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Maximize2,
  Sparkles,
  CameraOff,
  Eye,
  Crosshair,
  Layers,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle2,
  Menu,
  Crown,
  Settings as SettingsIcon,
} from 'lucide-react';
import { FilterId, AppSettings, FaceTrackingData, DetectedFaceFeatures } from '../../types';
import { ANIMAL_FILTERS, FILM_CHARACTER_FILTERS } from '../../data/filtersCatalog';
import { ARFaceMeshShaderEngine } from './filters/ARFaceMeshShaderEngine';
import { FaceTracker } from '../../services/faceTracker';
import { FaceFeaturesReticlesOverlay } from './FaceFeaturesReticlesOverlay';

interface CameraPreviewProps {
  activeFilterId: FilterId | null;
  onSelectFilter: (id: FilterId) => void;
  onClearFilter: () => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenDrawer: () => void;
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
  onOpenDrawer,
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

  // Dimensions for high-DPI projection
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  // Face & Feature Tracking State
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [detectedFeatures, setDetectedFeatures] = useState<DetectedFaceFeatures | undefined>(undefined);

  // Modern Floating Filter Dock State
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'film_characters' | 'animals'>('film_characters');

  // Reticles toggle state (default true)
  const showReticles = settings.showFeatureReticles !== false;

  const filterEngineRef = useRef<ARFaceMeshShaderEngine | null>(null);
  const faceTrackerRef = useRef<FaceTracker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const allFilters = [...FILM_CHARACTER_FILTERS, ...ANIMAL_FILTERS];
  const currentCategoryFilters = filterCategory === 'film_characters' ? FILM_CHARACTER_FILTERS : ANIMAL_FILTERS;

  // Handle Escape key to exit fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        onToggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onToggleFullscreen]);

  // Sync facing mode from settings
  useEffect(() => {
    if (settings.facingMode && settings.facingMode !== facingMode) {
      setFacingMode(settings.facingMode);
    }
  }, [settings.facingMode, facingMode]);

  // Sync 3D Shaded Mesh toggle with AR shader engine
  useEffect(() => {
    if (filterEngineRef.current) {
      filterEngineRef.current.setShow3DShadedMesh(!!settings.show3DShadedMesh);
    }
  }, [settings.show3DShadedMesh]);

  // Sync Mask & Mesh Fit Scale (85%–135%) with AR shader engine
  useEffect(() => {
    if (filterEngineRef.current && settings.maskFitScale) {
      filterEngineRef.current.setMaskFitScale(settings.maskFitScale);
    }
  }, [settings.maskFitScale]);

  // Sync Mesh Shade Transparency / Opacity (20%–100%)
  useEffect(() => {
    if (filterEngineRef.current && settings.meshShadeOpacity !== undefined) {
      filterEngineRef.current.setMeshShadeOpacity(settings.meshShadeOpacity);
    }
  }, [settings.meshShadeOpacity]);

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

  // Request camera on mount or lens change
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
      filterEngineRef.current.setShow3DShadedMesh(!!settings.show3DShadedMesh);
      if (settings.maskFitScale) {
        filterEngineRef.current.setMaskFitScale(settings.maskFitScale);
      }
      if (settings.meshShadeOpacity !== undefined) {
        filterEngineRef.current.setMeshShadeOpacity(settings.meshShadeOpacity);
      }
      if (activeFilterId) {
        filterEngineRef.current.setFilter(activeFilterId);
      }
    }

    if (!faceTrackerRef.current) {
      faceTrackerRef.current = new FaceTracker();
    }
  }, []);

  // Update active 3D filter immediately without delay
  useEffect(() => {
    if (filterEngineRef.current) {
      if (activeFilterId) {
        filterEngineRef.current.setFilter(activeFilterId);
      } else {
        filterEngineRef.current.clearFilter();
      }
    }
  }, [activeFilterId]);

  // Handle Resize of canvas overlay (High-DPI logical projection)
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && filterCanvasRef.current && filterEngineRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          filterCanvasRef.current.width = rect.width;
          filterCanvasRef.current.height = rect.height;
          setDimensions({ width: rect.width, height: rect.height });
          filterEngineRef.current.resize(rect.width, rect.height);
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

  // Main Render & Tracking Loop (60 FPS)
  useEffect(() => {
    let frameCount = 0;

    const renderLoop = () => {
      if (videoRef.current && filterEngineRef.current && faceTrackerRef.current && containerRef.current) {
        const cWidth = containerRef.current.clientWidth || 640;
        const cHeight = containerRef.current.clientHeight || 480;

        const trackingData: FaceTrackingData = faceTrackerRef.current.processVideoFrame(
          videoRef.current,
          cWidth,
          cHeight,
          facingMode
        );

        // Update React feature reticles state throttled to ~30fps for buttery smooth UI
        frameCount++;
        if (frameCount % 2 === 0) {
          setIsFaceDetected(trackingData.detected);
          setDetectedFeatures(trackingData.features);
        }

        // Update high-fidelity 3D Face Mesh anchored to detected features
        if (filterEngineRef.current) {
          if (activeFilterId || settings.show3DShadedMesh) {
            filterEngineRef.current.update(
              trackingData,
              1.0,
              1.2
            );
          } else {
            filterEngineRef.current.clearFilter();
          }
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
  }, [facingMode, activeFilterId, settings.show3DShadedMesh]);

  const activeFilter = allFilters.find((f) => f.id === activeFilterId);

  return (
    <div
      ref={containerRef}
      onClick={() => {
        // Tapping anywhere in fullscreen mode cleanly exits fullscreen
        if (isFullscreen) {
          onToggleFullscreen();
        }
      }}
      className={`relative w-full h-full overflow-hidden bg-[#06030c] flex items-center justify-center select-none ${
        isFullscreen ? 'fixed inset-0 z-50 cursor-pointer' : ''
      }`}
    >
      {/* 1. Live Camera Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-300 ${
          facingMode === 'user' ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* 2. WebGL 3D Shaded Mesh & Mask Canvas Overlay */}
      <canvas
        ref={filterCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-15"
      />

      {/* 3. Real-Time AI Feature Reticles Overlay (Eyes, Nose, Mouth HUD) */}
      {!isFullscreen && (
        <FaceFeaturesReticlesOverlay
          features={detectedFeatures}
          detected={isFaceDetected}
          visible={showReticles}
          width={dimensions.width}
          height={dimensions.height}
        />
      )}

      {/* 4. Subtle Studio Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-radial from-transparent via-black/15 to-black/60" />

      {/* ------------------------------------------------------------------ */}
      {/* HUD OVERLAYS & MODERN CONTROLS (COMPLETELY HIDDEN IN FULLSCREEN)  */}
      {/* ------------------------------------------------------------------ */}
      {!isFullscreen && (
        <>
          {/* TOP UNIFIED GLASS HUD BAR */}
          <div className="absolute top-3 left-3 right-3 z-25 flex items-center justify-between pointer-events-auto gap-2">
            {/* Left: Menu + Crown Logo + LIVE + Viewers */}
            <div className="flex items-center gap-2">
              {/* Menu Hamburger */}
              <button
                onClick={onOpenDrawer}
                className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 hover:border-purple-400 text-white flex items-center justify-center backdrop-blur-xl shadow-lg transition-all active:scale-95"
                title="Open Menu Drawer"
                aria-label="Open Navigation Drawer"
              >
                <Menu className="w-4 h-4 text-slate-100" />
              </button>

              {/* Ethiopian Brand Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0614]/80 border border-purple-500/30 rounded-full backdrop-blur-xl shadow-lg select-none">
                <Crown className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                <span className="text-xs sm:text-sm font-black tracking-wider text-white font-['Noto_Sans_Ethiopic'] drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]">
                  <span className="bg-gradient-to-r from-white via-purple-200 to-fuchsia-300 bg-clip-text text-transparent">
                    ጎሪ እና ጅቦ
                  </span>
                </span>
              </div>

              {/* LIVE Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-full font-bold uppercase text-[10px] tracking-wider shadow-lg shadow-red-950/60">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>LIVE</span>
              </div>

              {/* Viewers */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/70 border border-white/10 text-slate-200 rounded-full text-[11px] backdrop-blur-md">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono font-medium">12.5K</span>
              </div>

              {/* Active Filter Pill */}
              {activeFilter && (
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-purple-950/80 text-purple-200 border border-purple-500/50 rounded-full backdrop-blur-md shadow-md animate-in fade-in duration-200">
                  <span className="text-sm">{activeFilter.icon}</span>
                  <span className="font-bold text-[11px] text-white">{activeFilter.nameEnglish}</span>
                </div>
              )}
            </div>

            {/* Center: Live AI Feature Lock Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-black/65 border border-cyan-500/30 rounded-full backdrop-blur-xl shadow-lg">
              {isFaceDetected && detectedFeatures?.allLocked ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-300 font-mono tracking-wide">
                    AI LOCKED:
                  </span>
                  <span className="text-[10px] text-cyan-200 font-mono flex items-center gap-1.5">
                    <span>👁 Eyes 100%</span>
                    <span className="text-slate-500">•</span>
                    <span>👃 Nose 100%</span>
                    <span className="text-slate-500">•</span>
                    <span>👄 Mouth 100%</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-[11px] font-semibold text-amber-300 font-mono">
                    ACQUIRING FACIAL FEATURES...
                  </span>
                </>
              )}
            </div>

            {/* Right: Quick Action Controls (Reticles, 3D Mesh, Settings, Fullscreen) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Feature Reticles Toggle */}
              <button
                onClick={() => onUpdateSettings({ showFeatureReticles: !showReticles })}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-xl transition-all active:scale-95 ${
                  showReticles
                    ? 'bg-cyan-950/85 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-black/50 border-white/15 text-slate-400 hover:text-white'
                }`}
                title="Toggle Eye, Nose, Mouth HUD Reticles"
              >
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Reticles</span>
              </button>

              {/* 3D Shaded Mesh Toggle */}
              <button
                onClick={() => onUpdateSettings({ show3DShadedMesh: !settings.show3DShadedMesh })}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-xl transition-all active:scale-95 ${
                  settings.show3DShadedMesh
                    ? 'bg-purple-950/85 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                    : 'bg-black/50 border-white/15 text-slate-400 hover:text-white'
                }`}
                title="Toggle 3D Shaded Mesh Topology"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">3D Mesh</span>
              </button>

              {/* Settings Gear Button */}
              <button
                onClick={onOpenSettings}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 hover:border-cyan-400 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-xl shadow-md transition-all active:scale-95"
                title="Open Settings"
                aria-label="Application Settings"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={onToggleFullscreen}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 hover:border-purple-400 text-white flex items-center justify-center backdrop-blur-xl shadow-md transition-all active:scale-95"
                title="Pure Fullscreen Mode (Mask Only)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* MODERN BOTTOM FLOATING AR FILTER CAROUSEL DOCK                */}
          {/* ------------------------------------------------------------- */}
          <div className="absolute bottom-4 left-0 right-0 z-25 flex flex-col items-center pointer-events-auto px-4 max-w-4xl mx-auto">
            {/* Dock Collapse Toggle Pill */}
            <button
              onClick={() => setIsDockCollapsed((prev) => !prev)}
              className="flex items-center gap-1 px-3 py-0.5 mb-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-[11px] text-slate-300 hover:text-white backdrop-blur-md transition-all shadow-md active:scale-95"
            >
              <span>{isDockCollapsed ? 'Filters Carousel (16)' : 'Hide Filters'}</span>
              {isDockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Filter Dock Container */}
            {!isDockCollapsed && (
              <div className="w-full bg-[#0b0718]/90 border border-purple-500/30 rounded-2xl p-2.5 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col gap-2">
                {/* Category Switcher Tabs */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 bg-black/50 p-0.5 rounded-xl border border-white/5">
                    <button
                      onClick={() => setFilterCategory('film_characters')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        filterCategory === 'film_characters'
                          ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🎭 የሲኒማ ጭምብሎች</span>
                      <span className="text-[10px] opacity-75 ml-1">(8)</span>
                    </button>

                    <button
                      onClick={() => setFilterCategory('animals')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        filterCategory === 'animals'
                          ? 'bg-gradient-to-r from-purple-600 to-amber-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🦁 የኢትዮጵያ ዱር አራዊት</span>
                      <span className="text-[10px] opacity-75 ml-1">(8)</span>
                    </button>
                  </div>

                  {activeFilterId && (
                    <button
                      onClick={onClearFilter}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 rounded-xl transition-all"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Horizontal Scrolling Filter Cards Ribbon */}
                <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 scrollbar-thin scrollbar-thumb-purple-900">
                  {/* Option: RAW / NO FILTER */}
                  <button
                    onClick={onClearFilter}
                    className={`flex flex-col items-center justify-center shrink-0 w-16 h-20 rounded-xl transition-all duration-200 border ${
                      !activeFilterId
                        ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105'
                        : 'bg-slate-900/60 hover:bg-slate-800/70 border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-xs font-bold mb-1">
                      RAW
                    </div>
                    <span className="text-[10px] font-medium">የጠራ (None)</span>
                  </button>

                  {/* Filter Items */}
                  {currentCategoryFilters.map((f) => {
                    const isSelected = activeFilterId === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (isSelected) {
                            onClearFilter();
                          } else {
                            onSelectFilter(f.id);
                          }
                        }}
                        className={`group relative flex flex-col items-center justify-center shrink-0 w-16 h-20 rounded-xl transition-all duration-200 border ${
                          isSelected
                            ? 'bg-purple-600/80 border-2 border-cyan-300 text-white shadow-[0_0_16px_rgba(168,85,247,0.6)] scale-105'
                            : 'bg-slate-900/70 hover:bg-slate-800/80 border-purple-500/20 text-slate-300 hover:scale-102'
                        }`}
                        title={`${f.nameEnglish} (${f.nameAmharic}) - Tap to apply/remove`}
                      >
                        {/* Circular Avatar / Emoji Icon */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1 transition-all ${
                            isSelected
                              ? 'bg-purple-950 ring-2 ring-cyan-300'
                              : 'bg-slate-950/80 group-hover:bg-slate-900'
                          }`}
                        >
                          {f.icon}
                        </div>

                        {/* Name Label */}
                        <span className="text-[10px] font-semibold text-center truncate max-w-[60px] leading-tight">
                          {f.nameEnglish.split(' ')[0]}
                        </span>
                        <span className="text-[9px] text-purple-300 truncate max-w-[60px] leading-tight">
                          {f.nameAmharic.split(' ')[0]}
                        </span>

                        {/* Active Selection Indicator */}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 flex items-center justify-center shadow-md">
                            <CheckCircle2 className="w-3 h-3 text-slate-950" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 5. CAMERA PERMISSION ERROR MODAL */}
      {permissionStatus !== 'granted' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
            <CameraOff className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">ካሜራ ፈቃድ (Camera Access Required)</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {errorMessage ||
              'ጎሪ እና ጅቦ requires camera access to detect facial organs (eyes, nose, mouth) and project 3D deformable masks.'}
          </p>

          <button
            onClick={() => startCamera(facingMode)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 active:scale-95 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            ካሜራ አንቃ (Enable Camera)
          </button>
        </div>
      )}
    </div>
  );
};
