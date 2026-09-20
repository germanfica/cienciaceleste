# Cienciaceleste API

API Node/TypeScript para autenticar al administrador, guardar sesiones y auditoría
en SQLite, y ejecutar el flujo existente de Gulp en una cola de una publicación.
El contenido del documento queda en SQLite solo mientras el trabajo está pendiente;
al terminar se elimina el payload de la cola. Los documentos publicados continúan
siendo archivos de texto en el checkout.

## Qué ejecuta un guardado

Para cada trabajo, y siempre de a uno, la API hace lo siguiente:

1. Guarda el request validado en un archivo temporal privado.
2. Ejecuta `npm run gulp -- write:rollo`, `write:minirollo` o `write:ley`.
3. Ejecuta `npm run gulp -- build:all:docs`.
4. Ejecuta `npm run frontend:deploy:ghpages`.

Los nombres de tareas están fijados en el código. El navegador no puede enviar
comandos, rutas ni argumentos para ejecutar procesos.

## Requisitos

- Docker Compose v2.
- Un checkout funcional de Cienciaceleste con sus dependencias ya instaladas.
- Credenciales Git disponibles dentro del entorno que ejecuta el pipeline. Para
  producción, usá una clave SSH de despliegue montada de solo lectura o un
  mecanismo de credenciales del sistema; no guardes tokens dentro de `.env`.

Antes de iniciar el contenedor, verificá desde la raíz del proyecto que tu
pipeline existente funciona y que sus dependencias están instaladas:

```bash
npm run gulp -- install:all
```

## Inicio local

Desde la raíz del repositorio:

```bash
cp api/.env.example api/.env
```

Editá `api/.env`, especialmente `ADMIN_USERNAME` y `ADMIN_PASSWORD`. La primera
vez que arranca, la API crea esa cuenta y guarda solo un hash Argon2id en SQLite.
Cambiar `ADMIN_PASSWORD` después no reemplaza una cuenta existente de forma
silenciosa.

Para probar sin desplegar a GitHub Pages, usá temporalmente:

```dotenv
DEPLOY_ENABLED=false
```

Luego iniciá:

```bash
docker compose -f docker-compose.api.yml up --build
```

La API queda en `http://localhost:3000/api/v1`. Angular en modo desarrollo debe
usar esa URL. En producción, poné Angular y `/api/v1` detrás del mismo proxy HTTPS.

## Conexión con el editor

El archivo `frontend/editor-save-integration.patch` contiene la integración para
el editor que adjuntaste. Primero comprobá que coincide con tu copia actual:

```bash
patch --dry-run -p1 < frontend/editor-save-integration.patch
```

Luego aplicalo desde la raíz del proyecto:

```bash
patch -p1 < frontend/editor-save-integration.patch
```

El cambio conserva el botón de exportar JSON y hace que `Guardar` reutilice ese
request para encolarlo en la API. Cuando se completa una creación, el editor pasa
a tratar ese documento como existente para no volver a enviarlo como `create`.

El servicio Angular también expone `login()`, `currentSession()` y `logout()`.
Falta agregar la pantalla y la ruta de inicio de sesión al router de Angular,
porque ese archivo no formó parte de los archivos disponibles aquí.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Crea una sesión con cookie HttpOnly y cookie CSRF. |
| `GET` | `/api/v1/auth/me` | Comprueba la sesión actual. |
| `POST` | `/api/v1/auth/logout` | Revoca la sesión. Requiere CSRF. |
| `POST` | `/api/v1/documents/:documentType` | Encola un guardado. Requiere sesión y CSRF. |
| `GET` | `/api/v1/jobs/:jobId` | Consulta estado, error y salida del trabajo. |
| `GET` | `/api/v1/health` | Comprobación de disponibilidad. |

`documentType` solo puede ser `rollo`, `minirollo` o `ley`. El cuerpo conserva el
contrato JSON que ya genera `editor-export-json`.

## Límites de seguridad incluidos

- Contraseñas con Argon2id del módulo nativo de Node 24, con salt aleatorio.
- Tokens de sesión y CSRF aleatorios; SQLite conserva solo sus hashes SHA-256.
- Cookies `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
- CORS sin comodines y límite de intentos de login.
- Validación de schema y tamaños antes de escribir archivos.
- Una cola persistida en SQLite: nunca corren dos pipelines en paralelo.
- `spawn(..., { shell: false })` y argumentos fijados, sin interpolar contenido
  del documento en una shell.
- Requests temporales y base SQLite fuera de `frontend/public`.

## Producción

El checkout montado en `PROJECT_ROOT` debe quedar fuera de `/var/www` o de
cualquier directorio servido por el proxy. Solo el build estático puede ser
público. La API debe quedar detrás de HTTPS y el puerto 3000 no debe exponerse
directamente a Internet.

La composición incluida supone un servidor Linux en el que el usuario del
contenedor puede modificar el checkout. Si el usuario del host tiene otro UID,
ajustá los permisos de ese checkout antes de iniciar el servicio.
