# Feature 09: Documentacion con Swagger / OpenAPI

## Rama

```bash
feature/swagger-docs
```

## Objetivo

Agregar documentacion interactiva de la API con Springdoc OpenAPI, incluyendo esquema de seguridad Bearer JWT para poder probar endpoints protegidos desde Swagger UI.

## Cambios esperados

### Gradle

Agregar la dependencia:

```kotlin
implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.6")
```

Ajustar la version segun compatibilidad con Spring Boot 4.x y Spring Framework 7.x.

### Seguridad

Permitir acceso publico a los endpoints de Swagger y OpenAPI:

- `/swagger-ui.html`
- `/swagger-ui/**`
- `/v3/api-docs/**`
- `/swagger-resources/**`
- `/webjars/**`

Actualizar `SecurityConfig.kt` para que estas rutas sean `permitAll`.

### Configuracion OpenAPI

Crear `config/OpenApiConfig.kt` con:

- Titulo y version de la API.
- Descripcion.
- Esquema de seguridad `bearerAuth` tipo HTTP con formato JWT.
- Requerimiento de seguridad global para endpoints protegidos.

### Acceso

Una vez arrancada la aplicacion:

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## Archivo por archivo

### 1. `build.gradle.kts`

```kotlin
dependencies {
    // ... dependencias existentes ...

    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.6")
}
```

Explicacion:

`springdoc-openapi-starter-webmvc-ui` genera automaticamente la documentacion OpenAPI 3 a partir de los controllers de Spring Web MVC e incluye la interfaz Swagger UI.

### 2. `config/SecurityConfig.kt`

```kotlin
.authorizeHttpRequests {
    it.requestMatchers(HttpMethod.GET, "/").permitAll()
    it.requestMatchers(HttpMethod.POST, "/auth/register").permitAll()
    it.requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
    it.requestMatchers(
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/swagger-resources/**",
        "/webjars/**"
    ).permitAll()
    it.requestMatchers(HttpMethod.GET, "/users").hasRole("ADMIN")
    it.requestMatchers(HttpMethod.PUT, "/users/*/role").hasRole("ADMIN")
    it.requestMatchers(HttpMethod.GET, "/tasks/all").hasRole("ADMIN")
    it.anyRequest().authenticated()
}
```

Explicacion:

Swagger UI y los documentos OpenAPI deben ser publicos para que desarrolladores y probadores puedan consultarlos sin autenticacion. Las demas rutas mantienen su proteccion.

### 3. `config/OpenApiConfig.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {

    @Bean
    fun customOpenAPI(): OpenAPI {
        val bearerSchemeName = "bearerAuth"

        return OpenAPI()
            .info(
                Info()
                    .title("Task Server Kotlin API")
                    .version("1.0.0")
                    .description("API REST para gestion de usuarios y tareas con autenticacion JWT")
            )
            .addSecurityItem(SecurityRequirement().addList(bearerSchemeName))
            .components(
                Components().addSecuritySchemes(
                    bearerSchemeName,
                    SecurityScheme()
                        .name(bearerSchemeName)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                    )
            )
    }
}
```

Explicacion:

- `OpenAPI` configura la metadata general de la API.
- `addSecurityItem` aplica el requerimiento de seguridad a todos los endpoints por defecto.
- `SecurityScheme` define el esquema Bearer JWT. Swagger UI mostrara un boton "Authorize" para ingresar el token.

## Verificacion

- `./gradlew build -x test` compila exitosamente.
- Arrancar la app.
- Abrir `http://localhost:8080/swagger-ui.html` y confirmar que carga.
- Abrir `http://localhost:8080/v3/api-docs` y confirmar que devuelve JSON con `info.title` y `paths`.
- Hacer login, copiar el token y usar "Authorize" en Swagger UI.
- Probar un endpoint protegido (por ejemplo `GET /users/me`) desde Swagger UI.
