package co.edu.unibarranquilla.taskserverkotlin.controller

import co.edu.unibarranquilla.taskserverkotlin.dto.reminder.ReminderCreateRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.reminder.ReminderResponse
import co.edu.unibarranquilla.taskserverkotlin.dto.reminder.ReminderUpdateRequest
import co.edu.unibarranquilla.taskserverkotlin.service.ReminderService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/reminders")
class ReminderController(
    private val reminderService: ReminderService
) {

    @PostMapping
    fun create(
        @Valid @RequestBody request: ReminderCreateRequest,
        authentication: Authentication
    ): ResponseEntity<ReminderResponse> {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(reminderService.createReminder(authentication.name, request))
    }

    @GetMapping
    fun list(authentication: Authentication): List<ReminderResponse> {
        return reminderService.getReminders(authentication.name)
    }

    @GetMapping("/{id}")
    fun get(@PathVariable id: Long, authentication: Authentication): ReminderResponse {
        return reminderService.getReminder(id, authentication.name)
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: Long,
        @RequestBody request: ReminderUpdateRequest,
        authentication: Authentication
    ): ReminderResponse {
        return reminderService.updateReminder(id, authentication.name, request)
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long, authentication: Authentication): ResponseEntity<Void> {
        reminderService.deleteReminder(id, authentication.name)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/all")
    fun listAll(): List<ReminderResponse> {
        return reminderService.getAllReminders()
    }
}
