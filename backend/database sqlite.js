import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

let db = null;

export const initDatabase = () => {
  db = new sqlite3.Database('./tienda.db');
  
  db.serialize(() => {
    // ============ TABLA DE USUARIOS ============
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Crear admin por defecto
    db.get('SELECT * FROM users WHERE email = ?', ['admin@tienda.com'], (err, row) => {
      if (!row && !err) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(
          'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
          ['1', 'Administrador', 'admin@tienda.com', hashedPassword, 'admin']
        );
        console.log('✅ Admin creado: admin@tienda.com / admin123');
      }
    });
    
    // ============ TABLA DE PRODUCTOS ============
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        stock INTEGER DEFAULT 0,
        category TEXT,
        image TEXT,
        featured INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ============ TABLA DE MOVIMIENTOS DE INVENTARIO ============
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reason TEXT,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    
    // ============ TABLA DE TIPOS DE CAMBIO (MONEDAS) ============
    db.run(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency TEXT NOT NULL UNIQUE,
        rate REAL NOT NULL,
        name TEXT DEFAULT '',
        symbol TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insertar monedas por defecto
    db.get('SELECT COUNT(*) as count FROM exchange_rates', (err, row) => {
      if (!err && row && row.count === 0) {
        const defaultRates = [
          ['USD', 1.00, 'Dólar Americano', '$'],
          ['EUR', 0.92, 'Euro', '€'],
          ['COP', 4000.00, 'Peso Colombiano', '$'],
          ['MXN', 17.50, 'Peso Mexicano', '$'],
          ['ARS', 850.00, 'Peso Argentino', '$'],
          ['CLP', 950.00, 'Peso Chileno', '$'],
          ['PEN', 3.75, 'Sol Peruano', 'S/'],
          ['BOB', 6.91, 'Boliviano', 'Bs']
        ];
        
        const stmt = db.prepare('INSERT INTO exchange_rates (currency, rate, name, symbol) VALUES (?, ?, ?, ?)');
        defaultRates.forEach(rate => {
          stmt.run(rate);
        });
        stmt.finalize();
        console.log('✅ Monedas por defecto insertadas');
      }
    });
    
    // ============ TABLA DE PEDIDOS ============
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        total REAL,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'pending',
        sender_name TEXT,
        sender_phone TEXT,
        sender_email TEXT,
        recipient_name TEXT,
        recipient_phone TEXT,
        recipient_address TEXT,
        delivery_date TEXT,
        delivery_notes TEXT,
        payment_method TEXT DEFAULT 'cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // ============ TABLA DE ITEMS DE PEDIDO ============
    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT,
        product_id TEXT,
        quantity INTEGER DEFAULT 0,
        price REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    
    // ============ TABLA DE LOGS DE ADMIN ============
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id TEXT NOT NULL,
        admin_name TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )
    `);
    
    // ============ TABLA DE COMBOS ============
    db.run(`
      CREATE TABLE IF NOT EXISTS combos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        total_price REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ============ TABLA DE PRODUCTOS EN COMBO ============
    db.run(`
      CREATE TABLE IF NOT EXISTS combo_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        combo_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (combo_id) REFERENCES combos(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    
    // ============ TABLA DE OFERTAS ============
    db.run(`
      CREATE TABLE IF NOT EXISTS offers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        discount_percent REAL DEFAULT 0,
        start_date DATETIME,
        end_date DATETIME,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ============ TABLA DE PRODUCTOS EN OFERTA ============
    db.run(`
      CREATE TABLE IF NOT EXISTS offer_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        discounted_price REAL,
        FOREIGN KEY (offer_id) REFERENCES offers(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    
    // ============ TABLA DE CUPONES ============
    db.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        discount_type TEXT DEFAULT 'percentage',
        discount_value REAL NOT NULL,
        min_purchase REAL DEFAULT 0,
        max_discount REAL,
        start_date DATETIME,
        end_date DATETIME,
        usage_limit INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ============ TABLA DE CONFIGURACIÓN DEL NEGOCIO ============
    db.run(`
      CREATE TABLE IF NOT EXISTS business_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT DEFAULT 'Tienda Virtual',
        phone TEXT DEFAULT '573001234567',
        email TEXT DEFAULT 'info@tiendavirtual.com',
        address TEXT DEFAULT 'Cra 1 # 2-3, Bogotá, Colombia',
        website TEXT DEFAULT 'www.tiendavirtual.com',
        description TEXT DEFAULT 'Tu tienda de confianza',
        logo TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insertar configuración de negocio por defecto
    db.get('SELECT * FROM business_settings WHERE id = 1', (err, row) => {
      if (!row && !err) {
        db.run(
          `INSERT INTO business_settings (id, name, phone, email, address, website, description) 
           VALUES (1, 'Tienda Virtual', '573001234567', 'info@tiendavirtual.com', 
           'Cra 1 # 2-3, Bogotá, Colombia', 'www.tiendavirtual.com', 'Tu tienda de confianza')`
        );
        console.log('✅ Configuración de negocio creada');
      }
    });
    
    // Insertar productos de ejemplo
    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
      if (row && row.count === 0) {
        const sampleProducts = [
          ['1', 'Smartphone Pro Max', 'Teléfono inteligente', 899.99, 'USD', 25, 'Electrónica', '', 1],
          ['2', 'Laptop Ultra Slim', 'Computadora portátil', 1299.99, 'USD', 15, 'Electrónica', '', 1],
          ['3', 'Auriculares Bluetooth', 'Audífonos inalámbricos', 79.99, 'USD', 50, 'Electrónica', '', 0],
          ['4', 'Camiseta Deportiva', 'Camiseta de algodón', 24.99, 'USD', 100, 'Ropa', '', 0],
          ['5', 'Mochila Ejecutiva', 'Resistente al agua', 59.99, 'USD', 40, 'Accesorios', '', 1],
          ['6', 'Reloj Inteligente', 'Monitor de ritmo cardíaco', 159.99, 'USD', 30, 'Electrónica', '', 1],
          ['7', 'Set de Cocina', 'Utensilios profesionales', 89.99, 'USD', 20, 'Hogar', '', 0],
          ['8', 'Zapatillas Running', 'Amortiguación avanzada', 79.99, 'USD', 45, 'Ropa', '', 0]
        ];
        
        const stmt = db.prepare('INSERT INTO products (id, name, description, price, currency, stock, category, image, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        sampleProducts.forEach(p => stmt.run(p));
        stmt.finalize();
        console.log('✅ 8 productos de ejemplo insertados');
      }
    });
    
    console.log('✅ Base de datos inicializada correctamente');
  });
  
  return db;
};

export const getDb = () => {
  if (!db) {
    return initDatabase();
  }
  return db;
};