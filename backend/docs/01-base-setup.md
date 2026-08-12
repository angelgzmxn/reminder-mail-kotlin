# Feature 01: Base Setup en Kotlin

## Rama

```bash
feature/base-setup
```

## Objetivo

Preparar el proyecto Spring Boot para soportar SQLite en memoria, JPA, validaciones, seguridad futura y una arquitectura por capas. Esta feature no implementa autenticacion ni tareas todavia; solo deja los cimientos.

## Cambios esperados

### Gradle

Agregar dependencias:

- `spring-boot-starter-data-jpa`
- `spring-boot-starter-validation`
- `spring-boot-starter-security`
- `org.xerial:sqlite-jdbc:3.47.2.0`
- `org.hibernate.orm:hibernate-community-dialects`
- `jjwt-api:0.12.6`, `jjwt-impl:0.12.6`, `jjwt-jackson:0.12.6`
- `spring-boot-devtools`
- Dependencias de test

Mantener:

- `spring-boot-starter-webmvc`
- `jackson-module-kotlin`
- `kotlin-reflect`

### Configuracion

Crear `src/main/resources/application.yml`.

Variables:

```yaml
spring:
  application:
    name: TaskServerKotlin
  datasource:
    url: jdbc:sqlite:file:task_server_kotlin?mode=memory&cache=shared
    driver-class-name: org.sqlite.JDBC
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.community.dialect.SQLiteDialect
        format_sql: true

app:
  jwt:
    secret: ${JWT_SECRET:this-is-a-dev-secret-must-be-at-least-32-bytes}
    expiration-minutes: ${JWT_EXPIRATION_MINUTES:30}
```

Crear `.env.example` solo con variables de JWT, porque SQLite en memoria no necesita credenciales locales:

```env
JWT_SECRET=this-is-a-dev-secret-must-be-at-least-32-bytes
JWT_EXPIRATION_MINUTES=30
```

El secreto por defecto debe tener al menos 32 bytes (256 bits) para que jjwt no lance `WeakKeyException`.

### Paquetes base

Crear estos paquetes vacios o con clases base segun aplique:

- `config`
- `controller`
- `dto`
- `exception`
- `model`
- `repository`
- `service`
- `util`

### Endpoint de salud

Crear un controller simple:

- `GET /`
- Respuesta: `{ "message": "Task Server Kotlin API" }`

Esto permite confirmar que la aplicacion arranca antes de agregar features complejas.

## Archivos sugeridos

- `build.gradle.kts`
- `.env.example`
- `src/main/resources/application.yml`
- `src/main/kotlin/.../controller/HealthController.kt`

## Archivo por archivo

### 1. `build.gradle.kts` - Dependencias del proyecto

En esta feature se prepara Gradle para que el proyecto pueda hablar HTTP, validar requests, usar JPA, crear tokens JWT y conectarse a SQLite en memoria.

```kotlin
plugins {
    kotlin("jvm") version "2.3.21"
    kotlin("plugin.spring") version "2.3.21"
    kotlin("plugin.jpa") version "2.3.21"
    id("org.springframework.boot") version "4.1.0"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "co.edu.unibarranquilla"
version = "0.0.1-SNAPSHOT"
description = "TaskServerKotlin"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")

    implementation("org.hibernate.orm:hibernate-community-dialects")
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
    runtimeOnly("org.xerial:sqlite-jdbc:3.47.2.0")

    developmentOnly("org.springframework.boot:spring-boot-devtools")

    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=warn")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

Explicacion:

- `spring-boot-starter-webmvc`: permite crear controllers REST con `@RestController`.
- `spring-boot-starter-data-jpa`: agrega JPA/Hibernate para mapear clases Kotlin a tablas.
- `spring-boot-starter-validation`: habilita anotaciones como `@NotBlank`, `@Email` y `@Size`.
- `spring-boot-starter-security`: deja lista la base para login, JWT y roles.
- `sqlite-jdbc`: driver JDBC que conecta Spring con SQLite.
- `hibernate-community-dialects`: incluye `SQLiteDialect`, necesario porque SQLite no es dialecto core de Hibernate.
- `jjwt-*`: librerias para crear y validar tokens JWT en la feature de login.
- `freeCompilerArgs.addAll("-Xjsr305=warn")`: evita que librerias Java sin anotaciones de nullability (como Spring Security) generen errores de compilacion por tipos vistos como nullable. Con `warn` se mantiene la compatibilidad sin ser demasiado permisivo.

### 2. `application.yml` - Configuracion de la aplicacion

```yaml
spring:
  application:
    name: TaskServerKotlin
  datasource:
    url: jdbc:sqlite:file:task_server_kotlin?mode=memory&cache=shared
    driver-class-name: org.sqlite.JDBC
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.community.dialect.SQLiteDialect
        format_sql: true

app:
  jwt:
    secret: ${JWT_SECRET:this-is-a-dev-secret-must-be-at-least-32-bytes}
    expiration-minutes: ${JWT_EXPIRATION_MINUTES:30}
```

Explicacion:

- `jdbc:sqlite:file:task_server_kotlin?mode=memory&cache=shared` crea una base SQLite en memoria compartida por las conexiones de la app.
- `ddl-auto: create-drop` hace que Hibernate cree las tablas al arrancar y las elimine al apagar.
- `show-sql: true` ayuda a aprender viendo las consultas SQL en consola.
- `app.jwt.*` no lo usa esta feature todavia, pero deja listas las propiedades para login. El secreto por defecto debe medir al menos 32 bytes; de lo contrario `jjwt` rechazara la clave al firmar tokens.

### 3. `.env.example` - Variables externas

```env
JWT_SECRET=this-is-a-dev-secret-must-be-at-least-32-bytes
JWT_EXPIRATION_MINUTES=30
```

Explicacion:

El repo no debe guardar secretos reales. Como SQLite en memoria no necesita usuario ni password, por ahora solo documentamos variables de JWT.

### 4. `HealthController.kt` - Primer endpoint

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController {

    @GetMapping("/")
    fun home(): Map<String, String> {
        return mapOf("message" to "Task Server Kotlin API")
    }
}
```

Explicacion:

- `@RestController` indica que la clase expone endpoints HTTP y devuelve JSON.
- `@GetMapping("/")` atiende requests `GET /`.
- `Map<String, String>` se serializa automaticamente como JSON gracias a Jackson.

### 5. Paquetes base - Arquitectura en capas

Los paquetes se crean desde el inicio para que cada feature tenga un lugar claro:

- `controller`: entrada HTTP, status codes y request/response.
- `service`: reglas de negocio.
- `repository`: acceso a datos.
- `model`: entidades JPA.
- `dto`: objetos de entrada/salida de la API.
- `config`: configuracion de Spring, seguridad y filtros.
- `exception`: errores de dominio y handler global.
- `util`: helpers sin estado de negocio propio.

La regla principal: el controller no debe hacer queries y el repository no debe conocer reglas HTTP.

## Verificacion

- `./gradlew build`
- Arrancar la app.
- Abrir `GET /` y confirmar respuesta JSON.
- Confirmar que la app crea tablas en memoria al arrancar.
- Revisar en logs las sentencias SQL generadas por Hibernate.
- Recordar que los datos se pierden al reiniciar la aplicacion.
