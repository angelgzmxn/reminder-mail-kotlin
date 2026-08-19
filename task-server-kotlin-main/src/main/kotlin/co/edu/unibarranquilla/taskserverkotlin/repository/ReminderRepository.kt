package co.edu.unibarranquilla.taskserverkotlin.repository

import co.edu.unibarranquilla.taskserverkotlin.model.Reminder
import co.edu.unibarranquilla.taskserverkotlin.model.ReminderStatus
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime

interface ReminderRepository : JpaRepository<Reminder, Long> {
    fun findAllByOwnerId(ownerId: Long): List<Reminder>
    fun findByIdAndOwnerId(id: Long, ownerId: Long): Reminder?

    fun findAllByStatusAndScheduledAtLessThanEqual(
        status: ReminderStatus,
        scheduledAt: LocalDateTime
    ): List<Reminder>
}
