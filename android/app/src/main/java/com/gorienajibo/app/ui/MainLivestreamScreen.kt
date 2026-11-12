package com.gorienajibo.app.ui

import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.gorienajibo.app.ar.AnimalCharacter
import com.gorienajibo.app.camera.CameraXManager
import com.gorienajibo.app.music.MusicPlayerManager
import com.gorienajibo.app.ui.theme.CardSlate
import com.gorienajibo.app.ui.theme.DarkSlate
import com.gorienajibo.app.ui.theme.NeonPurple

@Composable
fun MainLivestreamScreen(
    cameraManager: CameraXManager,
    musicPlayerManager: MusicPlayerManager,
    hasCameraPermission: Boolean,
    onRequestCameraPermission: () -> Unit
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    var selectedFilter by remember { mutableStateOf<AnimalCharacter?>(AnimalCharacter.HYENA) }
    var previewViewRef by remember { mutableStateOf<PreviewView?>(null) }

    val leftFilters = listOf(
        AnimalCharacter.HYENA,
        AnimalCharacter.GORILLA,
        AnimalCharacter.TIGER,
        AnimalCharacter.LION
    )
    val rightFilters = listOf(
        AnimalCharacter.WOLF,
        AnimalCharacter.MONKEY,
        AnimalCharacter.BEAR,
        AnimalCharacter.FOX
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate)
    ) {
        // -------------------------------------------------------------
        // TOP 50%: CAMERA PREVIEW & 3D ANIMAL CHARACTER FILTERS
        // -------------------------------------------------------------
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(Color.Black)
        ) {
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
                        Text("ካሜራ አንቃ (Grant Camera Permission)")
                    }
                }
            }

            // Top Status Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color.Red)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        "LIVE",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(
                        onClick = {
                            previewViewRef?.let { pView ->
                                cameraManager.switchCamera(lifecycleOwner, pView)
                            }
                        },
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(Color(0x99000000))
                    ) {
                        Icon(Icons.Default.FlipCameraAndroid, contentDescription = "Switch Camera", tint = Color.White)
                    }
                }
            }

            // Left Filter Buttons (4 Animals)
            Column(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                leftFilters.forEach { character ->
                    val isSelected = selectedFilter == character
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) NeonPurple else Color(0x990F172A))
                            .border(
                                1.5.dp,
                                if (isSelected) Color.White else Color(0x44A855F7),
                                RoundedCornerShape(12.dp)
                            )
                            .clickable { selectedFilter = character },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = character.amharicName,
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Right Filter Buttons (4 Animals)
            Column(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                rightFilters.forEach { character ->
                    val isSelected = selectedFilter == character
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) NeonPurple else Color(0x990F172A))
                            .border(
                                1.5.dp,
                                if (isSelected) Color.White else Color(0x44A855F7),
                                RoundedCornerShape(12.dp)
                            )
                            .clickable { selectedFilter = character },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = character.amharicName,
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // -------------------------------------------------------------
        // BOTTOM 50%: MUSIC PLAYER (NOW PLAYING + PLAYLIST)
        // -------------------------------------------------------------
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(CardSlate)
        ) {
            // LEFT COLUMN: NOW PLAYING
            val isPlaying by musicPlayerManager.isPlaying.collectAsState()
            val currentTrack by musicPlayerManager.currentTrack.collectAsState()

            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(12.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "አሁን የሚጫወት",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = NeonPurple
                )

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(NeonPurple),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.MusicNote, contentDescription = null, tint = Color.White)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = currentTrack?.title ?: "ጎሪ እና ጅቦ Theme",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = currentTrack?.artist ?: "Addis Sound",
                        color = Color.Gray,
                        fontSize = 11.sp
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { musicPlayerManager.playPrevious() }) {
                        Icon(Icons.Default.SkipPrevious, contentDescription = "Previous", tint = Color.White)
                    }
                    IconButton(
                        onClick = { musicPlayerManager.togglePlayPause() },
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(NeonPurple)
                    ) {
                        Icon(
                            if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = "Play/Pause",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = { musicPlayerManager.playNext() }) {
                        Icon(Icons.Default.SkipNext, contentDescription = "Next", tint = Color.White)
                    }
                }
            }

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .fillMaxHeight()
                    .background(Color(0x22FFFFFF))
            )

            // RIGHT COLUMN: PLAYLIST
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(12.dp)
            ) {
                Text(
                    text = "አጫዋች ዝርዝር (Playlist)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = NeonPurple
                )

                Spacer(modifier = Modifier.height(6.dp))

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(musicPlayerManager.playlist) { track ->
                        val isCurrent = currentTrack?.id == track.id
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isCurrent) Color(0x33A855F7) else Color(0x11FFFFFF))
                                .clickable { musicPlayerManager.playTrack(track) }
                                .padding(8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = track.title,
                                color = if (isCurrent) NeonPurple else Color.White,
                                fontSize = 11.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }
    }
}
