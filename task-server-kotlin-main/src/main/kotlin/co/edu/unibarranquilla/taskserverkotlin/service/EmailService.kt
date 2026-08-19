package co.edu.unibarranquilla.taskserverkotlin.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

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
