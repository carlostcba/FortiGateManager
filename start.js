#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colores para output en consola
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(color + message + colors.reset);
}

function checkEnvironment() {
    log(colors.blue, '=== Verificando entorno de ejecucion ===\n');
    
    // Verificar version de Node.js
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion < 16) {
        log(colors.red, `❌ Error: Node.js version ${nodeVersion} no es compatible`);
        log(colors.yellow, '   Requiere Node.js >= 16.0.0');
        process.exit(1);
    }
    
    log(colors.green, `✓ Node.js version ${nodeVersion} - Compatible`);
    
    // Verificar archivo .env
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        log(colors.red, '❌ Error: Archivo .env no encontrado');
        log(colors.yellow, '   Ejecuta: cp .env.example .env');
        log(colors.yellow, '   Luego edita el archivo .env con tus credenciales');
        process.exit(1);
    }
    
    log(colors.green, '✓ Archivo .env encontrado');
    
    // Cargar y verificar variables de entorno
    require('dotenv').config();
    
    const requiredVars = [
        'FORTIGATE_HOST',
        'FORTIGATE_USERNAME', 
        'FORTIGATE_PASSWORD'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        log(colors.red, '❌ Error: Variables de entorno faltantes:');
        missingVars.forEach(varName => {
            log(colors.yellow, `   ${varName}`);
        });
        log(colors.yellow, '\n   Edita el archivo .env con las credenciales correctas');
        process.exit(1);
    }
    
    log(colors.green, '✓ Variables de entorno configuradas');
    
    // Verificar estructura de directorios
    const requiredDirs = ['lib', 'public'];
    const missingDirs = requiredDirs.filter(dir => !fs.existsSync(path.join(__dirname, dir)));
    
    if (missingDirs.length > 0) {
        log(colors.red, '❌ Error: Directorios faltantes:');
        missingDirs.forEach(dir => {
            log(colors.yellow, `   ${dir}/`);
        });
        process.exit(1);
    }
    
    log(colors.green, '✓ Estructura de directorios correcta');
    
    // Verificar archivos principales
    const requiredFiles = [
        'server.js',
        'lib/FortiGateManager.js',
        'public/index.html',
        'public/app.js',
        'public/styles.css'
    ];
    
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(__dirname, file)));
    
    if (missingFiles.length > 0) {
        log(colors.red, '❌ Error: Archivos faltantes:');
        missingFiles.forEach(file => {
            log(colors.yellow, `   ${file}`);
        });
        process.exit(1);
    }
    
    log(colors.green, '✓ Archivos principales encontrados');
    
    // Verificar dependencias
    try {
        require('express');
        require('node-ssh');
        require('socket.io');
        log(colors.green, '✓ Dependencias principales instaladas');
    } catch (error) {
        log(colors.red, '❌ Error: Dependencias faltantes');
        log(colors.yellow, '   Ejecuta: npm install');
        process.exit(1);
    }
    
    log(colors.green, '\n✓ Todas las verificaciones pasaron correctamente\n');
}

function showConfig() {
    log(colors.blue, '=== Configuracion actual ===\n');
    
    const config = {
        'Servidor': `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`,
        'FortiGate Host': process.env.FORTIGATE_HOST,
        'FortiGate Usuario': process.env.FORTIGATE_USERNAME,
        'FortiGate Puerto': process.env.FORTIGATE_PORT || '22',
        'Timeout': `${process.env.FORTIGATE_TIMEOUT || 20000}ms`,
        'Entorno': process.env.NODE_ENV || 'development'
    };
    
    Object.entries(config).forEach(([key, value]) => {
        log(colors.green, `${key.padEnd(20)}: ${value}`);
    });
    
    console.log();
}

function startServer() {
    log(colors.blue, '=== Iniciando FortiGate Manager ===\n');
    
    // Crear directorio de logs si no existe
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
        log(colors.green, '✓ Directorio de logs creado');
    }
    
    // Iniciar servidor principal
    require('./server.js');
}

// Manejo de señales del sistema
process.on('SIGINT', () => {
    log(colors.yellow, '\n🛑 Cerrando FortiGate Manager...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log(colors.yellow, '\n🛑 Cerrando FortiGate Manager...');
    process.exit(0);
});

// Ejecutar verificaciones y iniciar
try {
    checkEnvironment();
    showConfig();
    startServer();
} catch (error) {
    log(colors.red, `❌ Error fatal: ${error.message}`);
    process.exit(1);
}