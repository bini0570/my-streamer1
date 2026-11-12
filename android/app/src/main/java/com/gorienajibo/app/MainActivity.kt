package com.gorienajibo.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader

/**
 * Gori ena Jibo (ጎሪ እና ጅቦ) - Main Activity
 * Hosts the hardware-accelerated 3D Face Mesh & AR Transformation Mask Studio
 * completely offline with zero-lag MediaPipe tracking and custom GLSL Three.js shaders.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var pendingPermissionRequest: PermissionRequest? = null

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] == true

        if (cameraGranted) {
            pendingPermissionRequest?.let { req ->
                req.grant(req.resources)
                pendingPermissionRequest = null
            }
            if (::webView.isInitialized) {
                webView.reload()
            }
        } else {
            Toast.makeText(
                this,
                "ጎሪ እና ጅቦ requires camera permission for real-time 3D face mesh tracking",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge immersive full-screen display
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())

        // Set black root container
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Initialize AndroidX WebViewAssetLoader for 100% offline HTTPS asset loading
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.BLACK)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportZoom(false)
                displayZoomControls = false
                cacheMode = WebSettings.LOAD_DEFAULT
            }

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        if (checkCameraPermission()) {
                            request.grant(request.resources)
                        } else {
                            pendingPermissionRequest = request
                            requestPermissions()
                        }
                    }
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    val response = assetLoader.shouldInterceptRequest(request.url) ?: return null
                    val path = request.url.path ?: ""
                    if (path.endsWith(".wasm")) {
                        response.mimeType = "application/wasm"
                    } else if (path.endsWith(".js")) {
                        response.mimeType = "application/javascript"
                    } else if (path.endsWith(".css")) {
                        response.mimeType = "text/css"
                    } else if (path.endsWith(".binarypb") || path.endsWith(".data")) {
                        response.mimeType = "application/octet-stream"
                    }
                    return response
                }

                @Deprecated("Deprecated in Java")
                override fun shouldInterceptRequest(
                    view: WebView,
                    url: String
                ): WebResourceResponse? {
                    val uri = Uri.parse(url)
                    val response = assetLoader.shouldInterceptRequest(uri) ?: return null
                    val path = uri.path ?: ""
                    if (path.endsWith(".wasm")) {
                        response.mimeType = "application/wasm"
                    } else if (path.endsWith(".js")) {
                        response.mimeType = "application/javascript"
                    } else if (path.endsWith(".css")) {
                        response.mimeType = "text/css"
                    } else if (path.endsWith(".binarypb") || path.endsWith(".data")) {
                        response.mimeType = "application/octet-stream"
                    }
                    return response
                }
            }
        }

        rootLayout.addView(webView)
        setContentView(rootLayout)

        // Load the 100% offline WebGL 3D face mesh studio from APK assets
        webView.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html")

        if (!checkCameraPermission()) {
            requestPermissions()
        }
    }

    private fun checkCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
        permissionLauncher.launch(permissions.toTypedArray())
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}
