# Feature 08: Cross-Cutting en Kotlin

## Rama

```bash
feature/cross-cutting
```

## Objetivo

Centralizar errores, respuestas y logging para que los services no dependan de detalles HTTP y la API responda de forma consistente.

## Excepciones de dominio

Crear `exception/ApiException.kt` con excepciones especificas:

- `DuplicateResourceException`
- `ResourceNotFoundException`
- `InvalidCredentialsException`
- `ForbiddenOperationException`
- `InvalidRequestException`
- `InvalidStatusTransitionException`

Los services deben lanzar estas excepciones, no `ResponseStatusException` ni `HttpServletResponse`.

## Handler global

Crear `exception/GlobalExceptionHandler.kt` con `@RestControllerAdvice`.

Respuesta recomendada:

```json
{
  "timestamp": "2026-07-08T10:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "Task not found",
  "path": "/tasks/99"
}
```

Manejar:

- Excepciones de dominio (`ApiException`).
- `MethodArgumentNotValidException`.
- `HttpMessageNotReadableException` (body JSON incompleto o invalido).
- `AuthenticationException`.
- `AccessDeniedException`.
- Errores inesperados como `500`.

## Logging

Usar logger por clase:

```kotlin
private val logger = LoggerFactory.getLogger(MyClass::class.java)
```

Registrar:

- Errores inesperados con stacktrace.
- No registrar contrasenas ni tokens completos.

## Refactor esperado

Revisar services:

- `AuthService`
- `UserService`
- `TaskService`

Cambiar errores HTTP directos por excepciones de dominio.

Revisar controllers:

- Deben quedar delgados.
- No duplicar reglas de negocio.
- No construir manualmente errores repetidos.

## Archivo por archivo

### 1. `exception/ApiError.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.exception

import java.time.LocalDateTime

data class ApiError(
    val timestamp: LocalDateTime = LocalDateTime.now(),
    val status: Int,
    val error: String,
    val message: String,
    val path: String
)
```

Explicacion:

Todas las respuestas de error tienen la misma forma. Esto ayuda al frontend y evita respuestas inconsistentes.

### 2. Excepciones de dominio

```kotlin
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
```

Explicacion:

Los services lanzan excepciones de dominio. No necesitan conocer `ResponseEntity` ni construir JSON. Cada excepcion lleva asociado su `HttpStatus`, que el handler global utilizara para generar la respuesta.

### 3. `GlobalExceptionHandler.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.exception

import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(ApiException::class)
    fun handleApiException(
        ex: ApiException,
        request: HttpServletRequest
    ): ResponseEntity<ApiError> {
        val body = ApiError(
            status = ex.status.value(),
            error = ex.status.reasonPhrase,
            message = ex.message ?: "Unexpected error",
            path = request.requestURI
        )
        return ResponseEntity.status(ex.status).body(body)
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(
        ex: MethodArgumentNotValidException,
        request: HttpServletRequest
    ): ResponseEntity<ApiError> {
        val message = ex.bindingResult.fieldErrors
            .joinToString("; ") { "${it.field}: ${it.defaultMessage}" }

        val body = ApiError(
            status = HttpStatus.BAD_REQUEST.value(),
            error = HttpStatus.BAD_REQUEST.reasonPhrase,
            message = message,
            path = request.requestURI
        )
        return ResponseEntity.badRequest().body(body)
    }

    @ExceptionHandler(AuthenticationException::class)
    fun handleAuthentication(
        ex: AuthenticationException,
        request: HttpServletRequest
    ): ResponseEntity<ApiError> {
        val body = ApiError(
            status = HttpStatus.UNAUTHORIZED.value(),
            error = HttpStatus.UNAUTHORIZED.reasonPhrase,
            message = ex.message ?: "Unauthorized",
            path = request.requestURI
        )
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body)
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleMessageNotReadable(
        ex: HttpMessageNotReadableException,
        request: HttpServletRequest
    ): ResponseEntity<ApiError> {
        val body = ApiError(
            status = HttpStatus.BAD_REQUEST.value(),
            error = HttpStatus.BAD_REQUEST.reasonPhrase,
            message = "Invalid or incomplete request body",
            path = request.requestURI
        )
        return ResponseEntity.badRequest().body(body)
    }

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(
        ex: AccessDeniedException,
        request: HttpServletRequest
    ): ResponseEntity<ApiError> {
        val body = ApiError(
            status = HttpStatus.FORBIDDEN.value(),
            error = HttpStatus.FORBIDDEN.reasonPhrase,
            message = ex.message ?: "Forbidden",
            path = request.requestURI
        )
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body)
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(
        ex: Exception,
        request: HttpServletRequest
    ): ResponseEntity<ApiError> {
        logger.error("Unexpected error at ${request.requestURI}", ex)

        val body = ApiError(
            status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
            error = HttpStatus.INTERNAL_SERVER_ERROR.reasonPhrase,
            message = "Internal server error",
            path = request.requestURI
        )
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body)
    }
}
```

Explicacion:

`@RestControllerAdvice` intercepta excepciones lanzadas por controllers/services y las convierte en respuestas HTTP consistentes.

- `handleApiException` cubre todas las excepciones de dominio.
- `handleValidation` devuelve `400` con los mensajes de validacion de Bean Validation.
- `handleMessageNotReadable` devuelve `400` cuando el JSON esta incompleto o mal formado, evitando un `500` inesperado.
- `handleAccessDenied` devuelve `403` cuando un usuario autenticado intenta acceder a un recurso sin el rol adecuado.
- `handleUnexpected` captura cualquier otra excepcion, loguea el error con stacktrace y devuelve `500` sin exponer detalles internos.

### 4. Refactor de services

Antes:

```kotlin
throw ResponseStatusException(HttpStatus.CONFLICT, "Email already exists")
```

Despues:

```kotlin
throw DuplicateResourceException("Email already exists")
```

Este cambio limpia los services y permite mapear cada tipo de error al status HTTP correcto en un solo lugar.

Ejemplos de mapeo usados:

| Situacion | Excepcion | Status |
| --- | --- | --- |
| Email duplicado | `DuplicateResourceException` | `409` |
| Tarea no encontrada | `ResourceNotFoundException` | `404` |
| Login invalido | `InvalidCredentialsException` | `401` |
| Transicion de estado invalida | `InvalidStatusTransitionException` | `400` |
| Password actual incorrecta | `InvalidRequestException` | `400` |

## Verificacion

- Email duplicado devuelve `409` con formato estandar.
- Login invalido devuelve `401` con formato estandar.
- Acceso sin permisos devuelve `403`.
- Tarea inexistente devuelve `404`.
- Transicion invalida devuelve `400`.
- Validaciones de DTO devuelven `400` con mensajes claros.
- Body JSON incompleto devuelve `400`.
