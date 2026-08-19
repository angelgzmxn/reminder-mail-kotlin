package co.edu.unibarranquilla.taskserverkotlin.dto.reminder

import jakarta.validation.constraints.Future
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDateTime

data class ReminderCreateRequest(
    @field:NotBlank
    val title: String,

    @field:NotBlank
    val message: String,

    @field:NotNull
    @field:Future
    val scheduledAt: LocalDateTime
)
