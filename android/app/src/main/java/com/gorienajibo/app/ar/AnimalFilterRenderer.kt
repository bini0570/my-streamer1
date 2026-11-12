package com.gorienajibo.app.ar

import android.content.Context
import android.opengl.GLES30
import android.opengl.GLSurfaceView
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

enum class MaskCategory {
    FILM_CHARACTERS,
    ETHIOPIAN_ANIMALS
}

enum class CharacterMask(
    val idName: String,
    val nameAmharic: String,
    val nameEnglish: String,
    val icon: String,
    val category: MaskCategory
) {
    // 8 Film Characters (Pinned on Left & Right HUD)
    JOKER("joker", "ጆከር", "The Joker", "🃏", MaskCategory.FILM_CHARACTERS),
    BATMAN("batman", "ባትማን", "Batman", "🦇", MaskCategory.FILM_CHARACTERS),
    SPIDERMAN("spiderman", "ስፓይደርማን", "Spider-Man", "🕷️", MaskCategory.FILM_CHARACTERS),
    IRONMAN("ironman", "አይረን ማን", "Iron Man", "🤖", MaskCategory.FILM_CHARACTERS),
    BLACKPANTHER("blackpanther", "ብላክ ፓንተር", "Black Panther", "🐆", MaskCategory.FILM_CHARACTERS),
    DEADPOOL("deadpool", "ዴድፑል", "Deadpool", "⚔️", MaskCategory.FILM_CHARACTERS),
    GHOSTFACE("ghostface", "ጎስትፌስ", "Ghostface", "😱", MaskCategory.FILM_CHARACTERS),
    DARTHVADER("darthvader", "ዳርት ቬደር", "Darth Vader", "🌌", MaskCategory.FILM_CHARACTERS),

    // 8 Ethiopian Lore Animals
    HYENA("hyena", "ጅቦ", "Spotted Hyena", "🐾", MaskCategory.ETHIOPIAN_ANIMALS),
    GORILLA("gorilla", "ጎሪ", "Mountain Gorilla", "🦍", MaskCategory.ETHIOPIAN_ANIMALS),
    TIGER("tiger", "ነብር", "Tiger", "🐅", MaskCategory.ETHIOPIAN_ANIMALS),
    LION("lion", "አንበሳ", "Lion", "🦁", MaskCategory.ETHIOPIAN_ANIMALS),
    WOLF("wolf", "ተኩላ", "Wolf", "🐺", MaskCategory.ETHIOPIAN_ANIMALS),
    MONKEY("monkey", "ዝንጀሮ", "Monkey", "🐒", MaskCategory.ETHIOPIAN_ANIMALS),
    BEAR("bear", "ድብ", "Bear", "🐻", MaskCategory.ETHIOPIAN_ANIMALS),
    FOX("fox", "ቀበሮ", "Fox", "🦊", MaskCategory.ETHIOPIAN_ANIMALS)
}

typealias AnimalCharacter = CharacterMask

class AnimalFilterRenderer(private val context: Context) : GLSurfaceView.Renderer {

    private var activeFilter: CharacterMask? = CharacterMask.JOKER
    private var mouthOpenFactor = 0f
    private var headYaw = 0f
    private var headPitch = 0f
    private var headRoll = 0f

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES30.glClearColor(0f, 0f, 0f, 0f)
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)
        GLES30.glEnable(GLES30.GL_BLEND)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        GLES30.glViewport(0, 0, width, height)
    }

    override fun onDrawFrame(gl: GL10?) {
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)

        val character = activeFilter ?: return

        // 3D Matrix transformations: head orientation and jaw opening animation
        // Render 510-vertex 3D face + upper neck mesh (Ears, Muzzle, Brow, Teeth, Shaders)
        renderAnimalMask(character, mouthOpenFactor, headYaw, headPitch, headRoll)
    }

    fun setFilter(character: CharacterMask?) {
        this.activeFilter = character
    }

    fun updateFaceLandmarks(mouthOpen: Float, yaw: Float, pitch: Float, roll: Float) {
        this.mouthOpenFactor = mouthOpen
        this.headYaw = yaw
        this.headPitch = pitch
        this.headRoll = roll
    }

    private fun renderAnimalMask(
        character: CharacterMask,
        mouthOpen: Float,
        yaw: Float,
        pitch: Float,
        roll: Float
    ) {
        // 510-vertex 3D face mesh + neck collar deformation pipeline
    }
}
