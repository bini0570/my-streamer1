import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Maximize2,
  CameraOff,
  SwitchCamera,
  Play,
  Pause,
  Sliders,
  Settings as SettingsIcon,
  Activity,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  Cpu,
  Eye,
  CheckCircle,
  Menu,
  Shield,
  Radio,
} from 'lucide-react';
import { yoloDetector } from '../../services/yoloDetector.js';
import { byteTracker } from '../../services/byteTrack.js';
import { VisionBoundingBoxOverlay } from './VisionBoundingBoxOverlay.jsx';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Objects', icon: '✦' },
  { id: 'people', label: 'People', icon: '👤' },
  { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
  { id: 'electronics', label: 'Devices', icon: '📱' },
  { id: 'animals', label: 'Animals', icon: '🐾' },
  { id: 'furniture', label: 'Furniture', icon: '🪑' },
  { id: 'everyday', label: 'Items', icon: '🎒' },
];

export const CameraPreview = ({
  settings,
  onOpenSettings,
  onOpenDrawer,
  onUpdateSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [errorMessage, setErrorMessage] = useState(null);
  const [facingMode, setFacingMode] = useState(settings.facingMode || 'user');

  // Viewport projection dimensions
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  // Model loading state
  const [modelLoadingStatus, setModelLoadingStatus] = useState('Initializing AI Neural Core...');
  const [isModelReady, setIsModelReady] = useState(false);

  // Active Live Tracks
  const [trackedObjects, setTrackedObjects] = useState([]);

  // Telemetry Metrics
  const [metrics, setMetrics] = useState({
    fps: 0,
    inferenceMs: 0,
    totalDetected: 0,
    movingCount: 0,
    stationaryCount: 0,
    modelLoaded: false,
    engineMode: 'webgl',
  });

  const [isControlsMinimized, setIsControlsMinimized] = useState(false);

  // Loop references
  const isInferencingRef = useRef(false);
  const animFrameIdRef = useRef(null);
  const lastFrameTimeRef = useRef(performance.now());
  const fpsWindowRef = useRef([]);

  // Sync facing mode from settings
  useEffect(() => {
    if (settings.facingMode && settings.facingMode !== facingMode) {
      setFacingMode(settings.facingMode);
    }
  }, [settings.facingMode, facingMode]);

  // Handle ESC key to exit fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        onToggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onToggleFullscreen]);

  // Load YOLO11n ONNX Neural Engine on mount
  useEffect(() => {
    let isCancelled = false;

    const initModel = async () => {
      setModelLoadingStatus('Loading YOLO11n neural weights...');
      const success = await yoloDetector.loadModel((status) => {
        if (!isCancelled) {
          setModelLoadingStatus(status);
        }
      });

      if (!isCancelled) {
        if (success) {
          setIsModelReady(true);
          setMetrics((prev) => ({
            ...prev,
            modelLoaded: true,
            engineMode: yoloDetector.getEngineMode(),
          }));
        } else {
          setModelLoadingStatus('Model failed to load. Please refresh.');
        }
      }
    };

    initModel();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Initialize Camera Stream
  const startCamera = useCallback(
    async (facing) => {
      setPermissionStatus('requesting');
      setErrorMessage(null);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      try {
        const constraints = {
          audio: false,
          video: {
            facingMode: facing,
            width:
              settings.cameraResolution === '1080p'
                ? { ideal: 1920 }
                : settings.cameraResolution === '720p'
                ? { ideal: 1280 }
                : { ideal: 640 },
            height:
              settings.cameraResolution === '1080p'
                ? { ideal: 1080 }
                : settings.cameraResolution === '720p'
                ? { ideal: 720 }
                : { ideal: 480 },
          },
        };

        let mediaStream;
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
    },
    [settings.cameraResolution]
  );

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
    };
  }, [startCamera, facingMode]);

  // Handle Resize of container overlay
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
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

  // Switch Camera Lens between Front & Rear
  const handleToggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    onUpdateSettings({ facingMode: nextMode });
    byteTracker.reset();
  };

  // Toggle Detection Paused
  const handleTogglePause = () => {
    onUpdateSettings({ isDetectionPaused: !settings.isDetectionPaused });
  };

  // 1. Synchronous 60 FPS Render Loop (Never awaits anything - preview never freezes)
  useEffect(() => {
    let isCancelled = false;

    const renderLoop = () => {
      if (isCancelled) return;

      const now = performance.now();
      const dt = Math.max(0.001, (now - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = now;

      // Sliding window display FPS
      const currentFps = 1 / dt;
      fpsWindowRef.current.push(currentFps);
      if (fpsWindowRef.current.length > 20) {
        fpsWindowRef.current.shift();
      }
      const avgFps = Math.round(
        fpsWindowRef.current.reduce((a, b) => a + b, 0) / fpsWindowRef.current.length
      );

      const cWidth = dimensions.width || 640;
      const cHeight = dimensions.height || 480;

      // Smoothly glide bounding boxes and motion trails using ByteTrack velocity prediction
      const activeTracks = byteTracker.advanceFrame(dt, cWidth, cHeight);
      setTrackedObjects(activeTracks);

      setMetrics((prev) => ({
        ...prev,
        fps: avgFps,
      }));

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [dimensions]);

  // 2. Asynchronous Background Inference Loop (Runs completely independently)
  useEffect(() => {
    let isCancelled = false;
    let timerId = null;

    const runInferenceCycle = async () => {
      if (isCancelled) return;

      if (
        isModelReady &&
        !settings.isDetectionPaused &&
        !isInferencingRef.current &&
        videoRef.current &&
        videoRef.current.readyState >= 2
      ) {
        isInferencingRef.current = true;
        const inferenceStart = performance.now();

        try {
          const cWidth = dimensions.width || 640;
          const cHeight = dimensions.height || 480;

          const rawDetections = await yoloDetector.detect(
            videoRef.current,
            settings.confidenceThreshold || 0.45,
            0.45
          );

          const inferenceElapsed = Math.round(performance.now() - inferenceStart);

          // Mirror X coordinates for front selfie camera
          if (facingMode === 'user') {
            for (const d of rawDetections) {
              d.bbox.x = 1.0 - (d.bbox.x + d.bbox.width);
            }
          }

          // Update ByteTracker
          const updatedTracks = byteTracker.update(rawDetections, cWidth, cHeight, performance.now());
          setTrackedObjects(updatedTracks);

          const movingCount = updatedTracks.filter((t) => t.isMoving).length;
          const stationaryCount = updatedTracks.length - movingCount;

          setMetrics((prev) => ({
            ...prev,
            inferenceMs: inferenceElapsed,
            totalDetected: updatedTracks.length,
            movingCount,
            stationaryCount,
            modelLoaded: true,
            engineMode: yoloDetector.getEngineMode(),
          }));
        } catch (err) {
          console.error('[DetectionLoop] Inference error:', err);
        } finally {
          isInferencingRef.current = false;
        }
      }

      if (!isCancelled) {
        timerId = window.setTimeout(runInferenceCycle, 40);
      }
    };

    timerId = window.setTimeout(runInferenceCycle, 150);

    return () => {
      isCancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      isInferencingRef.current = false;
    };
  }, [isModelReady, settings.isDetectionPaused, settings.confidenceThreshold, facingMode, dimensions]);

  return (
    <div
      ref={containerRef}
      onClick={() => {
        if (isFullscreen) {
          onToggleFullscreen();
        }
      }}
      className={`relative w-full h-full overflow-hidden bg-[#07090e] flex items-center justify-center select-none ${
        isFullscreen ? 'fixed inset-0 z-50 cursor-pointer' : ''
      }`}
    >
      {/* 1. Live Camera Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-200 ${
          facingMode === 'user' ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* 2. Precision Kinetic Bounding Box & Motion Trail Overlay */}
      <VisionBoundingBoxOverlay
        tracks={trackedObjects}
        width={dimensions.width}
        height={dimensions.height}
        showMotionTrails={settings.showMotionTrails !== false}
        showBoxDimensions={settings.showBoxDimensions !== false}
        showConfidence={settings.showConfidence !== false}
        selectedCategory={settings.selectedCategory || 'all'}
      />

      {/* 3. Subtle Film Vignette Gradient */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-radial from-transparent via-black/10 to-black/50" />

      {/* 4. Model Loading Screen */}
      {!isModelReady && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl p-6 text-center">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Zap className="w-7 h-7 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-white tracking-wide font-sans">AuraVision Core Initializing</h3>
          <p className="text-xs text-cyan-300/80 font-mono mt-1.5 max-w-sm">{modelLoadingStatus}</p>
          <div className="mt-4 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>100% Offline Pretrained Neural Core</span>
          </div>
        </div>
      )}

      {/* 5. Permission / Camera Error */}
      {permissionStatus === 'denied' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 mb-3.5 shadow-xl">
            <CameraOff className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">Camera Access Required</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">{errorMessage || 'Please enable camera permission in device settings.'}</p>
          <button
            onClick={() => startCamera(facingMode)}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
          >
            Retry Camera Access
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODERN GLASS HUD (COMPLETELY HIDDEN IN FULLSCREEN STREAMER MODE)   */}
      {/* ------------------------------------------------------------------ */}
      {!isFullscreen && (
        <>
          {/* TOP DYNAMIC ISLAND BAR */}
          <div className="absolute top-3.5 left-3.5 right-3.5 z-30 flex items-center justify-between pointer-events-auto gap-2">
            {/* Left: Menu + Brand Beacon */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenDrawer}
                className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 border border-white/10 hover:border-cyan-400/50 text-white flex items-center justify-center backdrop-blur-2xl shadow-xl transition-all active:scale-95"
                title="Navigation Menu"
                aria-label="Open Navigation Drawer"
              >
                <Menu className="w-4 h-4 text-slate-200" />
              </button>

              {/* Brand Pill */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-black/50 border border-white/10 rounded-full backdrop-blur-2xl shadow-xl select-none">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                <span className="text-xs font-bold tracking-wider text-white font-sans">
                  AURA<span className="text-cyan-400">VISION</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 border-l border-white/10 pl-2">
                  {facingMode === 'user' ? 'FRONT' : 'REAR'}
                </span>
              </div>
            </div>

            {/* Center: Live Telemetry Capsule */}
            <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-black/50 border border-white/10 rounded-full backdrop-blur-2xl shadow-xl text-[11px] font-mono text-slate-300">
              {/* FPS */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px]">FPS</span>
                <span
                  className={`font-bold ${
                    metrics.fps >= 24 ? 'text-emerald-400' : metrics.fps >= 15 ? 'text-amber-400' : 'text-rose-400'
                  }`}
                >
                  {metrics.fps}
                </span>
              </div>

              <span className="text-white/10">|</span>

              {/* Inference Latency */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px]">AI</span>
                <span className="font-bold text-cyan-300">{metrics.inferenceMs}ms</span>
              </div>

              <span className="text-white/10">|</span>

              {/* Target Objects Count */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px]">TARGETS</span>
                <span className="font-bold text-white">{metrics.totalDetected}</span>
                {metrics.movingCount > 0 && (
                  <span className="text-emerald-400 text-[10px]">({metrics.movingCount} mov)</span>
                )}
              </div>

              <span className="text-white/10">|</span>

              {/* Engine Mode */}
              <div className="flex items-center gap-1 text-[10px] text-purple-300 uppercase">
                <Cpu className="w-3 h-3 text-purple-400" />
                <span>{metrics.engineMode}</span>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-2">
              {/* Pause/Resume Toggle */}
              <button
                onClick={handleTogglePause}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-2xl transition-all active:scale-95 ${
                  settings.isDetectionPaused
                    ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-black/50 border-white/10 text-slate-300 hover:text-white'
                }`}
                title={settings.isDetectionPaused ? 'Resume Object Tracking' : 'Pause Object Tracking'}
              >
                {settings.isDetectionPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="hidden sm:inline">Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Pause</span>
                  </>
                )}
              </button>

              {/* Lens Flip */}
              <button
                onClick={handleToggleCameraFacing}
                className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 border border-white/10 hover:border-cyan-400/50 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-2xl shadow-xl transition-all active:scale-95"
                title={`Switch Camera Lens (Current: ${facingMode === 'user' ? 'Front' : 'Rear'})`}
                aria-label="Switch Camera Facing"
              >
                <SwitchCamera className="w-4 h-4 text-cyan-300" />
              </button>

              {/* Settings Gear */}
              <button
                onClick={onOpenSettings}
                className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 border border-white/10 hover:border-cyan-400/50 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-2xl shadow-xl transition-all active:scale-95"
                title="Settings"
                aria-label="Application Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>

              {/* Fullscreen Streamer Mode (TikTok LIVE) */}
              <button
                onClick={onToggleFullscreen}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center justify-center backdrop-blur-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all active:scale-95"
                title="Pure Streamer Fullscreen (TikTok LIVE)"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BOTTOM DYNAMIC ISLAND CONTROL DOCK                            */}
          {/* ------------------------------------------------------------- */}
          <div className="absolute bottom-4 left-0 right-0 z-30 flex flex-col items-center pointer-events-auto px-4 max-w-2xl mx-auto">
            {/* Dock Collapse Toggle */}
            <button
              onClick={() => setIsControlsMinimized((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-black/50 hover:bg-black/75 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white backdrop-blur-xl transition-all shadow-md active:scale-95"
            >
              <span>{isControlsMinimized ? 'Show Control Island' : 'Hide Controls (Streamer HUD)'}</span>
            </button>

            {/* Island Glass Panel */}
            {!isControlsMinimized && (
              <div className="w-full bg-[#070a12]/85 border border-white/10 rounded-2xl p-3 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex flex-col gap-2.5">
                {/* 1. Category Switcher */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {CATEGORY_TABS.map((tab) => {
                    const isSelected = (settings.selectedCategory || 'all') === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => onUpdateSettings({ selectedCategory: tab.id })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                            : 'bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Sensitivity Slider & Feature Toggles */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
                  {/* Slider */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <span className="text-[11px] font-mono text-cyan-300 whitespace-nowrap">
                      Threshold: {Math.round((settings.confidenceThreshold || 0.45) * 100)}%
                    </span>
                    <input
                      type="range"
                      min="30"
                      max="90"
                      step="5"
                      value={Math.round((settings.confidenceThreshold || 0.45) * 100)}
                      onChange={(e) =>
                        onUpdateSettings({ confidenceThreshold: parseInt(e.target.value, 10) / 100 })
                      }
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Feature Toggles */}
                  <div className="flex items-center gap-2">
                    {/* Motion Trails Toggle */}
                    <button
                      onClick={() =>
                        onUpdateSettings({ showMotionTrails: !(settings.showMotionTrails !== false) })
                      }
                      className={`px-3 py-1 rounded-xl border text-[11px] font-mono font-medium transition-all ${
                        settings.showMotionTrails !== false
                          ? 'bg-cyan-950/80 border-cyan-400/80 text-cyan-200'
                          : 'bg-white/[0.04] border-white/10 text-slate-400'
                      }`}
                    >
                      ∿ Trails: {settings.showMotionTrails !== false ? 'ON' : 'OFF'}
                    </button>

                    {/* Dimensions Toggle */}
                    <button
                      onClick={() =>
                        onUpdateSettings({ showBoxDimensions: !(settings.showBoxDimensions !== false) })
                      }
                      className={`px-3 py-1 rounded-xl border text-[11px] font-mono font-medium transition-all ${
                        settings.showBoxDimensions !== false
                          ? 'bg-purple-950/80 border-purple-400/80 text-purple-200'
                          : 'bg-white/[0.04] border-white/10 text-slate-400'
                      }`}
                    >
                      📐 Dims: {settings.showBoxDimensions !== false ? 'ON' : 'OFF'}
                    </button>

                    {/* Offline Badge */}
                    <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span>Offline Core</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
