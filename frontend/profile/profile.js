document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:8080";

    const mensaje = document.getElementById("mensaje");

    const tarjetaPerfil = document.getElementById("tarjeta-perfil");
    const infoNombre = document.getElementById("info-nombre");
    const infoCorreo = document.getElementById("info-correo");
    const infoRol = document.getElementById("info-rol");
    const infoActivo = document.getElementById("info-activo");
    const infoCreado = document.getElementById("info-creado");
    const btnEditarPerfil = document.getElementById("btn-editar-perfil");

    const formPerfil = document.getElementById("form-perfil");
    const perfilNombre = document.getElementById("perfil-nombre");
    const perfilCorreo = document.getElementById("perfil-correo");
    const btnGuardarPerfil = document.getElementById("btn-guardar-perfil");
    const btnCancelarPerfil = document.getElementById("btn-cancelar-perfil");

    const formPassword = document.getElementById("form-password");
    const btnAbrirPassword = document.getElementById("btn-abrir-password");
    const btnCancelarPassword = document.getElementById("btn-cancelar-password");
    const passwordActual = document.getElementById("password-actual");
    const passwordNueva = document.getElementById("password-nueva");
    const passwordConfirmar = document.getElementById("password-confirmar");
    const btnGuardarPassword = document.getElementById("btn-guardar-password");

    const panelAdmin = document.getElementById("panel-admin");
    const listaUsuarios = document.getElementById("lista-usuarios");
    const listaRecordatoriosAdmin = document.getElementById("lista-recordatorios-admin");

    const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

    function mostrarMensaje(texto, tipo = "") {
        mensaje.textContent = texto;
        mensaje.className = `mensaje ${tipo}`;
    }

    function limpiarMensaje() {
        mostrarMensaje("");
    }

    function redirigirALogin() {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("tokenType");
        window.location.href = "../login/login.html";
    }

    async function leerError(response) {
        const texto = await response.text();

        try {
            const error = JSON.parse(texto);
            return error.message || error.error || `Error HTTP ${response.status}`;
        } catch {
            return texto || `Error HTTP ${response.status}`;
        }
    }

    async function authFetch(ruta, opciones = {}) {
        const token = localStorage.getItem("accessToken");

        if (!token) {
            redirigirALogin();
            return null;
        }

        const headers = {
            Authorization: `Bearer ${token}`,
            ...(opciones.headers || {})
        };

        if (opciones.body) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers
        });

        if (response.status === 401 || response.status === 403) {
            mostrarMensaje("Tu sesión expiró o no tienes permisos.", "error");
            redirigirALogin();
            return null;
        }

        return response;
    }

    function formatearFecha(fechaIso) {
        if (!fechaIso) return "-";
        return fechaIso.slice(0, 16).replace("T", " ");
    }

    function mostrarEstadoRecordatorio(status) {
        const etiquetas = { PENDING: "Pendiente", SENT: "Enviado", FAILED: "Falló el envío" };
        return etiquetas[status] || status;
    }

    // ---------- Perfil (ver / editar) ----------

    function pintarPerfil(perfil) {
        infoNombre.textContent = perfil.fullName;
        infoCorreo.textContent = perfil.email;
        infoRol.textContent = perfil.role;
        infoActivo.textContent = perfil.active ? "Activo" : "Inactivo";
        infoCreado.textContent = formatearFecha(perfil.createdAt);

        tarjetaPerfil.classList.remove("oculto");
    }

    function abrirEdicionPerfil(perfil) {
        limpiarMensaje();
        perfilNombre.value = perfil.fullName || "";
        perfilCorreo.value = perfil.email || "";

        tarjetaPerfil.classList.add("oculto");
        formPerfil.classList.remove("oculto");
        perfilNombre.focus();
    }

    function cerrarEdicionPerfil() {
        formPerfil.classList.add("oculto");
        tarjetaPerfil.classList.remove("oculto");
    }

    async function cargarPerfil() {
        try {
            limpiarMensaje();
            const response = await authFetch("/users/me", { method: "GET" });
            if (!response) return null;

            if (!response.ok) {
                mostrarMensaje(await leerError(response), "error");
                return null;
            }

            const perfil = await response.json();
            pintarPerfil(perfil);
            btnEditarPerfil.onclick = () => abrirEdicionPerfil(perfil);

            if (perfil.role === "ADMIN") {
                panelAdmin.classList.remove("oculto");
                await cargarUsuarios();
                await cargarRecordatoriosAdmin();
            } else {
                panelAdmin.classList.add("oculto");
            }

            return perfil;
        } catch (error) {
            console.error(error);
            mostrarMensaje(
                "No fue posible conectar con el backend en http://localhost:8080.",
                "error"
            );
            return null;
        }
    }

    formPerfil.addEventListener("submit", async (event) => {
        event.preventDefault();
        limpiarMensaje();

        const datos = {
            fullName: perfilNombre.value.trim(),
            email: perfilCorreo.value.trim()
        };

        if (!datos.fullName) {
            mostrarMensaje("El nombre es obligatorio.", "error");
            perfilNombre.focus();
            return;
        }

        try {
            btnGuardarPerfil.disabled = true;
            btnGuardarPerfil.textContent = "Guardando...";

            const response = await authFetch("/users/me", {
                method: "PUT",
                body: JSON.stringify(datos)
            });

            if (!response) return;

            if (!response.ok) {
                mostrarMensaje(await leerError(response), "error");
                return;
            }

            cerrarEdicionPerfil();
            mostrarMensaje("Perfil actualizado correctamente.", "exito");
            await cargarPerfil();
        } catch (error) {
            console.error(error);
            mostrarMensaje("No fue posible actualizar el perfil.", "error");
        } finally {
            btnGuardarPerfil.disabled = false;
            btnGuardarPerfil.textContent = "Guardar cambios";
        }
    });

    btnCancelarPerfil.addEventListener("click", cerrarEdicionPerfil);

    // ---------- Cambio de contraseña ----------

    function abrirFormularioPassword() {
        limpiarMensaje();
        formPassword.classList.remove("oculto");
        btnAbrirPassword.classList.add("oculto");
        passwordActual.focus();
    }

    function cerrarFormularioPassword() {
        formPassword.reset();
        formPassword.classList.add("oculto");
        btnAbrirPassword.classList.remove("oculto");
    }

    btnAbrirPassword.addEventListener("click", abrirFormularioPassword);
    btnCancelarPassword.addEventListener("click", cerrarFormularioPassword);

    formPassword.addEventListener("submit", async (event) => {
        event.preventDefault();
        limpiarMensaje();

        if (passwordNueva.value !== passwordConfirmar.value) {
            mostrarMensaje("La nueva contraseña y su confirmación no coinciden.", "error");
            passwordConfirmar.focus();
            return;
        }

        const datos = {
            currentPassword: passwordActual.value,
            newPassword: passwordNueva.value
        };

        try {
            btnGuardarPassword.disabled = true;
            btnGuardarPassword.textContent = "Cambiando...";

            const response = await authFetch("/users/me/change-password", {
                method: "POST",
                body: JSON.stringify(datos)
            });

            if (!response) return;

            if (!response.ok) {
                mostrarMensaje(await leerError(response), "error");
                return;
            }

            cerrarFormularioPassword();
            mostrarMensaje("Contraseña actualizada correctamente.", "exito");
        } catch (error) {
            console.error(error);
            mostrarMensaje("No fue posible cambiar la contraseña.", "error");
        } finally {
            btnGuardarPassword.disabled = false;
            btnGuardarPassword.textContent = "Cambiar contraseña";
        }
    });

    function renderizarUsuarios(usuarios) {
        listaUsuarios.innerHTML = "";

        if (!Array.isArray(usuarios) || usuarios.length === 0) {
            listaUsuarios.innerHTML = '<p class="estado-vacio">No hay usuarios registrados.</p>';
            return;
        }

        usuarios.forEach((usuario) => {
            const fila = document.createElement("div");
            fila.className = "fila-admin";

            const info = document.createElement("div");
            info.className = "info-admin";
            info.innerHTML = `
                <strong>${usuario.fullName}</strong>
                <span>${usuario.email}</span>
                <span>${usuario.active ? "Activo" : "Inactivo"}</span>
            `;

            const selectRol = document.createElement("select");
            ["USER", "ADMIN"].forEach((rol) => {
                const opcion = document.createElement("option");
                opcion.value = rol;
                opcion.textContent = rol;
                opcion.selected = rol === usuario.role;
                selectRol.appendChild(opcion);
            });

            const btnGuardarRol = document.createElement("button");
            btnGuardarRol.type = "button";
            btnGuardarRol.className = "btn-accion btn-editar";
            btnGuardarRol.textContent = "Guardar rol";
            btnGuardarRol.addEventListener("click", () => actualizarRol(usuario.id, selectRol.value));

            fila.append(info, selectRol, btnGuardarRol);
            listaUsuarios.appendChild(fila);
        });
    }

    async function cargarUsuarios() {
        const response = await authFetch("/users", { method: "GET" });
        if (!response) return;

        if (!response.ok) {
            mostrarMensaje(await leerError(response), "error");
            return;
        }

        renderizarUsuarios(await response.json());
    }

    async function actualizarRol(id, nuevoRol) {
        try {
            const response = await authFetch(`/users/${id}/role`, {
                method: "PUT",
                body: JSON.stringify({ role: nuevoRol })
            });

            if (!response) return;

            if (!response.ok) {
                mostrarMensaje(await leerError(response), "error");
                return;
            }

            mostrarMensaje("Rol actualizado correctamente.", "exito");
            await cargarUsuarios();
        } catch (error) {
            console.error(error);
            mostrarMensaje("No fue posible actualizar el rol.", "error");
        }
    }

    function renderizarRecordatoriosAdmin(recordatorios) {
        listaRecordatoriosAdmin.innerHTML = "";

        if (!Array.isArray(recordatorios) || recordatorios.length === 0) {
            listaRecordatoriosAdmin.innerHTML = '<p class="estado-vacio">No hay recordatorios en el sistema.</p>';
            return;
        }

        recordatorios.forEach((recordatorio) => {
            const fila = document.createElement("div");
            fila.className = "fila-admin";
            fila.innerHTML = `
                <div class="info-admin">
                    <strong>${recordatorio.title}</strong>
                    <span>Usuario #${recordatorio.userId}</span>
                    <span>Programado: ${formatearFecha(recordatorio.scheduledAt)}</span>
                    <span>Estado: ${mostrarEstadoRecordatorio(recordatorio.status)}</span>
                </div>
            `;
            listaRecordatoriosAdmin.appendChild(fila);
        });
    }

    async function cargarRecordatoriosAdmin() {
        const response = await authFetch("/reminders/all", { method: "GET" });
        if (!response) return;

        if (!response.ok) {
            mostrarMensaje(await leerError(response), "error");
            return;
        }

        renderizarRecordatoriosAdmin(await response.json());
    }

    // ---------- Cerrar sesión ----------

    btnCerrarSesion.addEventListener("click", redirigirALogin);

    cargarPerfil();
});