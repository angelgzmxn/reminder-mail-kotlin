# Feature 07: Roles y Administracion en Kotlin

## Rama

```bash
feature/roles
```

## Objetivo

Agregar permisos diferenciados para `USER` y `ADMIN`.

## Endpoints administrativos

| Metodo | Ruta | Acceso | Descripcion |
| --- | --- | --- | --- |
| GET | `/users` | ADMIN | Listar todos los usuarios |
| PUT | `/users/{id}/role` | ADMIN | Cambiar rol de usuario |
| GET | `/tasks/all` | ADMIN | Listar todas las tareas |

## Seed de administrador

Crear `config/DataInitializer.kt` que ejecute al arrancar la aplicacion y cree un usuario administrador por defecto si no existe:

- Email: `admin@taskflow.com`
- Password: `AdminSecret123`
- Rol: `ADMIN`

Esto facilita las pruebas sin tener que modificar la base de datos manualmente.

## Seguridad

Actualizar `SecurityConfig.kt`:

- `/users` solo `ADMIN`.
- `/users/{id}/role` solo `ADMIN`.
- `/tasks/all` solo `ADMIN`.
- Resto de `/tasks/**` para usuarios autenticados.
- `/users/me/**` para usuarios autenticados.
- Rutas publicas: `/`, `/auth/register`, `/auth/login`.

Authority recomendada:

```text
ROLE_USER
ROLE_ADMIN
```

Si el enum es `ADMIN`, mapearlo a `SimpleGrantedAuthority("ROLE_ADMIN")`.

## DTOs

Crear:

- `UpdateUserRoleRequest`

Request:

```json
{
  "role": "ADMIN"
}
```

## Repository

Extender:

- `UserRepository.findAll()` ya viene de `JpaRepository<User, Long>`.
- `TaskRepository.findAll()` ya viene de `JpaRepository<Task, Long>`.

## Service

Extender `UserService.kt`:

- `getAllUsers(): List<UserResponse>`
- `updateRole(userId: Long, request: UpdateUserRoleRequest): UserResponse`

Extender `TaskService.kt`:

- `getAllTasks(): List<TaskResponse>`

Reglas:

- Solo admin puede usar estos metodos desde controller.
- No permitir roles fuera del enum (Jackson se encarga al usar `UserRole`).

## Errores esperados

- `403 Forbidden` si un `USER` intenta entrar.
- `404 Not Found` si el usuario a modificar no existe.

## Archivo por archivo

### 1. `config/DataInitializer.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.config

import co.edu.unibarranquilla.taskserverkotlin.model.User
import co.edu.unibarranquilla.taskserverkotlin.model.UserRole
import co.edu.unibarranquilla.taskserverkotlin.repository.UserRepository
import org.springframework.boot.CommandLineRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

@Component
class DataInitializer(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) : CommandLineRunner {

    override fun run(vararg args: String) {
        if (!userRepository.existsByEmail("admin@taskflow.com")) {
            val admin = User(
                email = "admin@taskflow.com",
                fullName = "System Administrator",
                passwordHash = passwordEncoder.encode("AdminSecret123")!!,
                role = UserRole.ADMIN
            )
            userRepository.save(admin)
        }
    }
}
```

Explicacion:

`CommandLineRunner` ejecuta su metodo `run` una vez que Spring arranca. Aqui se crea un admin inicial si no existe, permitiendo probar endpoints protegidos inmediatamente.

### 2. `dto/user/UpdateUserRoleRequest.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.user

import co.edu.unibarranquilla.taskserverkotlin.model.UserRole
import jakarta.validation.constraints.NotNull

data class UpdateUserRoleRequest(
    @field:NotNull
    val role: UserRole
)
```

Explicacion:

El request usa el enum `UserRole`, asi Spring/Jackson rechaza valores que no existan.

### 3. Authorities en seguridad

```kotlin
val authorities = listOf(SimpleGrantedAuthority("ROLE_${user.role.name}"))
```

Explicacion:

Spring Security espera roles con prefijo `ROLE_` cuando se usa `hasRole("ADMIN")`.

### 4. `SecurityConfig`

```kotlin
@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter
) {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        return http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers(HttpMethod.GET, "/").permitAll()
                it.requestMatchers(HttpMethod.POST, "/auth/register").permitAll()
                it.requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
                it.requestMatchers(HttpMethod.GET, "/users").hasRole("ADMIN")
                it.requestMatchers(HttpMethod.PUT, "/users/*/role").hasRole("ADMIN")
                it.requestMatchers(HttpMethod.GET, "/tasks/all").hasRole("ADMIN")
                it.anyRequest().authenticated()
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .build()
    }
}
```

Explicacion:

La autorizacion se declara de forma centralizada. Los controllers administrativos aun deben existir, pero Spring bloquea antes de entrar si el rol no alcanza.

### 5. `UserController`

```kotlin
@GetMapping
fun list(): ResponseEntity<List<UserResponse>> {
    return ResponseEntity.ok(userService.getAllUsers())
}

@PutMapping("/{id}/role")
fun updateRole(
    @PathVariable id: Long,
    @Valid @RequestBody request: UpdateUserRoleRequest
): ResponseEntity<UserResponse> {
    return ResponseEntity.ok(userService.updateRole(id, request))
}
```

### 6. `UserService.updateRole()`

```kotlin
fun updateRole(userId: Long, request: UpdateUserRoleRequest): UserResponse {
    val user = userRepository.findById(userId)
        .orElseThrow { ResourceNotFoundException("User not found") }

    user.role = request.role
    return userRepository.save(user).toResponse()
}
```

Explicacion:

Cambiar roles es una regla administrativa. No se expone dentro de `/users/me` para evitar que un usuario cambie su propio permiso.

### 7. `TaskController`

```kotlin
@GetMapping("/all")
fun listAll(): List<TaskResponse> {
    return taskService.getAllTasks()
}
```

### 8. `TaskService.getAllTasks()`

```kotlin
fun getAllTasks(): List<TaskResponse> {
    return taskRepository.findAll().map { it.toResponse() }
}
```

Explicacion:

Este metodo no filtra por dueno porque solo lo puede ejecutar un admin, protegido por `SecurityConfig`.

## Verificacion

- Usuario normal recibe `403` en `/users`.
- Admin puede listar usuarios.
- Admin cambia rol de otro usuario.
- Admin puede listar todas las tareas.
