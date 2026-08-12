# Feature 06: Cambio de Contrasena en Kotlin

## Rama

```bash
feature/change-password
```

## Objetivo

Permitir que el usuario autenticado cambie su contrasena validando primero la contrasena actual.

## Endpoint

```http
POST /users/me/change-password
```

Request:

```json
{
  "currentPassword": "Secret123",
  "newPassword": "NewSecret123"
}
```

Response:

```json
{
  "message": "Password changed successfully"
}
```

## DTOs

Crear:

- `dto/user/ChangePasswordRequest`
- `dto/MessageResponse`

Validaciones:

- `currentPassword` obligatorio.
- `newPassword` obligatorio.
- `newPassword` minimo 8 caracteres.

## Service

Extender `UserService.kt`.

Metodo:

```kotlin
fun changePassword(currentUserEmail: String, request: ChangePasswordRequest)
```

Flujo:

1. Buscar usuario autenticado.
2. Validar `currentPassword` con `PasswordEncoder.matches`.
3. Validar que la nueva contrasena cumpla reglas (via `@Valid` en controller).
4. Hashear nueva contrasena.
5. Guardar usuario.

## Reglas

- No aceptar contrasena actual incorrecta.
- No guardar contrasena plana.

## Errores esperados

- `401 Unauthorized` sin token.
- `400 Bad Request` si la contrasena actual no coincide.
- `400 Bad Request` si la nueva contrasena no cumple reglas.

## Archivo por archivo

### 1. `dto/user/ChangePasswordRequest.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.user

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ChangePasswordRequest(
    @field:NotBlank
    val currentPassword: String,

    @field:NotBlank
    @field:Size(min = 8)
    val newPassword: String
)
```

Explicacion:

La contrasena actual se requiere para confirmar identidad aunque el usuario ya tenga token.

### 2. `dto/MessageResponse.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto

data class MessageResponse(
    val message: String
)
```

Explicacion:

Para operaciones sin entidad de respuesta, se devuelve un JSON simple y consistente.

### 3. `UserService.changePassword()`

```kotlin
fun changePassword(currentEmail: String, request: ChangePasswordRequest) {
    val user = findUserByEmail(currentEmail)

    if (!passwordEncoder.matches(request.currentPassword, user.passwordHash)) {
        throw InvalidRequestException("Current password is invalid")
    }

    user.passwordHash = passwordEncoder.encode(request.newPassword)!!
    userRepository.save(user)
}
```

Explicacion:

Nunca se compara texto plano contra texto plano. Se usa `PasswordEncoder.matches` contra el hash existente y luego se guarda un nuevo hash.

- Se lanza `InvalidRequestException` (definida en `feature/cross-cutting`) para mantener el service libre de HTTP.
- El `!!` en `passwordEncoder.encode(...)` es necesario por el flag `-Xjsr305=warn`.

### 4. `UserController`

```kotlin
@PostMapping("/me/change-password")
fun changePassword(
    @Valid @RequestBody request: ChangePasswordRequest,
    authentication: Authentication
): ResponseEntity<MessageResponse> {
    userService.changePassword(authentication.name, request)
    return ResponseEntity.ok(MessageResponse("Password changed successfully"))
}
```

Explicacion:

El controller solo traduce HTTP. La validacion de la contrasena actual vive en el service.

## Verificacion

- Cambiar contrasena con la actual correcta.
- Login con contrasena anterior debe fallar.
- Login con nueva contrasena debe funcionar.
- Cambio con contrasena actual incorrecta debe fallar.
