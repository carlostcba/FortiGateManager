# FortiGate Manager - Aplicacion Node.js con Autenticacion OAuth 2.0

Aplicacion web segura para gestionar objetos de direcciones y grupos en firewalls FortiGate mediante conexion SSH, con sistema de autenticacion Google OAuth 2.0.

## Caracteristicas

### Sistema de Autenticacion
- **Google OAuth 2.0** - Autenticacion segura mediante cuentas de Google Workspace
- **Control de acceso granular** - Lista de emails autorizados configurable
- **Roles de usuario** - Permisos de administrador y usuario normal
- **Sesiones seguras** - Gestion avanzada de sesiones con expiacion automatica
- **Verificacion de dominio** - Restriccion opcional por dominio de Google Workspace

### Gestion de FortiGate
- **Auto-conexion SSH** usando configuracion desde archivo `.env` al iniciar
- **Verificaciones automaticas** del entorno antes de ejecutar 
- **Gestion de objetos MAC** con prefijo ELS- automatico y validacion en tiempo real
- **Administracion del grupo ELS-APP** con interfaz de transferencia de miembros
- **Interfaz web moderna** con WebSocket para actualizaciones en tiempo real
- **Diagnostico de conexion** integrado con pruebas de DNS, ping y puerto SSH
- **Sistema de notificaciones** con diferentes tipos (exito, error, advertencia)
- **Responsive design** para dispositivos moviles
- **Estados de conexion** visuales (conectado, desconectado, conectando)

## Requisitos Previos

- Node.js >= 16.0.0
- npm o yarn
- Acceso SSH al FortiGate
- Usuario con permisos de administracion en FortiGate
- **Proyecto de Google Cloud Platform** con OAuth 2.0 configurado
- **Google Workspace** (recomendado para restriccion de dominio)

## Instalacion

1. **Clonar el repositorio:**
```bash
git clone <url-del-repositorio>
cd fortigate-manager
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar Google OAuth 2.0:**
   
   a. Ve a [Google Cloud Console](https://console.cloud.google.com)
   
   b. Crea un nuevo proyecto o selecciona uno existente
   
   c. Habilita la API de Google+ (Google Plus API)
   
   d. Ve a "Credenciales" > "Crear credenciales" > "ID de cliente OAuth 2.0"
   
   e. Configura los URIs de redireccion autorizados:
   ```
   http://localhost:3000/auth/google/callback  (desarrollo)
   https://tu-dominio.com/auth/google/callback  (produccion)
   ```
   
   f. Descarga las credenciales y guarda el Client ID y Client Secret

4. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

5. **Editar el archivo `.env`** con tus credenciales:
```env
# Configuracion del servidor
PORT=3000
HOST=localhost
NODE_ENV=development

# Configuracion de FortiGate
FORTIGATE_HOST=10.0.0.1
FORTIGATE_USERNAME=usuario
FORTIGATE_PASSWORD=tu_password_aqui
FORTIGATE_PORT=22
FORTIGATE_TIMEOUT=20000

# Autenticacion Google OAuth 2.0
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
GOOGLE_WORKSPACE_DOMAIN=tu-dominio.com

# Seguridad de sesiones
SESSION_SECRET=genera-una-clave-aleatoria-de-64-caracteres-aqui
SESSION_NAME=fortigate_session
SESSION_MAX_AGE=86400000
SESSION_SECURE=false

# Configuracion de proxy (si aplica)
TRUST_PROXY=false
```

6. **Configurar usuarios autorizados:**

Edita el archivo `lib/auth.js` y actualiza la lista `AUTHORIZED_EMAILS`:

```javascript
const AUTHORIZED_EMAILS = [
  'usuario1@tu-dominio.com',
  'usuario2@tu-dominio.com',
  'admin@tu-dominio.com'
];
```

## Uso

### Iniciar la aplicacion

**Metodo recomendado (con verificaciones):**
```bash
npm start
```

**Para desarrollo con auto-reinicio:**
```bash
npm run dev
```

**Ejecutar servidor directamente (sin verificaciones):**
```bash
npm run server
```

### Acceso a la aplicacion

1. Abre tu navegador en `http://localhost:3000`
2. Seras redirigido automaticamente a la pagina de login
3. Haz clic en "Iniciar Sesion con Google"
4. Selecciona tu cuenta autorizada del dominio
5. Acepta los permisos solicitados
6. Seras redirigido al dashboard principal

## Sistema de Autenticacion

### Control de Acceso

La aplicacion implementa un sistema de autenticacion de tres capas:

1. **Verificacion de email autorizado** - Solo emails en la lista `AUTHORIZED_EMAILS` pueden acceder
2. **Verificacion de dominio** (opcional) - Restriccion adicional por dominio de Google Workspace
3. **Verificacion de sesion activa** - Todas las rutas requieren sesion valida

### Roles de Usuario

- **Usuario normal**: Acceso completo a gestion de objetos y grupos
- **Administrador**: Acceso adicional a funciones administrativas y estadisticas

Los administradores se configuran en el metodo `isAdmin()` del archivo `lib/auth.js`.

### Seguridad de Sesiones

- **Expiracion automatica**: Las sesiones expiran despues de 24 horas por defecto
- **Renovacion de sesion**: Se renueva automaticamente en cada request
- **Limpieza automatica**: Las sesiones inactivas se limpian del servidor
- **Verificacion periodica**: El frontend verifica el estado de autenticacion cada 5 minutos

## Funcionalidades

### 1. Autenticacion y Sesiones

- **Login OAuth 2.0**: Proceso de autenticacion seguro con Google
- **Logout seguro**: Limpieza completa de sesiones del cliente y servidor  
- **Verificacion de estado**: Endpoint para verificar estado de autenticacion
- **Interceptor de errores**: Manejo automatico de errores 401/403
- **Redireccion automatica**: Redirige a login cuando la sesion expira

### 2. Gestion de Objetos MAC

- **Crear objetos**: Interfaz intuitiva con campos MAC validados
- **Auto-formato**: Los campos MAC se formatean automaticamente (XX:XX:XX:XX:XX:XX)
- **Editar objetos**: Selecciona cualquier objeto de la tabla para editarlo
- **Eliminar objetos**: Funcion de eliminacion con confirmacion
- **Filtrado**: Filtra objetos por tipo (todos, MAC, subnet, FQDN, range)
- **Prefijo automatico**: Todos los objetos se crean con prefijo "ELS-"
- **Actualizacion en tiempo real**: Los cambios se reflejan inmediatamente via WebSocket
- **Auditoria**: Registro de quien realiza cada cambio

### 3. Gestion de Grupos

- **Grupo ELS-APP**: Administracion especifica del grupo de aplicaciones
- **Transferencia de miembros**: Mueve objetos entre disponibles y miembros actuales
- **Seleccion multiple**: Permite seleccionar varios objetos para transferir
- **Ordenamiento automatico**: Las listas se ordenan alfabeticamente
- **Sincronizacion**: Los cambios se sincronizan en tiempo real
- **Historial de cambios**: Tracking de modificaciones por usuario

### 4. Conexion y Diagnostico  

- **Auto-conexion**: Conecta automaticamente al iniciar usando configuracion `.env`
- **Estados visuales**: Indicador de estado (conectado/desconectado/conectando)
- **Reconexion manual**: Boton para reestablecer conexion cuando sea necesario
- **Diagnostico completo**: Prueba DNS, ping y conectividad al puerto SSH
- **Mensajes informativos**: Notificaciones detalladas sobre el estado de la conexion
- **Verificacion de permisos**: Solo usuarios autenticados pueden acceder a diagnosticos

### 5. Sistema de Notificaciones

- **Tipos**: Exito (verde), Error (rojo), Advertencia (amarillo), Info (azul)  
- **Auto-dismiss**: Las notificaciones se ocultan automaticamente despues de 5 segundos
- **Click to dismiss**: Haz clic en cualquier notificacion para ocultarla
- **Posicion fija**: Aparecen en la esquina superior derecha
- **Informacion de usuario**: Muestra quien realizo la accion

## Estructura del Proyecto

```
fortigate-manager/
├── lib/
│   ├── FortiGateManager.js    # Clase principal para conexion SSH
│   └── auth.js                # Sistema de autenticacion OAuth 2.0
├── routes/
│   └── auth.js                # Rutas de autenticacion y OAuth
├── public/
│   ├── index.html             # Interfaz web principal
│   ├── app.js                 # Frontend con manejo de autenticacion
│   └── styles.css             # Estilos CSS responsivos con elementos de auth
├── scripts/
│   └── clear-rate-limit.js    # Utilidad para desarrollo
├── start.js                   # Script de inicio con verificaciones OAuth
├── server.js                  # Servidor Express con middleware de autenticacion
├── package.json               # Configuracion del proyecto y dependencias
├── .env.example              # Plantilla de configuracion con OAuth
├── Dockerfile                # Configuracion para Docker
└── README.md                 # Documentacion del proyecto
```

## API Endpoints

### Autenticacion
- `GET /login` - Pagina de inicio de sesion
- `GET /auth/google` - Iniciar proceso OAuth con Google
- `GET /auth/google/callback` - Callback de Google OAuth
- `POST /auth/logout` - Cerrar sesion
- `GET /auth/status` - Verificar estado de autenticacion
- `GET /auth/authorized-users` - Lista de usuarios autorizados (solo admins)

### Estado y Conexion (Requieren autenticacion)
- `GET /api/status` - Estado actual de la conexion SSH
- `POST /api/reconnect` - Reconectar manualmente al FortiGate  
- `GET /api/diagnose` - Ejecutar diagnostico completo de conexion

### Objetos ELS (Requieren autenticacion)
- `GET /api/els-objects` - Obtener todos los objetos ELS
- `GET /api/els-objects?type=mac` - Filtrar objetos por tipo
- `POST /api/els-objects` - Crear o actualizar objeto ELS
- `DELETE /api/els-objects/:name` - Eliminar objeto especifico

### Grupos de Direcciones (Requieren autenticacion)
- `GET /api/address-groups` - Obtener grupos
- `PUT /api/address-groups/ELS-APP` - Actualizar miembros del grupo

## Configuracion de Seguridad

### Medidas de Seguridad Implementadas

- **Google OAuth 2.0**: Autenticacion delegada a Google
- **Helmet.js**: Headers de seguridad HTTP estandar
- **Rate limiting**: Proteccion contra ataques de fuerza bruta
- **CORS**: Configuracion de cross-origin requests
- **CSP**: Content Security Policy para prevenir XSS
- **Session security**: Cookies HTTP-only y configuracion de SameSite
- **Validacion de entrada**: Validacion con express-validator
- **Variables de entorno**: Credenciales nunca hardcodeadas
- **Middleware de autorizacion**: Verificacion en todas las rutas protegidas

### Rate Limiting

La aplicacion implementa rate limiting diferenciado:

- **Rutas OAuth exitosas**: 20 requests por minuto
- **Intentos de autenticacion fallidos**: 5 intentos cada 15 minutos
- **Rutas de API**: Protegidas por autenticacion requerida

## WebSocket Events

**Eventos del servidor:**
- `connection_status` - Cambios en el estado de conexion SSH
- `object_updated` - Notifica cuando un objeto es modificado (incluye usuario)
- `object_deleted` - Notifica cuando un objeto es eliminado (incluye usuario)
- `group_updated` - Notifica cuando el grupo ELS-APP es actualizado (incluye usuario)
- `auth_error` - Notifica errores de autenticacion en WebSocket

## Variables de Entorno Requeridas

```env
# Configuracion del servidor  
PORT=3000
HOST=localhost
NODE_ENV=development

# Configuracion de FortiGate
FORTIGATE_HOST=10.0.0.1
FORTIGATE_USERNAME=usuario
FORTIGATE_PASSWORD=tu_password_aqui
FORTIGATE_PORT=22
FORTIGATE_TIMEOUT=20000

# Autenticacion Google OAuth 2.0 (REQUERIDO)
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
GOOGLE_WORKSPACE_DOMAIN=tu-dominio.com

# Seguridad de sesiones (REQUERIDO)
SESSION_SECRET=clave-aleatoria-de-64-caracteres-minimo
SESSION_NAME=fortigate_session
SESSION_MAX_AGE=86400000
SESSION_SECURE=false

# Configuracion de proxy
TRUST_PROXY=false
```

### Generacion de SESSION_SECRET

Para generar una clave segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment

### Desarrollo Local

```bash
npm run dev
```

### Produccion

1. **Configurar variables de entorno para produccion:**
```env
NODE_ENV=production
SESSION_SECURE=true
TRUST_PROXY=true
GOOGLE_CALLBACK_URL=https://tu-dominio.com/auth/google/callback
```

2. **Usar HTTPS en produccion:**
   - La aplicacion requiere HTTPS para OAuth en produccion
   - Configura SSL/TLS en tu servidor web o proxy reverso

3. **Docker:**
```bash
docker build -t fortigate-manager .
docker run -p 3000:3000 --env-file .env fortigate-manager
```

## Troubleshooting

### Errores de OAuth

**Error: "redirect_uri_mismatch"**
```
Solucion: Verifica que la GOOGLE_CALLBACK_URL coincida exactamente 
con la configurada en Google Cloud Console
```

**Error: "access_denied"**
```
Solucion: 
1. Verifica que el email este en AUTHORIZED_EMAILS
2. Confirma que el dominio sea correcto si usas GOOGLE_WORKSPACE_DOMAIN
3. Revisa los logs del servidor para mas detalles
```

**Error: "Demasiados intentos de autenticacion"**
```
Solucion: 
1. Espera 15 minutos para que se resetee el rate limit
2. En desarrollo, reinicia el servidor
3. Usa el script: npm run scripts/clear-rate-limit.js
```

### Errores de Conexion SSH

**Error: "No hay conexion SSH activa"**
```
Solucion:
1. Verifica que estes autenticado (revisa /auth/status)
2. Usa boton "Reconectar" en la interfaz
3. Ejecuta diagnostico para identificar el problema
```

**Error: "Sesion expirada"**
```
Solucion:
1. La aplicacion te redirigira automaticamente al login
2. Inicia sesion nuevamente con Google
3. Si persiste, limpia cookies del navegador
```

### Errores de Configuracion

**Error: "Variables de entorno de Google OAuth no configuradas"**
```
Solucion:
1. Verifica que GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET esten en .env
2. Confirma que no haya espacios extra en las variables
3. Reinicia el servidor despues de cambiar .env
```

## Monitoreo y Logs

### Logs de Autenticacion

La aplicacion registra detalladamente todos los eventos de autenticacion:

```
✓ Usuario autenticado exitosamente: usuario@dominio.com
❌ Acceso denegado para: usuario@otro-dominio.com - No autorizado
🔐 Sesion activa para: usuario@dominio.com
✓ Sesion cerrada para: usuario@dominio.com
```

### Debug de Sesiones

En modo desarrollo, puedes usar las funciones de debug disponibles en la consola del navegador:

```javascript
// Informacion de autenticacion actual
debugAuth()

// Forzar logout
forceLogout()

// Mostrar informacion del usuario
showUserInfo()
```

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Verificar entorno e iniciar (incluye verificaciones OAuth)
npm start

# Modo desarrollo con nodemon
npm run dev

# Solo servidor (sin verificaciones)
npm run server

# Limpiar rate limiting (desarrollo)
node scripts/clear-rate-limit.js

# Verificar configuracion OAuth
npm start -- --check
```

## Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Passport.js** - Middleware de autenticacion
- **passport-google-oauth20** - Estrategia OAuth 2.0 para Google
- **express-session** - Manejo de sesiones
- **Socket.io** - Comunicacion en tiempo real
- **node-ssh** - Cliente SSH para Node.js

### Seguridad
- **Helmet** - Headers de seguridad HTTP
- **express-rate-limit** - Rate limiting
- **express-validator** - Validacion de entrada
- **connect-flash** - Mensajes flash de sesion

### Frontend
- **HTML5, CSS3, JavaScript** - Sin frameworks adicionales
- **WebSocket** - Actualizaciones en tiempo real
- **Responsive Design** - Compatible con dispositivos moviles

## Licencia

Este proyecto esta bajo la Licencia MIT.

## Contribucion

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)  
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## Soporte

Para reportar bugs o solicitar nuevas funcionalidades:
- Crear un issue en el repositorio del proyecto
- Incluir logs relevantes y pasos para reproducir el problema
- Especificar version de Node.js y sistema operativo
- Para problemas de OAuth, incluir configuracion de Google Cloud Console (sin credenciales)

## Seguridad

Si encuentras vulnerabilidades de seguridad, por favor reportalas de forma privada al maintainer del proyecto antes de crear un issue publico.
