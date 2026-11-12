import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Maximize2,
  Sparkles,
  CameraOff,
  Eye,
} from 'lucide-react';
import { FilterId, AppSettings, FaceTrackingData } from '../../types';
import { ANIMAL_FILTERS, FILM_CHARACTER_FILTERS } from '../../data/filtersCatalog';
import { ARFaceMeshShaderEngine } from './filters/ARFaceMeshShaderEngine';
import { FaceTracker } from '../../services/faceTracker';

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

  const filterEngineRef = useRef<ARFaceMeshShaderEngine | null>(null);
  const faceTrackerRef = useRef<FaceTracker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Category State: 'animals' (8 Animals) or 'film_characters' (8 Cinema Masks)
  const [filterCategory, setFilterCategory] = useState<'animals' | 'film_characters'>('animals');
  const allFilters = [...ANIMAL_FILTERS, ...FILM_CHARACTER_FILTERS];

  // Split selected category filters: 4 on Left, 4 on Right
  const currentCategoryFilters = filterCategory === 'animals' ? ANIMAL_FILTERS : FILM_CHARACTER_FILTERS;
  const leftFilters = currentCategoryFilters.slice(0, 4);
  const rightFilters = currentCategoryFilters.slice(4, 8);

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

  // Main Render & Tracking Loop
  useEffect(() => {
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

        // Update high-fidelity 3D Face Mesh with Shaded Mesh / Character Filter
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

  // Click-Again Filter Toggle: clicking selected filter unselects & clears it
  const handleFilterClick = (id: FilterId) => {
    if (activeFilterId === id) {
      onClearFilter();
    } else {
      onSelectFilter(id);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={() => {
        // Tapping/clicking anywhere in fullscreen mode cleanly exits fullscreen
        if (isFullscreen) {
          onToggleFullscreen();
        }
      }}
      className={`relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center select-none ${
        isFullscreen ? 'fixed inset-0 z-50 cursor-pointer' : ''
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

      {/* 2. 100% Opaque WebGL 3D Shaded Mesh & Mask Canvas */}
      <canvas
        ref={filterCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-15"
      />

      {/* 3. Subtle Vignette & Studio Lighting Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-radial from-transparent via-black/10 to-black/50" />

      {/* ------------------------------------------------------------------ */}
      {/* ALL HUD OVERLAYS & CONTROLS (COMPLETELY HIDDEN IN FULLSCREEN MODE) */}
      {/* When in Fullscreen: ZERO text, ZERO icons, ONLY video + 3D filter  */}
      {/* ------------------------------------------------------------------ */}
      {!isFullscreen && (
        <>
          {/* TOP STATUS BAR: LIVE + 12.5K + Active Filter Badge + Fullscreen */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between text-xs font-medium">
            {/* Left: • LIVE + 👁 12.5K Pills + Active Filter */}
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

              {/* Active Filter Pill */}
              {activeFilterId && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-900/80 text-purple-200 border border-purple-500/40 rounded-full backdrop-blur-md shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span className="font-semibold text-[11px]">
                    {allFilters.find((f) => f.id === activeFilterId)?.nameEnglish}
                  </span>
                </div>
              )}

              {/* 3D Shaded Mesh Active Pill */}
              {settings.show3DShadedMesh && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/80 border border-cyan-400/80 text-cyan-200 rounded-full font-bold text-[11px] shadow-[0_0_12px_rgba(6,182,212,0.4)] backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>3D SHADED MESH</span>
                </div>
              )}
            </div>

            {/* Right: Fullscreen Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleFullscreen}
                className="w-9 h-9 rounded-full bg-black/60 border border-white/15 hover:border-purple-500 text-white flex items-center justify-center transition-all backdrop-blur-md shadow-md active:scale-95"
                title="Fullscreen Mode (Hide all UI, Filter Only)"
                aria-label="Toggle Fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* CATEGORY TABS: 🐾 የዱር እንስሳት vs 🎭 የሲኒማ ጭምብሎች */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center bg-black/65 border border-purple-500/40 rounded-full p-1 backdrop-blur-md shadow-xl max-w-[95vw]">
            <button
              onClick={() => setFilterCategory('animals')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filterCategory === 'animals'
                  ? 'bg-gradient-to-r from-purple-600 to-amber-600 text-white shadow-md glow-purple-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🐾 የዱር እንስሳት</span>
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
              <span>🎭 የሲኒማ ጭምብሎች</span>
              <span className="hidden sm:inline">(8 Cinema Masks)</span>
            </button>
          </div>

          {/* LEFT COLUMN: 4 Pinned Character Masks (Click-again unselects) */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
            {leftFilters.map((filter) => {
              const isSelected = activeFilterId === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => handleFilterClick(filter.id)}
                  className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-purple-600/90 border-2 border-cyan-300 text-white shadow-lg shadow-purple-900/60 scale-110'
                      : 'bg-slate-900/80 hover:bg-slate-800/90 border border-purple-500/30 text-slate-200 backdrop-blur-md hover:scale-105'
                  }`}
                  title={`${filter.nameEnglish} - Tap again to unselect`}
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

          {/* RIGHT COLUMN: 4 Pinned Character Masks (Click-again unselects) */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
            {rightFilters.map((filter) => {
              const isSelected = activeFilterId === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => handleFilterClick(filter.id)}
                  className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-purple-600/90 border-2 border-cyan-300 text-white shadow-lg shadow-purple-900/60 scale-110'
                      : 'bg-slate-900/80 hover:bg-slate-800/90 border border-purple-500/30 text-slate-200 backdrop-blur-md hover:scale-105'
                  }`}
                  title={`${filter.nameEnglish} - Tap again to unselect`}
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

          {/* BOTTOM CONTROLS STRIP: Single Fullscreen Button */}
          <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center">
            <button
              onClick={onToggleFullscreen}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg glow-purple-sm transition-all active:scale-95 flex items-center gap-2"
              title="Fullscreen Mode (Full Screen with Filter Only)"
              aria-label="Enter Fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-white" />
              <span>ሙሉ ማያ (Fullscreen)</span>
            </button>
          </div>
        </>
      )}

      {/* 4. PERMISSION / ERROR FALLBACK OVERLAY */}
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
            <span>ካሜራ አንቃ (Enable Camera)</span>
          </button>
        </div>
      )}
    </div>
  );
};
