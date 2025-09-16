// Configuracion global
const API_BASE = '';
let socket;
let currentDevices = {};
let selectedDevice = null;
let availableMembers = [];
let currentMembers = [];

// Inicializacion de la aplicacion
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    connectWebSocket();
    checkConnectionStatus();
});

function initializeApp() {
    console.log('Inicializando FortiGate Manager...');
    
    // Configurar tabs
    setupTabs();
    
    // Configurar inputs MAC
    setupMacInputs();
    
    // Cargar datos iniciales
    setTimeout(() => {
        loadDevices();
        loadGroups();
    }, 1000);
}

function setupEventListeners() {
    // Botones de estado
    document.getElementById('reconnectBtn').addEventListener('click', reconnect);
    document.getElementById('diagnoseBtn').addEventListener('click', showDiagnostic);
    
    // Botones de dispositivos
    document.getElementById('refreshDevicesBtn').addEventListener('click', loadDevices);
    document.getElementById('typeFilter').addEventListener('change', loadDevices);
    document.getElementById('deviceForm').addEventListener('submit', saveDevice);
    document.getElementById('deleteDeviceBtn').addEventListener('click', deleteDevice);
    document.getElementById('clearFormBtn').addEventListener('click', clearDeviceForm);
    
    // Botones de grupos
    document.getElementById('refreshGroupBtn').addEventListener('click', loadGroups);
    document.getElementById('addMemberBtn').addEventListener('click', addMembers);
    document.getElementById('removeMemberBtn').addEventListener('click', removeMembers);
    document.getElementById('saveGroupBtn').addEventListener('click', saveGroup);
    
    // Modal de diagnostico
    document.getElementById('closeDiagnosticModal').addEventListener('click', closeDiagnosticModal);
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('diagnosticModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeDiagnosticModal();
        }
    });
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remover clases activas
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Agregar clase activa
            this.classList.add('active');
            document.getElementById(targetTab + 'Tab').classList.add('active');
            
            // Cargar datos si es necesario
            if (targetTab === 'devices') {
                loadDevices();
            } else if (targetTab === 'groups') {
                loadGroups();
            }
        });
    });
}

function setupMacInputs() {
    const macInputs = document.querySelectorAll('.mac-input');
    
    macInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.toUpperCase();
            
            // Solo permitir caracteres hexadecimales
            value = value.replace(/[^0-9A-F]/g, '');
            
            // Limitar a 2 caracteres
            if (value.length > 2) {
                value = value.slice(0, 2);
            }
            
            e.target.value = value;
            
            // Auto-avanzar al siguiente campo
            if (value.length === 2 && index < macInputs.length - 1) {
                macInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            // Permitir backspace para retroceder
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                macInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('focus', function() {
            this.select();
        });
    });
}

function connectWebSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('WebSocket conectado');
    });
    
    socket.on('connection_status', function(data) {
        updateConnectionStatus(data.connected, data.message);
    });
    
    socket.on('object_updated', function(data) {
        showNotification('success', 'Objeto actualizado', `El objeto ${data.name} ha sido actualizado`);
        loadDevices();
    });
    
    socket.on('object_deleted', function(data) {
        showNotification('info', 'Objeto eliminado', `El objeto ${data.name} ha sido eliminado`);
        loadDevices();
        clearDeviceForm();
    });
    
    socket.on('group_updated', function(data) {
        showNotification('success', 'Grupo actualizado', `El grupo ${data.name} ha sido actualizado`);
        loadGroups();
    });
    
    socket.on('disconnect', function() {
        console.log('WebSocket desconectado');
        updateConnectionStatus(false, 'Conexion WebSocket perdida');
    });
}

async function checkConnectionStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        const data = await response.json();
        
        updateConnectionStatus(data.connected, data.message);
        
        if (data.config) {
            console.log('Configuracion:', data.config);
        }
    } catch (error) {
        console.error('Error al verificar estado:', error);
        updateConnectionStatus(false, 'Error de comunicacion con el servidor');
    }
}

function updateConnectionStatus(connected, message) {
    const indicator = document.getElementById('statusIndicator');
    const statusMessage = document.getElementById('statusMessage');
    
    indicator.className = 'status-indicator ' + (connected ? 'connected' : 'disconnected');
    statusMessage.textContent = message;
    
    // Habilitar/deshabilitar botones segun el estado
    const reconnectBtn = document.getElementById('reconnectBtn');
    reconnectBtn.disabled = false;
    reconnectBtn.textContent = connected ? 'Reconectar' : 'Conectar';
}

async function reconnect() {
    const indicator = document.getElementById('statusIndicator');
    const statusMessage = document.getElementById('statusMessage');
    
    indicator.className = 'status-indicator connecting';
    statusMessage.textContent = 'Conectando...';
    
    try {
        const response = await fetch(`${API_BASE}/api/reconnect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', 'Reconexion exitosa', data.message);
            loadDevices();
            loadGroups();
        } else {
            showNotification('error', 'Error de conexion', data.message);
        }
        
        updateConnectionStatus(data.success, data.message);
    } catch (error) {
        console.error('Error en reconexion:', error);
        updateConnectionStatus(false, 'Error de comunicacion');
        showNotification('error', 'Error', 'No se pudo conectar al servidor');
    }
}

async function loadDevices() {
    const devicesList = document.getElementById('devicesList');
    const typeFilter = document.getElementById('typeFilter').value;
    
    // Mostrar loading
    devicesList.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>Cargando objetos...</span>
        </div>
    `;
    
    try {
        const filterParam = typeFilter !== 'all' ? `?type=${typeFilter}` : '';
        const response = await fetch(`${API_BASE}/api/els-objects${filterParam}`);
        const data = await response.json();
        
        if (data.success) {
            currentDevices = data.data;
            renderDevicesTable(data.data);
        } else {
            devicesList.innerHTML = `
                <div class="empty-state">
                    <p>Error al cargar objetos: ${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar dispositivos:', error);
        devicesList.innerHTML = `
            <div class="empty-state">
                <p>Error de comunicacion con el servidor</p>
            </div>
        `;
    }
}

function renderDevicesTable(devices) {
    const devicesList = document.getElementById('devicesList');
    
    if (Object.keys(devices).length === 0) {
        devicesList.innerHTML = `
            <div class="empty-state">
                <p>No se encontraron objetos ELS</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="device-table-header">
            <div>Nombre</div>
            <div>Tipo</div>
            <div>Valor</div>
            <div>Acciones</div>
        </div>
    `;
    
    Object.entries(devices).forEach(([name, info]) => {
        html += `
            <div class="device-table-row" data-name="${name}">
                <div>${name}</div>
                <div>${info.type.toUpperCase()}</div>
                <div>${info.displayValue}</div>
                <div>
                    <button class="btn btn-outline btn-sm edit-btn" data-name="${name}">Editar</button>
                </div>
            </div>
        `;
    });
    
    devicesList.innerHTML = html;

    // ----- CAMBIO REALIZADO 2/2 -----
    // Se añaden los 'event listeners' a los botones de forma segura.
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const deviceName = event.currentTarget.getAttribute('data-name');
            selectDevice(deviceName);
        });
    });
}

function selectDevice(name) {
    const device = currentDevices[name];
    if (!device) return;
    
    // Remover seleccion anterior
    document.querySelectorAll('.device-table-row').forEach(row => {
        row.classList.remove('selected');
    });
    
    // Seleccionar nueva fila
    document.querySelector(`[data-name="${name}"]`).classList.add('selected');
    
    // Llenar formulario
    const deviceNameInput = document.getElementById('deviceName');
    const deleteBtn = document.getElementById('deleteDeviceBtn');
    
    // Remover prefijo ELS- para mostrar solo la parte variable
    const displayName = name.startsWith('ELS-') ? name.substring(4) : name;
    deviceNameInput.value = displayName;
    
    // Llenar campos MAC
    if (device.type === 'mac' && device.value) {
        setMacAddress(device.value);
    }
    
    selectedDevice = name;
    deleteBtn.style.display = 'inline-flex';
    
    // Scroll al formulario
    document.querySelector('.device-form-container').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

function setMacAddress(macAddress) {
    const macInputs = document.querySelectorAll('.mac-input');
    const cleanMac = macAddress.replace(/[:-]/g, '');
    
    if (cleanMac.length === 12) {
        macInputs.forEach((input, index) => {
            input.value = cleanMac.substring(index * 2, (index * 2) + 2);
        });
    }
}

function getMacAddress() {
    const macInputs = document.querySelectorAll('.mac-input');
    const macParts = Array.from(macInputs).map(input => input.value.padStart(2, '0'));
    
    // Validar que todos los campos esten llenos
    if (macParts.some(part => part === '00' && part !== macInputs[macParts.indexOf(part)].value)) {
        return null;
    }
    
    return macParts.join(':');
}

async function saveDevice(event) {
    event.preventDefault();
    
    const deviceName = document.getElementById('deviceName').value.trim();
    const macAddress = getMacAddress();
    
    if (!deviceName) {
        showNotification('error', 'Error', 'El nombre del dispositivo es requerido');
        return;
    }
    
    if (!macAddress) {
        showNotification('error', 'Error', 'Ingresa una direccion MAC valida');
        return;
    }
    
    const fullName = `ELS-${deviceName}`;
    
    try {
        const response = await fetch(`${API_BASE}/api/els-objects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: fullName,
                type: 'mac',
                value: macAddress
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', 'Exito', data.message);
            clearDeviceForm();
            loadDevices();
        } else {
            showNotification('error', 'Error', data.message);
        }
    } catch (error) {
        console.error('Error al guardar dispositivo:', error);
        showNotification('error', 'Error', 'Error de comunicacion con el servidor');
    }
}

async function deleteDevice() {
    if (!selectedDevice) {
        showNotification('warning', 'Advertencia', 'No hay dispositivo seleccionado');
        return;
    }
    
    if (!confirm(`¿Estas seguro de eliminar el objeto '${selectedDevice}'?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/els-objects/${selectedDevice}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', 'Exito', data.message);
            clearDeviceForm();
            loadDevices();
        } else {
            showNotification('error', 'Error', data.message);
        }
    } catch (error) {
        console.error('Error al eliminar dispositivo:', error);
        showNotification('error', 'Error', 'Error de comunicacion con el servidor');
    }
}

function clearDeviceForm() {
    document.getElementById('deviceName').value = '';
    document.querySelectorAll('.mac-input').forEach(input => input.value = '');
    document.getElementById('deleteDeviceBtn').style.display = 'none';
    
    // Remover seleccion
    document.querySelectorAll('.device-table-row').forEach(row => {
        row.classList.remove('selected');
    });
    
    selectedDevice = null;
}

async function loadGroups() {
    const availableMembersList = document.getElementById('availableMembers');
    const currentMembersList = document.getElementById('currentMembers');
    
    // Mostrar loading
    availableMembersList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><span>Cargando...</span></div>';
    currentMembersList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><span>Cargando...</span></div>';
    
    try {
        // Cargar objetos disponibles y grupo actual en paralelo
        const [objectsResponse, groupsResponse] = await Promise.all([
            fetch(`${API_BASE}/api/els-objects`),
            fetch(`${API_BASE}/api/address-groups`)
        ]);
        
        const objectsData = await objectsResponse.json();
        const groupsData = await groupsResponse.json();
        
        if (objectsData.success && groupsData.success) {
            const allObjects = Object.keys(objectsData.data);
            currentMembers = groupsData.data['ELS-APP'] || [];
            availableMembers = allObjects.filter(obj => !currentMembers.includes(obj));
            
            renderMemberLists();
        } else {
            availableMembersList.innerHTML = '<div class="empty-state"><p>Error al cargar datos</p></div>';
            currentMembersList.innerHTML = '<div class="empty-state"><p>Error al cargar datos</p></div>';
        }
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        availableMembersList.innerHTML = '<div class="empty-state"><p>Error de comunicacion</p></div>';
        currentMembersList.innerHTML = '<div class="empty-state"><p>Error de comunicacion</p></div>';
    }
}

function renderMemberLists() {
    const availableMembersList = document.getElementById('availableMembers');
    const currentMembersList = document.getElementById('currentMembers');
    
    // Renderizar miembros disponibles
    if (availableMembers.length === 0) {
        availableMembersList.innerHTML = '<div class="empty-state"><p>No hay objetos disponibles</p></div>';
    } else {
        let html = '';
        availableMembers.forEach(member => {
            html += `<div class="member-item" data-member="${member}">${member}</div>`;
        });
        availableMembersList.innerHTML = html;
    }
    
    // Renderizar miembros actuales
    if (currentMembers.length === 0) {
        currentMembersList.innerHTML = '<div class="empty-state"><p>El grupo esta vacio</p></div>';
    } else {
        let html = '';
        currentMembers.forEach(member => {
            html += `<div class="member-item" data-member="${member}">${member}</div>`;
        });
        currentMembersList.innerHTML = html;
    }
    
    // Agregar event listeners para seleccion
    setupMemberSelection();
}

function setupMemberSelection() {
    document.querySelectorAll('.member-item').forEach(item => {
        item.addEventListener('click', function() {
            this.classList.toggle('selected');
        });
    });
}

function addMembers() {
    const selectedAvailable = document.querySelectorAll('#availableMembers .member-item.selected');
    
    selectedAvailable.forEach(item => {
        const member = item.getAttribute('data-member');
        
        // Mover de disponibles a actuales
        const index = availableMembers.indexOf(member);
        if (index > -1) {
            availableMembers.splice(index, 1);
            currentMembers.push(member);
        }
    });
    
    // Actualizar listas
    currentMembers.sort();
    availableMembers.sort();
    renderMemberLists();
}

function removeMembers() {
    const selectedCurrent = document.querySelectorAll('#currentMembers .member-item.selected');
    
    selectedCurrent.forEach(item => {
        const member = item.getAttribute('data-member');
        
        // Mover de actuales a disponibles
        const index = currentMembers.indexOf(member);
        if (index > -1) {
            currentMembers.splice(index, 1);
            availableMembers.push(member);
        }
    });
    
    // Actualizar listas
    currentMembers.sort();
    availableMembers.sort();
    renderMemberLists();
}

async function saveGroup() {
    if (currentMembers.length === 0) {
        if (!confirm('El grupo quedara vacio. ¿Quieres guardarlo asi?')) {
            return;
        }
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/address-groups/ELS-APP`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                members: currentMembers
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', 'Exito', data.message);
        } else {
            showNotification('error', 'Error', data.message);
        }
    } catch (error) {
        console.error('Error al guardar grupo:', error);
        showNotification('error', 'Error', 'Error de comunicacion con el servidor');
    }
}

async function showDiagnostic() {
    const modal = document.getElementById('diagnosticModal');
    const results = document.getElementById('diagnosticResults');
    
    modal.classList.add('show');
    results.innerHTML = '<div class="loading"><div class="loading-spinner"></div><span>Ejecutando diagnostico...</span></div>';
    
    try {
        const response = await fetch(`${API_BASE}/api/diagnose`);
        const data = await response.json();
        
        if (data.success) {
            results.innerHTML = data.data.results.join('\n');
        } else {
            results.innerHTML = 'Error al ejecutar diagnostico: ' + data.message;
        }
    } catch (error) {
        console.error('Error en diagnostico:', error);
        results.innerHTML = 'Error de comunicacion con el servidor';
    }
}

function closeDiagnosticModal() {
    document.getElementById('diagnosticModal').classList.remove('show');
}

function showNotification(type, title, message) {
    const container = document.getElementById('notifications');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remover despues de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Permitir cerrar al hacer clic
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

// Funciones utilitarias
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Manejo de errores global
window.addEventListener('error', function(e) {
    console.error('Error global:', e.error);
    showNotification('error', 'Error', 'Ha ocurrido un error inesperado');
});

// Manejo de promesas rechazadas
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promesa rechazada:', e.reason);
    showNotification('error', 'Error', 'Error de comunicacion con el servidor');
    e.preventDefault();
});

// ----- CAMBIO REALIZADO: Se elimina esta línea -----
// Ya no es necesario exponer la función globalmente
// window.selectDevice = selectDevice;