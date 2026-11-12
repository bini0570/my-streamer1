# ጎሪ እና ጅቦ (Gori ena Jibo) - Android Build & Release Guide

## 1. Overview
**ጎሪ እና ጅቦ** is a native Android application built with:
- **Language**: Kotlin 2.0+
- **UI Framework**: Jetpack Compose (Material 3)
- **Camera Pipeline**: AndroidX CameraX (Camera2, Lifecycle, Preview, ImageAnalysis)
- **Audio Architecture**: AndroidX Media3 (ExoPlayer + Visualizer FFT)
- **AR 3D Face Filters**: Google ARCore Augmented Faces / Filament OpenGL ES 3.0
- **Storage & Music Scanner**: Android `MediaStore.Audio.Media.EXTERNAL_CONTENT_URI`

---

## 2. Requirements & Prerequisites
1. **Android Studio**: Android Studio Ladybug (2024.2.1) or Meerkat
2. **JDK**: Java Development Kit 17 (bundled with modern Android Studio)
3. **Android SDK**:
   - `compileSdk`: 35 (Android 15)
   - `minSdk`: 26 (Android 8.0 Oreo, compatible with mid-range devices and 6GB RAM)
   - `targetSdk`: 35

---

## 3. How to Open and Run in Android Studio
1. Open **Android Studio**.
2. Click **Open** and select the `/android` directory.
3. Allow Gradle to sync dependencies automatically.
4. Connect an Android phone via USB with **USB Debugging** enabled (or start an emulator with Camera emulation enabled).
5. Click **Run** (`Shift + F10`) or select `Run 'app'`.

---

## 4. How to Build the Release APK

### Option A: Via Command Line (Terminal)
Navigate to the `android/` directory and run:

```bash
cd android

# Make gradlew executable (on macOS/Linux)
chmod +x gradlew

# Build unsigned / debug-signed release APK
./gradlew assembleRelease

# The generated APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

### Option B: Generate Signed Release APK via Android Studio UI
1. In Android Studio, go to menu: **Build** > **Generate Signed Bundle / APK...**
2. Choose **APK** and click **Next**.
3. Create or select your keystore file:
   - Keystore path: `~/keystores/gorienajibo-release.jks`
   - Key alias: `gorienajibo`
   - Key password & Store password
4. Select build variant: **release**.
5. Check **V1 (Jar Signature)** and **V2 (Full APK Signature)**.
6. Click **Finish**. Your optimized release APK will be located in `app/release/app-release.apk`.

---

## 5. Animal 3D Filter Assets Configuration
The 8 animal characters (Hyena, Gorilla, Tiger, Lion, Wolf, Monkey, Bear, Fox) require:
1. Face mesh canonical mapping (Google ARCore Augmented Faces 468 vertex canonical face mesh).
2. Assets are placed in:
   `app/src/main/assets/filters/`
   - `hyena_mask.gltf`
   - `gorilla_mask.gltf`
   - `tiger_mask.gltf`
   - `lion_mask.gltf`
   - `wolf_mask.gltf`
   - `monkey_mask.gltf`
   - `bear_mask.gltf`
   - `fox_mask.gltf`

---

## 6. Offline Operation
ጎሪ እና ጅቦ is fully self-contained:
- All audio processing, visualizers, camera streams, and 3D filter textures operate 100% offline with zero cloud dependency after installation.
