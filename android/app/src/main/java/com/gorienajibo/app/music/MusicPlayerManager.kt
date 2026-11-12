package com.gorienajibo.app.music

import android.content.Context
import android.media.audiofx.Visualizer
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class AndroidTrack(
    val id: String,
    val title: String,
    val artist: String,
    val durationMs: Long,
    val uri: Uri
)

class MusicPlayerManager(private val context: Context) {

    private val player: ExoPlayer = ExoPlayer.Builder(context).build()
    private var visualizer: Visualizer? = null

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying

    private val _currentTrack = MutableStateFlow<AndroidTrack?>(null)
    val currentTrack: StateFlow<AndroidTrack?> = _currentTrack

    private val _fftData = MutableStateFlow(ByteArray(64))
    val fftData: StateFlow<ByteArray> = _fftData

    val playlist = mutableListOf<AndroidTrack>()

    init {
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _isPlaying.value = isPlaying
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    playNext()
                }
            }
        })

        setupVisualizer()
    }

    private fun setupVisualizer() {
        try {
            val audioSessionId = player.audioSessionId
            if (audioSessionId != 0) {
                visualizer = Visualizer(audioSessionId).apply {
                    captureSize = Visualizer.getCaptureSizeRange()[0]
                    setDataCaptureListener(object : Visualizer.OnDataCaptureListener {
                        override fun onWaveFormDataCapture(v: Visualizer?, waveform: ByteArray?, samplingRate: Int) {}
                        override fun onFftDataCapture(v: Visualizer?, fft: ByteArray?, samplingRate: Int) {
                            if (fft != null) {
                                _fftData.value = fft
                            }
                        }
                    }, Visualizer.getMaxCaptureRate() / 2, false, true)
                    enabled = true
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun playTrack(track: AndroidTrack) {
        _currentTrack.value = track
        val mediaItem = MediaItem.fromUri(track.uri)
        player.setMediaItem(mediaItem)
        player.prepare()
        player.play()
    }

    fun togglePlayPause() {
        if (player.isPlaying) {
            player.pause()
        } else {
            player.play()
        }
    }

    fun playNext() {
        if (playlist.isEmpty()) return
        val currentIdx = playlist.indexOfFirst { it.id == _currentTrack.value?.id }
        val nextIdx = (currentIdx + 1) % playlist.size
        playTrack(playlist[nextIdx])
    }

    fun playPrevious() {
        if (playlist.isEmpty()) return
        val currentIdx = playlist.indexOfFirst { it.id == _currentTrack.value?.id }
        val prevIdx = if (currentIdx <= 0) playlist.size - 1 else currentIdx - 1
        playTrack(playlist[prevIdx])
    }

    fun seekTo(positionMs: Long) {
        player.seekTo(positionMs)
    }

    fun setVolume(volume: Float) {
        player.volume = volume.coerceIn(0f, 1f)
    }

    fun release() {
        visualizer?.release()
        player.release()
    }
}
