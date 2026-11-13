import React, { useState, useEffect } from 'react';
import {
  Menu,
  Settings as SettingsIcon,
  Zap,
  Smartphone,
  X,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { AppSettings, ObjectCategory } from './types';
import { CameraPreview } from './components/camera/CameraPreview';
import { SettingsModal } from './components/settings/SettingsModal';
import { AndroidProjectModal } from './components/android/AndroidProjectModal';

export default function App() {
  // Application Settings
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    cameraResolution: '720p',
    facingMode: 'user',
    confidenceThreshold: 0.45,
    selectedCategory: 'all',
    showMotionTrails: true,
    showBoxDimensions: true,
    showConfidence: true,
    isDetectionPaused: false,
  });

  const [isCameraFullscreen, setIsCameraFullscreen] = useState(false);

  // Modals & Drawers
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAndroidHubOpen, setIsAndroidHubOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sync theme with HTML class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleSelectCategory = (category: ObjectCategory) => {
    handleUpdateSettings({ selectedCategory: category });
    setIsDrawerOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#04060c] text-slate-100 font-sans selection:bg-cyan-600 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION DRAWER                                              */}
      {/* ------------------------------------------------------------- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#080d1a] border-r border-cyan-900/50 p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-base text-white font-mono tracking-wide">
                      VisionAI
                    </span>
                    <span className="text-[11px] font-bold text-cyan-400 ml-1">TRACKER</span>
                    <div className="text-[10px] text-slate-400 font-sans">MotionTrack Studio</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                  aria-label="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Quick Links */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsAndroidHubOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-md transition-all text-left"
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="leading-tight text-xs font-bold">Android Studio & APK Hub</div>
                    <div className="text-[10px] text-cyan-100 font-normal">Offline YOLO11n & Native Build</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition-all text-left"
                >
                  <SettingsIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Configure Settings</span>
                </button>
              </div>

              {/* Object Categories Filter Shortcuts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
                    Detection Categories
                  </h4>
                  <span className="text-[10px] text-slate-400">80 COCO Classes</span>
                </div>

                <div className="space-y-1">
                  {[
                    { id: 'all' as ObjectCategory, label: 'All Objects', icon: '🌐', desc: '80 Supported Classes' },
                    { id: 'people' as ObjectCategory, label: 'People (Full-Body)', icon: '👤', desc: 'Rectangular Boxes & Tracking' },
                    { id: 'vehicles' as ObjectCategory, label: 'Vehicles', icon: '🚗', desc: 'Cars, Bikes, Trucks, Buses' },
                    { id: 'electronics' as ObjectCategory, label: 'Electronics', icon: '📱', desc: 'Phones, Laptops, Remotes' },
                    { id: 'animals' as ObjectCategory, label: 'Animals & Pets', icon: '🐾', desc: 'Dogs, Cats, Horses, Birds' },
                    { id: 'furniture' as ObjectCategory, label: 'Furniture', icon: '🪑', desc: 'Chairs, Couches, Beds, Tables' },
                    { id: 'everyday' as ObjectCategory, label: 'Everyday Objects', icon: '🎒', desc: 'Backpacks, Bottles, Cups' },
                  ].map((cat) => {
                    const isSelected = settings.selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-sm'
                            : 'bg-black/30 border-white/5 hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cat.icon}</span>
                          <div>
                            <div className="text-xs font-semibold">{cat.label}</div>
                            <div className="text-[10px] text-slate-400">{cat.desc}</div>
                          </div>
                        </div>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-white/10 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Offline Pretrained Model</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                Optimized for Samsung Galaxy A06 & Android
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN VIEWPORT: 100% Full-Screen AI Camera & Tracking Studio   */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
        <CameraPreview
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onUpdateSettings={handleUpdateSettings}
          isFullscreen={isCameraFullscreen}
          onToggleFullscreen={() => setIsCameraFullscreen(!isCameraFullscreen)}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenAndroidHub={() => setIsAndroidHubOpen(true)}
      />

      {/* Android Studio Source Code & APK Export Hub */}
      <AndroidProjectModal
        isOpen={isAndroidHubOpen}
        onClose={() => setIsAndroidHubOpen(false)}
      />
    </div>
  );
}
