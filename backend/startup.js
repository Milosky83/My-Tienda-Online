import { initDatabase } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Iniciando configuración de producción...');

// Crear directorio de uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Directorio uploads creado');
}

// Inicializar base de datos
console.log('📦 Inicializando base de datos...');
initDatabase();

console.log('✅ Configuración completada');
console.log('🎉 Aplicación lista para producción');