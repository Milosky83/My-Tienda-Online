import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extensiones de archivo a procesar
const extensions = ['.jsx', '.js'];

// Directorios a procesar
const directories = ['src/components', 'src/pages', 'src/context'];

// Patrones de búsqueda
const alertPatterns = [
  /alert\(`([^`]*)`\)/g,
  /alert\(["']([^"']*)["']\)/g,
  /alert\('([^']*)'\)/g,
  /alert\("([^"]*)"\)/g
];

// Función para convertir mensaje de alert a toast
const convertAlertToToast = (content, filePath) => {
  let newContent = content;
  let hasChanges = false;
  let hasUseToast = false;
  let hasToastImport = false;

  // Verificar si ya existe useToast
  if (content.includes('useToast')) {
    hasUseToast = true;
  }

  // Verificar si ya existe import de useToast
  if (content.includes("import { useToast } from '../context/ToastContext'") ||
      content.includes('import { useToast } from "../context/ToastContext"')) {
    hasToastImport = true;
  }

  // Reemplazar alerts
  for (const pattern of alertPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const originalAlert = match[0];
      const message = match[1];
      
      // Determinar tipo de toast basado en el mensaje
      let toastType = 'success';
      if (message.includes('❌') || message.includes('Error') || message.includes('error') || message.includes('Error') || message.includes('incorrecto')) {
        toastType = 'error';
      } else if (message.includes('⚠️') || message.includes('advertencia')) {
        toastType = 'warning';
      } else if (message.includes('✅') || message.includes('éxito') || message.includes('correctamente')) {
        toastType = 'success';
      } else {
        toastType = 'info';
      }
      
      const newToast = `toast${toastType.charAt(0).toUpperCase() + toastType.slice  (1)}(${originalAlert.replace('alert', '').replace(/\(/g, '').replace(/\)/g, '').trim()})`;
      const replacement = `${toastType === 'success' ? 'success' : toastType === 'error' ? 'error' : toastType === 'warning' ? 'warning' : 'info'}(${originalAlert.replace(/alert\(/, '').replace(/\)$/, '')})`;
      
      newContent = newContent.replace(originalAlert, `${toastType}(\`${message}\`)`);
      hasChanges = true;
    }
  }

  // Agregar import de useToast si es necesario
  if (hasChanges && !hasToastImport) {
    const importStatement = "import { useToast } from '../context/ToastContext';";
    
    // Buscar el último import para agregar después
    const importRegex = /import .+ from .+;/g;
    const imports = newContent.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      newContent = newContent.replace(lastImport, `${lastImport}\n${importStatement}`);
    } else {
      newContent = `${importStatement}\n${newContent}`;
    }
  }

  // Agregar hook useToast si es necesario
  if (hasChanges && !hasUseToast) {
    // Buscar el componente function
    const functionRegex = /(function\s+\w+\s*\([^)]*\)\s*\{|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{)/;
    const match = newContent.match(functionRegex);
    if (match) {
      const functionStart = match[0];
      newContent = newContent.replace(functionStart, `${functionStart}\n  const { success, error, warning, info } = useToast();`);
      hasUseToast = true;
    }
  }

  return { content: newContent, hasChanges };
};

// Función para procesar un archivo
const processFile = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, hasChanges } = convertAlertToToast(content, filePath);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Procesado: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️ Sin cambios: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return false;
  }
};

// Función para recorrer directorios
const processDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`⚠️ Directorio no encontrado: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (extensions.includes(path.extname(file))) {
      processFile(filePath);
    }
  }
};

// Función principal
const main = () => {
  console.log('🚀 Iniciando reemplazo de alerts por toasts...\n');
  
  let processedCount = 0;
  
  for (const dir of directories) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      console.log(`📁 Procesando: ${dir}`);
      processDirectory(fullPath);
      processedCount++;
    } else {
      console.log(`⚠️ Directorio no encontrado: ${dir}`);
    }
  }
  
  console.log('\n✨ Proceso completado!');
  console.log('📝 Recuerda:');
  console.log('   1. Asegúrate de que ToastProvider esté en App.jsx');
  console.log('   2. Verifica que useToast esté importado correctamente');
  console.log('   3. Los toasts mostrarán mensajes temporales en lugar de alerts');
};

// Ejecutar script
main();