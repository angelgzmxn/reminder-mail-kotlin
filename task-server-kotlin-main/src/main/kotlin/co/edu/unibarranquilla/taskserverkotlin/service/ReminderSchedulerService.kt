package co.edu.unibarranquilla.taskserverkotlin.service

import co.edu.unibarranquilla.taskserverkotlin.model.ReminderStatus
import co.edu.unibarranquilla.taskserverkotlin.repository.ReminderRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
class ReminderSchedulerService(
    private val reminderRepository: ReminderRepository,
    private val emailService: EmailService
) {

    private val logger = LoggerFactory.getLogger(ReminderSchedulerService::class.java)

    @Transactional
    @Scheduled(fixedDelayString = "\${app.reminder.scheduler.fixed-delay-ms:60000}")
    fun dispatchDueReminders() {
        val dueReminders = reminderRepository.findAllByStatusAndScheduledAtLessThanEqual(
            ReminderStatus.PENDING,
            LocalDateTime.now()
        )

        if (dueReminders.isEmpty()) return

        logger.info("Enviando ${dueReminders.size} recordatorio(s) pendiente(s)")

        dueReminders.forEach { reminder ->
            val sent = emailService.sendReminderEmail(
                toEmail = reminder.owner.email,
                title = reminder.title,
                message = reminder.message
            )

            reminder.status = if (sent) ReminderStatus.SENT else ReminderStatus.FAILED
            reminder.sentAt = if (sent) LocalDateTime.now() else null
            reminder.updatedAt = LocalDateTime.now()
            reminderRepository.save(reminder)
        }
    }
}
