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
  Eye,
  Radio,
} from 'lucide-react';
import { CameraPreview } from './components/camera/CameraPreview.jsx';
import { SettingsModal } from './components/settings/SettingsModal.jsx';
import { AndroidProjectModal } from './components/android/AndroidProjectModal.jsx';

export default function App() {
  const [settings, setSettings] = useState({
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAndroidHubOpen, setIsAndroidHubOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleUpdateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleSelectCategory = (category) => {
    handleUpdateSettings({ selectedCategory: category });
    setIsDrawerOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#07090e] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* MODERN GLASS NAVIGATION DRAWER                                */}
      {/* ------------------------------------------------------------- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
          />

          {/* Drawer Capsule */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#080c16]/95 border-r border-white/10 p-5 flex flex-col justify-between shadow-2xl z-10 backdrop-blur-2xl animate-in slide-in-from-left duration-250">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-2xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm tracking-wider text-white font-sans">
                      AURA<span className="text-cyan-400">VISION</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">Dynamic Motion Studio</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10"
                  aria-label="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Launch Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsAndroidHubOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg transition-all text-left group"
                >
                  <Smartphone className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="leading-tight font-bold">Android Studio & APK Hub</div>
                    <div className="text-[10px] text-cyan-100 font-normal">Offline YOLO11n & Native Build</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-semibold transition-all text-left"
                >
                  <SettingsIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Configure Settings</span>
                </button>
              </div>

              {/* Category Shortcuts */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
                    Detection Categories
                  </h4>
                  <span className="text-[10px] text-slate-400">80 COCO Classes</span>
                </div>

                <div className="space-y-1">
                  {[
                    { id: 'all', label: 'All Targets', icon: '✦', desc: '80 Supported Object Classes' },
                    { id: 'people', label: 'People (Full-Body)', icon: '👤', desc: 'Kinetic Bounding & Tracking' },
                    { id: 'vehicles', label: 'Vehicles', icon: '🚗', desc: 'Cars, Bikes, Trucks, Boats' },
                    { id: 'electronics', label: 'Devices', icon: '📱', desc: 'Phones, Laptops, Remotes' },
                    { id: 'animals', label: 'Animals', icon: '🐾', desc: 'Dogs, Cats, Horses, Birds' },
                    { id: 'furniture', label: 'Furniture', icon: '🪑', desc: 'Chairs, Couches, Beds, Tables' },
                    { id: 'everyday', label: 'Everyday Items', icon: '🎒', desc: 'Backpacks, Bottles, Cups' },
                  ].map((cat) => {
                    const isSelected = settings.selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left border transition-all ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-400/80 text-white shadow-md'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">{cat.icon}</span>
                          <div>
                            <div className="text-xs font-semibold">{cat.label}</div>
                            <div className="text-[10px] text-slate-400">{cat.desc}</div>
                          </div>
                        </div>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Offline AI Operation</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                Optimized for Samsung Galaxy A06 & Android 14
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN VIEWPORT: Full-Screen AI Camera & Motion Tracker         */}
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

      {/* Android Native APK Hub */}
      <AndroidProjectModal
        isOpen={isAndroidHubOpen}
        onClose={() => setIsAndroidHubOpen(false)}
      />
    </div>
  );
}
