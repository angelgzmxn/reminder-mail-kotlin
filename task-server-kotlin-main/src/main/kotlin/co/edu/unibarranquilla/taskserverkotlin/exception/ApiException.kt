package co.edu.unibarranquilla.taskserverkotlin.exception

import org.springframework.http.HttpStatus

open class ApiException(
    message: String,
    val status: HttpStatus
) : RuntimeException(message)

class DuplicateResourceException(message: String) :
    ApiException(message, HttpStatus.CONFLICT)

class ResourceNotFoundException(message: String) :
    ApiException(message, HttpStatus.NOT_FOUND)

class InvalidCredentialsException(message: String) :
    ApiException(message, HttpStatus.UNAUTHORIZED)

class ForbiddenOperationException(message: String) :
    ApiException(message, HttpStatus.FORBIDDEN)

class InvalidRequestException(message: String) :
    ApiException(message, HttpStatus.BAD_REQUEST)

class InvalidStatusTransitionException(message: String) :
    ApiException(message, HttpStatus.BAD_REQUEST)

class ReminderAlreadySentException(message: String) :
    ApiException(message, HttpStatus.CONFLICT)
