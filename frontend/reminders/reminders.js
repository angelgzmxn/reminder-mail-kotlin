document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:8080";

    const formRecordatorio = document.getElementById("form-recordatorio");
    const listaRecordatorios = document.getElementById("lista-recordatorios");
    const mensaje = document.getElementById("mensaje");

    const btnCrear = document.getElementById("btn-crear-recordatorio");
    const btnCancelar = document.getElementById("btn-cancelar-recordatorio");
    const btnGuardar = document.getElementById("btn-guardar-recordatorio");

    const recordatorioId = document.getElementById("recordatorio-id");
    const titulo = document.getElementById("titulo");
    const mensajeRecordatorio = document.getElementById("mensaje-recordatorio");
    const fechaEnvio = document.getElementById("fecha-envio");

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

    function aFormatoInput(fechaIso) {
        if (!fechaIso) return "";
        return fechaIso.slice(0, 16);
    }

    function mostrarEstado(status) {
        const etiquetas = {
            PENDING: "Pendiente",
            SENT: "Enviado",
            FAILED: "Falló el envío"
        };
        return etiquetas[status] || status;
    }

    function abrirFormulario(recordatorio = null) {
        limpiarMensaje();
        formRecordatorio.classList.remove("oculto");
        listaRecordatorios.classList.add("oculto");
        btnCrear.classList.add("oculto");

        if (recordatorio) {
            recordatorioId.value = recordatorio.id;
            titulo.value = recordatorio.title || "";
            mensajeRecordatorio.value = recordatorio.message || "";
            fechaEnvio.value = aFormatoInput(recordatorio.scheduledAt);
            btnGuardar.textContent = "Actualizar";
        } else {
            formRecordatorio.reset();
            recordatorioId.value = "";
            btnGuardar.textContent = "Guardar";
        }

        titulo.focus();
    }

    function cerrarFormulario() {
        formRecordatorio.reset();
        recordatorioId.value = "";
        btnGuardar.textContent = "Guardar";

        formRecordatorio.classList.add("oculto");
        listaRecordatorios.classList.remove("oculto");
        btnCrear.classList.remove("oculto");
    }

    function crearBoton(texto, clase, accion) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = texto;
        boton.className = `btn-accion ${clase}`;
        boton.addEventListener("click", accion);
        return boton;
    }

    function renderizarRecordatorios(recordatorios) {
        listaRecordatorios.innerHTML = "";

        if (!Array.isArray(recordatorios) || recordatorios.length === 0) {
            const vacio = document.createElement("p");
            vacio.className = "estado-vacio";
            vacio.textContent = "Aún no tienes recordatorios. Crea el primero.";
            listaRecordatorios.appendChild(vacio);
            return;
        }

        recordatorios.forEach((recordatorio) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-recordatorio";

            const informacion = document.createElement("div");
            informacion.className = "info-recordatorio";

            const tituloRecordatorio = document.createElement("h2");
            tituloRecordatorio.textContent = recordatorio.title;

            const mensajeTexto = document.createElement("p");
            mensajeTexto.textContent = recordatorio.message;

            const meta = document.createElement("div");
            meta.className = "meta-recordatorio";
            meta.textContent = `Programado: ${aFormatoInput(recordatorio.scheduledAt).replace("T", " ")} · Estado: ${mostrarEstado(recordatorio.status)}`;

            informacion.append(tituloRecordatorio, mensajeTexto, meta);

            if (recordatorio.sentAt) {
                const enviado = document.createElement("div");
                enviado.className = "meta-recordatorio";
                enviado.textContent = `Enviado: ${aFormatoInput(recordatorio.sentAt).replace("T", " ")}`;
                informacion.append(enviado);
            }

            const acciones = document.createElement("div");
            acciones.className = "acciones-recordatorio";

            // Un recordatorio ya enviado o fallido no se puede editar (el backend lo rechaza con 409).
            if (recordatorio.status === "PENDING") {
                acciones.append(
                    crearBoton("Editar", "btn-editar", () => abrirFormulario(recordatorio))
                );
            }

            acciones.append(
                crearBoton("Eliminar", "btn-borrar", () => eliminarRecordatorio(recordatorio.id))
            );

            tarjeta.append(informacion, acciones);
            listaRecordatorios.appendChild(tarjeta);
        });
    }

    async function cargarRecordatorios() {
        try {
            limpiarMensaje();
            const response = await authFetch("/reminders", { method: "GET" });

            if (!response) return;

            if (!response.ok) {
                mostrarMensaje(await leerError(response), "error");
                return;
            }

            renderizarRecordatorios(await response.json());
        } catch (error) {
            console.error(error);
            mostrarMensaje(
                "No fue posible conectar con el backend en http://localhost:8080.",
                "error"
            );
        }
    }

    async function eliminarRecordatorio(id) {
        const confirmar = window.confirm("¿Deseas eliminar este recordatorio?");
        if (!confirmar) return;

        try {
            const response = await authFetch(`/reminders/${id}`, {
                method: "DELETE"
            });

            if (!response) return;

            if (!response.ok) {
                mostrarMensaje(await leerError(response), "error");
                return;
            }

            mostrarMensaje("Recordatorio eliminado correctamente.", "exito");
            await cargarRecordatorios();
        } catch (error) {
            console.error(error);
            mostrarMensaje("No fue posible eliminar el recordatorio.", "error");
        }
    }

    formRecordatorio.addEventListener("submit", async (event) => {
        event.preventDefault();
        limpiarMensaje();

        const id = recordatorioId.value.trim();
        const datosRecordatorio = {
            title: titulo.value.trim(),
            message: mensajeRecordatorio.value.trim(),
            scheduledAt: fechaEnvio.value
        };

        if (!datosRecordatorio.title) {
            mostrarMensaje("El título es obligatorio.", "error");
            titulo.focus();
            return;
        }

        if (!datosRecordatorio.message) {
            mostrarMensaje("El mensaje es obligatorio.", "error");
            mensajeRecordatorio.focus();
            return;
        }

        if (!datosRecordatorio.scheduledAt) {
            mostrarMensaje("La fecha y hora de envío son obligatorias.", "error");
            fechaEnvio.focus();
            return;
        }

        const esEdicion = Boolean(id);
        const ruta = esEdicion ? `/reminders/${id}` : "/reminders";
        const metodo = esEdicion ? "PUT" : "POST";

        try {
            btnGuardar.disabled = true;
            btnGuardar.textContent = esEdicion ? "Actualizando..." : "Guardando...";

            const response = await authFetch(ruta, {
                method: metodo,
                body: JSON.stringify(datosRecordatorio)
            });

            if (!response) return;

            if (!response.ok) {
                const detalle = await leerError(response);
                console.error("Respuesta del backend:", detalle);
                mostrarMensaje(detalle, "error");
                return;
            }

            cerrarFormulario();
            mostrarMensaje(
                esEdicion
                    ? "Recordatorio actualizado correctamente."
                    : "Recordatorio creado correctamente.",
                "exito"
            );
            await cargarRecordatorios();
        } catch (error) {
            console.error(error);
            mostrarMensaje(
                "No fue posible conectar con el servidor al guardar el recordatorio.",
                "error"
            );
        } finally {
            btnGuardar.disabled = false;

            if (!formRecordatorio.classList.contains("oculto")) {
                btnGuardar.textContent = recordatorioId.value ? "Actualizar" : "Guardar";
            }
        }
    });

    btnCrear.addEventListener("click", () => abrirFormulario());
    btnCancelar.addEventListener("click", cerrarFormulario);

    cargarRecordatorios();
});
