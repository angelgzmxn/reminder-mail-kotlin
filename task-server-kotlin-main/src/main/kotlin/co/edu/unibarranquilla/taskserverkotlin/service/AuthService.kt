package co.edu.unibarranquilla.taskserverkotlin.service

import co.edu.unibarranquilla.taskserverkotlin.dto.auth.LoginRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.auth.RegisterRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.auth.TokenResponse
import co.edu.unibarranquilla.taskserverkotlin.dto.user.UserResponse
import co.edu.unibarranquilla.taskserverkotlin.exception.DuplicateResourceException
import co.edu.unibarranquilla.taskserverkotlin.exception.InvalidCredentialsException
import co.edu.unibarranquilla.taskserverkotlin.model.User
import co.edu.unibarranquilla.taskserverkotlin.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService
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
