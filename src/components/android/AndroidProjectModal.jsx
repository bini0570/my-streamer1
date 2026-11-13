import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Copy,
  Check,
  Download,
  FolderTree,
  Terminal,
  FileCode,
  ShieldCheck,
} from 'lucide-react';

const ANDROID_FILES = [
  {
    path: 'android/app/src/main/java/com/gorienajibo/app/MainActivity.kt',
    filename: 'MainActivity.kt',
    language: 'kotlin',
    description: 'Hardware-accelerated WebView & CameraX entry point with WebGL support',
    content: `package com.gorienajibo.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var pendingPermissionRequest: PermissionRequest? = null

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] == true
        if (cameraGranted) {
            pendingPermissionRequest?.grant(pendingPermissionRequest?.resources)
            pendingPermissionRequest = null
            if (::webView.isInitialized) {
                webView.reload()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.mediaPlaybackRequiresUserGesture = false
            loadUrl("https://appassets.androidplatform.net/assets/dist/index.html")
        }

        setContentView(webView)
    }
}`,
  },
  {
    path: 'android/app/build.gradle.kts',
    filename: 'build.gradle.kts',
    language: 'kotlin',
    description: 'Android application build script with V1+V2+V3 APK signing',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.gorienajibo.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.gorienajibo.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 4
        versionName = "2.2.0"
    }

    signingConfigs {
        getByName("debug") {
            enableV1Signing = true
            enableV2Signing = true
            enableV3Signing = true
        }
    }
}`,
  },
];

export const AndroidProjectModal = ({ isOpen, onClose }) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentFile = ANDROID_FILES[selectedFileIdx];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#080c16] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-600/30 border border-cyan-500/40 text-cyan-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-sans">AuraVision - Android Project Hub</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  Native Kotlin / WebGL
                </span>
              </div>
              <p className="text-xs text-slate-400">Offline YOLO11n neural engine & hardware-accelerated Camera</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="w-full md:w-72 bg-black/40 border-r border-white/10 p-3 flex flex-col overflow-y-auto shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5 px-2 font-mono">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Project Structure</span>
            </div>

            <div className="space-y-1.5">
              {ANDROID_FILES.map((file, idx) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`w-full text-left p-2.5 rounded-2xl text-xs transition-all flex flex-col gap-0.5 ${
                    selectedFileIdx === idx
                      ? 'bg-cyan-600/25 border border-cyan-400/60 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span className="truncate">{file.filename}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate pl-5">
                    {file.description}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-white/10">
              <div className="p-3 bg-cyan-950/40 rounded-2xl border border-cyan-500/30 text-[11px] space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-300 font-semibold font-mono">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Build Command</span>
                </div>
                <code className="block bg-black/60 p-2 rounded-xl text-[10px] font-mono text-emerald-300 overflow-x-auto">
                  ./gradlew assembleDebug
                </code>
              </div>
            </div>
          </div>

          {/* Code Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#060810] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/30">
              <span className="font-mono text-xs text-cyan-300 truncate">
                {currentFile.path}
              </span>

              <button
                onClick={handleCopyCode}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed">
              <pre className="whitespace-pre">{currentFile.content}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ready for Android Studio Ladybug (CompileSdk 35 / MinSdk 24)</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
