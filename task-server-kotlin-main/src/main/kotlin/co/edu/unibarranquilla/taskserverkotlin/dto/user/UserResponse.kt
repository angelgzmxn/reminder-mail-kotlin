package co.edu.unibarranquilla.taskserverkotlin.dto.user

import co.edu.unibarranquilla.taskserverkotlin.model.UserRole
import java.time.LocalDateTime

data class UserResponse(
    val id: Long,
    val email: String,
    val fullName: String,
    val active: Boolean,
    val role: UserRole,
    val createdAt: LocalDateTime
)
