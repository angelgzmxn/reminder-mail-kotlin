package co.edu.unibarranquilla.taskserverkotlin.dto.auth

data class TokenResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long
)
