import React, { useState, useEffect } from 'react';
import {
  Menu,
  Settings as SettingsIcon,
  Crown,
  Smartphone,
  X,
} from 'lucide-react';
import { FilterId, AppSettings } from './types';
import { FILM_CHARACTER_FILTERS, ANIMAL_FILTERS } from './data/filtersCatalog';
import { CameraPreview } from './components/camera/CameraPreview';
import { SettingsModal } from './components/settings/SettingsModal';
import { AndroidProjectModal } from './components/android/AndroidProjectModal';

export default function App() {
  // Application Settings
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    cameraResolution: '720p',
    facingMode: 'user',
    maskFitScale: 1.0,
    show3DShadedMesh: false,
    meshShadeOpacity: 1.0,
  });

  // Camera & AR Filters State (Defaults to iconic Joker Film Character Mask)
  const [activeFilterId, setActiveFilterId] = useState<FilterId | null>('joker');
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

  // Click-Again Filter Toggle
  const handleToggleFilter = (id: FilterId) => {
    setActiveFilterId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090514] text-slate-100 font-sans selection:bg-purple-600 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER (Hidden when in Fullscreen Mode)                  */}
      {/* Left: ☰ | Center: 👑 ጎሪ እና ጅቦ | Right: ⚙ (Single Settings)  */}
      {/* ------------------------------------------------------------- */}
      {!isCameraFullscreen && (
        <header className="h-14 px-4 flex items-center justify-between border-b border-purple-950/60 bg-[#070410]/95 backdrop-blur-md z-30 shrink-0">
          {/* Left: Hamburger Menu Icon */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95"
            title="Open Menu"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-6 h-6 text-slate-100" />
          </button>

          {/* Center: Gold Crown + Stylized Ethiopian Wordmark */}
          <div className="flex items-center gap-2 select-none">
            {/* Gold Crown */}
            <div className="relative flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            </div>

            {/* Stylized Amharic Text: ጎሪ እና ጅቦ */}
            <span className="text-xl sm:text-2xl font-black tracking-wider text-white font-['Noto_Sans_Ethiopic'] drop-shadow-[0_0_12px_rgba(192,132,252,0.6)] flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-white via-purple-200 to-fuchsia-300 bg-clip-text text-transparent">
                ጎሪ እና ጅቦ
              </span>
            </span>
          </div>

          {/* Right: Single Settings Gear Icon */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95"
            title="Open Settings"
            aria-label="Application Settings"
          >
            <SettingsIcon className="w-6 h-6 text-slate-100" />
          </button>
        </header>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SIDE DRAWER (When Hamburger is Clicked)                      */}
      {/* ------------------------------------------------------------- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#0d081f] border-r border-purple-900/50 p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-purple-900/40">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="font-extrabold text-lg text-white font-['Noto_Sans_Ethiopic']">
                    ጎሪ እና ጅቦ
                  </span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                  aria-label="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsAndroidHubOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md glow-purple-sm transition-all text-left"
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="leading-tight">Android Studio & APK Hub</div>
                    <div className="text-[11px] text-purple-200 font-normal">Offline 3D AR Engine & Native Android</div>
                  </div>
                </button>
              </div>

              {/* 3D Film Character Masks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Film Character Masks (8)
                  </h4>
                  <span className="text-[10px] text-purple-300 font-mono">Tap to Select/Unselect</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {FILM_CHARACTER_FILTERS.map((f) => {
                    const isSelected = activeFilterId === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          handleToggleFilter(f.id);
                          setIsDrawerOpen(false);
                        }}
                        className={`p-2 rounded-xl text-center flex flex-col items-center justify-center border transition-all ${
                          isSelected
                            ? 'border-cyan-400 bg-purple-950/80 text-white shadow-sm shadow-cyan-500/30'
                            : 'border-white/5 bg-slate-900/50 hover:bg-slate-800/80 text-slate-300'
                        }`}
                        title={`${f.nameEnglish} - ${f.actorOrOrigin}`}
                      >
                        <span className="text-lg">{f.icon}</span>
                        <span className="text-[10px] truncate max-w-full font-medium mt-0.5">
                          {f.nameEnglish}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ethiopian Wildlife Masks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                    የዱር እንስሳት • Wild Animals (8)
                  </h4>
                  <span className="text-[10px] text-purple-300 font-mono">Tap to Select/Unselect</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {ANIMAL_FILTERS.map((f) => {
                    const isSelected = activeFilterId === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          handleToggleFilter(f.id);
                          setIsDrawerOpen(false);
                        }}
                        className={`p-1.5 rounded-xl text-center flex flex-col items-center justify-center border transition-all ${
                          isSelected
                            ? 'border-purple-400 bg-purple-950/80 text-white shadow-sm glow-purple-sm'
                            : 'border-white/5 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400'
                        }`}
                      >
                        <span className="text-base">{f.icon}</span>
                        <span className="text-[9px] truncate max-w-full font-medium mt-0.5">
                          {f.nameAmharic}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-purple-900/40 text-[11px] text-slate-500 text-center">
              <div>ጎሪ እና ጅቦ • AR Character & Animal Studio</div>
              <div className="text-cyan-400/80 mt-0.5 font-mono">100% Offline 3D Mask Engine</div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN VIEWPORT: 100% Full-Screen AR Camera & Mask Studio       */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
        <CameraPreview
          activeFilterId={activeFilterId}
          onSelectFilter={handleToggleFilter}
          onClearFilter={() => setActiveFilterId(null)}
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onUpdateSettings={handleUpdateSettings}
          isFullscreen={isCameraFullscreen}
          onToggleFullscreen={() => setIsCameraFullscreen(!isCameraFullscreen)}
        />
      </main>

      {/* Settings Modal (Single Settings Control) */}
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
