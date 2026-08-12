# Feature 03: Login y JWT en Kotlin

## Rama

```bash
feature/login
```

## Objetivo

Permitir inicio de sesion con email y contrasena, emitir JWT y preparar Spring Security para proteger endpoints futuros.

## Endpoint

```http
POST /auth/login
```

Request:

```json
{
  "email": "ana@taskflow.com",
  "password": "Secret123"
}
```

Response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 1800
}
```

## DTOs

Crear:

- `dto/auth/LoginRequest`
- `dto/auth/TokenResponse`

## JwtService

Crear `service/JwtService.kt`.

Responsabilidades:

- Generar token con subject = email.
- Incluir claim `role`.
- Leer secreto y expiracion desde propiedades `app.jwt`.
- Validar expiracion y firma.
- Extraer email del token.

## Spring Security

Actualizar:

- `config/SecurityConfig.kt`
- Crear `config/JwtAuthenticationFilter.kt`

Configurar:

- CSRF deshabilitado para API stateless.
- Sesion stateless.
- Rutas publicas: `/`, `/auth/register`, `/auth/login`.
- Resto de rutas autenticadas.
- `PasswordEncoder` como bean `BCryptPasswordEncoder`.
- Agregar filtro JWT antes de `UsernamePasswordAuthenticationFilter`.

## AuthService

Agregar metodo `login`.

Flujo:

1. Buscar usuario por email (normalizado).
2. Validar que exista y este activo.
3. Comparar password plano con hash usando `PasswordEncoder.matches`.
4. Crear JWT.
5. Devolver `TokenResponse`.

## UserDetails

El filtro JWT crea un `UsernamePasswordAuthenticationToken` con authorities desde el rol del usuario. No se usa `UserDetailsService` para mantener la solucion simple y legible.

## Errores esperados

- `401 Unauthorized` para credenciales invalidas.
- `401 Unauthorized` para usuario inactivo.
- `401 Unauthorized` para token invalido o expirado.

## Archivo por archivo

### 1. `dto/auth/LoginRequest.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.auth

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class LoginRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    @field:NotBlank
    val password: String
)
```

Explicacion:

Este DTO representa las credenciales que llegan al endpoint. No se reutiliza `RegisterRequest` porque login no necesita `fullName`.

### 2. `dto/auth/TokenResponse.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.dto.auth

data class TokenResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long
)
```

Explicacion:

La API devuelve el token y metadata minima para que el cliente sepa como enviarlo: `Authorization: Bearer <token>`.

### 3. `service/JwtService.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.service

import co.edu.unibarranquilla.taskserverkotlin.model.User
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date
import javax.crypto.SecretKey

@Service
class JwtService(
    @param:Value("\${app.jwt.secret}") private val secret: String,
    @param:Value("\${app.jwt.expiration-minutes}") val expirationMinutes: Long
) {

    private val signingKey: SecretKey by lazy {
        Keys.hmacShaKeyFor(secret.toByteArray(Charsets.UTF_8))
    }

    fun generateToken(user: User): String {
        val now = Date()
        val expiration = Date(now.time + expirationMinutes * 60_000)

        return Jwts.builder()
            .subject(user.email)
            .claim("role", user.role.name)
            .issuedAt(now)
            .expiration(expiration)
            .signWith(signingKey)
            .compact()
    }

    fun extractEmail(token: String): String? {
        return extractAllClaims(token)?.subject
    }

    fun isTokenValid(token: String): Boolean {
        return try {
            extractAllClaims(token) != null && !isTokenExpired(token)
        } catch (ex: Exception) {
            false
        }
    }

    private fun isTokenExpired(token: String): Boolean {
        val expiration = extractAllClaims(token)?.expiration ?: return true
        return expiration.before(Date())
    }

    private fun extractAllClaims(token: String): Claims? {
        return try {
            Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .payload
        } catch (ex: Exception) {
            null
        }
    }
}
```

Explicacion:

`JwtService` encapsula todo lo relacionado con tokens. El resto del sistema no debe saber como se firma un JWT ni que libreria se usa.

- `@param:Value` lee las propiedades de `application.yml`. Se usa `@param:` para evitar advertencias del compilador de Kotlin sobre el target de la anotacion.
- `signingKey` se construye con `Keys.hmacShaKeyFor`. Requiere un secreto de al menos 32 bytes.
- `extractAllClaims` devuelve `null` (en lugar de lanzar excepcion) cuando el token es invalido, facilitando la validacion posterior.

### 4. `AuthService.login()`

El servicio de autenticacion recibe `JwtService` por constructor y agrega el metodo `login`:

```kotlin
fun login(request: LoginRequest): TokenResponse {
    val email = request.email.trim().lowercase()
    val user = userRepository.findByEmail(email)
        ?: throw InvalidCredentialsException("Invalid credentials")

    if (!user.active || !passwordEncoder.matches(request.password, user.passwordHash)) {
        throw InvalidCredentialsException("Invalid credentials")
    }

    val token = jwtService.generateToken(user)
    return TokenResponse(
        accessToken = token,
        expiresIn = jwtService.expirationMinutes * 60
    )
}
```

Explicacion:

La regla importante es no revelar si fallo el email o la contrasena. Para ambos casos se responde credenciales invalidas. En `feature/cross-cutting` se cambia `IllegalArgumentException` por `InvalidCredentialsException` para mantener los services libres de HTTP.

### 5. `config/JwtAuthenticationFilter.kt`

```kotlin
package co.edu.unibarranquilla.taskserverkotlin.config

import co.edu.unibarranquilla.taskserverkotlin.repository.UserRepository
import co.edu.unibarranquilla.taskserverkotlin.service.JwtService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthenticationFilter(
    private val jwtService: JwtService,
    private val userRepository: UserRepository
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val header = request.getHeader("Authorization")
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response)
            return
        }

        val token = header.removePrefix("Bearer ").trim()
        val email = jwtService.extractEmail(token)

        if (email != null && jwtService.isTokenValid(token) && SecurityContextHolder.getContext().authentication == null) {
            val user = userRepository.findByEmail(email)
            if (user != null) {
                val authorities = listOf(SimpleGrantedAuthority("ROLE_${user.role.name}"))
                val authentication = UsernamePasswordAuthenticationToken(
                    user.email,
                    null,
                    authorities
                )
                SecurityContextHolder.getContext().authentication = authentication
            }
        }

        filterChain.doFilter(request, response)
    }
}
```

Explicacion:

El filtro corre antes de los controllers. Su trabajo es leer el header, validar el token y llenar el `SecurityContext` para que Spring sepa quien es el usuario autenticado.

- El token se extrae quitando el prefijo `Bearer `.
- Se usa `jwtService.isTokenValid(token)` para verificar firma y expiracion.
- Se crea `UsernamePasswordAuthenticationToken` con el email como principal y `ROLE_X` como authority. Esto prepara el terreno para la autorizacion por roles de `feature/roles`.

### 6. `config/SecurityConfig.kt`

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

La API es stateless: no usa sesion de servidor. Cada request protegido debe traer su token.

- `jwtAuthenticationFilter` se inyecta por constructor y se agrega antes del filtro de autenticacion de usuario/contrasena de Spring.
- `requestMatchers("/auth/login").permitAll()` permite que cualquiera intente iniciar sesion.
- `anyRequest().authenticated()` protege el resto de endpoints.

En `feature/roles` se amplia esta configuracion anadiendo reglas `hasRole("ADMIN")` para endpoints administrativos.

### 7. `controller/AuthController.kt`

El controller agrega el metodo de login:

```kotlin
@PostMapping("/login")
fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<TokenResponse> {
    return ResponseEntity.ok(authService.login(request))
}
```

## Verificacion

- Registrar usuario.
- Hacer login y recibir token.
- Usar token en `Authorization: Bearer <token>` contra una ruta protegida de prueba.
- Probar login con password incorrecto.
