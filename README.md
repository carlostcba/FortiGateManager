# FortiGate Manager - Aplicación Node.js

Aplicación web para gestionar objetos de direcciones y grupos en firewalls FortiGate mediante conexión SSH.

## Características

- **Conexión SSH automática** usando configuración desde archivo `.env`
- **Gestión de objetos MAC** con prefijo ELS- automático
- **Administración del grupo ELS-APP** con interfaz drag-and-drop
- **Interfaz web moderna** con WebSocket para actualizaciones en tiempo real
- **Diagnóstico de conexión** integrado
- **Notificaciones** en tiempo real
- **Responsive design** para dispositivos móviles

## Requisitos Previos

- Node.js >= 16.0.0
- npm o yarn
- Acceso SSH al FortiGate
- Usuario con permisos de administración en FortiGate

## Instalación

1. **Clonar el repositorio:**
```bash
git clone <url-del-repositorio>
cd fortigate-manager
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

4. **Editar el archivo `.env`** con tus credenciales:
```env
# Configuración del servidor
PORT=3000
HOST=localhost
NODE_ENV=development

# Configuración de FortiGate
FORTIGATE_HOST=10.0.10.1
FORTIGATE_USERNAME=admin
FORTIGATE_PASSWORD=tu_password_aqui
FORTIGATE_PORT=22
FORTIGATE_TIMEOUT=20000

# Configuración de seguridad
SESSION_SECRET=tu_session_secret_aqui
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Uso

### Modo Desarrollo
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## Funcionalidades

### 1. Gestión de Objetos MAC

- **Crear objetos**: Interfaz intuitiva para ingresar direcciones MAC
- **Editar objetos**: Selecciona cualquier objeto de la lista para editarlo
- **Eliminar objetos**: Función de eliminación con confirmación
- **Filtrado**: Filtra objetos por tipo (MAC, subnet, FQDN, range)
- **Prefijo automático**: Todos los objetos se crean con prefijo "ELS-"

### 2. Gestión de Grupos

- **Grupo ELS-APP**: Administración específica del grupo de aplicaciones
- **Transferencia de miembros**: Mueve objetos entre disponibles y miembros actuales
- **Actualización en tiempo real**: Los cambios se reflejan inmediatamente

### 3. Conexión y Diagnóstico

- **Auto-conexión**: Conecta automáticamente al iniciar usando `.env`
- **Reconexión manual**: Botón para reestablecer conexión si es necesario
- **Diagnóstico completo**: Prueba DNS, ping y conectividad SSH
- **Estado en tiempo real**: Indicador visual del estado de conexión

## Estructura del Proyecto

```
fortigate-manager/
├── lib/
│   └── FortiGateManager.js    # Clase principal para SSH
├── public/
│   ├── index.html             # Interfaz principal
│   ├── app.js                 # Lógica del frontend
│   └── styles.css             # Estilos CSS
├── server.js                  # Servidor Express
├── package.json               # Dependencias del proyecto
├── .env.example              # Plantilla de configuración
└── README.md                 # Esta documentación
```

## API Endpoints

### Estado y Conexión
- `GET /api/status` - Estado actual de la conexión
- `POST /api/reconnect` - Reconectar al FortiGate
- `GET /api/diagnose` - Ejecutar diagnóstico de conexión

### Objetos ELS
- `GET /api/els-objects?type=mac` - Obtener objetos filtrados por tipo
- `POST /api/els-objects` - Crear/actualizar objeto
- `DELETE /api/els-objects/:name` - Eliminar objeto

### Grupos de Direcciones
- `GET /api/address-groups` - Obtener grupos (específicamente ELS-APP)
- `PUT /api/address-groups/ELS-APP` - Actualizar miembros del grupo

## Configuración de Seguridad

La aplicación incluye las siguientes medidas de seguridad:

- **Helmet.js**: Headers de seguridad HTTP
- **Rate limiting**: Límite de requests por IP
- **CORS**: Configuración de cross-origin requests
- **Validación de entrada**: Validación de todos los datos recibidos
- **Variables de entorno**: Credenciales nunca hardcodeadas

## WebSocket Events

La aplicación usa WebSocket para actualizaciones en tiempo real:

- `connection_status` - Cambios en el estado de conexión
- `object_updated` - Objeto creado/actualizado
- `object_deleted` - Objeto eliminado
- `group_updated` - Grupo actualizado

## Troubleshooting

### Error de Conexión SSH

1. Verificar que las credenciales en `.env` sean correctas
2. Confirmar que el FortiGate esté accesible en la red
3. Usar el diagnóstico integrado para identificar el problema

### Error de Autenticación

1. Verificar usuario y contraseña en `.env`
2. Confirmar que el usuario tenga permisos de administración
3. Verificar que SSH esté habilitado en el FortiGate

### Error de Comandos

1. Confirmar que el usuario tenga permisos para modificar objetos
2. Verificar que no haya políticas que bloqueen los cambios
3. Revisar logs del FortiGate para más detalles

## Contribución

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Soporte

Para reportar bugs o solicitar funcionalidades, crea un issue en el repositorio del proyecto.