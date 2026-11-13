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
} from 'lucide-react';
import { AppSettings, DetectionMetrics, ObjectCategory, TrackedObject } from '../../types';
import { yoloDetector } from '../../services/yoloDetector';
import { byteTracker } from '../../services/byteTrack';
import { VisionBoundingBoxOverlay } from './VisionBoundingBoxOverlay';

interface CameraPreviewProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenDrawer: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const CATEGORY_TABS: { id: ObjectCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All Objects', icon: '🌐' },
  { id: 'people', label: 'People', icon: '👤' },
  { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'animals', label: 'Animals', icon: '🐾' },
  { id: 'furniture', label: 'Furniture', icon: '🪑' },
  { id: 'everyday', label: 'Everyday', icon: '🎒' },
];

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  settings,
  onOpenSettings,
  onOpenDrawer,
  onUpdateSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(settings.facingMode || 'user');

  // Logical viewport projection dimensions
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  // AI Model Loading State
  const [modelLoadingStatus, setModelLoadingStatus] = useState<string>('Initializing YOLO11n engine...');
  const [isModelReady, setIsModelReady] = useState(false);

  // Active Live Tracks for Overlay
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([]);

  // Telemetry Metrics
  const [metrics, setMetrics] = useState<DetectionMetrics>({
    fps: 0,
    inferenceMs: 0,
    totalDetected: 0,
    movingCount: 0,
    stationaryCount: 0,
    modelLoaded: false,
    engineMode: 'webgl',
  });

  // Dock collapse toggle for streamer mode
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);

  // Refs for tracking animation & inference loops
  const isInferencingRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const fpsWindowRef = useRef<number[]>([]);

  // Sync facing mode from settings
  useEffect(() => {
    if (settings.facingMode && settings.facingMode !== facingMode) {
      setFacingMode(settings.facingMode);
    }
  }, [settings.facingMode, facingMode]);

  // Handle ESC key to exit fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      setModelLoadingStatus('Loading YOLO11n ONNX neural weights...');
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
          setModelLoadingStatus('Failed to load YOLO11n model. Please refresh.');
        }
      }
    };

    initModel();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Initialize Camera Stream
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    setPermissionStatus('requesting');
    setErrorMessage(null);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
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

  // Main High-Performance Animation & Decoupled Inference Loop
  useEffect(() => {
    let isCancelled = false;

    const processLoop = async () => {
      if (isCancelled) return;

      const now = performance.now();
      const dt = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      // Calculate instantaneous rendering FPS (sliding window of 15 frames)
      const currentFps = dt > 0 ? 1 / dt : 30;
      fpsWindowRef.current.push(currentFps);
      if (fpsWindowRef.current.length > 15) {
        fpsWindowRef.current.shift();
      }
      const avgFps = Math.round(
        fpsWindowRef.current.reduce((a, b) => a + b, 0) / fpsWindowRef.current.length
      );

      const cWidth = dimensions.width || 640;
      const cHeight = dimensions.height || 480;

      // 1. Advance ByteTrack positions smoothly between AI frames using velocity prediction
      const currentTracks = byteTracker.advanceFrame(dt, cWidth, cHeight);
      setTrackedObjects(currentTracks);

      // 2. Decoupled AI Object Detection
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
          const rawDetections = await yoloDetector.detect(
            videoRef.current,
            settings.confidenceThreshold || 0.45,
            0.45
          );

          const inferenceElapsed = Math.round(performance.now() - inferenceStart);

          // If front selfie camera is mirrored horizontally, adjust detection X coordinates
          if (facingMode === 'user') {
            for (const d of rawDetections) {
              d.bbox.x = 1.0 - (d.bbox.x + d.bbox.width);
            }
          }

          // Update ByteTracker with new detections
          const updatedTracks = byteTracker.update(rawDetections, cWidth, cHeight, performance.now());
          setTrackedObjects(updatedTracks);

          const movingCount = updatedTracks.filter((t) => t.isMoving).length;
          const stationaryCount = updatedTracks.length - movingCount;

          setMetrics({
            fps: avgFps,
            inferenceMs: inferenceElapsed,
            totalDetected: updatedTracks.length,
            movingCount,
            stationaryCount,
            modelLoaded: true,
            engineMode: yoloDetector.getEngineMode(),
          });
        } catch (err) {
          console.error('[DetectionLoop] Error during inference cycle:', err);
        } finally {
          isInferencingRef.current = false;
        }
      } else {
        // Just update FPS metric during animation frame
        setMetrics((prev) => ({
          ...prev,
          fps: avgFps,
        }));
      }

      animFrameIdRef.current = requestAnimationFrame(processLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(processLoop);

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isModelReady, settings.isDetectionPaused, settings.confidenceThreshold, facingMode, dimensions]);

  return (
    <div
      ref={containerRef}
      onClick={() => {
        // Tapping anywhere in fullscreen streamer mode exits fullscreen
        if (isFullscreen) {
          onToggleFullscreen();
        }
      }}
      className={`relative w-full h-full overflow-hidden bg-[#04060c] flex items-center justify-center select-none ${
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

      {/* 2. Cyber Tactical Bounding Box & Motion Trail Overlay */}
      <VisionBoundingBoxOverlay
        tracks={trackedObjects}
        width={dimensions.width}
        height={dimensions.height}
        showMotionTrails={settings.showMotionTrails !== false}
        showBoxDimensions={settings.showBoxDimensions !== false}
        showConfidence={settings.showConfidence !== false}
        selectedCategory={settings.selectedCategory || 'all'}
      />

      {/* 3. Subtle Cyber Edge Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-radial from-transparent via-black/10 to-black/60" />

      {/* 4. Model Loading Indicator (Displayed only until weights finish loading) */}
      {!isModelReady && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6 text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Zap className="w-7 h-7 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-wide">VisionAI Engine Starting</h3>
          <p className="text-xs text-cyan-300/80 font-mono mt-1 max-w-sm">{modelLoadingStatus}</p>
          <div className="mt-4 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>100% Offline Pretrained YOLO11n (ONNX)</span>
          </div>
        </div>
      )}

      {/* 5. Permission / Camera Error Banner */}
      {permissionStatus === 'denied' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
          <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-400 mb-3">
            <CameraOff className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">Camera Access Required</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">{errorMessage || 'Please allow camera permission in browser settings.'}</p>
          <button
            onClick={() => startCamera(facingMode)}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
          >
            Retry Camera Access
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* HUD OVERLAYS & CONTROLS (COMPLETELY HIDDEN IN FULLSCREEN STREAMER) */}
      {/* ------------------------------------------------------------------ */}
      {!isFullscreen && (
        <>
          {/* TOP TACTICAL HUD TELEMETRY BAR */}
          <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto gap-2">
            {/* Left: Menu Drawer + VisionAI Brand + Live Status */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenDrawer}
                className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 hover:border-cyan-400 text-white flex items-center justify-center backdrop-blur-xl shadow-lg transition-all active:scale-95"
                title="Navigation Menu"
                aria-label="Open Navigation Drawer"
              >
                <Menu className="w-4 h-4 text-slate-100" />
              </button>

              {/* Brand Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0e1a]/85 border border-cyan-500/30 rounded-full backdrop-blur-xl shadow-lg select-none">
                <Zap className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span className="text-xs sm:text-sm font-black tracking-wider text-white font-mono">
                  <span className="bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                    VisionAI
                  </span>
                  <span className="text-cyan-400 font-bold ml-1 text-[11px]">TRACKER</span>
                </span>
              </div>

              {/* Live Tracking Indicator */}
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider backdrop-blur-md shadow-md ${
                  settings.isDetectionPaused
                    ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
                    : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    settings.isDetectionPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                <span>{settings.isDetectionPaused ? 'PAUSED' : 'AI LIVE'}</span>
              </div>
            </div>

            {/* Center: Live Performance Telemetry Pill */}
            <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 bg-black/75 border border-white/10 rounded-full backdrop-blur-xl shadow-lg text-[11px] font-mono text-slate-200">
              {/* FPS Counter */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[10px]">FPS:</span>
                <span
                  className={`font-bold ${
                    metrics.fps >= 24 ? 'text-emerald-400' : metrics.fps >= 15 ? 'text-amber-400' : 'text-red-400'
                  }`}
                >
                  {metrics.fps}
                </span>
              </div>

              <span className="text-slate-600">•</span>

              {/* Latency */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[10px]">LATENCY:</span>
                <span className="font-bold text-cyan-300">{metrics.inferenceMs}ms</span>
              </div>

              <span className="text-slate-600">•</span>

              {/* Object & Motion Count */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">OBJS:</span>
                <span className="font-bold text-white">{metrics.totalDetected}</span>
                <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                  (<TrendingUp className="w-2.5 h-2.5" />
                  {metrics.movingCount} mov)
                </span>
              </div>

              <span className="text-slate-600">•</span>

              {/* Acceleration Engine */}
              <div className="flex items-center gap-1 text-[10px] text-purple-300 uppercase">
                <Cpu className="w-3 h-3" />
                <span>{metrics.engineMode}</span>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Start/Stop Detection Toggle */}
              <button
                onClick={handleTogglePause}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-xl transition-all active:scale-95 ${
                  settings.isDetectionPaused
                    ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'bg-black/60 border-white/15 text-slate-300 hover:text-white'
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

              {/* Front/Rear Camera Lens Switch */}
              <button
                onClick={handleToggleCameraFacing}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 hover:border-cyan-400 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-xl shadow-md transition-all active:scale-95"
                title={`Switch Camera Lens (Current: ${facingMode === 'user' ? 'Front' : 'Rear'})`}
                aria-label="Switch Camera Facing"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-cyan-300" />
              </button>

              {/* Settings Gear */}
              <button
                onClick={onOpenSettings}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 hover:border-cyan-400 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-xl shadow-md transition-all active:scale-95"
                title="Open Settings"
                aria-label="Application Settings"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
              </button>

              {/* Fullscreen Streamer Mode */}
              <button
                onClick={onToggleFullscreen}
                className="w-8 h-8 rounded-full bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-400/50 text-cyan-200 flex items-center justify-center backdrop-blur-xl shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all active:scale-95"
                title="Pure Streamer Fullscreen Mode (TikTok LIVE)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BOTTOM FLOATING CYBER TACTICAL DOCK                           */}
          {/* ------------------------------------------------------------- */}
          <div className="absolute bottom-4 left-0 right-0 z-30 flex flex-col items-center pointer-events-auto px-3 max-w-3xl mx-auto">
            {/* Dock Collapse Toggle */}
            <button
              onClick={() => setIsControlsMinimized((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-black/70 hover:bg-black/90 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white backdrop-blur-md transition-all shadow-md active:scale-95"
            >
              <span>{isControlsMinimized ? 'Show Detection Controls' : 'Hide Controls (Streamer HUD)'}</span>
            </button>

            {/* Main Cyber Control Panel */}
            {!isControlsMinimized && (
              <div className="w-full bg-[#080d1a]/92 border border-cyan-500/25 rounded-2xl p-3 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex flex-col gap-2.5">
                {/* 1. Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {CATEGORY_TABS.map((tab) => {
                    const isSelected = (settings.selectedCategory || 'all') === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => onUpdateSettings({ selectedCategory: tab.id })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)] border border-cyan-300/40'
                            : 'bg-black/50 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Interactive Controls Row: Confidence Slider & Fast Toggles */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/10 text-xs">
                  {/* Confidence Threshold Slider */}
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-[11px] font-mono text-cyan-300 whitespace-nowrap">
                      Confidence: {Math.round((settings.confidenceThreshold || 0.45) * 100)}%
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

                  {/* Motion Trails & Box Dimensions Toggles */}
                  <div className="flex items-center gap-2">
                    {/* Motion Trails Toggle */}
                    <button
                      onClick={() =>
                        onUpdateSettings({ showMotionTrails: !(settings.showMotionTrails !== false) })
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all ${
                        settings.showMotionTrails !== false
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                          : 'bg-black/40 border-white/10 text-slate-400'
                      }`}
                    >
                      ∿ Trails: {settings.showMotionTrails !== false ? 'ON' : 'OFF'}
                    </button>

                    {/* Dimensions Toggle */}
                    <button
                      onClick={() =>
                        onUpdateSettings({ showBoxDimensions: !(settings.showBoxDimensions !== false) })
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all ${
                        settings.showBoxDimensions !== false
                          ? 'bg-purple-950/80 border-purple-400 text-purple-200'
                          : 'bg-black/40 border-white/10 text-slate-400'
                      }`}
                    >
                      📐 Dims: {settings.showBoxDimensions !== false ? 'ON' : 'OFF'}
                    </button>

                    {/* 100% Offline Status Badge */}
                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-md border border-emerald-500/30">
                      <CheckCircle className="w-3 h-3" />
                      <span>100% Offline</span>
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
