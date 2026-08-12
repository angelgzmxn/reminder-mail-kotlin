package co.edu.unibarranquilla.taskserverkotlin.service

import co.edu.unibarranquilla.taskserverkotlin.dto.user.ChangePasswordRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.user.UpdateProfileRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.user.UpdateUserRoleRequest
import co.edu.unibarranquilla.taskserverkotlin.dto.user.UserResponse
import co.edu.unibarranquilla.taskserverkotlin.exception.DuplicateResourceException
import co.edu.unibarranquilla.taskserverkotlin.exception.InvalidCredentialsException
import co.edu.unibarranquilla.taskserverkotlin.exception.InvalidRequestException
import co.edu.unibarranquilla.taskserverkotlin.exception.ResourceNotFoundException
import co.edu.unibarranquilla.taskserverkotlin.model.User
import co.edu.unibarranquilla.taskserverkotlin.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
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

    fun changePassword(currentEmail: String, request: ChangePasswordRequest) {
        val user = findUserByEmail(currentEmail)

        if (!passwordEncoder.matches(request.currentPassword, user.passwordHash)) {
            throw InvalidRequestException("Current password is invalid")
        }

        user.passwordHash = passwordEncoder.encode(request.newPassword)!!
        userRepository.save(user)
    }

    fun getAllUsers(): List<UserResponse> {
        return userRepository.findAll().map { it.toResponse() }
    }

    fun updateRole(userId: Long, request: UpdateUserRoleRequest): UserResponse {
        val user = userRepository.findById(userId)
            .orElseThrow { ResourceNotFoundException("User not found") }

        user.role = request.role
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
