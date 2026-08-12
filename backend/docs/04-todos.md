# Feature 04: CRUD de Tareas en Kotlin

## Rama

```bash
feature/todos
```

## Objetivo

Implementar tareas protegidas por JWT. Cada usuario solo puede ver y modificar sus propias tareas.

## Endpoints

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| GET | `/tasks` | Listar mis tareas |
| POST | `/tasks` | Crear tarea |
| GET | `/tasks/{id}` | Ver mi tarea |
| PUT | `/tasks/{id}` | Actualizar mi tarea |
| DELETE | `/tasks/{id}` | Eliminar mi tarea |

Todos requieren token.

## Modelo Task

Crear `model/Task.kt`.

Campos:

- `id: Long?`
- `title: String`
- `description: String?`
- `status: TaskStatus`
- `priority: TaskPriority`
- `owner: User`
- `createdAt: LocalDateTime`
- `updatedAt: LocalDateTime`

Enums:

```kotlin
enum class TaskStatus {
    PENDING,
    IN_PROGRESS,
    DONE
}

enum class TaskPriority {
    LOW,
    MEDIUM,
    HIGH
}
```

Relacion:

- `@ManyToOne(fetch = FetchType.LAZY)`
- `@JoinColumn(name = "user_id", nullable = false)`

## DTOs

Crear en `dto/task`:

- `TaskCreateRequest`
- `TaskUpdateRequest`
- `TaskResponse`

Reglas:

- `title` obligatorio.
- `description` opcional.
- `priority` obligatorio al crear.
- `status` se inicializa en `PENDING` al crear.

## Repository

Crear `repository/TaskRepository.kt`.

Metodos:

- `findAllByOwnerId(ownerId: Long): List<Task>`
- `findByIdAndOwnerId(id: Long, ownerId: Long): Task?`

## Service

Crear `service/TaskService.kt`.

Responsabilidades:

- Crear tareas para el usuario autenticado.
- Listar solo tareas del usuario autenticado.
- Buscar por `id` y `ownerId`.
- Actualizar campos permitidos.
- Eliminar solo si pertenece al usuario.
- Validar transicion de estado.

Regla de estado:

```text
PENDING -> IN_PROGRESS permitido
IN_PROGRESS -> DONE permitido
PENDING -> DONE no permitido
DONE -> PENDING no permitido
```

## Controller

Crear `controller/TaskController.kt`.

Obtener usuario autenticado desde `Authentication`.

## Errores esperados

- `401 Unauthorized` si no hay token.
- `404 Not Found` si la tarea no existe o no pertenece al usuario.
- `400 Bad Request` para transicion invalida.

## Archivo por archivo

### 1. `model/TaskStatus.kt` y `TaskPriority.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.model

enum class TaskStatus {
    PENDING,
    IN_PROGRESS,
    DONE
}

enum class TaskPriority {
    LOW,
    MEDIUM,
    HIGH
}
```

Explicacion:

Los enums hacen que los estados y prioridades sean valores cerrados. La regla de transicion se implementa en el service, no en el enum.

### 2. `model/Task.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "tasks")
class Task(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false)
    var title: String,

    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: TaskStatus = TaskStatus.PENDING,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var priority: TaskPriority,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var owner: User,

    @Column(nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
```

Explicacion:

`Task` pertenece a un `User`. La relacion `ManyToOne` permite que un usuario tenga muchas tareas y cada tarea tenga un solo dueno.

- `@Column(nullable = false)` en `createdAt` y `updatedAt` asegura que la base de datos exija esos valores.
- `status` inicia en `PENDING` por defecto.
- `description` es opcional (`String?`).

### 3. DTOs de tarea

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.task

import co.edu.unibarranquilla.taskserverkotlin.model.TaskPriority
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull

data class TaskCreateRequest(
    @field:NotBlank val title: String,
    val description: String?,
    @field:NotNull val priority: TaskPriority
)
```

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.task

import co.edu.unibarranquilla.taskserverkotlin.model.TaskPriority
import co.edu.unibarranquilla.taskserverkotlin.model.TaskStatus

data class TaskUpdateRequest(
    val title: String?,
    val description: String?,
    val status: TaskStatus?,
    val priority: TaskPriority?
)
```

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.task

import co.edu.unibarranquilla.taskserverkotlin.model.TaskPriority
import co.edu.unibarranquilla.taskserverkotlin.model.TaskStatus
import java.time.LocalDateTime

data class TaskResponse(
    val id: Long,
    val title: String,
    val description: String?,
    val status: TaskStatus,
    val priority: TaskPriority,
    val userId: Long,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)
```

Explicacion:

Crear y actualizar no usan el mismo contrato. Al crear, `title` y `priority` son obligatorios; al actualizar, todos los campos pueden ser opcionales.

### 4. `repository/TaskRepository.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.repository

import co.edu.unibarranquilla.taskserverkotlin.model.Task
import org.springframework.data.jpa.repository.JpaRepository

interface TaskRepository : JpaRepository<Task, Long> {
    fun findAllByOwnerId(ownerId: Long): List<Task>
    fun findByIdAndOwnerId(id: Long, ownerId: Long): Task?
}
```

Explicacion:

Buscar por `id` y `ownerId` evita traer una tarea de otro usuario por accidente. Esta decision refuerza seguridad desde la capa de datos.

### 5. `service/TaskService.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.service

import co.edu.unibarranquilla.taskserverkotlin.dto.task.TaskCreateRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.task.TaskResponse
import co.edu.unibarranquilla.taskserverkotlin.dto.task.TaskUpdateRequest
import co.edu.unibarranquilla.taskserverkotlin.exception.InvalidCredentialsException
import co.edu.unibarranquilla.taskserverkotlin.exception.InvalidStatusTransitionException
import co.edu.unibarranquilla.taskserverkotlin.exception.ResourceNotFoundException
import co.edu.unibarranquilla.taskserverkotlin.model.Task
import co.edu.unibarranquilla.taskserverkotlin.model.TaskStatus
import co.edu.unibarranquilla.taskserverkotlin.repository.TaskRepository
import co.edu.unibarranquilla.taskserverkotlin.repository.UserRepository
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class TaskService(
    private val taskRepository: TaskRepository,
    private val userRepository: UserRepository
) {

    fun createTask(ownerEmail: String, request: TaskCreateRequest): TaskResponse {
        val owner = findUserByEmail(ownerEmail)
        val task = Task(
            title = request.title,
            description = request.description,
            priority = request.priority,
            owner = owner
        )
        return taskRepository.save(task).toResponse()
    }

    fun getTasks(ownerEmail: String): List<TaskResponse> {
        val owner = findUserByEmail(ownerEmail)
        return taskRepository.findAllByOwnerId(requireNotNull(owner.id)).map { it.toResponse() }
    }

    fun getTask(id: Long, ownerEmail: String): TaskResponse {
        val owner = findUserByEmail(ownerEmail)
        val task = taskRepository.findByIdAndOwnerId(id, requireNotNull(owner.id))
            ?: throw ResourceNotFoundException("Task not found")
        return task.toResponse()
    }

    fun updateTask(id: Long, ownerEmail: String, request: TaskUpdateRequest): TaskResponse {
        val owner = findUserByEmail(ownerEmail)
        val task = taskRepository.findByIdAndOwnerId(id, requireNotNull(owner.id))
            ?: throw ResourceNotFoundException("Task not found")

        request.status?.let { validateStatusTransition(task.status, it) }

        request.title?.let { task.title = it }
        task.description = request.description ?: task.description
        request.priority?.let { task.priority = it }
        request.status?.let { task.status = it }
        task.updatedAt = LocalDateTime.now()

        return taskRepository.save(task).toResponse()
    }

    fun deleteTask(id: Long, ownerEmail: String) {
        val owner = findUserByEmail(ownerEmail)
        val task = taskRepository.findByIdAndOwnerId(id, requireNotNull(owner.id))
            ?: throw ResourceNotFoundException("Task not found")
        taskRepository.delete(task)
    }

    fun getAllTasks(): List<TaskResponse> {
        return taskRepository.findAll().map { it.toResponse() }
    }

    private fun findUserByEmail(email: String) =
        userRepository.findByEmail(email)
            ?: throw InvalidCredentialsException("User not found")

    private fun validateStatusTransition(current: TaskStatus, next: TaskStatus) {
        if (current == next) return

        val allowed = when (current) {
            TaskStatus.PENDING -> next == TaskStatus.IN_PROGRESS
            TaskStatus.IN_PROGRESS -> next == TaskStatus.DONE
            TaskStatus.DONE -> false
        }

        if (!allowed) {
            throw InvalidStatusTransitionException("Invalid task status transition")
        }
    }

    private fun Task.toResponse(): TaskResponse {
        return TaskResponse(
            id = requireNotNull(id),
            title = title,
            description = description,
            status = status,
            priority = priority,
            userId = requireNotNull(owner.id),
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
}
```

Explicacion:

El service aplica las reglas de negocio: solo el dueno modifica su tarea y no se permiten transiciones invalidas.

- Se usa `ResourceNotFoundException` en lugar de `IllegalArgumentException` para recursos que no existen.
- Se usa `InvalidStatusTransitionException` cuando se viola el flujo de estados.
- `getAllTasks()` se agrega aqui porque pertenece al dominio de tareas, aunque solo se expone como endpoint administrativo en `feature/roles`.

### 6. Regla de transicion

```kotlin
private fun validateStatusTransition(current: TaskStatus, next: TaskStatus) {
    if (current == next) return

    val allowed = when (current) {
        TaskStatus.PENDING -> next == TaskStatus.IN_PROGRESS
        TaskStatus.IN_PROGRESS -> next == TaskStatus.DONE
        TaskStatus.DONE -> false
    }

    if (!allowed) {
        throw InvalidStatusTransitionException("Invalid task status transition")
    }
}
```

Explicacion:

Esta regla vive en service porque es politica de negocio. Si manana cambia el flujo de estados, se modifica aqui.

### 7. `controller/TaskController.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.controller

import co.edu.unibarranquilla.taskserverkotlin.dto.task.TaskCreateRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.task.TaskResponse
import co.edu.unibarranquilla.taskserverkotlin.dto.task.TaskUpdateRequest
import co.edu.unibarranquilla.taskserverkotlin.service.TaskService
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
@RequestMapping("/tasks")
class TaskController(private val taskService: TaskService) {

    @PostMapping
    fun create(
        @Valid @RequestBody request: TaskCreateRequest,
        authentication: Authentication
    ): ResponseEntity<TaskResponse> {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(taskService.createTask(authentication.name, request))
    }

    @GetMapping
    fun list(authentication: Authentication): List<TaskResponse> {
        return taskService.getTasks(authentication.name)
    }

    @GetMapping("/{id}")
    fun get(@PathVariable id: Long, authentication: Authentication): TaskResponse {
        return taskService.getTask(id, authentication.name)
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: Long,
        @RequestBody request: TaskUpdateRequest,
        authentication: Authentication
    ): TaskResponse {
        return taskService.updateTask(id, authentication.name, request)
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long, authentication: Authentication): ResponseEntity<Void> {
        taskService.deleteTask(id, authentication.name)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/all")
    fun listAll(): List<TaskResponse> {
        return taskService.getAllTasks()
    }
}
```

Explicacion:

`authentication.name` contiene el email extraido del JWT. El controller no busca usuarios ni valida ownership; delega eso al service.

- `create` usa `@Valid` porque `TaskCreateRequest` tiene campos obligatorios.
- `update` no usa `@Valid` porque todos los campos de `TaskUpdateRequest` son opcionales.
- `listAll` se expone como endpoint en el controller, aunque Spring Security lo protegera con `hasRole("ADMIN")` en `feature/roles`.

## Verificacion

- Usuario A crea tarea.
- Usuario B no puede verla por id.
- Usuario A actualiza de `PENDING` a `IN_PROGRESS`.
- Usuario A intenta pasar de `PENDING` a `DONE` y recibe error.
