# Feature 05: Perfil de Usuario en Kotlin

## Rama

```bash
feature/profile
```

## Objetivo

Permitir que el usuario autenticado consulte y actualice su perfil.

## Endpoints

```http
GET /users/me
PUT /users/me
```

Ambos requieren token.

## DTOs

Crear en `dto/user`:

- `UpdateProfileRequest`
- Reutilizar `UserResponse`

Campos actualizables:

- `fullName`
- `email`

Validaciones:

- `email` con formato valido cuando venga presente.

## Repository

Extender `UserRepository` agregando:

```kotlin
fun existsByEmailAndIdNot(email: String, id: Long): Boolean
```

## Service

Crear `service/UserService.kt`.

Metodos de esta feature:

- `getProfile(currentUserEmail: String): UserResponse`
- `updateProfile(currentUserEmail: String, request: UpdateProfileRequest): UserResponse`

Reglas:

- Si cambia email, validar que no exista para otro usuario.
- No permitir cambiar rol ni active desde este endpoint.
- No devolver `passwordHash`.

## Controller

Crear `controller/UserController.kt`.

Ruta base:

```text
/users
```

Usar `Authentication.name` como email del usuario autenticado.

## Errores esperados

- `401 Unauthorized` sin token.
- `409 Conflict` si el nuevo email ya esta tomado.
- `400 Bad Request` si el request no cumple validaciones.

## Archivo por archivo

### 1. `dto/user/UpdateProfileRequest.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.user

import jakarta.validation.constraints.Email

data class UpdateProfileRequest(
    @field:Email
    val email: String?,

    val fullName: String?
)
```

Explicacion:

Los campos son opcionales porque el usuario puede actualizar solo su nombre o solo su correo.

### 2. `UserRepository`

```kotlin
interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
    fun existsByEmail(email: String): Boolean
    fun existsByEmailAndIdNot(email: String, id: Long): Boolean
}
```

Explicacion:

Este metodo permite validar que el nuevo email no pertenezca a otro usuario, pero deja que el usuario conserve su propio email.

### 3. `UserService.updateProfile()`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.service

import co.edu.unibarranquilla.taskserverkotlin.dto.user.UpdateProfileRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.user.UserResponse
import co.edu.unibarranquilla.taskserverkotlin.exception.DuplicateResourceException
import co.edu.unibarranquilla.taskserverkotlin.exception.InvalidCredentialsException
import co.edu.unibarranquilla.taskserverkotlin.model.User
import co.edu.unibarranquilla.taskserverkotlin.repository.UserRepository
import org.springframework.stereotype.Service

@Service
class UserService(
    private val userRepository: UserRepository
) {

    fun getProfile(currentEmail: String): UserResponse {
        val user = findUserByEmail(currentEmail)
        return user.toResponse()
    }

    fun updateProfile(currentEmail: String, request: UpdateProfileRequest): UserResponse {
        val user = findUserByEmail(currentEmail)

        request.email?.let { newEmail ->
            if (userRepository.existsByEmailAndIdNot(newEmail, requireNotNull(user.id))) {
                throw DuplicateResourceException("Email already exists")
            }
            user.email = newEmail.trim().lowercase()
        }

        request.fullName?.let { user.fullName = it.trim() }

        return userRepository.save(user).toResponse()
    }

    private fun findUserByEmail(email: String) =
        userRepository.findByEmail(email)
            ?: throw InvalidCredentialsException("User not found")

    private fun User.toResponse(): UserResponse {
        return UserResponse(
            id = requireNotNull(id),
            email = email,
            fullName = fullName,
            active = active,
            role = role,
            createdAt = createdAt
        )
    }
}
```

Explicacion:

El service decide que campos se pueden cambiar. Rol, password y estado activo quedan por fuera de este endpoint. El codigo mostrado corresponde al estado de esta feature; en ramas posteriores se agregan metodos como `changePassword`, `getAllUsers` y `updateRole` al mismo `UserService`.

### 4. `UserController`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.controller

import co.edu.unibarranquilla.taskserverkotlin.dto.user.UpdateProfileRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.user.UserResponse
import co.edu.unibarranquilla.taskserverkotlin.service.UserService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/users")
class UserController(
    private val userService: UserService
) {

    @GetMapping("/me")
    fun me(authentication: Authentication): ResponseEntity<UserResponse> {
        return ResponseEntity.ok(userService.getProfile(authentication.name))
    }

    @PutMapping("/me")
    fun update(
        @Valid @RequestBody request: UpdateProfileRequest,
        authentication: Authentication
    ): ResponseEntity<UserResponse> {
        return ResponseEntity.ok(userService.updateProfile(authentication.name, request))
    }
}
```

Explicacion:

La identidad sale del token, no del body ni de un parametro manipulable por el cliente.

## Verificacion

- Consultar perfil con token.
- Cambiar nombre.
- Cambiar email a uno libre.
- Intentar cambiar email a uno existente y verificar `409`.
