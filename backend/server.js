import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDatabase, getDb } from './database.js';

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

// Configurar CORS para producción
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://*.onrender.com',
  'https://*.railway.app'
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.some(o => o === '*' || (o.includes('*') ? origin?.includes(o.replace('*', '')) : o === origin))) {
      callback(null, true);
    } else {
      console.log('Origen no permitido:', origin);
      callback(null, true); // Permitir en desarrollo
    }
  },
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inicializar DB
initDatabase();

// Middleware para verificar token
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

// ============ FUNCIÓN PARA REGISTRAR MOVIMIENTO DE INVENTARIO ============
const registerInventoryMovement = (productId, type, quantity, reason, previousStock, newStock) => {
  const db = getDb();
  db.run(
    `INSERT INTO inventory_movements (product_id, type, quantity, reason, previous_stock, new_stock) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [productId, type, quantity, reason || '', previousStock, newStock],
    (err) => {
      if (err) {
        console.error('Error al registrar movimiento de inventario:', err);
      }
    }
  );
};

// ============ RUTAS DE AUTENTICACIÓN ============
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  const db = getDb();
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = Date.now().toString();
    
    db.run(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, hashedPassword, 'user'],
      (err) => {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'El email ya existe' });
          }
          return res.status(500).json({ error: 'Error al registrar' });
        }
        const token = jwt.sign({ id, email, role: 'user', name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id, name, email, role: 'user' } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
});

// ============ RUTAS DE PRODUCTOS ============
app.get('/api/products', (req, res) => {
  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 8;
  const offset = (page - 1) * limit;
  
  db.all('SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, products) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.get('SELECT COUNT(*) as total FROM products', (err, count) => {
      res.json({
        products: products || [],
        total: count ? count.total : 0,
        page,
        totalPages: Math.ceil((count ? count.total : 0) / limit)
      });
    });
  });
});

app.get('/api/products/:id', (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  });
});

app.post('/api/products', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  const { name, description, price, currency, stock, category, featured } = req.body;
  const db = getDb();
  const id = Date.now().toString();
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  
  db.run(
    'INSERT INTO products (id, name, description, price, currency, stock, category, image, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, description, parseFloat(price), currency || 'USD', parseInt(stock), category, imageUrl, featured === 'true' ? 1 : 0],
    (err) => {
      if (err) {
        console.error('Error al crear producto:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ id, name, description, price, currency, stock, category, image: imageUrl, featured });
    }
  );
});

app.put('/api/products/:id', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  const { name, description, price, currency, stock, category, featured } = req.body;
  const db = getDb();
  
  let query = 'UPDATE products SET name=?, description=?, price=?, currency=?, stock=?, category=?, featured=?';
  let params = [name, description || '', parseFloat(price), currency || 'USD', parseInt(stock), category || '', featured === 'true' ? 1 : 0];
  
  if (req.file) {
    query += ', image=?';
    params.push(`/uploads/${req.file.filename}`);
  }
  
  query += ' WHERE id=?';
  params.push(req.params.id);
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Error al actualizar:', err);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ success: true, message: 'Producto actualizado correctamente' });
  });
});

app.delete('/api/products/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Producto eliminado' });
  });
});

// ============ RUTAS DE COMBOS ============
app.get('/api/combos', (req, res) => {
  const db = getDb();
  
  db.all(`
    SELECT c.*, COUNT(cp.id) as products_count, SUM(cp.quantity) as total_items
    FROM combos c
    LEFT JOIN combo_products cp ON c.id = cp.combo_id
    WHERE c.active = 1
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `, (err, combos) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const combosWithProducts = [];
    let completed = 0;
    
    if (combos.length === 0) {
      return res.json([]);
    }
    
    combos.forEach((combo, index) => {
      db.all(`
        SELECT cp.*, p.name, p.price, p.currency, p.image, p.stock
        FROM combo_products cp
        JOIN products p ON cp.product_id = p.id
        WHERE cp.combo_id = ?
      `, [combo.id], (err, products) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        combosWithProducts.push({
          ...combo,
          products: products || []
        });
        
        completed++;
        if (completed === combos.length) {
          res.json(combosWithProducts);
        }
      });
    });
  });
});

app.get('/api/admin/combos', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.all(`
    SELECT c.*, COUNT(cp.id) as products_count, SUM(cp.quantity) as total_items
    FROM combos c
    LEFT JOIN combo_products cp ON c.id = cp.combo_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `, (err, combos) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const combosWithProducts = [];
    let completed = 0;
    
    if (combos.length === 0) {
      return res.json([]);
    }
    
    combos.forEach((combo, index) => {
      db.all(`
        SELECT cp.*, p.name, p.price, p.currency, p.image, p.stock
        FROM combo_products cp
        JOIN products p ON cp.product_id = p.id
        WHERE cp.combo_id = ?
      `, [combo.id], (err, products) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        combosWithProducts.push({
          ...combo,
          products: products || []
        });
        
        completed++;
        if (completed === combos.length) {
          res.json(combosWithProducts);
        }
      });
    });
  });
});

app.post('/api/combos', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, total_price, currency, active, products } = req.body;
  const db = getDb();
  const id = Date.now().toString();
  
  db.run(
    `INSERT INTO combos (id, name, description, total_price, currency, active) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, description, total_price, currency, active ? 1 : 0],
    (err) => {
      if (err) {
        console.error('Error al crear combo:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const stmt = db.prepare(`INSERT INTO combo_products 
        (combo_id, product_id, quantity, unit_price, total_price) 
        VALUES (?, ?, ?, ?, ?)`);
      
      products.forEach(product => {
        stmt.run([id, product.product_id, product.quantity, product.unit_price, product.total_price]);
      });
      stmt.finalize();
      
      res.json({ success: true, id, message: 'Combo creado exitosamente' });
    }
  );
});

app.put('/api/combos/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, total_price, currency, active, products } = req.body;
  const db = getDb();
  
  db.run(
    `UPDATE combos SET name = ?, description = ?, total_price = ?, currency = ?, active = ? WHERE id = ?`,
    [name, description, total_price, currency, active ? 1 : 0, req.params.id],
    (err) => {
      if (err) {
        console.error('Error al actualizar combo:', err);
        return res.status(500).json({ error: err.message });
      }
      
      db.run('DELETE FROM combo_products WHERE combo_id = ?', [req.params.id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const stmt = db.prepare(`INSERT INTO combo_products 
          (combo_id, product_id, quantity, unit_price, total_price) 
          VALUES (?, ?, ?, ?, ?)`);
        
        products.forEach(product => {
          stmt.run([req.params.id, product.product_id, product.quantity, product.unit_price, product.total_price]);
        });
        stmt.finalize();
        
        res.json({ success: true, message: 'Combo actualizado exitosamente' });
      });
    }
  );
});

app.delete('/api/combos/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.run('DELETE FROM combo_products WHERE combo_id = ?', [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.run('DELETE FROM combos WHERE id = ?', [req.params.id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Combo eliminado' });
    });
  });
});

// ============ RUTAS DE OFERTAS ============
app.get('/api/offers', (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.all(`
    SELECT o.*, COUNT(op.id) as products_count, SUM(op.quantity) as total_items
    FROM offers o
    LEFT JOIN offer_products op ON o.id = op.offer_id
    WHERE o.active = 1 AND o.start_date <= ? AND o.end_date >= ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [now, now], (err, offers) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const offersWithProducts = [];
    let completed = 0;
    
    if (offers.length === 0) {
      return res.json([]);
    }
    
    offers.forEach((offer, index) => {
      db.all(`
        SELECT op.*, p.name, p.price, p.currency, p.image, p.stock
        FROM offer_products op
        JOIN products p ON op.product_id = p.id
        WHERE op.offer_id = ?
      `, [offer.id], (err, products) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        offersWithProducts.push({
          ...offer,
          products: products || []
        });
        
        completed++;
        if (completed === offers.length) {
          res.json(offersWithProducts);
        }
      });
    });
  });
});

app.get('/api/admin/offers', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.all(`
    SELECT o.*, COUNT(op.id) as products_count, SUM(op.quantity) as total_items
    FROM offers o
    LEFT JOIN offer_products op ON o.id = op.offer_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, (err, offers) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const offersWithProducts = [];
    let completed = 0;
    
    if (offers.length === 0) {
      return res.json([]);
    }
    
    offers.forEach((offer, index) => {
      db.all(`
        SELECT op.*, p.name, p.price, p.currency, p.image, p.stock
        FROM offer_products op
        JOIN products p ON op.product_id = p.id
        WHERE op.offer_id = ?
      `, [offer.id], (err, products) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        offersWithProducts.push({
          ...offer,
          products: products || []
        });
        
        completed++;
        if (completed === offers.length) {
          res.json(offersWithProducts);
        }
      });
    });
  });
});

app.post('/api/offers', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, discount_percent, start_date, end_date, products } = req.body;
  const db = getDb();
  const id = Date.now().toString();
  
  db.run(
    `INSERT INTO offers (id, name, description, discount_percent, start_date, end_date, active) 
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [id, name, description, discount_percent, start_date, end_date],
    (err) => {
      if (err) {
        console.error('Error al crear oferta:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const stmt = db.prepare('INSERT INTO offer_products (offer_id, product_id, quantity, discounted_price) VALUES (?, ?, ?, ?)');
      products.forEach(product => {
        stmt.run([id, product.product_id, product.quantity, product.discounted_price || null]);
      });
      stmt.finalize();
      
      res.json({ success: true, id, message: 'Oferta creada exitosamente' });
    }
  );
});

app.put('/api/offers/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, discount_percent, start_date, end_date, active, products } = req.body;
  const db = getDb();
  
  db.run(
    `UPDATE offers SET name = ?, description = ?, discount_percent = ?, start_date = ?, end_date = ?, active = ? WHERE id = ?`,
    [name, description, discount_percent, start_date, end_date, active ? 1 : 0, req.params.id],
    (err) => {
      if (err) {
        console.error('Error al actualizar oferta:', err);
        return res.status(500).json({ error: err.message });
      }
      
      db.run('DELETE FROM offer_products WHERE offer_id = ?', [req.params.id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const stmt = db.prepare('INSERT INTO offer_products (offer_id, product_id, quantity, discounted_price) VALUES (?, ?, ?, ?)');
        products.forEach(product => {
          stmt.run([req.params.id, product.product_id, product.quantity, product.discounted_price || null]);
        });
        stmt.finalize();
        
        res.json({ success: true, message: 'Oferta actualizada exitosamente' });
      });
    }
  );
});

app.delete('/api/offers/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.run('DELETE FROM offer_products WHERE offer_id = ?', [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.run('DELETE FROM offers WHERE id = ?', [req.params.id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Oferta eliminada' });
    });
  });
});

// ============ RUTAS DE PEDIDOS ============
app.post('/api/orders', authMiddleware, (req, res) => {
  const { 
    products, 
    total, 
    senderInfo, 
    recipientInfo,
    deliveryDate,
    deliveryNotes,
    paymentMethod,
    currency = 'USD'
  } = req.body;
  
  const db = getDb();
  const orderId = Date.now().toString();
  
  if (!products || !products.length) {
    return res.status(400).json({ error: 'No hay productos en el pedido' });
  }
  
  if (!senderInfo || !recipientInfo) {
    return res.status(400).json({ error: 'Faltan datos del remitente o destinatario' });
  }
  
  db.run(
    `INSERT INTO orders (
      id, user_id, total, currency, status, 
      sender_name, sender_phone, sender_email,
      recipient_name, recipient_phone, recipient_address,
      delivery_date, delivery_notes, payment_method
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId, 
      req.user.id, 
      total || 0, 
      currency || 'USD',
      'pending',
      senderInfo.name || '',
      senderInfo.phone || '',
      senderInfo.email || '',
      recipientInfo.name || '',
      recipientInfo.phone || '',
      recipientInfo.address || '',
      deliveryDate || null,
      deliveryNotes || '',
      paymentMethod || 'cash'
    ],
    (err) => {
      if (err) {
        console.error('❌ Error al crear pedido:', err);
        return res.status(500).json({ error: err.message });
      }
      
      let processedCount = 0;
      const totalProducts = products.length;
      
      products.forEach(product => {
        db.get('SELECT stock FROM products WHERE id = ?', [product.id], (err, prod) => {
          if (err || !prod) {
            console.error('Error al obtener stock o producto no encontrado:', product.id);
            return;
          }
          
          const previousStock = prod.stock;
          const newStock = previousStock - product.quantity;
          
          if (newStock < 0) {
            console.error(`Stock insuficiente para producto ${product.id}`);
            return;
          }
          
          db.run(
            `INSERT INTO order_items (order_id, product_id, quantity, price, currency) 
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, product.id, product.quantity, product.price, currency],
            (err) => {
              if (err) console.error('Error al insertar item:', err);
            }
          );
          
          db.run(
            'UPDATE products SET stock = ? WHERE id = ?',
            [newStock, product.id],
            (err) => {
              if (!err) {
                registerInventoryMovement(
                  product.id,
                  'exit',
                  product.quantity,
                  `Pedido #${orderId.slice(-8)} - Venta realizada`,
                  previousStock,
                  newStock
                );
              }
            }
          );
          
          processedCount++;
          if (processedCount === totalProducts) {
            console.log('✅ Pedido creado exitosamente:', orderId);
            res.json({ success: true, orderId, message: 'Pedido creado exitosamente' });
          }
        });
      });
    }
  );
});

app.get('/api/orders', authMiddleware, adminMiddleware, (req, res) => {
  const { status, search, dateFrom, dateTo } = req.query;
  const db = getDb();
  
  let query = `
    SELECT o.*, u.name as user_name 
    FROM orders o 
    LEFT JOIN users u ON o.user_id = u.id 
    WHERE 1=1
  `;
  let params = [];
  
  if (status && status !== 'todos') {
    query += ' AND o.status = ?';
    params.push(status);
  }
  
  if (search) {
    query += ` AND (
      o.sender_name LIKE ? OR 
      o.sender_phone LIKE ? OR 
      o.recipient_name LIKE ? OR 
      o.recipient_phone LIKE ? OR 
      o.id LIKE ?
    )`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
  }
  
  if (dateFrom && dateFrom !== '') {
    query += ' AND DATE(o.created_at) >= DATE(?)';
    params.push(dateFrom);
  }
  
  if (dateTo && dateTo !== '') {
    query += ' AND DATE(o.created_at) <= DATE(?)';
    params.push(dateTo);
  }
  
  query += ' ORDER BY o.created_at DESC';
  
  db.all(query, params, (err, orders) => {
    if (err) {
      console.error('Error al obtener pedidos:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(orders || []);
  });
});

app.get('/api/orders/:id/items', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  db.all(`
    SELECT oi.*, p.name, p.image 
    FROM order_items oi 
    JOIN products p ON oi.product_id = p.id 
    WHERE oi.order_id = ?
  `, [req.params.id], (err, items) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(items || []);
  });
});

app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body;
  const db = getDb();
  
  db.get('SELECT status FROM orders WHERE id = ?', [req.params.id], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    const oldStatus = order.status;
    
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id], (err, items) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (status === 'cancelled' && oldStatus !== 'cancelled') {
          items.forEach(item => {
            db.get('SELECT stock FROM products WHERE id = ?', [item.product_id], (err, prod) => {
              if (!err && prod) {
                const previousStock = prod.stock;
                const newStock = previousStock + item.quantity;
                
                db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id]);
                
                registerInventoryMovement(
                  item.product_id,
                  'entry',
                  item.quantity,
                  `Pedido #${req.params.id.slice(-8)} cancelado - Devolución de stock`,
                  previousStock,
                  newStock
                );
              }
            });
          });
          res.json({ success: true, message: 'Pedido cancelado y stock devuelto' });
        } else if (oldStatus === 'cancelled' && status !== 'cancelled') {
          items.forEach(item => {
            db.get('SELECT stock FROM products WHERE id = ?', [item.product_id], (err, prod) => {
              if (!err && prod) {
                const previousStock = prod.stock;
                const newStock = previousStock - item.quantity;
                
                db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id]);
                
                registerInventoryMovement(
                  item.product_id,
                  'exit',
                  item.quantity,
                  `Pedido #${req.params.id.slice(-8)} reactivado - Venta nuevamente`,
                  previousStock,
                  newStock
                );
              }
            });
          });
          res.json({ success: true, message: 'Pedido reactivado y stock actualizado' });
        } else {
          res.json({ success: true, message: 'Estado actualizado' });
        }
      });
    });
  });
});

app.delete('/api/orders/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id], (err, items) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    items.forEach(item => {
      db.get('SELECT stock FROM products WHERE id = ?', [item.product_id], (err, prod) => {
        if (!err && prod) {
          const previousStock = prod.stock;
          const newStock = previousStock + item.quantity;
          
          db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id]);
          
          registerInventoryMovement(
            item.product_id,
            'entry',
            item.quantity,
            `Pedido #${req.params.id.slice(-8)} eliminado - Devolución de stock`,
            previousStock,
            newStock
          );
        }
      });
    });
    
    db.run('DELETE FROM order_items WHERE order_id = ?', [req.params.id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      db.run('DELETE FROM orders WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Pedido eliminado y stock devuelto' });
      });
    });
  });
});

// ============ RUTAS DE MONEDAS ============
app.get('/api/currencies', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM exchange_rates ORDER BY currency', (err, rates) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rates || []);
  });
});

app.post('/api/currencies', authMiddleware, adminMiddleware, (req, res) => {
  const { currency, rate, name, symbol } = req.body;
  const db = getDb();
  
  if (!currency || !rate) {
    return res.status(400).json({ error: 'Código de moneda y tasa son requeridos' });
  }
  
  db.run(
    'INSERT INTO exchange_rates (currency, rate, name, symbol) VALUES (?, ?, ?, ?)',
    [currency.toUpperCase(), rate, name || '', symbol || ''],
    (err) => {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'La moneda ya existe' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Moneda creada correctamente' });
    }
  );
});

app.put('/api/currencies/:currency', authMiddleware, adminMiddleware, (req, res) => {
  const { rate, name, symbol } = req.body;
  const db = getDb();
  
  db.run(
    'UPDATE exchange_rates SET rate = ?, name = ?, symbol = ?, updated_at = CURRENT_TIMESTAMP WHERE currency = ?',
    [rate, name || '', symbol || '', req.params.currency],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Moneda no encontrada' });
      }
      res.json({ success: true, message: 'Moneda actualizada correctamente' });
    }
  );
});

app.delete('/api/currencies/:currency', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  if (req.params.currency === 'USD') {
    return res.status(400).json({ error: 'No se puede eliminar la moneda base (USD)' });
  }
  
  db.run('DELETE FROM exchange_rates WHERE currency = ?', [req.params.currency], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Moneda no encontrada' });
    }
    res.json({ success: true, message: 'Moneda eliminada correctamente' });
  });
});

// ============ RUTAS DE INVENTARIO ============
app.get('/api/inventory-movements', authMiddleware, adminMiddleware, (req, res) => {
  const { productId, limit = 50 } = req.query;
  const db = getDb();
  
  let query = `
    SELECT im.*, p.name as product_name 
    FROM inventory_movements im
    JOIN products p ON im.product_id = p.id
  `;
  let params = [];
  
  if (productId && productId !== 'undefined' && productId !== 'todos') {
    query += ' WHERE im.product_id = ?';
    params.push(productId);
  }
  
  query += ' ORDER BY im.created_at DESC LIMIT ?';
  params.push(limit);
  
  db.all(query, params, (err, movements) => {
    if (err) {
      console.error('Error fetching movements:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(movements || []);
  });
});

app.post('/api/inventory-movements', authMiddleware, adminMiddleware, (req, res) => {
  const { product_id, type, quantity, reason } = req.body;
  const db = getDb();
  
  db.get('SELECT stock FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err || !product) {
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
    }
    
    db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, product_id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      registerInventoryMovement(product_id, type, quantity, reason, previousStock, newStock);
      
      res.json({ success: true, message: 'Inventario actualizado', previousStock, newStock });
    });
  });
});

app.get('/api/inventory-report', authMiddleware, adminMiddleware, (req, res) => {
  const { from, to, productId, type } = req.query;
  const db = getDb();
  
  let query = `
    SELECT 
      im.id,
      im.product_id,
      p.name as product_name,
      p.category,
      p.currency,
      im.type,
      im.quantity,
      im.reason,
      im.previous_stock,
      im.new_stock,
      im.created_at
    FROM inventory_movements im
    JOIN products p ON im.product_id = p.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (from && from !== '') {
    query += ' AND DATE(im.created_at) >= DATE(?)';
    params.push(from);
  }
  
  if (to && to !== '') {
    query += ' AND DATE(im.created_at) <= DATE(?)';
    params.push(to);
  }
  
  if (productId && productId !== 'todos') {
    query += ' AND im.product_id = ?';
    params.push(productId);
  }
  
  if (type && type !== 'todos') {
    query += ' AND im.type = ?';
    params.push(type);
  }
  
  query += ' ORDER BY im.created_at DESC';
  
  db.all(query, params, (err, movements) => {
    if (err) {
      console.error('Error al obtener reporte de inventario:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const summary = {
      total_entries: 0,
      total_exits: 0,
      net_change: 0,
      products_affected: new Set()
    };
    
    movements.forEach(m => {
      if (m.type === 'entry') {
        summary.total_entries += m.quantity;
      } else if (m.type === 'exit') {
        summary.total_exits += m.quantity;
      }
      summary.products_affected.add(m.product_id);
    });
    
    summary.net_change = summary.total_entries - summary.total_exits;
    summary.products_affected = summary.products_affected.size;
    
    res.json({
      movements: movements || [],
      summary
    });
  });
});

// ============ RUTAS DE REPORTES ============
app.get('/api/sales-report', authMiddleware, adminMiddleware, (req, res) => {
  const { from, to, category, search, currency } = req.query;
  const db = getDb();
  
  let query = `
    SELECT 
      p.id,
      p.name, 
      p.category,
      p.currency as product_currency,
      COALESCE(SUM(oi.quantity), 0) as total_sold, 
      COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue,
      COUNT(DISTINCT oi.order_id) as total_orders,
      MAX(o.created_at) as last_sale_date
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
    WHERE 1=1
  `;
  
  const params = [];
  
  if (from && from !== '') {
    query += ' AND DATE(o.created_at) >= DATE(?)';
    params.push(from);
  }
  
  if (to && to !== '') {
    query += ' AND DATE(o.created_at) <= DATE(?)';
    params.push(to);
  }
  
  if (category && category !== 'todas' && category !== '') {
    query += ' AND p.category = ?';
    params.push(category);
  }
  
  if (search && search !== '') {
    query += ' AND p.name LIKE ?';
    params.push(`%${search}%`);
  }
  
  if (currency && currency !== 'todas' && currency !== '') {
    query += ' AND o.currency = ?';
    params.push(currency);
  }
  
  query += ' GROUP BY p.id HAVING total_sold > 0 OR total_revenue > 0 ORDER BY total_sold DESC';
  
  db.all(query, params, (err, reports) => {
    if (err) {
      console.error('Error al obtener reporte:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(reports || []);
  });
});

app.get('/api/sales-report-by-currency', authMiddleware, adminMiddleware, (req, res) => {
  const { from, to } = req.query;
  const db = getDb();
  
  let query = `
    SELECT 
      o.currency,
      COUNT(DISTINCT o.id) as total_orders,
      SUM(o.total) as total_revenue,
      SUM(oi.quantity) as total_items_sold
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status != 'cancelled' AND o.status IS NOT NULL
  `;
  
  const params = [];
  
  if (from && from !== '') {
    query += ' AND DATE(o.created_at) >= DATE(?)';
    params.push(from);
  }
  
  if (to && to !== '') {
    query += ' AND DATE(o.created_at) <= DATE(?)';
    params.push(to);
  }
  
  query += ' GROUP BY o.currency ORDER BY o.currency';
  
  db.all(query, params, (err, results) => {
    if (err) {
      console.error('Error al obtener reporte por moneda:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results || []);
  });
});

app.get('/api/featured', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM products WHERE featured = 1 AND stock > 0 ORDER BY created_at DESC LIMIT 4', (err, products) => {
    res.json(products || []);
  });
});

app.get('/api/bestsellers', (req, res) => {
  const db = getDb();
  db.all(`
    SELECT p.*, COALESCE(SUM(oi.quantity), 0) as sold
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    GROUP BY p.id
    ORDER BY sold DESC
    LIMIT 4
  `, (err, products) => {
    res.json(products || []);
  });
});

app.get('/api/categories', (req, res) => {
  const db = getDb();
  db.all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category', (err, categories) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(categories.map(c => c.category).filter(c => c));
  });
});

// ============ RUTAS DE CONFIGURACIÓN DEL NEGOCIO ============
app.get('/api/business-settings', (req, res) => {
  const db = getDb();
  
  db.get('SELECT * FROM business_settings WHERE id = 1', (err, settings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
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
  });
});

app.post('/api/business-settings', authMiddleware, adminMiddleware, upload.single('logo'), (req, res) => {
  const { name, phone, email, address, website, description } = req.body;
  const db = getDb();
  
  let logoUrl = '';
  if (req.file) {
    logoUrl = `/uploads/${req.file.filename}`;
  }
  
  db.get('SELECT * FROM business_settings WHERE id = 1', (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (existing) {
      let query = `UPDATE business_settings SET 
        name = ?, phone = ?, email = ?, address = ?, website = ?, description = ?`;
      let params = [name, phone, email, address, website, description];
      
      if (logoUrl) {
        query += ', logo = ?';
        params.push(logoUrl);
      }
      
      query += ' WHERE id = 1';
      
      db.run(query, params, (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Configuración actualizada' });
      });
    } else {
      db.run(`INSERT INTO business_settings 
        (id, name, phone, email, address, website, description, logo) 
        VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [name, phone, email, address, website, description, logoUrl],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ success: true, message: 'Configuración guardada' });
        }
      );
    }
  });
});

// ============ RUTAS DE TIPOS DE CAMBIO (públicas) ============
app.get('/api/exchange-rates', (req, res) => {
  const db = getDb();
  db.all('SELECT currency, rate, name, symbol FROM exchange_rates', (err, rates) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rates || []);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV || 'development'}`);
});