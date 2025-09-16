const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const FortiGateManager = require('./lib/FortiGateManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

const fortiManager = new FortiGateManager();

const requireConnection = (req, res, next) => {
  if (!fortiManager.isConnected()) {
    return res.status(503).json({ success: false, message: 'No hay conexión SSH activa al FortiGate' });
  }
  next();
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----- CAMBIO REALIZADO: Ruta de estado ahora respeta el estado 'CONNECTING' -----
app.get('/api/status', (req, res) => {
  const connectionState = fortiManager.getConnectionState();
  const connectionInfo = fortiManager.getConnectionInfo();
  
  let message = 'No conectado';
  if (connectionState === 'CONNECTED') message = 'Conectado al FortiGate';
  if (connectionState === 'CONNECTING') message = 'Conectando...';

  const safeConfig = connectionInfo ? { hostname: connectionInfo.hostname, username: connectionInfo.username, port: connectionInfo.port } : {};
  
  res.json({
    success: true,
    connected: connectionState === 'CONNECTED',
    message: message,
    config: safeConfig
  });
});

app.post('/api/reconnect', async (req, res) => {
  const result = await fortiManager.connect();
  io.emit('connection_status', { connected: result.success, message: result.message });
  res.json({ success: result.success, message: result.message });
});

// ----- CAMBIO REALIZADO: Lógica de filtrado corregida -----
app.get('/api/els-objects', requireConnection, async (req, res) => {
  try {
    const { type } = req.query;
    // Si 'type' no está definido, es 'all', o está vacío, no se aplica filtro (null).
    // De lo contrario, se usa el tipo proporcionado. Esto corrige el bug del listado.
    const filter = (type && type !== 'all') ? type : null;
    const objects = await fortiManager.getElsObjectsByType(filter);
    
    res.json({
      success: true,
      data: objects,
      count: Object.keys(objects).length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener objetos ELS', error: error.message });
  }
});

// (El resto de los endpoints: POST, DELETE, PUT a /api/els-objects y /api/address-groups permanecen igual)
// ...
// Pega aquí el resto de tus endpoints desde app.post('/api/els-objects'...)
// ...

app.post('/api/els-objects', [
  body('name').isLength({ min: 1 }).withMessage('Nombre es requerido'),
  body('type').isIn(['mac', 'subnet', 'fqdn', 'range']).withMessage('Tipo no valido'),
  body('value').isLength({ min: 1 }).withMessage('Valor es requerido')
], requireConnection, async (req, res) => {
  try {
    const { name, type, value } = req.body;
    const fullName = name.startsWith('ELS-') ? name : `ELS-${name}`;
    await fortiManager.createUpdateAddressObject(fullName, type, value);
    io.emit('object_updated', { name: fullName, type, value });
    res.json({ success: true, message: `Objeto '${fullName}' guardado correctamente` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al guardar objeto', error: error.message });
  }
});

app.delete('/api/els-objects/:name', requireConnection, async (req, res) => {
  try {
    const { name } = req.params;
    await fortiManager.deleteAddressObject(name);
    io.emit('object_deleted', { name });
    res.json({ success: true, message: `Objeto '${name}' eliminado correctamente` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar objeto', error: error.message });
  }
});

app.get('/api/address-groups', requireConnection, async (req, res) => {
  try {
    const groups = await fortiManager.getAddressGroups();
    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener grupos', error: error.message });
  }
});

app.put('/api/address-groups/ELS-APP', [
  body('members').isArray().withMessage('Members debe ser un array')
], requireConnection, async (req, res) => {
  try {
    const { members } = req.body;
    await fortiManager.createUpdateGroup('ELS-APP', members);
    io.emit('group_updated', { name: 'ELS-APP', members });
    res.json({ success: true, message: 'Grupo ELS-APP actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar grupo', error: error.message });
  }
});


io.on('connection', (socket) => {
  const state = fortiManager.getConnectionState();
  let message = 'No conectado';
  if (state === 'CONNECTED') message = 'Conectado al FortiGate';
  if (state === 'CONNECTING') message = 'Conectando...';
  socket.emit('connection_status', { connected: state === 'CONNECTED', message });
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor ejecutándose en http://${HOST}:${PORT}`);
  fortiManager.autoConnect().then(result => {
    io.emit('connection_status', { connected: result.success, message: result.message });
  });
});