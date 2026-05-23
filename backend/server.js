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

// Configurar multer para subida de imágenes
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
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inicializar DB
initDatabase();

// ============ FUNCIONES AUXILIARES ============

// Obtener IP del cliente
const getClientIp = (req) => {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
};

// Registrar movimiento de inventario
const registerInventoryMovement = (productId, type, quantity, reason, previousStock, newStock) => {
  const db = getDb();
  db.run(
    `INSERT INTO inventory_movements (product_id, type, quantity, reason, previous_stock, new_stock) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [productId, type, quantity, reason || '', previousStock, newStock],
    (err) => {
      if (err) console.error('Error al registrar movimiento:', err);
    }
  );
};

// Registrar log de administrador
// Función para registrar logs de administrador (con manejo de errores)
const registerAdminLog = (adminId, adminName, action, entityType, entityId, details, ipAddress) => {
  const db = getDb();
  db.run(
    `INSERT INTO admin_logs (admin_id, admin_name, action, entity_type, entity_id, details, ip_address) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [adminId || '', adminName || '', action || '', entityType || '', entityId || null, details || '', ipAddress || ''],
    (err) => {
      if (err) {
        // Solo mostrar error en consola, no detener la ejecución
        console.error('Error al registrar log:', err.message);
      }
    }
  );
};

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

// ============ RUTAS DE AUTENTICACIÓN ============

// Registro de usuario
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

// Login
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
    
    // Log de login para admin
    if (user.role === 'admin') {
      registerAdminLog(user.id, user.name, 'LOGIN', 'auth', user.id, `Inicio de sesión`, getClientIp(req));
    }
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
});

// ============ RUTAS DE PRODUCTOS ============

// Obtener todos los productos
app.get('/api/products', (req, res) => {
  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 8;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const category = req.query.category || '';
  
  console.log('Filtros recibidos - category:', category, 'search:', search);
  
  let query = 'SELECT * FROM products WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
  let params = [];
  let countParams = [];
  
  // Filtro por búsqueda
  if (search && search !== '') {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    countQuery += ' AND (name LIKE ? OR description LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
    countParams.push(searchParam, searchParam);
  }
  
  // Filtro por categoría - IMPORTANTE
  if (category && category !== '' && category !== 'undefined' && category !== 'todos') {
    query += ' AND category = ?';
    countQuery += ' AND category = ?';
    params.push(category);
    countParams.push(category);
    console.log('Aplicando filtro de categoría:', category);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  console.log('Query:', query);
  console.log('Params:', params);
  
  db.all(query, params, (err, products) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ error: err.message });
    }
    
    db.get(countQuery, countParams, (err, count) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`Productos encontrados: ${products.length}, Total: ${count ? count.total : 0}`);
      
      res.json({
        products: products || [],
        total: count ? count.total : 0,
        page,
        totalPages: Math.ceil((count ? count.total : 0) / limit),
        search
      });
    });
  });
});
// Obtener producto por ID
app.get('/api/products/:id', (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  });
});

// Crear producto
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
        return res.status(500).json({ error: err.message });
      }
      
      registerAdminLog(req.user.id, req.user.name, 'CREATE', 'product', id, `Creó el producto: ${name}`, getClientIp(req));
      
      res.json({ success: true, id, name, description, price, currency, stock, category, image: imageUrl, featured });
    }
  );
});

// Actualizar producto
app.put('/api/products/:id', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  const { name, description, price, currency, stock, category, featured } = req.body;
  const db = getDb();
  
  let query = 'UPDATE products SET name=?, description=?, price=?, currency=?, stock=?, category=?, featured=?';
  let params = [name, description || '', parseFloat(price), currency || 'USD', parseInt(stock), category || '', featured === 'true' ? 1 : 0];
  
  if (req.file) {
    const imageUrl = `/uploads/${req.file.filename}`;
    query += ', image=?';
    params.push(imageUrl);
  }
  
  query += ' WHERE id=?';
  params.push(req.params.id);
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'product', req.params.id, `Actualizó el producto: ${name}`, getClientIp(req));
    
    res.json({ success: true, message: 'Producto actualizado correctamente' });
  });
});

// Eliminar producto
app.delete('/api/products/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.get('SELECT name FROM products WHERE id = ?', [req.params.id], (err, product) => {
    const productName = product?.name || req.params.id;
    
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      registerAdminLog(req.user.id, req.user.name, 'DELETE', 'product', req.params.id, `Eliminó el producto: ${productName}`, getClientIp(req));
      
      res.json({ success: true, message: 'Producto eliminado' });
    });
  });
});

// ============ RUTAS DE PEDIDOS ============

// Crear pedido
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
        return res.status(500).json({ error: err.message });
      }
      
      let processedCount = 0;
      const totalProducts = products.length;
      
      products.forEach(product => {
        db.get('SELECT stock FROM products WHERE id = ?', [product.id], (err, prod) => {
          if (err || !prod) return;
          
          const previousStock = prod.stock;
          const newStock = previousStock - product.quantity;
          
          if (newStock < 0) return;
          
          db.run(
            `INSERT INTO order_items (order_id, product_id, quantity, price, currency) 
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, product.id, product.quantity, product.price, currency]
          );
          
          db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, product.id]);
          
          registerInventoryMovement(
            product.id, 'exit', product.quantity,
            `Pedido #${orderId.slice(-8)} - Venta realizada`,
            previousStock, newStock
          );
          
          processedCount++;
          if (processedCount === totalProducts) {
            res.json({ success: true, orderId, message: 'Pedido creado exitosamente' });
          }
        });
      });
    }
  );
});

// Obtener todos los pedidos (admin)
app.get('/api/orders', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, orders) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(orders || []);
  });
});

// Obtener items de un pedido
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

// Actualizar estado del pedido (con actualización de stock)
// Cancelar pedido - actualiza stock y reportes
app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body;
  const db = getDb();
  
  // Obtener estado actual y datos del pedido
  db.get('SELECT status, total, currency FROM orders WHERE id = ?', [req.params.id], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    const oldStatus = order.status;
    
    // Actualizar estado
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Obtener items del pedido
      db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id], (err, items) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Si se cancela el pedido (pendiente -> cancelado)
        if (status === 'cancelled' && oldStatus !== 'cancelled' && oldStatus !== 'completed') {
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
          
          registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'order', req.params.id, `Canceló el pedido #${req.params.id.slice(-8)}. Total: ${order.currency} ${order.total}`, getClientIp(req));
          
          res.json({ success: true, message: 'Pedido cancelado, stock devuelto y venta eliminada del reporte' });
        } 
        // Si se reactiva un pedido cancelado
        else if (oldStatus === 'cancelled' && status !== 'cancelled') {
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
          
          registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'order', req.params.id, `Reactivó el pedido #${req.params.id.slice(-8)}. Total: ${order.currency} ${order.total}`, getClientIp(req));
          
          res.json({ success: true, message: 'Pedido reactivado, stock actualizado y venta agregada al reporte' });
        }
        else {
          res.json({ success: true, message: 'Estado actualizado' });
        }
      });
    });
  });
});

// Actualizar pedido completo (con actualización de stock)
app.put('/api/orders/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { 
    sender_name, sender_phone, sender_email,
    recipient_name, recipient_phone, recipient_address,
    status, total, payment_method, delivery_date, delivery_notes
  } = req.body;
  const db = getDb();
  
  // Obtener estado actual
  db.get('SELECT status FROM orders WHERE id = ?', [req.params.id], (err, oldOrder) => {
    if (err || !oldOrder) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    const oldStatus = oldOrder.status;
    
    db.run(
      `UPDATE orders SET 
        sender_name = ?, sender_phone = ?, sender_email = ?,
        recipient_name = ?, recipient_phone = ?, recipient_address = ?,
        status = ?, total = ?, payment_method = ?, delivery_date = ?, delivery_notes = ?
       WHERE id = ?`,
      [sender_name, sender_phone, sender_email, recipient_name, recipient_phone, recipient_address, status, total, payment_method, delivery_date, delivery_notes, req.params.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Manejar stock según cambio de estado
        if (status === 'cancelled' && oldStatus !== 'cancelled') {
          db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id], (err, items) => {
            if (!err && items) {
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
                      `Pedido #${req.params.id.slice(-8)} actualizado a cancelado`,
                      previousStock,
                      newStock
                    );
                  }
                });
              });
            }
          });
        } else if (oldStatus === 'cancelled' && status !== 'cancelled') {
          db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id], (err, items) => {
            if (!err && items) {
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
                      `Pedido #${req.params.id.slice(-8)} reactivado desde cancelado`,
                      previousStock,
                      newStock
                    );
                  }
                });
              });
            }
          });
        }
        
        registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'order', req.params.id, `Editó el pedido #${req.params.id.slice(-8)}`, getClientIp(req));
        
        res.json({ success: true, message: 'Pedido actualizado' });
      }
    );
  });
});

// Actualizar items del pedido (con actualización de stock)
app.put('/api/orders/:id/items', authMiddleware, adminMiddleware, (req, res) => {
  const { items } = req.body;
  const db = getDb();
  const orderId = req.params.id;
  
  // Obtener items antiguos
  db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId], (err, oldItems) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Devolver stock de items antiguos
    oldItems.forEach(item => {
      db.get('SELECT stock FROM products WHERE id = ?', [item.product_id], (err, prod) => {
        if (!err && prod) {
          const previousStock = prod.stock;
          const newStock = previousStock + item.quantity;
          
          db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id]);
          
          registerInventoryMovement(
            item.product_id,
            'entry',
            item.quantity,
            `Pedido #${orderId.slice(-8)} - Eliminando item antiguo`,
            previousStock,
            newStock
          );
        }
      });
    });
    
    // Eliminar items antiguos
    db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Insertar nuevos items
      const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
      items.forEach(item => {
        stmt.run([orderId, item.product_id, item.quantity, item.price]);
        
        // Restar stock de nuevos items
        db.get('SELECT stock FROM products WHERE id = ?', [item.product_id], (err, prod) => {
          if (!err && prod) {
            const previousStock = prod.stock;
            const newStock = previousStock - item.quantity;
            
            db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id]);
            
            registerInventoryMovement(
              item.product_id,
              'exit',
              item.quantity,
              `Pedido #${orderId.slice(-8)} - Agregando nuevo item`,
              previousStock,
              newStock
            );
          }
        });
      });
      stmt.finalize();
      
      registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'order', orderId, `Editó los items del pedido #${orderId.slice(-8)}`, getClientIp(req));
      
      res.json({ success: true, message: 'Items actualizados' });
    });
  });
});

// Eliminar pedido (con actualización de stock)
// Eliminar pedido - elimina permanentemente y actualiza reportes
app.delete('/api/orders/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  // Obtener información del pedido antes de eliminar
  db.get('SELECT id, total, currency, status FROM orders WHERE id = ?', [req.params.id], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    // Obtener items del pedido
    db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id], (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Si el pedido no estaba cancelado, devolver stock
      if (order.status !== 'cancelled') {
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
      }
      
      // Eliminar items del pedido
      db.run('DELETE FROM order_items WHERE order_id = ?', [req.params.id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Eliminar el pedido
        db.run('DELETE FROM orders WHERE id = ?', [req.params.id], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          registerAdminLog(req.user.id, req.user.name, 'DELETE', 'order', req.params.id, `Eliminó permanentemente el pedido #${req.params.id.slice(-8)}. Total: ${order.currency} ${order.total}`, getClientIp(req));
          
          res.json({ success: true, message: 'Pedido eliminado permanentemente. El reporte de ventas se ha actualizado.' });
        });
      });
    });
  });
});
// Mis pedidos (usuario)
app.get('/api/my-orders', authMiddleware, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(orders || []);
  });
});

// ============ RUTAS DE REPORTES ============

// Reporte de ventas
app.get('/api/sales-report', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  const { from, to, category, search, currency } = req.query;
  
  let query = `
    SELECT 
      p.id,
      p.name, 
      p.category,
      p.currency as product_currency,
      COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity ELSE 0 END), 0) as total_sold, 
      COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity * oi.price ELSE 0 END), 0) as total_revenue,
      COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN oi.order_id END) as total_orders,
      MAX(CASE WHEN o.status != 'cancelled' THEN o.created_at END) as last_sale_date
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
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
  
  query += ' GROUP BY p.id ORDER BY total_sold DESC';
  
  db.all(query, params, (err, reports) => {
    if (err) {
      console.error('Error al obtener reporte:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(reports || []);
  });
});

// Reporte por moneda - excluye pedidos cancelados
app.get('/api/sales-report-by-currency', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  const { from, to } = req.query;
  
  let query = `
    SELECT 
      o.currency,
      COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.id END) as total_orders,
      SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END) as total_revenue,
      SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity ELSE 0 END) as total_items_sold
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
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
  
  query += ' GROUP BY o.currency';
  
  db.all(query, params, (err, results) => {
    if (err) {
      console.error('Error al obtener reporte por moneda:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results || []);
  });
});
// Productos destacados
app.get('/api/featured', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM products WHERE featured = 1 AND stock > 0 LIMIT 4', (err, products) => {
    res.json(products || []);
  });
});

// Más vendidos
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

// Categorías
app.get('/api/categories', (req, res) => {
  const db = getDb();
  db.all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ""', (err, categories) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(categories.map(c => c.category).filter(c => c));
  });
});

// ============ RUTAS DE INVENTARIO ============

// Movimientos de inventario
app.get('/api/inventory-movements', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  const { productId, limit = 100 } = req.query;
  
  let query = `
    SELECT im.*, p.name as product_name 
    FROM inventory_movements im
    JOIN products p ON im.product_id = p.id
    WHERE 1=1
  `;
  let params = [];
  
  if (productId && productId !== 'undefined' && productId !== 'todos') {
    query += ' AND im.product_id = ?';
    params.push(productId);
  }
  
  query += ' ORDER BY im.created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, movements) => {
    if (err) {
      console.error('Error fetching movements:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(movements || []);
  });
});

// Registrar movimiento manual de inventario
app.post('/api/inventory-movements', authMiddleware, adminMiddleware, (req, res) => {
  const { product_id, type, quantity, reason } = req.body;
  const db = getDb();
  
  if (!product_id || !type || !quantity) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  db.get('SELECT stock, name FROM products WHERE id = ?', [product_id], (err, product) => {
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
    } else {
      return res.status(400).json({ error: 'Tipo de movimiento inválido' });
    }
    
    // Actualizar stock
    db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, product_id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Registrar movimiento
      db.run(
        `INSERT INTO inventory_movements (product_id, type, quantity, reason, previous_stock, new_stock) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [product_id, type, quantity, reason || '', previousStock, newStock],
        (err) => {
          if (err) {
            console.error('Error al registrar movimiento:', err);
            return res.status(500).json({ error: err.message });
          }
          
          registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'inventory', product_id, `${type === 'entry' ? 'Agregó' : 'Quitó'} ${quantity} unidades de ${product.name}. Razón: ${reason || 'No especificada'}`, getClientIp(req));
          
          res.json({ 
            success: true, 
            message: 'Inventario actualizado',
            previousStock, 
            newStock 
          });
        }
      );
    });
  });
});
// Reporte de inventario
app.get('/api/inventory-report', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  const { from, to, productId, type } = req.query;
  
  let query = `
    SELECT 
      im.id,
      im.product_id,
      p.name as product_name,
      p.category,
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
  
  if (productId && productId !== 'todos' && productId !== 'undefined') {
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
    
    // Calcular resumen
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

// ============ RUTAS DE COMBOS ============
app.get('/api/combos', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM combos WHERE active = 1', (err, combos) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(combos || []);
  });
});

app.get('/api/admin/combos', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM combos', (err, combos) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(combos || []);
  });
});

app.post('/api/combos', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, total_price, currency, active, products } = req.body;
  const db = getDb();
  const id = Date.now().toString();
  
  db.run(
    'INSERT INTO combos (id, name, description, total_price, currency, active) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, description, total_price, currency, active ? 1 : 0],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const stmt = db.prepare('INSERT INTO combo_products (combo_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)');
      products.forEach(p => stmt.run([id, p.product_id, p.quantity, p.unit_price, p.total_price]));
      stmt.finalize();
      
      registerAdminLog(req.user.id, req.user.name, 'CREATE', 'combo', id, `Creó el combo: ${name}`, getClientIp(req));
      
      res.json({ success: true, id });
    }
  );
});

app.put('/api/combos/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, total_price, currency, active, products } = req.body;
  const db = getDb();
  
  db.run(
    'UPDATE combos SET name = ?, description = ?, total_price = ?, currency = ?, active = ? WHERE id = ?',
    [name, description, total_price, currency, active ? 1 : 0, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      db.run('DELETE FROM combo_products WHERE combo_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const stmt = db.prepare('INSERT INTO combo_products (combo_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)');
        products.forEach(p => stmt.run([req.params.id, p.product_id, p.quantity, p.unit_price, p.total_price]));
        stmt.finalize();
        
        registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'combo', req.params.id, `Actualizó el combo: ${name}`, getClientIp(req));
        
        res.json({ success: true });
      });
    }
  );
});

app.delete('/api/combos/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.get('SELECT name FROM combos WHERE id = ?', [req.params.id], (err, combo) => {
    const comboName = combo?.name || req.params.id;
    
    db.run('DELETE FROM combo_products WHERE combo_id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run('DELETE FROM combos WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        registerAdminLog(req.user.id, req.user.name, 'DELETE', 'combo', req.params.id, `Eliminó el combo: ${comboName}`, getClientIp(req));
        
        res.json({ success: true });
      });
    });
  });
});

// ============ RUTAS DE OFERTAS ============
app.get('/api/offers', (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.all('SELECT * FROM offers WHERE active = 1 AND start_date <= ? AND end_date >= ?', [now, now], (err, offers) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(offers || []);
  });
});

app.get('/api/admin/offers', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM offers', (err, offers) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(offers || []);
  });
});

app.post('/api/offers', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, discount_percent, start_date, end_date, products } = req.body;
  const db = getDb();
  const id = Date.now().toString();
  
  db.run(
    'INSERT INTO offers (id, name, description, discount_percent, start_date, end_date, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [id, name, description, discount_percent, start_date, end_date],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const stmt = db.prepare('INSERT INTO offer_products (offer_id, product_id, quantity, discounted_price) VALUES (?, ?, ?, ?)');
      products.forEach(p => stmt.run([id, p.product_id, p.quantity, p.discounted_price]));
      stmt.finalize();
      
      registerAdminLog(req.user.id, req.user.name, 'CREATE', 'offer', id, `Creó la oferta: ${name}`, getClientIp(req));
      
      res.json({ success: true, id });
    }
  );
});

app.put('/api/offers/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, discount_percent, start_date, end_date, active, products } = req.body;
  const db = getDb();
  
  db.run(
    'UPDATE offers SET name = ?, description = ?, discount_percent = ?, start_date = ?, end_date = ?, active = ? WHERE id = ?',
    [name, description, discount_percent, start_date, end_date, active ? 1 : 0, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      db.run('DELETE FROM offer_products WHERE offer_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const stmt = db.prepare('INSERT INTO offer_products (offer_id, product_id, quantity, discounted_price) VALUES (?, ?, ?, ?)');
        products.forEach(p => stmt.run([req.params.id, p.product_id, p.quantity, p.discounted_price]));
        stmt.finalize();
        
        registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'offer', req.params.id, `Actualizó la oferta: ${name}`, getClientIp(req));
        
        res.json({ success: true });
      });
    }
  );
});

app.delete('/api/offers/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.get('SELECT name FROM offers WHERE id = ?', [req.params.id], (err, offer) => {
    const offerName = offer?.name || req.params.id;
    
    db.run('DELETE FROM offer_products WHERE offer_id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run('DELETE FROM offers WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        registerAdminLog(req.user.id, req.user.name, 'DELETE', 'offer', req.params.id, `Eliminó la oferta: ${offerName}`, getClientIp(req));
        
        res.json({ success: true });
      });
    });
  });
});

// ============ RUTAS DE CUPONES ============
app.get('/api/admin/coupons', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM coupons ORDER BY created_at DESC', (err, coupons) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(coupons || []);
  });
});

app.post('/api/admin/coupons', authMiddleware, adminMiddleware, (req, res) => {
  const { code, description, discount_type, discount_value, min_purchase, max_discount, start_date, end_date, usage_limit } = req.body;
  const db = getDb();
  const id = Date.now().toString();
  
  db.run(
    'INSERT INTO coupons (id, code, description, discount_type, discount_value, min_purchase, max_discount, start_date, end_date, usage_limit, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
    [id, code.toUpperCase(), description, discount_type, discount_value, min_purchase || 0, max_discount || null, start_date || null, end_date || null, usage_limit || null],
    (err) => {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'El código ya existe' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      registerAdminLog(req.user.id, req.user.name, 'CREATE', 'coupon', id, `Creó el cupón: ${code}`, getClientIp(req));
      
      res.json({ success: true, id });
    }
  );
});

app.put('/api/admin/coupons/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { code, description, discount_type, discount_value, min_purchase, max_discount, start_date, end_date, usage_limit, active } = req.body;
  const db = getDb();
  
  db.run(
    'UPDATE coupons SET code = ?, description = ?, discount_type = ?, discount_value = ?, min_purchase = ?, max_discount = ?, start_date = ?, end_date = ?, usage_limit = ?, active = ? WHERE id = ?',
    [code.toUpperCase(), description, discount_type, discount_value, min_purchase || 0, max_discount || null, start_date || null, end_date || null, usage_limit || null, active ? 1 : 0, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'coupon', req.params.id, `Actualizó el cupón: ${code}`, getClientIp(req));
      
      res.json({ success: true });
    }
  );
});

app.delete('/api/admin/coupons/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.get('SELECT code FROM coupons WHERE id = ?', [req.params.id], (err, coupon) => {
    const couponCode = coupon?.code || req.params.id;
    
    db.run('DELETE FROM coupons WHERE id = ?', [req.params.id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      registerAdminLog(req.user.id, req.user.name, 'DELETE', 'coupon', req.params.id, `Eliminó el cupón: ${couponCode}`, getClientIp(req));
      
      res.json({ success: true });
    });
  });
});

// ============ RUTAS DE MONEDAS ============
// Obtener monedas (público)
app.get('/api/exchange-rates', (req, res) => {
  const db = getDb();
  db.all('SELECT currency, rate, name, symbol FROM exchange_rates ORDER BY currency', (err, rates) => {
    if (err) {
      console.error('Error fetching rates:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rates || []);
  });
});

// Obtener monedas (admin)
app.get('/api/currencies', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM exchange_rates ORDER BY currency', (err, rates) => {
    if (err) {
      console.error('Error fetching currencies:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rates || []);
  });
});

// Crear moneda
app.post('/api/currencies', authMiddleware, adminMiddleware, (req, res) => {
  const { currency, rate, name, symbol } = req.body;
  const db = getDb();
  
  if (!currency || !rate) {
    return res.status(400).json({ error: 'Código de moneda y tasa son requeridos' });
  }
  
  const currencyUpper = currency.toUpperCase();
  
  db.get('SELECT * FROM exchange_rates WHERE currency = ?', [currencyUpper], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (existing) {
      return res.status(400).json({ error: 'La moneda ya existe' });
    }
    
    db.run(
      'INSERT INTO exchange_rates (currency, rate, name, symbol) VALUES (?, ?, ?, ?)',
      [currencyUpper, parseFloat(rate), name || '', symbol || ''],
      (err) => {
        if (err) {
          console.error('Error creating currency:', err);
          return res.status(500).json({ error: err.message });
        }
        
        registerAdminLog(req.user.id, req.user.name, 'CREATE', 'currency', currencyUpper, `Creó la moneda: ${currencyUpper} (Tasa: ${rate})`, getClientIp(req));
        
        res.json({ success: true, message: 'Moneda creada correctamente' });
      }
    );
  });
});

// Actualizar moneda
app.put('/api/currencies/:currency', authMiddleware, adminMiddleware, (req, res) => {
  const { rate, name, symbol } = req.body;
  const db = getDb();
  const currencyCode = req.params.currency.toUpperCase();
  
  if (!rate) {
    return res.status(400).json({ error: 'La tasa es requerida' });
  }
  
  db.run(
    'UPDATE exchange_rates SET rate = ?, name = ?, symbol = ?, updated_at = CURRENT_TIMESTAMP WHERE currency = ?',
    [parseFloat(rate), name || '', symbol || '', currencyCode],
    function(err) {
      if (err) {
        console.error('Error updating currency:', err);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Moneda no encontrada' });
      }
      
      registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'currency', currencyCode, `Actualizó la moneda: ${currencyCode} (Nueva tasa: ${rate})`, getClientIp(req));
      
      res.json({ success: true, message: 'Moneda actualizada correctamente' });
    }
  );
});

// Eliminar moneda
app.delete('/api/currencies/:currency', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  const currencyCode = req.params.currency.toUpperCase();
  
  if (currencyCode === 'USD') {
    return res.status(400).json({ error: 'No se puede eliminar la moneda base (USD)' });
  }
  
  db.run('DELETE FROM exchange_rates WHERE currency = ?', [currencyCode], function(err) {
    if (err) {
      console.error('Error deleting currency:', err);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Moneda no encontrada' });
    }
    
    registerAdminLog(req.user.id, req.user.name, 'DELETE', 'currency', currencyCode, `Eliminó la moneda: ${currencyCode}`, getClientIp(req));
    
    res.json({ success: true, message: 'Moneda eliminada correctamente' });
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
        
        registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'settings', '1', `Actualizó la configuración del negocio`, getClientIp(req));
        
        res.json({ success: true });
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
          
          registerAdminLog(req.user.id, req.user.name, 'CREATE', 'settings', '1', `Creó la configuración del negocio`, getClientIp(req));
          
          res.json({ success: true });
        }
      );
    }
  });
});

// ============ RUTAS DE USUARIOS ============
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  db.all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(users || []);
  });
});

app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, email, role, password } = req.body;
  const db = getDb();
  
  let query = 'UPDATE users SET name = ?, email = ?, role = ?';
  let params = [name, email, role];
  
  if (password && password !== '') {
    const hashedPassword = bcrypt.hashSync(password, 10);
    query += ', password = ?';
    params.push(hashedPassword);
  }
  
  query += ' WHERE id = ?';
  params.push(req.params.id);
  
  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'El email ya está en uso' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    registerAdminLog(req.user.id, req.user.name, 'UPDATE', 'user', req.params.id, `Actualizó el usuario: ${name} (Rol: ${role})`, getClientIp(req));
    
    res.json({ success: true });
  });
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }
  
  db.get('SELECT name, role FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      registerAdminLog(req.user.id, req.user.name, 'DELETE', 'user', req.params.id, `Eliminó el usuario: ${user.name} (Rol: ${user.role})`, getClientIp(req));
      
      res.json({ success: true });
    });
  });
});

// ============ RUTAS DE LOGS ============
app.get('/api/admin/logs', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  const { limit = 100, offset = 0 } = req.query;
  
  if (req.user.id !== '1') {
    return res.status(403).json({ error: 'Solo el administrador principal puede ver los logs' });
  }
  
  db.all('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', [parseInt(limit), parseInt(offset)], (err, logs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.get('SELECT COUNT(*) as total FROM admin_logs', (err, count) => {
      res.json({ logs: logs || [], total: count?.total || 0 });
    });
  });
});

app.delete('/api/admin/logs/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  if (req.user.id !== '1') {
    return res.status(403).json({ error: 'Solo el administrador principal puede eliminar logs' });
  }
  
  db.run('DELETE FROM admin_logs WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// ============ RUTAS DE DIRECCIONES DE USUARIO ============
app.get('/api/user-addresses', authMiddleware, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [req.user.id], (err, addresses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(addresses || []);
  });
});

app.post('/api/user-addresses', authMiddleware, (req, res) => {
  const { name, phone, address, city, isDefault } = req.body;
  const db = getDb();
  const id = Date.now().toString();
  
  if (isDefault) {
    db.run('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  }
  
  db.run(
    'INSERT INTO user_addresses (id, user_id, name, phone, address, city, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, name, phone, address, city, isDefault ? 1 : 0],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id });
    }
  );
});

app.put('/api/user-addresses/:id/default', authMiddleware, (req, res) => {
  const db = getDb();
  db.run('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [req.user.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.run('UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

app.delete('/api/user-addresses/:id', authMiddleware, (req, res) => {
  const db = getDb();
  db.run('DELETE FROM user_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// ============ RUTAS DE DASHBOARD AVANZADO ============
app.get('/api/admin/advanced-stats', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  
  db.get('SELECT SUM(total) as total, COUNT(*) as orders, AVG(total) as avg_ticket FROM orders WHERE status != "cancelled"', (err, sales) => {
    db.all(`
      SELECT p.name, p.category, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.price) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `, (err, topProducts) => {
      db.get(`SELECT COUNT(*) as new_customers FROM users WHERE created_at >= datetime('now', '-30 days')`, (err, customers) => {
        db.all('SELECT id, name, stock FROM products WHERE stock < 10 ORDER BY stock ASC', (err, lowStock) => {
          res.json({
            sales: {
              total: sales?.total || 0,
              orders: sales?.orders || 0,
              averageTicket: sales?.avg_ticket || 0
            },
            topProducts: topProducts || [],
            customerStats: {
              newCustomers: customers?.new_customers || 0
            },
            inventoryAlert: lowStock || []
          });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📁 Uploads: ${path.join(__dirname, 'uploads')}`);
});