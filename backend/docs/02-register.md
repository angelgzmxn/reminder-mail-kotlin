# Feature 02: Register en Kotlin

## Rama

```bash
feature/register
```

## Objetivo

Implementar el registro de usuarios con Spring Boot, Kotlin, JPA y BCrypt.

## Endpoint

```http
POST /auth/register
```

Request:

```json
{
  "email": "ana@taskflow.com",
  "fullName": "Ana Gomez",
  "password": "Secret123"
}
```

Response `201 Created`:

```json
{
  "id": 1,
  "email": "ana@taskflow.com",
  "fullName": "Ana Gomez",
  "active": true,
  "role": "USER",
  "createdAt": "2026-07-08T10:00:00"
}
```

## Modelo

Crear `model/User.kt`.

Campos:

- `id: Long?`
- `email: String`
- `fullName: String`
- `passwordHash: String`
- `active: Boolean`
- `role: UserRole`
- `createdAt: LocalDateTime`

Crear `model/UserRole.kt`:

```kotlin
enum class UserRole {
    USER,
    ADMIN
}
```

## DTOs

Crear en `dto/auth` y `dto/user`:

- `RegisterRequest`
- `UserResponse`

Usar Bean Validation:

- `@Email`
- `@NotBlank`
- `@Size(min = 8)` para password

## Repository

Crear `repository/UserRepository.kt`.

Metodos:

- `fun findByEmail(email: String): User?`
- `fun existsByEmail(email: String): Boolean`

## Service

Crear `service/AuthService.kt`.

Responsabilidades:

- Validar que el correo no exista.
- Normalizar email con `trim().lowercase()`.
- Hashear contrasena con `PasswordEncoder`.
- Crear el usuario con rol `USER`.
- Devolver `UserResponse`.

## Controller

Crear `controller/AuthController.kt`.

- Ruta base: `/auth`
- Metodo: `register`
- Usar `@Valid` en el request.
- Devolver `ResponseEntity.status(HttpStatus.CREATED)`.

## Seguridad

En esta feature basta con exponer `/auth/register` como publico. Si Spring Security queda activo desde base setup, configurar temporalmente:

- `/`
- `/auth/register`

como rutas permitidas.

## Archivo por archivo

### 1. `model/UserRole.kt` - Roles del sistema

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.model

enum class UserRole {
    USER,
    ADMIN
}
```

Explicacion:

Usamos un `enum class` para evitar strings sueltos como `"user"` o `"admin"`. Esto reduce errores de escritura y permite que Kotlin valide los valores posibles en compilacion.

### 2. `model/User.kt` - Entidad JPA

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false, unique = true)
    var email: String = "",

    @Column(nullable = false)
    var fullName: String = "",

    @Column(nullable = false)
    var passwordHash: String = "",

    @Column(nullable = false)
    var active: Boolean = true,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: UserRole = UserRole.USER,

    @Column(nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()
)
```

Explicacion:

- `@Entity` le dice a JPA que esta clase representa una tabla.
- `@Table(name = "users")` evita usar nombres generados automaticamente.
- `@Id` y `@GeneratedValue` definen la llave primaria.
- `unique = true` protege que no haya dos usuarios con el mismo email tambien a nivel de base de datos.
- `passwordHash` deja claro que nunca guardamos la contrasena plana.
- `@Enumerated(EnumType.STRING)` guarda `USER` o `ADMIN` como texto, no como numero.
- Los valores por defecto (`=""`, `=true`, `=UserRole.USER`, `=LocalDateTime.now()`) permiten crear la entidad de forma comoda desde distintos lugares y no dependen de un constructor con todos los argumentos.

Nota Kotlin/JPA:

Las entidades JPA suelen necesitar clases abiertas y constructor sin argumentos. El plugin `kotlin("plugin.jpa")` se encarga de generar el constructor vacio y de abrir las clases anotadas con `@Entity`, `@MappedSuperclass` y `@Embeddable`.

### 3. `dto/auth/RegisterRequest.kt` - Datos de entrada

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.auth

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RegisterRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    @field:NotBlank
    val fullName: String,

    @field:NotBlank
    @field:Size(min = 8)
    val password: String
)
```

Explicacion:

Este DTO representa lo que llega por HTTP. La anotacion en Kotlin debe usar `@field:` para que Bean Validation valide el campo real generado por Kotlin.

### 4. `dto/user/UserResponse.kt` - Datos de salida

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.user

import co.edu.unibarranquilla.taskserverkotlin.model.UserRole
import java.time.LocalDateTime

data class UserResponse(
    val id: Long,
    val email: String,
    val fullName: String,
    val active: Boolean,
    val role: UserRole,
    val createdAt: LocalDateTime
)
```

Explicacion:

La respuesta no incluye `password` ni `passwordHash`. Separar DTOs de entidades evita exponer campos sensibles por accidente.

### 5. `repository/UserRepository.kt` - Acceso a datos

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.repository

import co.edu.unibarranquilla.taskserverkotlin.model.User
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
    fun existsByEmail(email: String): Boolean
}
```

Explicacion:

Spring Data JPA implementa este repository en runtime. Los metodos `findByEmail` y `existsByEmail` se generan por convencion a partir del nombre.

### 6. `service/AuthService.kt` - Regla de negocio

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.service

import co.edu.unibarranquilla.taskserverkotlin.dto.auth.RegisterRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.user.UserResponse
import co.edu.unibarranquilla.taskserverkotlin.exception.DuplicateResourceException
import co.edu.unibarranquilla.taskserverkotlin.model.User
import co.edu.unibarranquilla.taskserverkotlin.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {

    fun register(request: RegisterRequest): UserResponse {
        val email = request.email.trim().lowercase()

        if (userRepository.existsByEmail(email)) {
            throw DuplicateResourceException("Email already exists")
        }

        val user = User(
            email = email,
            fullName = request.fullName.trim(),
            passwordHash = passwordEncoder.encode(request.password)!!
        )

        return userRepository.save(user).toResponse()
    }

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

El service contiene la regla de negocio: no se permiten emails duplicados y la contrasena se guarda hasheada. El controller no debe decidir eso.

- `email.trim().lowercase()` estandariza el correo antes de comparar y guardar.
- `passwordEncoder.encode(request.password)!!` hashea la contrasena. El `!!` es necesario porque con `-Xjsr305=warn` el retorno de `encode` se ve como `String?`; sabemos que nunca sera null.
- Se lanza `DuplicateResourceException` (definida en `feature/cross-cutting`) para mantener los services libres de detalles HTTP.

### 7. `controller/AuthController.kt` - Endpoint HTTP

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.controller

import co.edu.unibarranquilla.taskserverkotlin.dto.auth.RegisterRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.user.UserResponse
import co.edu.unibarranquilla.taskserverkotlin.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/auth")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<UserResponse> {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(authService.register(request))
    }
}
```

Explicacion:

- `@RequestMapping("/auth")` define el prefijo del controller.
- `@PostMapping("/register")` crea el endpoint final `POST /auth/register`.
- `@Valid` activa las validaciones del DTO.
- `ResponseEntity` permite devolver status `201 Created`.

## Flujo completo

```text
HTTP POST /auth/register
        ↓
AuthController.register()
        ↓
AuthService.register()
        ↓
UserRepository.existsByEmail()
        ↓
PasswordEncoder.encode()
        ↓
UserRepository.save()
        ↓
UserResponse
```

## Errores esperados

- `409 Conflict` si el correo ya existe.
- `400 Bad Request` si falla validacion.

## Verificacion

- Crear usuario nuevo.
- Repetir el mismo correo y verificar `409`.
- Confirmar en DB que `passwordHash` no guarda la contrasena plana.
