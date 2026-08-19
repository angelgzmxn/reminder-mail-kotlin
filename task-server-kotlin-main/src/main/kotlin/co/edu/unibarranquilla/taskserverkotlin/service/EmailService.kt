package co.edu.unibarranquilla.taskserverkotlin.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

/**
 * Reemplaza al antiguo modulo de notificaciones por WhatsApp/Twilio.
 * Se encarga unicamente de armar y enviar el correo; no conoce reglas
 * de negocio de los recordatorios (esas viven en ReminderSchedulerService).
 */
@Service
class EmailService(
    private val mailSender: JavaMailSender,
    @Value("\${app.mail.from}") private val fromAddress: String
) {

    private val logger = LoggerFactory.getLogger(EmailService::class.java)

    fun sendReminderEmail(toEmail: String, title: String, message: String): Boolean {
        return try {
            val mail = SimpleMailMessage().apply {
                setFrom(fromAddress)
                setTo(toEmail)
                setSubject("Recordatorio: $title")
                setText(message)
            }
            mailSender.send(mail)
            true
        } catch (ex: Exception) {
            logger.error("No se pudo enviar el correo del recordatorio a $toEmail", ex)
            false
        }
    }
}
