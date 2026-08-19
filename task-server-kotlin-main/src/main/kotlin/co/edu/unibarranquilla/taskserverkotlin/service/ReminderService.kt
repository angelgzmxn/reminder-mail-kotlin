package co.edu.unibarranquilla.taskserverkotlin.service

import co.edu.unibarranquilla.taskserverkotlin.dto.reminder.ReminderCreateRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.reminder.ReminderResponse
import co.edu.unibarranquilla.taskserverkotlin.dto.reminder.ReminderUpdateRequest
import co.edu.unibarranquilla.taskserverkotlin.exception.InvalidCredentialsException
import co.edu.unibarranquilla.taskserverkotlin.exception.ReminderAlreadySentException
import co.edu.unibarranquilla.taskserverkotlin.exception.ResourceNotFoundException
import co.edu.unibarranquilla.taskserverkotlin.model.Reminder
import co.edu.unibarranquilla.taskserverkotlin.model.ReminderStatus
import co.edu.unibarranquilla.taskserverkotlin.repository.ReminderRepository
import co.edu.unibarranquilla.taskserverkotlin.repository.UserRepository
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class ReminderService(
    private val reminderRepository: ReminderRepository,
    private val userRepository: UserRepository
) {

    fun createReminder(ownerEmail: String, request: ReminderCreateRequest): ReminderResponse {
        val owner = findUserByEmail(ownerEmail)
        val reminder = Reminder(
            title = request.title,
            message = request.message,
            scheduledAt = request.scheduledAt,
            owner = owner
        )
        return reminderRepository.save(reminder).toResponse()
    }

    fun getReminders(ownerEmail: String): List<ReminderResponse> {
        val owner = findUserByEmail(ownerEmail)
        return reminderRepository.findAllByOwnerId(requireNotNull(owner.id)).map { it.toResponse() }
    }

    fun getReminder(id: Long, ownerEmail: String): ReminderResponse {
        val owner = findUserByEmail(ownerEmail)
        val reminder = reminderRepository.findByIdAndOwnerId(id, requireNotNull(owner.id))
            ?: throw ResourceNotFoundException("Reminder not found")
        return reminder.toResponse()
    }

    fun updateReminder(id: Long, ownerEmail: String, request: ReminderUpdateRequest): ReminderResponse {
        val owner = findUserByEmail(ownerEmail)
        val reminder = reminderRepository.findByIdAndOwnerId(id, requireNotNull(owner.id))
            ?: throw ResourceNotFoundException("Reminder not found")

        if (reminder.status == ReminderStatus.SENT) {
            throw ReminderAlreadySentException("Reminder was already sent and can no longer be edited")
        }

        request.title?.let { reminder.title = it }
        request.message?.let { reminder.message = it }
        request.scheduledAt?.let { reminder.scheduledAt = it }
        reminder.updatedAt = LocalDateTime.now()

        return reminderRepository.save(reminder).toResponse()
    }

    fun deleteReminder(id: Long, ownerEmail: String) {
        val owner = findUserByEmail(ownerEmail)
        val reminder = reminderRepository.findByIdAndOwnerId(id, requireNotNull(owner.id))
            ?: throw ResourceNotFoundException("Reminder not found")
        reminderRepository.delete(reminder)
    }

    fun getAllReminders(): List<ReminderResponse> {
        return reminderRepository.findAll().map { it.toResponse() }
    }

    private fun findUserByEmail(email: String) =
        userRepository.findByEmail(email)
            ?: throw InvalidCredentialsException("User not found")

    private fun Reminder.toResponse(): ReminderResponse {
        return ReminderResponse(
            id = requireNotNull(id),
            title = title,
            message = message,
            scheduledAt = scheduledAt,
            status = status,
            sentAt = sentAt,
            userId = requireNotNull(owner.id),
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
}
