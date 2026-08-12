document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('form-login');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:8080/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('tokenType', data.tokenType);

                alert('¡Bienvenido!');
                window.location.href = '../reminders/reminders.html';
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(`Error al iniciar sesión: ${errorData.message || 'Credenciales inválidas.'}`);
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('No se pudo conectar con el servidor. Verifica que tu backend esté encendido.');
        }
    });

    const toRegisterBtn = document.getElementById('toregister');
    if (toRegisterBtn) {
        toRegisterBtn.addEventListener('click', () => {
            window.location.href = '../register/register.html';
        });
    }
});
