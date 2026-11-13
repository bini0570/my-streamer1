import React from 'react';
import {
  X,
  Moon,
  Sun,
  Camera,
  Sliders,
  ShieldCheck,
  Cpu,
  Layers,
  Smartphone,
  Eye,
  CheckCircle,
  Zap,
  Activity,
} from 'lucide-react';
import { AppSettings } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenAndroidHub: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenAndroidHub,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-[#090d1a] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">VisionAI Settings</h3>
              <p className="text-xs text-slate-400">Configure YOLO11n AI detection, ByteTrack & camera</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* 1. Theme Configuration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Moon className="w-3.5 h-3.5" />
              <span>Theme Appearance</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-cyan-600/25 border-cyan-400 text-white shadow-sm'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-xs">Cyber Dark (HUD)</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  settings.theme === 'light'
                    ? 'bg-cyan-600/25 border-cyan-400 text-white shadow-sm'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-xs">High Contrast Light</span>
              </button>
            </div>
          </div>

          {/* 2. Camera Configuration */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Stream & Resolution</span>
            </label>

            {/* Resolution Selector */}
            <div className="grid grid-cols-3 gap-2">
              {(['720p', '1080p', '480p'] as const).map((res) => {
                const isSelected = settings.cameraResolution === res;
                return (
                  <button
                    key={res}
                    onClick={() => onUpdateSettings({ cameraResolution: res })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-cyan-600/30 border-cyan-400 text-white font-bold'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">{res.toUpperCase()}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {res === '720p' ? 'Balanced' : res === '1080p' ? 'Ultra HD' : 'Fast (A06)'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. AI Detection & Tracking Configuration */}
          <div className="space-y-3 p-3.5 rounded-xl bg-black/40 border border-white/10">
            <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Zap className="w-3.5 h-3.5" />
              <span>YOLO11n & ByteTrack Controls</span>
            </label>

            {/* Confidence Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Confidence Threshold:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {Math.round((settings.confidenceThreshold || 0.45) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                step="5"
                value={Math.round((settings.confidenceThreshold || 0.45) * 100)}
                onChange={(e) =>
                  onUpdateSettings({ confidenceThreshold: parseInt(e.target.value, 10) / 100 })
                }
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>30% (More detections)</span>
                <span>90% (Strict high precision)</span>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              {/* Motion Trails */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Fading Motion Trails</div>
                  <div className="text-[11px] text-slate-400">5-second neon trajectory lines</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showMotionTrails !== false}
                  onChange={(e) => onUpdateSettings({ showMotionTrails: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              {/* Bounding Box Dimensions */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Bounding Box Dimensions</div>
                  <div className="text-[11px] text-slate-400">Live box size in pixels & speed</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showBoxDimensions !== false}
                  onChange={(e) => onUpdateSettings({ showBoxDimensions: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              {/* Confidence Percent */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Confidence Percentage</div>
                  <div className="text-[11px] text-slate-400">Display AI confidence on label badges</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showConfidence !== false}
                  onChange={(e) => onUpdateSettings({ showConfidence: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 4. Architecture & Offline Guarantee */}
          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Offline AI Operation</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              YOLO11n ONNX neural weights (10.9MB) and the ByteTrack engine run locally on the device via WebGL hardware acceleration. Zero internet connection or cloud API calls required.
            </p>
          </div>

          {/* 5. Android Native APK & Studio Link */}
          <button
            onClick={() => {
              onClose();
              onOpenAndroidHub();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all shadow-md group"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-white" />
              <div className="text-left">
                <div className="text-xs font-bold">Android Studio & Native APK Hub</div>
                <div className="text-[10px] text-cyan-200">View Gradle build, assets & release APK</div>
              </div>
            </div>
            <span className="text-xs font-mono text-cyan-200 group-hover:translate-x-1 transition-transform">➔</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">VisionAI Tracker v2.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
