package co.edu.unibarranquilla.taskserverkotlin.dto.reminder

import java.time.LocalDateTime

data class ReminderUpdateRequest(
    val title: String?,
    val message: String?,
    val scheduledAt: LocalDateTime?
)
