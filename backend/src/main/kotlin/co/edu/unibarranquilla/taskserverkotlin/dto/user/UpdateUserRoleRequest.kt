package co.edu.unibarranquilla.taskserverkotlin.dto.user

import co.edu.unibarranquilla.taskserverkotlin.model.UserRole
import jakarta.validation.constraints.NotNull

data class UpdateUserRoleRequest(
    @field:NotNull
    val role: UserRole
)
