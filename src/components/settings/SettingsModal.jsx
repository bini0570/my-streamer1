import React from 'react';
import {
  X,
  Moon,
  Sun,
  Camera,
  Sliders,
  ShieldCheck,
  Cpu,
  Smartphone,
  Eye,
  CheckCircle,
  Zap,
} from 'lucide-react';

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenAndroidHub,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-[#080c16] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans tracking-wide">System Settings</h3>
              <p className="text-xs text-slate-400">YOLO11n Neural Engine & Hardware Configuration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
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
              <span>Appearance</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-cyan-600/25 border-cyan-400 text-white shadow-lg'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-xs">Obsidian Dark</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${
                  settings.theme === 'light'
                    ? 'bg-cyan-600/25 border-cyan-400 text-white shadow-lg'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-xs">High Contrast Light</span>
              </button>
            </div>
          </div>

          {/* 2. Camera Resolution */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Stream Quality</span>
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {['720p', '1080p', '480p'].map((res) => {
                const isSelected = settings.cameraResolution === res;
                return (
                  <button
                    key={res}
                    onClick={() => onUpdateSettings({ cameraResolution: res })}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-600/30 to-blue-600/30 border-cyan-400 text-white font-bold shadow-md'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs uppercase">{res}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {res === '720p' ? 'Balanced' : res === '1080p' ? 'Ultra HD' : 'Fast Mode'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. AI Detection & Tracking Configuration */}
          <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Zap className="w-3.5 h-3.5" />
              <span>YOLO11n & ByteTrack Controls</span>
            </label>

            {/* Confidence Slider */}
            <div className="space-y-2">
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
                <span>30% (Sensitive)</span>
                <span>90% (Strict)</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2.5 pt-2.5 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Motion Trajectory Trails</div>
                  <div className="text-[11px] text-slate-400">Glowing neon paths behind moving objects</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showMotionTrails !== false}
                  onChange={(e) => onUpdateSettings({ showMotionTrails: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Pixel Dimension Badges</div>
                  <div className="text-[11px] text-slate-400">Live box size and velocity arrows</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showBoxDimensions !== false}
                  onChange={(e) => onUpdateSettings({ showBoxDimensions: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Confidence Percentage</div>
                  <div className="text-[11px] text-slate-400">Show AI confidence on bounding pills</div>
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

          {/* 4. Offline Architecture Guarantee */}
          <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Offline AI Operation</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              YOLO11n neural weights (10.9MB) and the ByteTrack engine run directly on device via WebGL GPU acceleration. Zero internet connection or cloud API calls required.
            </p>
          </div>

          {/* 5. Android APK Studio Hub */}
          <button
            onClick={() => {
              onClose();
              onOpenAndroidHub();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all shadow-lg group"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-white" />
              <div className="text-left">
                <div className="text-xs font-bold">Android Studio & Native APK Hub</div>
                <div className="text-[10px] text-cyan-100">View Gradle build, assets & release APK</div>
              </div>
            </div>
            <span className="text-xs font-mono text-cyan-200 group-hover:translate-x-1 transition-transform">➔</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">AuraVision Studio v2.2.0</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
