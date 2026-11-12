# Keep MediaPipe and ARCore classes
-keep class com.google.mediapipe.** { *; }
-keep class com.google.ar.core.** { *; }

# Keep App Models and Renderers
-keep class com.gorienajibo.app.** { *; }

# Keep Compose Runtime
-keepclassmembers class * {
    @androidx.compose.runtime.Composable *;
}
