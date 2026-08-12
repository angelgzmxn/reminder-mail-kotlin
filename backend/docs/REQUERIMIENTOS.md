# Requerimientos del Backend Kotlin

**Cliente:** TaskFlow Solutions S.A.S  
**Objetivo:** API REST para gestionar usuarios, autenticacion, tareas personales y administracion por roles.

## Requerimientos funcionales

### RF-01: Registro de usuarios

- Cualquier persona puede registrarse con correo, nombre completo y contrasena.
- El correo debe ser unico.
- La contrasena se almacena hasheada con BCrypt.
- El rol inicial debe ser `USER`.
- Endpoint: `POST /auth/register`.

### RF-02: Inicio de sesion

- El usuario inicia sesion con correo y contrasena.
- Si las credenciales son validas, la API devuelve un token JWT.
- El token debe tener expiracion configurable.
- Endpoint: `POST /auth/login`.

### RF-03: Gestion de tareas

Un usuario autenticado puede:

- Crear una tarea.
- Listar sus propias tareas.
- Ver el detalle de una tarea propia.
- Actualizar una tarea propia.
- Eliminar una tarea propia.

Un usuario no puede consultar, editar ni eliminar tareas de otro usuario.

### RF-04: Estados de tareas

Estados permitidos:

- `PENDING`
- `IN_PROGRESS`
- `DONE`

Regla: una tarea no puede pasar directamente de `PENDING` a `DONE`; primero debe pasar por `IN_PROGRESS`.

### RF-05: Perfil

- El usuario autenticado puede consultar su perfil.
- El usuario autenticado puede editar su nombre y correo.
- Si cambia el correo, debe validarse que no exista otro usuario con ese correo.

### RF-06: Cambio de contrasena

- El usuario autenticado puede cambiar su contrasena.
- Debe enviar contrasena actual y nueva contrasena.
- La contrasena actual debe coincidir con el hash almacenado.

### RF-07: Roles y permisos

Roles:

- `USER`: gestiona sus tareas y perfil.
- `ADMIN`: tambien puede listar usuarios, cambiar roles y consultar todas las tareas.

Un usuario `USER` no debe acceder a endpoints administrativos.

## Requerimientos no funcionales

- API JSON.
- SQLite en memoria como base de datos para desarrollo y pruebas locales.
- La persistencia real en SQLite archivo, MySQL o PostgreSQL queda como ajuste futuro de infraestructura si el proyecto pasa a produccion.
- JPA/Hibernate para persistencia.
- Spring Security para autenticacion/autorizacion.
- JWT Bearer tokens.
- Errores consistentes con `timestamp`, `status`, `error`, `message` y `path`.
- Documentacion automatica deseable con Springdoc OpenAPI en una feature posterior si se requiere.

## Endpoints esperados

| Metodo | Ruta | Acceso | Descripcion |
| --- | --- | --- | --- |
| POST | `/auth/register` | Publico | Registro de usuario |
| POST | `/auth/login` | Publico | Inicio de sesion |
| GET | `/users/me` | USER/ADMIN | Ver mi perfil |
| PUT | `/users/me` | USER/ADMIN | Editar mi perfil |
| POST | `/users/me/change-password` | USER/ADMIN | Cambiar mi contrasena |
| GET | `/users` | ADMIN | Listar usuarios |
| PUT | `/users/{id}/role` | ADMIN | Cambiar rol |
| GET | `/tasks` | USER/ADMIN | Listar mis tareas |
| POST | `/tasks` | USER/ADMIN | Crear tarea |
| GET | `/tasks/{id}` | USER/ADMIN | Ver mi tarea |
| PUT | `/tasks/{id}` | USER/ADMIN | Actualizar mi tarea |
| DELETE | `/tasks/{id}` | USER/ADMIN | Eliminar mi tarea |
| GET | `/tasks/all` | ADMIN | Ver todas las tareas |
