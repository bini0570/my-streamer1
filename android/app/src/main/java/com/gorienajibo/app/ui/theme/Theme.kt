package com.gorienajibo.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val DarkSlate = Color(0xFF020617)
val CardSlate = Color(0xFF0F172A)
val NeonPurple = Color(0xFFA855F7)
val NeonPurpleLight = Color(0xFFC084FC)
val AccentGold = Color(0xFFF59E0B)

private val DarkColorScheme = darkColorScheme(
    primary = NeonPurple,
    onPrimary = Color.White,
    secondary = AccentGold,
    background = DarkSlate,
    surface = CardSlate,
    onBackground = Color.White,
    onSurface = Color(0xFFF1F5F9)
)

@Composable
fun GoriEnaJiboTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
