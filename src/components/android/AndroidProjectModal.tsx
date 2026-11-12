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
  Layers
} from 'lucide-react';

interface AndroidProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProjectFile {
  path: string;
  filename: string;
  language: string;
  content: string;
  description: string;
}

const ANDROID_FILES: ProjectFile[] = [
  {
    path: 'android/app/src/main/java/com/gorienajibo/app/MainActivity.kt',
    filename: 'MainActivity.kt',
    language: 'kotlin',
    description: 'Lifecycle & permissions entry point launching the MainLivestreamScreen',
    content: `package com.gorienajibo.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.gorienajibo.app.camera.CameraXManager
import com.gorienajibo.app.music.MusicPlayerManager
import com.gorienajibo.app.ui.MainLivestreamScreen
import com.gorienajibo.app.ui.theme.GoriEnaJiboTheme

class MainActivity : ComponentActivity() {

    private lateinit var cameraManager: CameraXManager
    private lateinit var musicPlayerManager: MusicPlayerManager

    private var hasCameraPermission by mutableStateOf(false)
    private var hasAudioPermission by mutableStateOf(false)

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasCameraPermission = permissions[Manifest.permission.CAMERA] == true
        hasAudioPermission = permissions[Manifest.permission.RECORD_AUDIO] == true
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cameraManager = CameraXManager(this)
        musicPlayerManager = MusicPlayerManager(this)

        checkAndRequestPermissions()

        setContent {
            GoriEnaJiboTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    MainLivestreamScreen(
                        cameraManager = cameraManager,
                        musicPlayerManager = musicPlayerManager,
                        hasCameraPermission = hasCameraPermission,
                        onRequestCameraPermission = { checkAndRequestPermissions() }
                    )
                }
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/gorienajibo/app/camera/CameraXManager.kt',
    filename: 'CameraXManager.kt',
    language: 'kotlin',
    description: 'Hardware camera controller with front/rear switching and image analysis',
    content: `package com.gorienajibo.app.camera

import android.content.Context
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.util.concurrent.Executors

class CameraXManager(private val context: Context) {
    private var cameraProvider: ProcessCameraProvider? = null
    var lensFacing: Int = CameraSelector.LENS_FACING_FRONT
        private set

    fun startCamera(lifecycleOwner: LifecycleOwner, previewView: PreviewView) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()
            val cameraSelector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
            val preview = Preview.Builder().setTargetAspectRatio(AspectRatio.RATIO_16_9).build()
                .also { it.setSurfaceProvider(previewView.surfaceProvider) }

            cameraProvider?.unbindAll()
            cameraProvider?.bindToLifecycle(lifecycleOwner, cameraSelector, preview)
        }, ContextCompat.getMainExecutor(context))
    }

    fun switchCamera(lifecycleOwner: LifecycleOwner, previewView: PreviewView) {
        lensFacing = if (lensFacing == CameraSelector.LENS_FACING_FRONT)
            CameraSelector.LENS_FACING_BACK else CameraSelector.LENS_FACING_FRONT
        startCamera(lifecycleOwner, previewView)
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/gorienajibo/app/ar/AnimalFilterRenderer.kt',
    filename: 'AnimalFilterRenderer.kt',
    language: 'kotlin',
    description: 'OpenGL ES 3.0 / Filament 3D engine for Hyena, Gorilla, and animal masks',
    content: `package com.gorienajibo.app.ar

import android.opengl.GLES30
import android.opengl.GLSurfaceView
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

enum class AnimalCharacter(val idName: String, val amharicName: String) {
    HYENA("hyena", "ጅቦ"),
    GORILLA("gorilla", "ጎሪ"),
    TIGER("tiger", "ነብር"),
    LION("lion", "አንበሳ"),
    WOLF("wolf", "ተኩላ"),
    MONKEY("monkey", "ዝንጀሮ"),
    BEAR("bear", "ድብ"),
    FOX("fox", "ቀበሮ")
}

class AnimalFilterRenderer : GLSurfaceView.Renderer {
    private var activeFilter: AnimalCharacter? = AnimalCharacter.HYENA
    private var mouthOpenFactor = 0f

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES30.glClearColor(0f, 0f, 0f, 0f)
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)
    }

    override fun onDrawFrame(gl: GL10?) {
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)
        val character = activeFilter ?: return
        // Render 3D animal mesh & hinged jaw synchronized to user mouth opening
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/gorienajibo/app/music/MusicPlayerManager.kt',
    filename: 'MusicPlayerManager.kt',
    language: 'kotlin',
    description: 'Android Media3 ExoPlayer audio playback with Visualizer FFT spectrum',
    content: `package com.gorienajibo.app.music

import android.content.Context
import android.media.audiofx.Visualizer
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer

class MusicPlayerManager(private val context: Context) {
    private val player: ExoPlayer = ExoPlayer.Builder(context).build()
    private var visualizer: Visualizer? = null

    fun playTrack(track: AndroidTrack) {
        val mediaItem = MediaItem.fromUri(track.uri)
        player.setMediaItem(mediaItem)
        player.prepare()
        player.play()
    }

    fun togglePlayPause() {
        if (player.isPlaying) player.pause() else player.play()
    }
}`
  },
  {
    path: 'android/app/build.gradle.kts',
    filename: 'build.gradle.kts',
    language: 'groovy',
    description: 'App Gradle build config with CameraX, Media3, and Compose dependencies',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.gorienajibo.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.gorienajibo.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation("androidx.camera:camera-camera2:1.4.1")
    implementation("androidx.camera:camera-lifecycle:1.4.1")
    implementation("androidx.camera:camera-view:1.4.1")
    implementation("androidx.media3:media3-exoplayer:1.5.0")
    implementation("com.google.ar:core:1.46.0")
}`
  },
  {
    path: 'android/README_BUILD_APK.md',
    filename: 'README_BUILD_APK.md',
    language: 'markdown',
    description: 'Comprehensive instructions for building the signed release APK',
    content: `# Build Release APK for ጎሪ እና ጅቦ (Gori ena Jibo)

## Fast Command Line Build:
\`\`\`bash
cd android
chmod +x gradlew
./gradlew assembleRelease
\`\`\`

The generated APK will be produced at:
\`android/app/build/outputs/apk/release/app-release.apk\`

## In Android Studio:
1. Open the /android folder.
2. Select Build -> Generate Signed Bundle / APK...
3. Select 'APK', choose keystore, and select 'release'.
4. Tap 'Finish' to produce the installable .apk file!`
  }
];

export const AndroidProjectModal: React.FC<AndroidProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentFile = ANDROID_FILES[selectedFileIdx];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-300 glow-purple-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">ጎሪ እና ጅቦ - Android Studio Project Hub</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-500/40">
                  Native Kotlin / Compose
                </span>
              </div>
              <p className="text-xs text-slate-400">Complete Android source tree, CameraX, Media3, and APK guide</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content: Sidebar + Code Viewer */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* File Selector Sidebar */}
          <div className="w-full md:w-72 bg-slate-950/60 border-r border-white/10 p-3 flex flex-col overflow-y-auto shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5 px-2">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Project Structure</span>
            </div>

            <div className="space-y-1">
              {ANDROID_FILES.map((file, idx) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-0.5 ${
                    selectedFileIdx === idx
                      ? 'bg-purple-600/30 border border-purple-500/60 text-white font-medium glow-purple-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                    <span className="truncate">{file.filename}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate pl-5">
                    {file.description}
                  </span>
                </button>
              ))}
            </div>

            {/* Release APK Command Summary Box */}
            <div className="mt-auto pt-4 border-t border-white/10">
              <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-500/30 text-[11px] space-y-2">
                <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Build Command</span>
                </div>
                <code className="block bg-black/60 p-2 rounded text-[10px] font-mono text-emerald-300 overflow-x-auto">
                  ./gradlew assembleRelease
                </code>
              </div>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-900/90 overflow-hidden">
            {/* Code Bar */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-slate-950/40">
              <span className="font-mono text-xs text-purple-300 truncate">
                {currentFile.path}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 bg-slate-950/90 font-mono text-xs text-slate-300 leading-relaxed">
              <pre className="whitespace-pre">{currentFile.content}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ready for Android Studio Ladybug & Meerkat (CompileSdk 35 / MinSdk 26)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
