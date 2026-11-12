package com.gorienajibo.app

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

        if (!hasCameraPermission) {
            Toast.makeText(
                this,
                "ጎሪ እና ጅቦ requires camera permission for real-time 3D animal filters",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        cameraManager = CameraXManager(this)
        musicPlayerManager = MusicPlayerManager(this)

        checkAndRequestPermissions()

        setContent {
            GoriEnaJiboTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
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

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isEmpty()) {
            hasCameraPermission = true
            hasAudioPermission = true
        } else {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraManager.shutdown()
        musicPlayerManager.release()
    }
}
