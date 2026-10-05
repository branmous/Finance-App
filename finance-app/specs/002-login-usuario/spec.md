# Feature Specification: Login de Usuario con Contraseña

**Feature Branch**: `feature/002-login-usuario`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Login de usuario completo contra la base de datos PostgreSQL. El usuario ingresa un identificador (correo o nombre de usuario) y una contraseña; la contraseña se guarda encriptada (hash) en la base de datos y nunca en texto plano. Se crea una pantalla de login funcional (el diseño visual no está definido todavía). El usuario inicial se crea con un script de seed por línea de comandos; no hay registro público. Reemplaza el login actual de solo correo sin contraseña del spec 001-cimientos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar sesión con usuario y contraseña (Priority: P1)

Como dueño de la app, quiero iniciar sesión escribiendo mi correo o mi nombre de usuario y mi
contraseña, de modo que solo yo pueda entrar a la aplicación y mi identidad quede verificada
contra la base de datos real.

**Why this priority**: Es el reemplazo directo del login actual sin contraseña; sin esto la app
no tiene una barrera de acceso real.

**Independent Test**: Se puede probar creando un usuario con el script de seed, abriendo la
pantalla de login, e iniciando sesión con correo y con nombre de usuario; ambos deben dar acceso
a la página de bienvenida. Con contraseña incorrecta, el acceso debe rechazarse.

**Acceptance Scenarios**:

1. **Given** que existe un usuario creado con correo `a@ejemplo.com`, nombre de usuario `brand` y
   una contraseña válida, **When** ingreso `a@ejemplo.com` con esa contraseña en la pantalla de
   login, **Then** accedo a la página de bienvenida.
2. **Given** el mismo usuario, **When** ingreso `brand` con esa contraseña, **Then** accedo a la
   página de bienvenida.
3. **Given** el mismo usuario, **When** ingreso un identificador válido con una contraseña
   incorrecta, **Then** el acceso es rechazado con un mensaje genérico que no revela si el
   identificador existe.
4. **Given** un identificador que no existe en la base de datos, **When** intento iniciar sesión,
   **Then** el acceso es rechazado con el mismo mensaje genérico del escenario 3.
5. **Given** que cierro sesión o nunca he iniciado sesión, **When** visito una página protegida,
   **Then** soy redirigido a la pantalla de login.

---

### User Story 2 - Guardar contraseñas de forma segura (Priority: P2)

Como dueño de la app, quiero que mi contraseña nunca quede almacenada en texto plano en la base
de datos, de modo que una filtración de la base de datos no exponga mis credenciales.

**Why this priority**: Es un requisito de seguridad no negociable para cualquier credencial, pero
depende de que exista el flujo de login (US1) para ser útil.

**Independent Test**: Se puede probar creando un usuario con el script de seed y leyendo
directamente la fila en la base de datos: el campo de contraseña debe contener un hash no
reversible, nunca la contraseña original.

**Acceptance Scenarios**:

1. **Given** que creo un usuario con el script de seed, **When** consulto su fila en la base de
   datos, **Then** el campo de contraseña contiene un hash y no la contraseña escrita.
2. **Given** dos usuarios con la misma contraseña, **When** consulto sus filas, **Then** sus
   hashes son distintos (cada hash usa una sal única).
3. **Given** un usuario ya creado, **When** ejecuto el script de seed de nuevo con el mismo
   correo, **Then** no se crea un duplicado y la contraseña existente no se sobrescribe sin
   confirmación explícita.

---

### User Story 3 - Crear el usuario inicial con un script de seed (Priority: P3)

Como dueño de la app, quiero crear mi usuario desde la línea de comandos, de modo que no exista
ninguna página pública de registro que cualquiera pueda usar.

**Why this priority**: Es necesario para probar US1 y US2, pero el uso real ocurre una sola vez.

**Independent Test**: Se puede probar ejecutando el comando de seed con correo, nombre de usuario
y contraseña, y verificando que el usuario puede iniciar sesión después.

**Acceptance Scenarios**:

1. **Given** una base de datos con las migraciones aplicadas y sin usuarios, **When** ejecuto el
   comando de seed con correo, nombre de usuario y contraseña, **Then** el usuario queda creado.
2. **Given** que ejecuto el comando de seed sin todos los argumentos requeridos, **When** se
   ejecuta, **Then** el comando falla con un mensaje claro indicando qué falta, sin crear nada.
3. **Given** que no existe ninguna ruta pública de registro, **When** visito una URL típica de
   registro, **Then** no encuentro ningún formulario para crear cuentas.

---

### Edge Cases

- ¿Qué pasa si el identificador tiene mayúsculas, espacios al inicio o al final? Debe normalizarse
  (sin espacios; correo en minúsculas) antes de compararlo.
- ¿Qué pasa si el mismo correo o nombre de usuario ya existe al crear un usuario? La creación debe
  fallar sin duplicar.
- ¿Qué pasa si se intentan muchas contraseñas incorrectas seguidas? El sistema debe limitar los
  intentos para evitar fuerza bruta (ver Assumptions para el umbral por defecto).
- ¿Qué pasa si la base de datos no está disponible al intentar iniciar sesión? La pantalla debe
  mostrar un error de servicio, no dejar la sesión en un estado intermedio.
- ¿Qué pasa con la sesión de un login anterior al cambio (solo correo)? Debe invalidarse: el
  nuevo login es la única forma válida de obtener sesión.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir iniciar sesión con un identificador que puede ser un correo
  electrónico o un nombre de usuario, junto con una contraseña.
- **FR-002**: El sistema MUST verificar las credenciales contra los usuarios almacenados en la
  base de datos PostgreSQL del proyecto.
- **FR-003**: El sistema MUST almacenar la contraseña únicamente como hash irreversible con sal
  por usuario; NUNCA DEBE almacenar la contraseña en texto plano ni en un formato reversible.
- **FR-004**: El sistema MUST normalizar el identificador (sin espacios al inicio o al final y,
  para correos, en minúsculas) antes de buscarlo o compararlo.
- **FR-005**: El sistema MUST responder con el mismo mensaje genérico de error cuando el
  identificador no existe y cuando la contraseña es incorrecta, para no revelar qué usuarios
  existen.
- **FR-006**: El sistema MUST limitar el número de intentos fallidos de inicio de sesión por
  identificador dentro de una ventana de tiempo.
- **FR-007**: El sistema MUST mostrar una pantalla de login funcional con campos para identificador
  y contraseña, sin definir todavía su diseño visual final.
- **FR-008**: El sistema MUST proteger todas las páginas de la aplicación: sin sesión válida, se
  redirige a la pantalla de login.
- **FR-009**: El sistema MUST proveer un script de línea de comandos para crear el usuario inicial,
  que valide que todos los datos requeridos estén presentes y que no duplique usuarios existentes.
- **FR-010**: El sistema MUST NOT exponer ninguna ruta pública de registro de cuentas.
- **FR-011**: El sistema MUST reemplazar el login anterior de solo correo sin contraseña; el
  correo autorizado del spec 001 deja de ser la única barrera de acceso.

### Key Entities

- **Usuario**: persona autorizada a iniciar sesión. Atributos: identificador único, correo
  electrónico, nombre de usuario, hash de contraseña, fecha de creación, fecha de última
  modificación, y contador de intentos fallidos con su ventana de tiempo. Relación: un usuario
  es el propietario de todos los datos de dominio futuros (`user_id`, según la constitución).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un inicio de sesión válido, con correo o con nombre de usuario, lleva a la página de
  bienvenida en menos de 3 segundos en el 95% de los intentos.
- **SC-002**: El 100% de los intentos con contraseña incorrecta o identificador inexistente son
  rechazados con el mismo mensaje genérico.
- **SC-003**: Al inspeccionar la base de datos después de crear un usuario, el 100% de los campos
  de contraseña contienen un hash y ninguno contiene la contraseña original.
- **SC-004**: Después de superar el límite de intentos fallidos, los siguientes intentos se
  bloquean durante la ventana configurada en el 100% de los casos de prueba.
- **SC-005**: Ejecutar el script de seed dos veces con el mismo correo no crea duplicados en el
  100% de las ejecuciones.

## Assumptions

- El diseño visual de la pantalla de login queda para un spec posterior; en este spec basta con
  campos funcionales y un botón de envío.
- El límite por defecto de intentos fallidos es 5 intentos en 15 minutos por identificador; el
  valor puede ajustarse en la configuración sin cambiar código.
- La base de datos PostgreSQL y sus migraciones ya existen (spec 001-cimientos); este spec agrega
  la tabla de usuarios mediante una nueva migración.
- La sesión sigue siendo gestionada por Auth.js como en el spec 001; solo cambia la forma de
  verificar la identidad.
- Recuperación de contraseña, cambio de contraseña desde la app y verificación por correo quedan
  fuera de alcance de este spec.
