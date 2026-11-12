import React from 'react';
import {
  X,
  Moon,
  Sun,
  Camera,
  Sliders,
  ShieldCheck,
  Info,
  Sparkles,
  Smartphone,
  ArrowUpDown
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">መቼቶች (Application Settings)</h3>
              <p className="text-xs text-slate-400">Configure AR camera, 3D character masks & tracking</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
          {/* 1. Theme Configuration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5" />
              <span>ገጽታ (Theme)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-purple-600/30 border-purple-500 text-white shadow-sm glow-purple-sm'
                    : 'bg-slate-950/50 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">ጨለማ (Dark Neon)</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  settings.theme === 'light'
                    ? 'bg-purple-600/30 border-purple-500 text-white shadow-sm glow-purple-sm'
                    : 'bg-slate-950/50 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">ብርሃን (Light)</span>
              </button>
            </div>
          </div>

          {/* 2. Camera Configuration */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              <span>የካሜራ ቅንብሮች (Camera Settings)</span>
            </label>

            <div className="bg-slate-950/50 border border-white/10 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-200">ጥራት (Resolution)</span>
                  <p className="text-[11px] text-slate-400">Higher resolution requires more GPU power</p>
                </div>
                <select
                  value={settings.cameraResolution}
                  onChange={(e) =>
                    onUpdateSettings({
                      cameraResolution: e.target.value as '720p' | '1080p' | '480p',
                    })
                  }
                  className="bg-slate-900 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="1080p">1080p FHD (High Detail)</option>
                  <option value="720p">720p HD (Balanced)</option>
                  <option value="480p">480p (Fast Performance)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div>
                  <span className="font-medium text-slate-200">የካሜራ አቅጣጫ (Facing Direction)</span>
                  <p className="text-[11px] text-slate-400">Front selfie or rear environment camera</p>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      facingMode: settings.facingMode === 'user' ? 'environment' : 'user',
                    })
                  }
                  className="px-3 py-1.5 bg-slate-900 border border-white/15 hover:border-purple-500 text-xs text-purple-300 rounded-lg font-medium"
                >
                  {settings.facingMode === 'user' ? 'ፊት ካሜራ (Front)' : 'የኋላ ካሜራ (Rear)'}
                </button>
              </div>
            </div>
          </div>

          {/* 3. AR Face & Mouth Sensitivity */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>የ3D ማጣሪያ ስሜታዊነት (Filter Tracking Sensitivity)</span>
            </label>

            <div className="bg-slate-950/50 border border-white/10 rounded-xl p-3.5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-300">የጭንቅላት እንቅስቃሴ (Head Tracking Sensitivity)</span>
                  <span className="font-mono text-xs text-purple-400">
                    {Math.round(settings.filterSensitivity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.05"
                  value={settings.filterSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ filterSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 accent-purple-500 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-300">የአፍ መከፈት ማስተካከያ (Mouth Opening Sync)</span>
                  <span className="font-mono text-xs text-purple-400">
                    {Math.round(settings.mouthTrackingSensitivity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.mouthTrackingSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ mouthTrackingSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 accent-purple-500 rounded-lg cursor-pointer"
                />
              </div>

              {/* MediaPipe Face-Mesh Wireframe Overlay Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div>
                  <span className="font-medium text-slate-200">የፊት መስመር እይታ (Face-Mesh Wireframe)</span>
                  <p className="text-[11px] text-slate-400">Display 468 MediaPipe tracking points & detection bounds</p>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({ showFaceMeshDebug: !settings.showFaceMeshDebug })
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    settings.showFaceMeshDebug
                      ? 'bg-purple-600 text-white shadow-sm glow-purple-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {settings.showFaceMeshDebug ? 'በርቷል (ON)' : 'ጠፍቷል (OFF)'}
                </button>
              </div>

              {/* Flip Mask Vertically / Invert Y Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div>
                  <span className="font-medium text-slate-200 flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>ጭምብል አቅጣጫ ገልብጥ (Flip Mask Vertically)</span>
                  </span>
                  <p className="text-[11px] text-slate-400">Invert 3D face mesh mask along Y-axis if camera is flipped down</p>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({ flipMaskVertical: !settings.flipMaskVertical })
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    settings.flipMaskVertical
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {settings.flipMaskVertical ? 'የተገለበጠ (Flipped)' : 'መደበኛ (Normal)'}
                </button>
              </div>
            </div>
          </div>

          {/* 5. Android Studio Native Project Export */}
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs uppercase tracking-wider">
              <Smartphone className="w-4 h-4" />
              <span>Android Studio Kotlin Project & APK Export</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Explore the complete native Android codebase (Kotlin, Jetpack Compose, CameraX, Android Media3, and ARCore/Filament renderer) and instructions for building the release APK.
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenAndroidHub();
              }}
              className="mt-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-2"
            >
              <span>View Android Source & APK Guide</span>
            </button>
          </div>

          {/* 6. About ጎሪ እና ጅቦ */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <Info className="w-4 h-4 text-purple-400" />
              <span>ስለ ጎሪ እና ጅቦ (About Gori & Jibo)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              ጎሪ እና ጅቦ (Gori ena Jibo) is a personal AR camera and music application engineered with real-time 3D animal face transformation filters, dual-channel audio player, and high-performance WebGL & Web Audio engines. Designed for optimal mid-range performance and offline reliability.
            </p>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Version 1.0.0 · Local & Offline Capable</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md glow-purple-sm transition-all"
          >
            አስቀምጥና ዝጋ (Save & Close)
          </button>
        </div>
      </div>
    </div>
  );
};
