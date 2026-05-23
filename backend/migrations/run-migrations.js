import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  console.log('🚀 Iniciando migración a PostgreSQL...');
  
  try {
    const sql = fs.readFileSync(path.join(__dirname, '001_init.sql'), 'utf8');
    
    // Dividir las sentencias SQL
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log('✅ Ejecutada:', statement.substring(0, 50) + '...');
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error('❌ Error:', err.message);
          }
        }
      }
    }
    
    console.log('🎉 Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await pool.end();
  }
};

runMigrations();