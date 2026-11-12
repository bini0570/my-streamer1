package com.gorienajibo.app.ui

import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.gorienajibo.app.ar.CharacterMask
import com.gorienajibo.app.ar.MaskCategory
import com.gorienajibo.app.camera.CameraXManager
import com.gorienajibo.app.music.MusicPlayerManager
import com.gorienajibo.app.ui.theme.NeonPurple

@Composable
fun MainLivestreamScreen(
    cameraManager: CameraXManager,
    musicPlayerManager: MusicPlayerManager? = null,
    hasCameraPermission: Boolean,
    onRequestCameraPermission: () -> Unit
) {
    val lifecycleOwner = LocalLifecycleOwner.current

    // Category State: 8 Animals vs 8 Cinema Masks
    var activeCategory by remember { mutableStateOf(MaskCategory.FILM_CHARACTERS) }
    var selectedFilter by remember { mutableStateOf<CharacterMask?>(CharacterMask.JOKER) }
    var isCalibrated by remember { mutableStateOf(true) }
    var isScanning by remember { mutableStateOf(false) }
    var showWireframe by remember { mutableStateOf(false) }
    var isFlippedY by remember { mutableStateOf(false) }
    var isFullscreen by remember { mutableStateOf(false) }
    var previewViewRef by remember { mutableStateOf<PreviewView?>(null) }

    // Split category masks into 4 Left and 4 Right
    val currentMasks = CharacterMask.values().filter { it.category == activeCategory }
    val leftFilters = currentMasks.take(4)
    val rightFilters = currentMasks.drop(4).take(4)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clickable {
                // Tapping anywhere in Fullscreen exits Fullscreen cleanly
                if (isFullscreen) {
                    isFullscreen = false
                }
            }
    ) {
        // -------------------------------------------------------------
        // 1. FULL-SCREEN HARDWARE CAMERA PREVIEW (Always Active)
        // -------------------------------------------------------------
        if (hasCameraPermission) {
            AndroidView(
                factory = { ctx ->
                    PreviewView(ctx).also { pView ->
                        previewViewRef = pView
                        cameraManager.startCamera(lifecycleOwner, pView)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Button(
                    onClick = onRequestCameraPermission,
                    colors = ButtonDefaults.buttonColors(containerColor = NeonPurple)
                ) {
                    Text("ካሜራ አንቃ (Enable Camera)")
                }
            }
        }

        // Vignette Overlay
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(Color.Transparent, Color(0x66000000))
                    )
                )
        )

        // -------------------------------------------------------------
        // ALL HUD CONTROLS & OVERLAYS (COMPLETELY HIDDEN IN FULLSCREEN)
        // When in Fullscreen: ZERO text, ZERO icons, ONLY filter on face!
        // -------------------------------------------------------------
        if (!isFullscreen) {
            // 2. TOP HUD: LIVE + 12.5K + ZERO-LAG BADGE + CONTROLS
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left Status Badges
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // • LIVE Pill
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFFF1744))
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(Color.White)
                        )
                        Text("LIVE", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    // 👁 12.5K Viewers
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0x99000000))
                            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(12.dp))
                            .padding(horizontal = 8.dp, vertical = 5.dp)
                    ) {
                        Icon(Icons.Default.RemoveRedEye, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(14.dp))
                        Text("12.5K", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }

                    // ZERO-LAG 100% Badge
                    if (isCalibrated) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xCC083344))
                                .border(1.dp, Color(0xFF06B6D4), RoundedCornerShape(12.dp))
                                .padding(horizontal = 8.dp, vertical = 5.dp)
                        ) {
                            Text("ZERO-LAG 100%", color = Color(0xFFA5F3FC), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Right Quick Controls (Scan, Mesh, Flip Y, Fullscreen)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // 100% Scan Button
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF0891B2))
                            .clickable { isScanning = true }
                            .padding(horizontal = 8.dp, vertical = 5.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("100% Scan", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    // Mesh Wireframe Toggle
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (showWireframe) NeonPurple else Color(0x99000000))
                            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(12.dp))
                            .clickable { showWireframe = !showWireframe }
                            .padding(horizontal = 8.dp, vertical = 5.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Mesh", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    // Flip Y Button
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isFlippedY) Color(0xFFD97706) else Color(0x99000000))
                            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(12.dp))
                            .clickable { isFlippedY = !isFlippedY }
                            .padding(horizontal = 8.dp, vertical = 5.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Flip Y", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    // Fullscreen Toggle Button in Top Bar
                    IconButton(
                        onClick = { isFullscreen = true },
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Color(0x99000000))
                            .border(1.dp, Color(0x33FFFFFF), CircleShape)
                    ) {
                        Icon(Icons.Default.Fullscreen, contentDescription = "Fullscreen", tint = Color.White, modifier = Modifier.size(18.dp))
                    }
                }
            }

            // 3. CATEGORY SWITCHER: 🐾 የዱር እንስሳት vs 🎭 Cinema Masks
            Row(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 64.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color(0xCC0B071E))
                    .border(1.dp, Color(0x44A855F7), RoundedCornerShape(24.dp))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(if (activeCategory == MaskCategory.ETHIOPIAN_ANIMALS) NeonPurple else Color.Transparent)
                        .clickable { activeCategory = MaskCategory.ETHIOPIAN_ANIMALS }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text("🐾 የዱር እንስሳት (8)", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(if (activeCategory == MaskCategory.FILM_CHARACTERS) Color(0xFF06B6D4) else Color.Transparent)
                        .clickable { activeCategory = MaskCategory.FILM_CHARACTERS }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text("🎭 Cinema Masks (8)", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            // 4. LEFT HUD: 4 PINNED CHARACTER MASKS
            Column(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                leftFilters.forEach { mask ->
                    val isSelected = selectedFilter == mask
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (isSelected) Color(0xFF7C3AED) else Color(0xCC0F172A))
                            .border(
                                2.dp,
                                if (isSelected) Color(0xFF67E8F9) else Color(0x33A855F7),
                                RoundedCornerShape(14.dp)
                            )
                            .clickable { selectedFilter = mask },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = mask.icon, fontSize = 16.sp)
                            Text(text = mask.nameAmharic, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // 5. RIGHT HUD: 4 PINNED CHARACTER MASKS
            Column(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                rightFilters.forEach { mask ->
                    val isSelected = selectedFilter == mask
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (isSelected) Color(0xFF7C3AED) else Color(0xCC0F172A))
                            .border(
                                2.dp,
                                if (isSelected) Color(0xFF67E8F9) else Color(0x33A855F7),
                                RoundedCornerShape(14.dp)
                            )
                            .clickable { selectedFilter = mask },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = mask.icon, fontSize = 16.sp)
                            Text(text = mask.nameAmharic, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // 6. BOTTOM STREAMING CONTROLS (Camera shoot button removed)
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(bottom = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Switch Camera (Front / Rear)
                IconButton(
                    onClick = {
                        previewViewRef?.let { pView ->
                            cameraManager.switchCamera(lifecycleOwner, pView)
                        }
                    },
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(Color(0x990F172A))
                        .border(1.dp, Color(0x33FFFFFF), CircleShape)
                ) {
                    Icon(Icons.Default.FlipCameraAndroid, contentDescription = "Switch Camera", tint = Color.White)
                }

                // Fullscreen Button
                Button(
                    onClick = { isFullscreen = true },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonPurple),
                    shape = RoundedCornerShape(24.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Icon(Icons.Default.Fullscreen, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("ሙሉ ማያ (Fullscreen)", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                // Clear Filter Button
                if (selectedFilter != null) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color(0x99450A0A))
                            .border(1.dp, Color(0x66EF4444), RoundedCornerShape(14.dp))
                            .clickable { selectedFilter = null }
                            .padding(horizontal = 12.dp, vertical = 10.dp)
                    ) {
                        Text("Clear", color = Color(0xFFFCA5A5), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
