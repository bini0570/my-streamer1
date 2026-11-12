# 👑 ጎሪ እና ጅቦ (Gori ena Jibo)
### Real-Time 3D AR Camera Studio & Native Android App

[![Build Android APK](https://github.com/bini0570/my-streamer1/actions/workflows/build-apk.yml/badge.svg)](https://github.com/bini0570/my-streamer1/actions/workflows/build-apk.yml)
[![GitHub Release](https://img.shields.io/github/v/release/bini0570/my-streamer1?include_prereleases&color=a855f7&label=Android%20APK)](https://github.com/bini0570/my-streamer1/releases/tag/v1.0.0-apk)

An advanced Augmented Reality (AR) camera application featuring real-time 3D face transformation masks, 468-point MediaPipe biometric tracking, zero-lag facial expression alignment, and native Android Studio integration.

---

## 📱 Download Installable Android APK

You can download and install the compiled Android APK directly onto your Android phone or tablet:

### ⬇️ [Direct Download Android APK (`Gori-ena-Jibo-v1.0.apk`)](https://github.com/bini0570/my-streamer1/releases/download/v1.0.0-apk/Gori-ena-Jibo-v1.0.apk)

> Alternatively, download the latest build from the [GitHub Releases Page](https://github.com/bini0570/my-streamer1/releases) or the [Actions Artifacts](https://github.com/bini0570/my-streamer1/actions).

### 📲 How to Install on Android:
1. Tap the download link above on your Android device.
2. When the download finishes, open `Gori-ena-Jibo-v1.0.apk` from your notification bar or **Downloads** folder.
3. Tap **Install** (if prompted, allow *"Install Unknown Apps"* in Android Settings).
4. Open **ጎሪ እና ጅቦ** and grant camera permissions to start streaming!

---

## 🎭 16 Transformative 3D AR Masks

### 🐾 1. የኢትዮጵያ ተረቶችና እንስሳት (Ethiopian Lore: ጎሪ እና ጅቦ - 8 Masks)
1. **ጅቦ (Jibo - Spotted Hyena):** Bone-crushing predator with spotted coat, synchronized jaw tracking, and broad ears.
2. **ጎሪ (Gori - Mountain Gorilla):** Silverback crest with heavy brow ridge, flared nostrils, and leathery muzzle.
3. **ነብር (Tiger - Royal Bengal):** Vivid orange coat with obsidian stripes and feline ears.
4. **አንበሳ (Lion - Savanna King):** Voluminous golden mane and regal muzzle structure.
5. **ተኩላ (Wolf - Timber Wolf):** Elongated canine snout and arctic howling synchronization.
6. **ዝንጀሮ (Monkey - Playful Primate):** Expressive primate mask with large curved ears.
7. **ድብ (Bear - Grizzly Bear):** Heavy rounded cranium, dense fur coat, and broad snout.
8. **ቀበሮ (Fox - Red Fox):** Slender mask with fiery orange coat and black-tipped tall ears.

### 🎬 2. የሲኒማ ጭምብሎች (Cinema Character Masks - 8 Legends)
1. **ጆከር (The Joker):** Theatrical white greasepaint, emerald green hair locks, and scarred Glasgow smile.
2. **ባትማን (The Dark Knight):** Armored carbon-fiber cowl with sharp bat ears and chiseled brow.
3. **ስፓይደርማን (Spider-Man):** Crimson web-patterned mask with mirrored white ocular lenses.
4. **አይረን ማን (Iron Man Mark 85):** Titanium red & gold faceplate with luminous cyan ARC repulsor eyes.
5. **ብላክ ፓንተር (Black Panther):** Vibranium habit cowl with purple kinetic pulse lines.
6. **ዴድፑል (Deadpool):** Crimson tactical mercenary mask with dynamic squint eyes.
7. **ጎስትፌስ (Ghostface):** Elongated porcelain Scream mask with weeping mouth cavity.
8. **ዳርት ቬደር (Darth Vader):** Obsidian Sith Lord helmet with respirator grille and red lens HUD.

---

## ⚙️ Automated GitHub Actions CI/CD Build

Every push to this GitHub repository automatically compiles and packages the Android APK via GitHub Actions:
- **Workflow:** [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml)
- **Compiler:** Gradle 8.10.2 + JDK 17 + Android SDK 35
- **Output:** Built APK is automatically published to GitHub Releases and stored in Actions artifacts.

---

## 💻 Web App Local Development

To run the web version locally:

```bash
# 1. Install dependencies
bun install   # or npm install

# 2. Build production assets
bun run build # or npm run build

# 3. Start local development server
bun run dev   # or npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
