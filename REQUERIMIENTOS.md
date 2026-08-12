# Requerimientos del Backend Kotlin

Objetivo: API REST para gestionar usuarios, autenticacion, recordatorios personales con envio automatico por correo electronico, y administracion por roles.

## Requerimientos funcionales

### RF-01: Registro de usuarios

- Cualquier persona puede registrarse con correo, nombre completo y contraseña.
- El correo debe ser unico.
- La contraseña se almacena hasheada con BCrypt.
- El rol inicial debe ser `USER`.
- Endpoint: `POST /auth/register`.

### RF-02: Inicio de sesion

- El usuario inicia sesion con correo y contraseña.
- Si las credenciales son validas, la API devuelve un token JWT.
- El token debe tener expiracion configurable.
- Endpoint: `POST /auth/login`.

### RF-03: Gestion de recordatorios

Un usuario autenticado puede:

- Crear un recordatorio (titulo, mensaje, fecha y hora de envio).
- Listar sus propios recordatorios.
- Ver el detalle de un recordatorio propio.
- Actualizar un recordatorio propio.
- Eliminar un recordatorio propio.

Un usuario no puede consultar, editar ni eliminar recordatorios de otro usuario.

### RF-04: Estados de recordatorios

Estados permitidos:

- `PENDING`
- `SENT`
- `FAILED`

Regla: un recordatorio se crea siempre en `PENDING`. El cambio a `SENT` o `FAILED` lo realiza unicamente el sistema (RF-05), nunca el usuario de forma manual.

Regla: un recordatorio en estado `SENT` no puede editarse; solo puede consultarse o eliminarse.

### RF-05: Programador de envios (Scheduler)

- El sistema debe revisar periodicamente los recordatorios en estado `PENDING` cuya fecha y hora de envio ya se cumplio.
- La revision debe ejecutarse en un hilo programado independiente (`@Scheduled`), sin bloquear las peticiones HTTP normales.
- El intervalo de revision del poller debe ser configurable.

### RF-06: Notificaciones por correo electronico

- Por cada recordatorio vencido detectado por el scheduler (RF-05), el sistema debe enviar un correo electronico al usuario dueno del recordatorio, con el titulo y el mensaje registrados.
- Si el envio es exitoso, el recordatorio pasa a `SENT` y se registra la fecha/hora real de envio.
- Si el envio falla (por ejemplo, error de conexion con el servidor de correo), el recordatorio pasa a `FAILED` y queda disponible para revision manual.
- El envio se realiza mediante `spring-boot-starter-mail` sobre un servidor SMTP configurable.

### RF-07: Perfil

- El usuario autenticado puede consultar su perfil.
- El usuario autenticado puede editar su nombre y correo.
- Si cambia el correo, debe validarse que no exista otro usuario con ese correo.

### RF-08: Cambio de contraseña

- El usuario autenticado puede cambiar su contraseña.
- Debe enviar contraseña actual y nueva contraseña.
- La contraseña actual debe coincidir con el hash almacenado.

### RF-09: Roles y permisos

Roles:

- `USER`: gestiona sus recordatorios y su perfil.
- `ADMIN`: tambien puede listar usuarios, cambiar roles y consultar todos los recordatorios del sistema.

Un usuario `USER` no debe acceder a endpoints administrativos.

### RF-10: Manejo de errores y documentacion

- Todos los errores de la API deben devolverse en un formato consistente, con `timestamp`, `status`, `error`, `message` y `path`.
- Los errores de negocio (recurso no encontrado, credenciales invalidas, recordatorio ya enviado, etc.) deben mapearse a codigos HTTP apropiados mediante un manejador global de excepciones.
- La API debe exponer documentacion interactiva (Swagger/OpenAPI) con el esquema de autenticacion Bearer JWT, para que cualquier endpoint pueda probarse desde el navegador sin herramientas externas.

## Requerimientos no funcionales

- API JSON.
- SQLite en memoria como base de datos para desarrollo y pruebas locales.
- La persistencia real en SQLite archivo, MySQL o PostgreSQL queda como ajuste futuro de infraestructura si el proyecto pasa a produccion.
- JPA/Hibernate para persistencia.
- Spring Security para autenticacion/autorizacion.
- JWT Bearer tokens.
- Envio de correo mediante `spring-boot-starter-mail` sobre un servidor SMTP configurable (Gmail para produccion; Mailtrap u otro servicio de pruebas para entornos de desarrollo).
- Las credenciales del servidor de correo deben configurarse mediante variables de entorno, nunca escritas directamente en el codigo fuente ni versionadas en el repositorio.
- El poller de recordatorios debe ejecutarse en un hilo programado independiente (`@Scheduled`) sin bloquear las peticiones HTTP normales.
- Errores consistentes con `timestamp`, `status`, `error`, `message` y `path`.
- Documentacion automatica deseable con Springdoc OpenAPI en una feature posterior si se requiere.

## Endpoints esperados

| Metodo | Ruta | Acceso | Descripcion |
| --- | --- | --- | --- |
| POST | `/auth/register` | Publico | Registro de usuario |
| POST | `/auth/login` | Publico | Inicio de sesion |
| GET | `/users/me` | USER/ADMIN | Ver mi perfil |
| PUT | `/users/me` | USER/ADMIN | Editar mi perfil |
| POST | `/users/me/change-password` | USER/ADMIN | Cambiar mi contraseña |
| GET | `/users` | ADMIN | Listar usuarios |
| PUT | `/users/{id}/role` | ADMIN | Cambiar rol |
| GET | `/reminders` | USER/ADMIN | Listar mis recordatorios |
| POST | `/reminders` | USER/ADMIN | Crear recordatorio |
| GET | `/reminders/{id}` | USER/ADMIN | Ver mi recordatorio |
| PUT | `/reminders/{id}` | USER/ADMIN | Actualizar mi recordatorio (solo si esta en `PENDING`) |
| DELETE | `/reminders/{id}` | USER/ADMIN | Eliminar mi recordatorio |
| GET | `/reminders/all` | ADMIN | Ver todos los recordatorios del sistema |