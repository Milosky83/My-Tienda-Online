import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, getOne, getAll, run } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mi-secreto-2024';

// Configurar multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo imágenes son permitidas'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Funciones auxiliares
const getClientIp = (req) => {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
};

const registerAdminLog = async (adminId, adminName, action, entityType, entityId, details, ipAddress) => {
  try {
    await run(
      `INSERT INTO admin_logs (admin_id, admin_name, action, entity_type, entity_id, details, ip_address) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminId, adminName, action, entityType, entityId, details, ipAddress]
    );
  } catch (err) {
    console.error('Error al registrar log:', err.message);
  }
};

const registerInventoryMovement = async (productId, type, quantity, reason, previousStock, newStock) => {
  try {
    await run(
      `INSERT INTO inventory_movements (product_id, type, quantity, reason, previous_stock, new_stock) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [productId, type, quantity, reason, previousStock, newStock]
    );
  } catch (err) {
    console.error('Error al registrar movimiento:', err);
  }
};

// ============ INICIALIZAR BASE DE DATOS ============
const initDatabase = async () => {
  try {
    // Tabla de usuarios
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla de productos
    await run(`
      CREATE TABLE IF NOT EXISTS products (
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
    
    // Tabla de imágenes de productos
    await run(`
      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        is_main INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla de combos
    await run(`
      CREATE TABLE IF NOT EXISTS combos (
        id TEXT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        total_price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla de combo_products
    await run(`
      CREATE TABLE IF NOT EXISTS combo_products (
        id SERIAL PRIMARY KEY,
        combo_id TEXT REFERENCES combos(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL
      )
    `);
    
    // Tabla de ofertas
    await run(`
      CREATE TABLE IF NOT EXISTS offers (
        id TEXT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla de offer_products
    await run(`
      CREATE TABLE IF NOT EXISTS offer_products (
        id SERIAL PRIMARY KEY,
        offer_id TEXT REFERENCES offers(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        discounted_price DECIMAL(10,2)
      )
    `);
    
    // Tabla de inventario
    await run(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
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
    
    // Tabla de pedidos
    await run(`
      CREATE TABLE IF NOT EXISTS orders (
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
    
    // Tabla de order_items
    await run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER DEFAULT 0,
        price DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD'
      )
    `);
    
    // Tabla de monedas
    await run(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id SERIAL PRIMARY KEY,
        currency VARCHAR(3) UNIQUE NOT NULL,
        rate DECIMAL(10,4) NOT NULL,
        name VARCHAR(50) DEFAULT '',
        symbol VARCHAR(5) DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla de configuración del negocio
    await run(`
      CREATE TABLE IF NOT EXISTS business_settings (
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
    
    // Tabla de logs de admin
    await run(`
      CREATE TABLE IF NOT EXISTS admin_logs (
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
    
    // Tabla de direcciones de usuario
    await run(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla de cupones
    await run(`
      CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) DEFAULT 'percentage',
        discount_value DECIMAL(10,2) NOT NULL,
        min_purchase DECIMAL(10,2) DEFAULT 0,
        max_discount DECIMAL(10,2),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        usage_limit INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla de cupones usados
    await run(`
      CREATE TABLE IF NOT EXISTS user_coupons (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        coupon_id TEXT REFERENCES coupons(id) ON DELETE CASCADE,
        order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insertar monedas por defecto
    const currencies = [
      ['USD', 1.00, 'Dólar Americano', '$'],
      ['EUR', 0.92, 'Euro', '€'],
      ['COP', 4000.00, 'Peso Colombiano', '$'],
      ['MXN', 17.50, 'Peso Mexicano', '$'],
      ['ARS', 850.00, 'Peso Argentino', '$'],
      ['CLP', 950.00, 'Peso Chileno', '$'],
      ['PEN', 3.75, 'Sol Peruano', 'S/'],
      ['BOB', 6.91, 'Boliviano', 'Bs']
    ];
    
    for (const c of currencies) {
      await run(
        `INSERT INTO exchange_rates (currency, rate, name, symbol) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (currency) DO NOTHING`,
        c
      );
    }
    
    // Insertar configuración por defecto
    await run(`
      INSERT INTO business_settings (id, name, phone, email, address, website, description) 
      VALUES (1, 'Tienda Virtual', '573001234567', 'info@tiendavirtual.com', 
      'Cra 1 # 2-3, Bogotá, Colombia', 'www.tiendavirtual.com', 'Tu tienda de confianza')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Insertar productos de ejemplo
    const productsCount = await getOne('SELECT COUNT(*) as count FROM products');
    if (parseInt(productsCount.count) === 0) {
      const products = [
        ['1', 'Smartphone Pro Max', 'Teléfono inteligente con cámara de 108MP', 899.99, 'USD', 25, 'Electrónica', '', 1],
        ['2', 'Laptop Ultra Slim', 'Computadora portátil ultraligera', 1299.99, 'USD', 15, 'Electrónica', '', 1],
        ['3', 'Auriculares Bluetooth', 'Audífonos inalámbricos con cancelación de ruido', 79.99, 'USD', 50, 'Electrónica', '', 0],
        ['4', 'Camiseta Deportiva', 'Camiseta de algodón transpirable', 24.99, 'USD', 100, 'Ropa', '', 0],
        ['5', 'Mochila Ejecutiva', 'Resistente al agua con compartimento para laptop', 59.99, 'USD', 40, 'Accesorios', '', 1],
        ['6', 'Reloj Inteligente', 'Monitor de ritmo cardíaco y notificaciones', 159.99, 'USD', 30, 'Electrónica', '', 1],
        ['7', 'Set de Cocina', 'Utensilios de cocina profesionales', 89.99, 'USD', 20, 'Hogar', '', 0],
        ['8', 'Zapatillas Running', 'Amortiguación avanzada', 79.99, 'USD', 45, 'Ropa', '', 0]
      ];
      
      for (const p of products) {
        await run(
          `INSERT INTO products (id, name, description, price, currency, stock, category, image, featured) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          p
        );
      }
      console.log('✅ 8 productos de ejemplo insertados');
    }
    
    // Crear admin por defecto
    const admin = await getOne('SELECT * FROM users WHERE email = $1', ['admin@tienda.com']);
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await run(
        `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)`,
        ['1', 'Administrador', 'admin@tienda.com', hashedPassword, 'admin']
      );
      console.log('✅ Admin creado: admin@tienda.com / admin123');
    }
    
    console.log('✅ Base de datos PostgreSQL inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
};

await initDatabase();

// ============ RUTAS DE AUTENTICACIÓN ============
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  
  try {
    const existing = await getOne('SELECT * FROM users WHERE email = $1', [email]);
    if (existing) {
      return res.status(400).json({ error: 'El email ya existe' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = Date.now().toString();
    
    await run(
      'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
      [id, name, email, hashedPassword, 'user']
    );
    
    const token = jwt.sign({ id, email, role: 'user', name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email, role: 'user' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  
  try {
    const user = await getOne('SELECT * FROM users WHERE email = $1', [email]);
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    
    if (user.role === 'admin') {
      await registerAdminLog(user.id, user.name, 'LOGIN', 'auth', user.id, `Inicio de sesión`, getClientIp(req));
    }
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ============ RUTAS DE PRODUCTOS ============
app.get('/api/products', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 8;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const category = req.query.category || '';
  
  try {
    let queryText = 'SELECT * FROM products WHERE 1=1';
    let countText = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    let params = [];
    let countParams = [];
    let paramIndex = 1;
    
    if (search && search !== '') {
      queryText += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      countText += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (category && category !== '' && category !== 'todos') {
      queryText += ` AND category = $${paramIndex}`;
      countText += ` AND category = $${paramIndex}`;
      params.push(category);
      countParams.push(category);
      paramIndex++;
    }
    
    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const products = await getAll(queryText, params);
    const total = await getOne(countText, countParams);
    
    res.json({
      products: products || [],
      total: parseInt(total?.total) || 0,
      page,
      totalPages: Math.ceil((parseInt(total?.total) || 0) / limit),
      search
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await getOne('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  const { name, description, price, currency, stock, category, featured } = req.body;
  const id = Date.now().toString();
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  
  try {
    await run(
      `INSERT INTO products (id, name, description, price, currency, stock, category, image, featured) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, name, description, parseFloat(price), currency || 'USD', parseInt(stock), category, imageUrl, featured === 'true' ? 1 : 0]
    );
    
    await registerAdminLog(req.user.id, req.user.name, 'CREATE', 'product', id, `Creó el producto: ${name}`, getClientIp(req));
    
    res.json({ success: true, id, name, description, price, currency, stock, category, image: imageUrl, featured });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  const { name, description, price, currency, stock, category, featured } = req.body;
  
  try {
    let queryText = `UPDATE products SET 
      name = $1, description = $2, price = $3, currency = $4, 
      stock = $5, category = $6, featured = $7`;
    let params = [name, description || '', parseFloat(price), currency || 'USD', parseInt(stock), category || '', featured === 'true' ? 1 : 0];
    let paramIndex = 8;
    
    if (req.file) {
      const imageUrl = `/uploads/${req.file.filename}`;
      queryText += `, image = $${paramIndex}`;
      params.push(imageUrl);
      paramIndex++;
    }
    
    queryText += ` WHERE id = $${paramIndex}`;
    params.push(req.params.id);
    
    const result = await run(queryText, params);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    await registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'product', req.params.id, `Actualizó el producto: ${name}`, getClientIp(req));
    
    res.json({ success: true, message: 'Producto actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await getOne('SELECT name FROM products WHERE id = $1', [req.params.id]);
    const productName = product?.name || req.params.id;
    
    const result = await run('DELETE FROM products WHERE id = $1', [req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    await registerAdminLog(req.user.id, req.user.name, 'DELETE', 'product', req.params.id, `Eliminó el producto: ${productName}`, getClientIp(req));
    
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE PEDIDOS ============
app.post('/api/orders', authMiddleware, async (req, res) => {
  const { products, total, senderInfo, recipientInfo, deliveryDate, deliveryNotes, paymentMethod, currency = 'USD' } = req.body;
  const orderId = Date.now().toString();
  
  if (!products || !products.length) {
    return res.status(400).json({ error: 'No hay productos en el pedido' });
  }
  
  try {
    await run(
      `INSERT INTO orders (id, user_id, total, currency, status, sender_name, sender_phone, sender_email, 
        recipient_name, recipient_phone, recipient_address, delivery_date, delivery_notes, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [orderId, req.user.id, total || 0, currency, 'pending', senderInfo.name, senderInfo.phone, senderInfo.email,
       recipientInfo.name, recipientInfo.phone, recipientInfo.address, deliveryDate, deliveryNotes, paymentMethod]
    );
    
    for (const product of products) {
      await run(
        `INSERT INTO order_items (order_id, product_id, quantity, price, currency) VALUES ($1, $2, $3, $4, $5)`,
        [orderId, product.id, product.quantity, product.price, currency]
      );
      
      const prod = await getOne('SELECT stock FROM products WHERE id = $1', [product.id]);
      const previousStock = prod.stock;
      const newStock = previousStock - product.quantity;
      
      await run('UPDATE products SET stock = $1 WHERE id = $2', [newStock, product.id]);
      
      await registerInventoryMovement(
        product.id, 'exit', product.quantity,
        `Pedido #${orderId.slice(-8)} - Venta realizada`,
        previousStock, newStock
      );
    }
    
    res.json({ success: true, orderId, message: 'Pedido creado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await getAll('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id/items', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const items = await getAll(`
      SELECT oi.*, p.name, p.image 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = $1
    `, [req.params.id]);
    res.json(items || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  
  try {
    const order = await getOne('SELECT status FROM orders WHERE id = $1', [req.params.id]);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    const oldStatus = order.status;
    
    await run('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
    
    const items = await getAll('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [req.params.id]);
    
    // Si se cancela el pedido, devolver stock
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      for (const item of items) {
        const prod = await getOne('SELECT stock FROM products WHERE id = $1', [item.product_id]);
        const previousStock = prod.stock;
        const newStock = previousStock + item.quantity;
        
        await run('UPDATE products SET stock = $1 WHERE id = $2', [newStock, item.product_id]);
        
        await registerInventoryMovement(
          item.product_id, 'entry', item.quantity,
          `Pedido #${req.params.id.slice(-8)} cancelado - Devolución de stock`,
          previousStock, newStock
        );
      }
    }
    // Si se reactiva un pedido cancelado
    else if (oldStatus === 'cancelled' && status !== 'cancelled') {
      for (const item of items) {
        const prod = await getOne('SELECT stock FROM products WHERE id = $1', [item.product_id]);
        const previousStock = prod.stock;
        const newStock = previousStock - item.quantity;
        
        await run('UPDATE products SET stock = $1 WHERE id = $2', [newStock, item.product_id]);
        
        await registerInventoryMovement(
          item.product_id, 'exit', item.quantity,
          `Pedido #${req.params.id.slice(-8)} reactivado - Venta nuevamente`,
          previousStock, newStock
        );
      }
    }
    
    res.json({ success: true, message: 'Estado actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await getAll('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(orders || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE REPORTES ============
app.get('/api/featured', async (req, res) => {
  try {
    const products = await getAll('SELECT * FROM products WHERE featured = 1 AND stock > 0 ORDER BY created_at DESC LIMIT 4');
    res.json(products || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bestsellers', async (req, res) => {
  try {
    const products = await getAll(`
      SELECT p.*, COALESCE(SUM(oi.quantity), 0) as sold
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY sold DESC
      LIMIT 4
    `);
    res.json(products || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getAll('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ""');
    res.json(categories.map(c => c.category).filter(c => c));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE COMBOS ============
app.get('/api/combos', async (req, res) => {
  try {
    const combos = await getAll(`
      SELECT c.*, COUNT(cp.id) as products_count, SUM(cp.quantity) as total_items
      FROM combos c
      LEFT JOIN combo_products cp ON c.id = cp.combo_id
      WHERE c.active = 1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    
    const combosWithProducts = [];
    for (const combo of combos) {
      const products = await getAll(`
        SELECT cp.*, p.name, p.price, p.currency, p.image, p.stock
        FROM combo_products cp
        JOIN products p ON cp.product_id = p.id
        WHERE cp.combo_id = $1
      `, [combo.id]);
      combosWithProducts.push({ ...combo, products: products || [] });
    }
    
    res.json(combosWithProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/combos', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const combos = await getAll(`
      SELECT c.*, COUNT(cp.id) as products_count, SUM(cp.quantity) as total_items
      FROM combos c
      LEFT JOIN combo_products cp ON c.id = cp.combo_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    
    const combosWithProducts = [];
    for (const combo of combos) {
      const products = await getAll(`
        SELECT cp.*, p.name, p.price, p.currency, p.image, p.stock
        FROM combo_products cp
        JOIN products p ON cp.product_id = p.id
        WHERE cp.combo_id = $1
      `, [combo.id]);
      combosWithProducts.push({ ...combo, products: products || [] });
    }
    
    res.json(combosWithProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/combos', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, description, total_price, currency, active, products } = req.body;
  const id = Date.now().toString();
  
  try {
    await run(
      `INSERT INTO combos (id, name, description, total_price, currency, active) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name, description, total_price, currency, active ? 1 : 0]
    );
    
    for (const product of products) {
      await run(
        `INSERT INTO combo_products (combo_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)`,
        [id, product.product_id, product.quantity, product.unit_price, product.total_price]
      );
    }
    
    await registerAdminLog(req.user.id, req.user.name, 'CREATE', 'combo', id, `Creó el combo: ${name}`, getClientIp(req));
    
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/combos/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, description, total_price, currency, active, products } = req.body;
  
  try {
    await run(
      `UPDATE combos SET name = $1, description = $2, total_price = $3, currency = $4, active = $5 WHERE id = $6`,
      [name, description, total_price, currency, active ? 1 : 0, req.params.id]
    );
    
    await run('DELETE FROM combo_products WHERE combo_id = $1', [req.params.id]);
    
    for (const product of products) {
      await run(
        `INSERT INTO combo_products (combo_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)`,
        [req.params.id, product.product_id, product.quantity, product.unit_price, product.total_price]
      );
    }
    
    await registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'combo', req.params.id, `Actualizó el combo: ${name}`, getClientIp(req));
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/combos/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const combo = await getOne('SELECT name FROM combos WHERE id = $1', [req.params.id]);
    const comboName = combo?.name || req.params.id;
    
    await run('DELETE FROM combo_products WHERE combo_id = $1', [req.params.id]);
    await run('DELETE FROM combos WHERE id = $1', [req.params.id]);
    
    await registerAdminLog(req.user.id, req.user.name, 'DELETE', 'combo', req.params.id, `Eliminó el combo: ${comboName}`, getClientIp(req));
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE OFERTAS ============
app.get('/api/offers', async (req, res) => {
  const now = new Date().toISOString();
  
  try {
    const offers = await getAll(`
      SELECT o.*, COUNT(op.id) as products_count, SUM(op.quantity) as total_items
      FROM offers o
      LEFT JOIN offer_products op ON o.id = op.offer_id
      WHERE o.active = 1 AND o.start_date <= $1 AND o.end_date >= $2
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [now, now]);
    
    const offersWithProducts = [];
    for (const offer of offers) {
      const products = await getAll(`
        SELECT op.*, p.name, p.price, p.currency, p.image, p.stock
        FROM offer_products op
        JOIN products p ON op.product_id = p.id
        WHERE op.offer_id = $1
      `, [offer.id]);
      offersWithProducts.push({ ...offer, products: products || [] });
    }
    
    res.json(offersWithProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/offers', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const offers = await getAll(`
      SELECT o.*, COUNT(op.id) as products_count, SUM(op.quantity) as total_items
      FROM offers o
      LEFT JOIN offer_products op ON o.id = op.offer_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    
    const offersWithProducts = [];
    for (const offer of offers) {
      const products = await getAll(`
        SELECT op.*, p.name, p.price, p.currency, p.image, p.stock
        FROM offer_products op
        JOIN products p ON op.product_id = p.id
        WHERE op.offer_id = $1
      `, [offer.id]);
      offersWithProducts.push({ ...offer, products: products || [] });
    }
    
    res.json(offersWithProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/offers', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, description, discount_percent, start_date, end_date, products } = req.body;
  const id = Date.now().toString();
  
  try {
    await run(
      `INSERT INTO offers (id, name, description, discount_percent, start_date, end_date, active) 
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [id, name, description, discount_percent, start_date, end_date]
    );
    
    for (const product of products) {
      await run(
        `INSERT INTO offer_products (offer_id, product_id, quantity, discounted_price) VALUES ($1, $2, $3, $4)`,
        [id, product.product_id, product.quantity, product.discounted_price || null]
      );
    }
    
    await registerAdminLog(req.user.id, req.user.name, 'CREATE', 'offer', id, `Creó la oferta: ${name}`, getClientIp(req));
    
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/offers/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, description, discount_percent, start_date, end_date, active, products } = req.body;
  
  try {
    await run(
      `UPDATE offers SET name = $1, description = $2, discount_percent = $3, start_date = $4, end_date = $5, active = $6 WHERE id = $7`,
      [name, description, discount_percent, start_date, end_date, active ? 1 : 0, req.params.id]
    );
    
    await run('DELETE FROM offer_products WHERE offer_id = $1', [req.params.id]);
    
    for (const product of products) {
      await run(
        `INSERT INTO offer_products (offer_id, product_id, quantity, discounted_price) VALUES ($1, $2, $3, $4)`,
        [req.params.id, product.product_id, product.quantity, product.discounted_price || null]
      );
    }
    
    await registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'offer', req.params.id, `Actualizó la oferta: ${name}`, getClientIp(req));
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/offers/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const offer = await getOne('SELECT name FROM offers WHERE id = $1', [req.params.id]);
    const offerName = offer?.name || req.params.id;
    
    await run('DELETE FROM offer_products WHERE offer_id = $1', [req.params.id]);
    await run('DELETE FROM offers WHERE id = $1', [req.params.id]);
    
    await registerAdminLog(req.user.id, req.user.name, 'DELETE', 'offer', req.params.id, `Eliminó la oferta: ${offerName}`, getClientIp(req));
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE MONEDAS ============
app.get('/api/exchange-rates', async (req, res) => {
  try {
    const rates = await getAll('SELECT currency, rate, name, symbol FROM exchange_rates ORDER BY currency');
    res.json(rates || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/currencies', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const currencies = await getAll('SELECT * FROM exchange_rates ORDER BY currency');
    res.json(currencies || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/currencies', authMiddleware, adminMiddleware, async (req, res) => {
  const { currency, rate, name, symbol } = req.body;
  const currencyUpper = currency.toUpperCase();
  
  try {
    const existing = await getOne('SELECT * FROM exchange_rates WHERE currency = $1', [currencyUpper]);
    if (existing) {
      return res.status(400).json({ error: 'La moneda ya existe' });
    }
    
    await run(
      `INSERT INTO exchange_rates (currency, rate, name, symbol) VALUES ($1, $2, $3, $4)`,
      [currencyUpper, parseFloat(rate), name || '', symbol || '']
    );
    
    await registerAdminLog(req.user.id, req.user.name, 'CREATE', 'currency', currencyUpper, `Creó la moneda: ${currencyUpper} (Tasa: ${rate})`, getClientIp(req));
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/currencies/:currency', authMiddleware, adminMiddleware, async (req, res) => {
  const { rate, name, symbol } = req.body;
  const currencyCode = req.params.currency.toUpperCase();
  
  try {
    const result = await run(
      `UPDATE exchange_rates SET rate = $1, name = $2, symbol = $3, updated_at = CURRENT_TIMESTAMP WHERE currency = $4`,
      [parseFloat(rate), name || '', symbol || '', currencyCode]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Moneda no encontrada' });
    }
    
    await registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'currency', currencyCode, `Actualizó la moneda: ${currencyCode} (Nueva tasa: ${rate})`, getClientIp(req));
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/currencies/:currency', authMiddleware, adminMiddleware, async (req, res) => {
  const currencyCode = req.params.currency.toUpperCase();
  
  if (currencyCode === 'USD') {
    return res.status(400).json({ error: 'No se puede eliminar la moneda base (USD)' });
  }
  
  try {
    const result = await run('DELETE FROM exchange_rates WHERE currency = $1', [currencyCode]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Moneda no encontrada' });
    }
    
    await registerAdminLog(req.user.id, req.user.name, 'DELETE', 'currency', currencyCode, `Eliminó la moneda: ${currencyCode}`, getClientIp(req));
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE INVENTARIO ============
app.get('/api/inventory-movements', authMiddleware, adminMiddleware, async (req, res) => {
  const { productId, limit = 50 } = req.query;
  
  try {
    let queryText = `
      SELECT im.*, p.name as product_name 
      FROM inventory_movements im
      JOIN products p ON im.product_id = p.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;
    
    if (productId && productId !== 'undefined' && productId !== 'todos') {
      queryText += ` AND im.product_id = $${paramIndex}`;
      params.push(productId);
      paramIndex++;
    }
    
    queryText += ` ORDER BY im.created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));
    
    const movements = await getAll(queryText, params);
    res.json(movements || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory-movements', authMiddleware, adminMiddleware, async (req, res) => {
  const { product_id, type, quantity, reason } = req.body;
  
  try {
    const product = await getOne('SELECT stock, name FROM products WHERE id = $1', [product_id]);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const previousStock = product.stock;
    let newStock = previousStock;
    
    if (type === 'entry') {
      newStock = previousStock + quantity;
    } else if (type === 'exit') {
      if (previousStock < quantity) {
        return res.status(400).json({ error: 'Stock insuficiente' });
      }
      newStock = previousStock - quantity;
    } else {
      return res.status(400).json({ error: 'Tipo de movimiento inválido' });
    }
    
    await run('UPDATE products SET stock = $1 WHERE id = $2', [newStock, product_id]);
    
    await registerInventoryMovement(product_id, type, quantity, reason, previousStock, newStock);
    
    await registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'inventory', product_id, `${type === 'entry' ? 'Agregó' : 'Quitó'} ${quantity} unidades de ${product.name}. Razón: ${reason || 'No especificada'}`, getClientIp(req));
    
    res.json({ success: true, message: 'Inventario actualizado', previousStock, newStock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE CONFIGURACIÓN ============
app.get('/api/business-settings', async (req, res) => {
  try {
    const settings = await getOne('SELECT * FROM business_settings WHERE id = 1');
    if (!settings) {
      return res.json({
        name: 'Tienda Virtual',
        phone: '573001234567',
        email: 'info@tiendavirtual.com',
        address: 'Cra 1 # 2-3, Bogotá, Colombia',
        website: 'www.tiendavirtual.com',
        description: 'Tu tienda de confianza',
        logo: ''
      });
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/business-settings', authMiddleware, adminMiddleware, upload.single('logo'), async (req, res) => {
  const { name, phone, email, address, website, description } = req.body;
  let logoUrl = '';
  if (req.file) {
    logoUrl = `/uploads/${req.file.filename}`;
  }
  
  try {
    const existing = await getOne('SELECT * FROM business_settings WHERE id = 1');
    
    if (existing) {
      let queryText = `UPDATE business_settings SET 
        name = $1, phone = $2, email = $3, address = $4, website = $5, description = $6`;
      let params = [name, phone, email, address, website, description];
      let paramIndex = 7;
      
      if (logoUrl) {
        queryText += `, logo = $${paramIndex}`;
        params.push(logoUrl);
        paramIndex++;
      }
      
      queryText += ` WHERE id = 1`;
      await run(queryText, params);
    } else {
      await run(
        `INSERT INTO business_settings (id, name, phone, email, address, website, description, logo) 
         VALUES (1, $1, $2, $3, $4, $5, $6, $7)`,
        [name, phone, email, address, website, description, logoUrl]
      );
    }
    
    await registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'settings', '1', `Actualizó la configuración del negocio`, getClientIp(req));
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE LOGS ============
app.get('/api/admin/logs', authMiddleware, adminMiddleware, async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  
  if (req.user.id !== '1') {
    return res.status(403).json({ error: 'Solo el administrador principal puede ver los logs' });
  }
  
  try {
    const logs = await getAll(
      'SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );
    const total = await getOne('SELECT COUNT(*) as total FROM admin_logs');
    res.json({ logs: logs || [], total: total?.total || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/logs/:id', authMiddleware, adminMiddleware, async (req, res) => {
  if (req.user.id !== '1') {
    return res.status(403).json({ error: 'Solo el administrador principal puede eliminar logs' });
  }
  
  try {
    await run('DELETE FROM admin_logs WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE DIRECCIONES ============
app.get('/api/user-addresses', authMiddleware, async (req, res) => {
  try {
    const addresses = await getAll(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json(addresses || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user-addresses', authMiddleware, async (req, res) => {
  const { name, phone, address, city, isDefault } = req.body;
  const id = Date.now().toString();
  
  try {
    if (isDefault) {
      await run('UPDATE user_addresses SET is_default = 0 WHERE user_id = $1', [req.user.id]);
    }
    
    await run(
      `INSERT INTO user_addresses (id, user_id, name, phone, address, city, is_default) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.user.id, name, phone, address, city, isDefault ? 1 : 0]
    );
    
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/user-addresses/:id/default', authMiddleware, async (req, res) => {
  try {
    await run('UPDATE user_addresses SET is_default = 0 WHERE user_id = $1', [req.user.id]);
    await run('UPDATE user_addresses SET is_default = 1 WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/user-addresses/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE REPORTES DE VENTAS ============
app.get('/api/sales-report', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const reports = await getAll(`
      SELECT 
        p.id,
        p.name, 
        p.category,
        p.currency as product_currency,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity ELSE 0 END), 0) as total_sold, 
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity * oi.price ELSE 0 END), 0) as total_revenue,
        COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN oi.order_id END) as total_orders
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      GROUP BY p.id
      ORDER BY total_sold DESC
    `);
    res.json(reports || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sales-report-by-currency', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const reports = await getAll(`
      SELECT 
        o.currency,
        COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.id END) as total_orders,
        SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END) as total_revenue,
        SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity ELSE 0 END) as total_items_sold
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.currency
    `);
    res.json(reports || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🐘 Base de datos: PostgreSQL`);
});