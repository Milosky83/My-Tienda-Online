import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tienda_virtual',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const createTables = async () => {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Eliminar tablas si existen (para reiniciar)
    console.log('🔄 Eliminando tablas existentes...');
    
    await client.query(`DROP TABLE IF EXISTS admin_logs CASCADE`);
    await client.query(`DROP TABLE IF EXISTS user_addresses CASCADE`);
    await client.query(`DROP TABLE IF EXISTS user_coupons CASCADE`);
    await client.query(`DROP TABLE IF EXISTS order_items CASCADE`);
    await client.query(`DROP TABLE IF EXISTS orders CASCADE`);
    await client.query(`DROP TABLE IF EXISTS combo_products CASCADE`);
    await client.query(`DROP TABLE IF EXISTS combos CASCADE`);
    await client.query(`DROP TABLE IF EXISTS offer_products CASCADE`);
    await client.query(`DROP TABLE IF EXISTS offers CASCADE`);
    await client.query(`DROP TABLE IF EXISTS coupons CASCADE`);
    await client.query(`DROP TABLE IF EXISTS inventory_movements CASCADE`);
    await client.query(`DROP TABLE IF EXISTS product_images CASCADE`);
    await client.query(`DROP TABLE IF EXISTS products CASCADE`);
    await client.query(`DROP TABLE IF EXISTS exchange_rates CASCADE`);
    await client.query(`DROP TABLE IF EXISTS business_settings CASCADE`);
    await client.query(`DROP TABLE IF EXISTS users CASCADE`);
    
    console.log('✅ Tablas eliminadas');

    // Crear tabla de usuarios
    console.log('📦 Creando tabla users...');
    await client.query(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear admin por defecto
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)`,
      ['1', 'Administrador', 'admin@tienda.com', hashedPassword, 'admin']
    );
    console.log('✅ Admin creado');

    // Crear tabla de productos
    console.log('📦 Creando tabla products...');
    await client.query(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        stock INTEGER DEFAULT 0,
        category VARCHAR(100),
        image TEXT,
        featured INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar productos de ejemplo
    const products = [
      ['1', 'Smartphone Pro Max', 'Teléfono inteligente con cámara de 108MP', 899.99, 'USD', 25, 'Electrónica', '', 1],
      ['2', 'Laptop Ultra Slim', 'Computadora portátil ultraligera', 1299.99, 'USD', 15, 'Electrónica', '', 1],
      ['3', 'Auriculares Bluetooth', 'Audífonos inalámbricos', 79.99, 'USD', 50, 'Electrónica', '', 0],
      ['4', 'Camiseta Deportiva', 'Camiseta de algodón transpirable', 24.99, 'USD', 100, 'Ropa', '', 0],
      ['5', 'Mochila Ejecutiva', 'Resistente al agua', 59.99, 'USD', 40, 'Accesorios', '', 1],
      ['6', 'Reloj Inteligente', 'Monitor de ritmo cardíaco', 159.99, 'USD', 30, 'Electrónica', '', 1],
      ['7', 'Set de Cocina', 'Utensilios profesionales', 89.99, 'USD', 20, 'Hogar', '', 0],
      ['8', 'Zapatillas Running', 'Amortiguación avanzada', 79.99, 'USD', 45, 'Ropa', '', 0]
    ];
    
    for (const p of products) {
      await client.query(
        `INSERT INTO products (id, name, description, price, currency, stock, category, image, featured) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        p
      );
    }
    console.log('✅ 8 productos insertados');

    // Crear tabla de pedidos
    console.log('📦 Creando tabla orders...');
    await client.query(`
      CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        total DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'pending',
        sender_name VARCHAR(100),
        sender_phone VARCHAR(20),
        sender_email VARCHAR(100),
        recipient_name VARCHAR(100),
        recipient_phone VARCHAR(20),
        recipient_address TEXT,
        delivery_date DATE,
        delivery_notes TEXT,
        payment_method VARCHAR(50) DEFAULT 'cash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de items de pedido
    console.log('📦 Creando tabla order_items...');
    await client.query(`
      CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER DEFAULT 0,
        price DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD'
      )
    `);

    // Crear tabla de movimientos de inventario
    console.log('📦 Creando tabla inventory_movements...');
    await client.query(`
      CREATE TABLE inventory_movements (
        id SERIAL PRIMARY KEY,
        product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL,
        quantity INTEGER NOT NULL,
        reason TEXT,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de monedas
    console.log('📦 Creando tabla exchange_rates...');
    await client.query(`
      CREATE TABLE exchange_rates (
        id SERIAL PRIMARY KEY,
        currency VARCHAR(3) UNIQUE NOT NULL,
        rate DECIMAL(10,4) NOT NULL,
        name VARCHAR(50) DEFAULT '',
        symbol VARCHAR(5) DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar monedas por defecto
    const currencies = [
      ['USD', 1.00, 'Dólar Americano', '$'],
      ['EUR', 0.92, 'Euro', '€'],
      ['COP', 4000.00, 'Peso Colombiano', '$'],
      ['MXN', 17.50, 'Peso Mexicano', '$']
    ];
    
    for (const c of currencies) {
      await client.query(
        `INSERT INTO exchange_rates (currency, rate, name, symbol) VALUES ($1, $2, $3, $4)`,
        c
      );
    }
    console.log('✅ Monedas insertadas');

    // Crear tabla de configuración del negocio
    console.log('📦 Creando tabla business_settings...');
    await client.query(`
      CREATE TABLE business_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name VARCHAR(100) DEFAULT 'Tienda Virtual',
        phone VARCHAR(20) DEFAULT '573001234567',
        email VARCHAR(100) DEFAULT 'info@tiendavirtual.com',
        address TEXT DEFAULT 'Cra 1 # 2-3, Bogotá, Colombia',
        website VARCHAR(100) DEFAULT 'www.tiendavirtual.com',
        description TEXT DEFAULT 'Tu tienda de confianza',
        logo TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(
      `INSERT INTO business_settings (id, name, phone, email, address, website, description) 
       VALUES (1, 'Tienda Virtual', '573001234567', 'info@tiendavirtual.com', 
       'Cra 1 # 2-3, Bogotá, Colombia', 'www.tiendavirtual.com', 'Tu tienda de confianza')`
    );
    console.log('✅ Configuración del negocio creada');

    // Crear tabla de logs de admin
    console.log('📦 Creando tabla admin_logs...');
    await client.query(`
      CREATE TABLE admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        admin_name VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id TEXT,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await client.end();
  }
};

createTables();