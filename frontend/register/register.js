document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('form-register');

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const userData = {
            fullName: fullName,
            email: email,
            password: password
        };

        try {
            const response = await fetch('http://localhost:8080/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                alert('¡Registro exitoso!');
                window.location.href = '../login/login.html';
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(`Error en el registro: ${errorData.message || 'Datos inválidos o correo ya registrado.'}`);
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('No se pudo conectar con el servidor.');
        }
    });

    const toRegisterBtn = document.getElementById('tologin');
    if (toRegisterBtn) {
        toRegisterBtn.addEventListener('click', () => {
            window.location.href = '../login/login.html';
        });
    }
});