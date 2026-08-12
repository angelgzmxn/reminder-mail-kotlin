# Plan: Migracion Kotlin - Spring Boot + SQLite en Memoria + JWT

## Contexto

Este repositorio es la version Kotlin del backend de tareas. La migracion se hara por features, usando el proyecto Python/FastAPI como referencia funcional, pero implementando la arquitectura con Spring Boot, Kotlin, Spring Web MVC, Spring Data JPA, Spring Security y una base SQLite en memoria para desarrollo.

Cada feature debe vivir en su propia rama, subirse a GitHub y luego mezclarse a `main` cuando compile y cumpla el alcance del documento correspondiente.

## Stack objetivo

- Kotlin 2.3.x
- Java 21
- Spring Boot 4.x
- Spring Web MVC
- Spring Data JPA
- Spring Security
- SQLite JDBC en memoria
- Hibernate Community Dialects para soporte SQLite
- JWT con `jjwt`
- BCrypt para passwords
- Gradle Kotlin DSL

## Paquete base

```text
co.edu.unibarranquilla.taskserverkotlin
```

## Estructura objetivo

```text
src/main/kotlin/co/edu/unibarranquilla/taskserverkotlin/
├── TaskServerKotlinApplication.kt
├── config/
│   ├── DatabaseConfig.kt
│   ├── SecurityConfig.kt
│   └── JwtAuthenticationFilter.kt
├── controller/
│   ├── AuthController.kt
│   ├── TaskController.kt
│   └── UserController.kt
├── dto/
│   ├── auth/
│   ├── task/
│   └── user/
├── exception/
│   ├── ApiException.kt
│   └── GlobalExceptionHandler.kt
├── model/
│   ├── Task.kt
│   ├── TaskPriority.kt
│   ├── TaskStatus.kt
│   ├── User.kt
│   └── UserRole.kt
├── repository/
│   ├── TaskRepository.kt
│   └── UserRepository.kt
├── service/
│   ├── AuthService.kt
│   ├── JwtService.kt
│   ├── TaskService.kt
│   └── UserService.kt
    ├── util/
    │   └── PasswordValidator.kt
    └── config/OpenApiConfig.kt
```

## Ramas de desarrollo

1. `feature/base-setup`
   - Dependencias Gradle, configuracion de SQLite en memoria, perfiles, health endpoint y estructura de paquetes.

2. `feature/register`
   - Registro de usuarios con entidad `User`, repository, DTOs, servicio, BCrypt y `POST /auth/register`.

3. `feature/login`
   - Login con JWT, configuracion de Spring Security, filtro de autenticacion y `POST /auth/login`.

4. `feature/todos`
   - CRUD de tareas protegido por token, entidad `Task`, reglas de dueno y transiciones de estado.

5. `feature/profile`
   - Ver y actualizar perfil del usuario autenticado.

6. `feature/change-password`
   - Cambio de contrasena validando la contrasena actual.

7. `feature/roles`
   - Rol `ADMIN`, endpoints administrativos y autorizacion por rol.

8. `feature/cross-cutting`
    - Manejo centralizado de errores, respuestas consistentes y logging.

9. `feature/swagger-docs`
    - Documentacion automatica OpenAPI/Swagger con esquema Bearer JWT.

## Flujo Git por feature

```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-feature

# implementar, probar y commitear

git push -u origin feature/nombre-feature
git checkout main
git merge --no-ff feature/nombre-feature
git push origin main
```

## Criterios generales de aceptacion

- El proyecto compila con `./gradlew build`.
- Los endpoints respetan las rutas definidas en `REQUERIMIENTOS.md`.
- Las capas se mantienen separadas: controller, service, repository, model y dto.
- Los services contienen reglas de negocio, no detalles HTTP.
- Los controllers traducen HTTP request/response y delegan al service.
- No se suben secretos reales; solo ejemplos seguros.
- Cada feature debe dejar pruebas o, al menos, verificacion manual documentable.
- La base SQLite en memoria se reinicia al arrancar la aplicacion; para produccion se podra cambiar a una base persistente sin cambiar las capas de negocio.
