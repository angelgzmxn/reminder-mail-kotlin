package co.edu.unibarranquilla.taskserverkotlin.dto.reminder

import co.edu.unibarranquilla.taskserverkotlin.model.ReminderStatus
import java.time.LocalDateTime

data class ReminderResponse(
    val id: Long,
    val title: String,
    val message: String,
    val scheduledAt: LocalDateTime,
    val status: ReminderStatus,
    val sentAt: LocalDateTime?,
    val userId: Long,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)
