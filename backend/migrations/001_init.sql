-- ==========================================
-- TIENDA VIRTUAL - ESQUEMA POSTGRESQL
-- ==========================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLA DE USUARIOS
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar admin por defecto
INSERT INTO users (id, name, email, password, role) 
VALUES ('1', 'Administrador', 'admin@tienda.com', '$2a$10$9Z7tKZxCqZxZxZxZxZxZxO', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- TABLA DE PRODUCTOS
-- ==========================================
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
);

-- ==========================================
-- TABLA DE IMÁGENES DE PRODUCTOS
-- ==========================================
CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_main INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLA DE PEDIDOS
-- ==========================================
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
    offer_id TEXT,
    combo_id TEXT,
    coupon_id TEXT,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLA DE ITEMS DE PEDIDO
-- ==========================================
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    original_price DECIMAL(10,2),
    offer_id TEXT,
    combo_id TEXT
);

-- ==========================================
-- TABLA DE MOVIMIENTOS DE INVENTARIO
-- ==========================================
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('entry', 'exit')),
    quantity INTEGER NOT NULL,
    reason TEXT,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLA DE TIPOS DE CAMBIO (MONEDAS)
-- ==========================================
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    currency VARCHAR(3) UNIQUE NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    name VARCHAR(50) DEFAULT '',
    symbol VARCHAR(5) DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar monedas por defecto
INSERT INTO exchange_rates (currency, rate, name, symbol) VALUES
    ('USD', 1.00, 'Dólar Americano', '$'),
    ('EUR', 0.92, 'Euro', '€'),
    ('COP', 4000.00, 'Peso Colombiano', '$'),
    ('MXN', 17.50, 'Peso Mexicano', '$'),
    ('ARS', 850.00, 'Peso Argentino', '$'),
    ('CLP', 950.00, 'Peso Chileno', '$'),
    ('PEN', 3.75, 'Sol Peruano', 'S/'),
    ('BOB', 6.91, 'Boliviano', 'Bs')
ON CONFLICT (currency) DO UPDATE SET rate = EXCLUDED.rate;

-- ==========================================
-- TABLA DE CONFIGURACIÓN DEL NEGOCIO
-- ==========================================
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
);

-- Insertar configuración por defecto
INSERT INTO business_settings (id, name, phone, email, address, website, description)
VALUES (1, 'Tienda Virtual', '573001234567', 'info@tiendavirtual.com', 
        'Cra 1 # 2-3, Bogotá, Colombia', 'www.tiendavirtual.com', 'Tu tienda de confianza')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- TABLA DE COMBOS
-- ==========================================
CREATE TABLE IF NOT EXISTS combos (
    id TEXT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    total_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLA DE PRODUCTOS EN COMBO
-- ==========================================
CREATE TABLE IF NOT EXISTS combo_products (
    id SERIAL PRIMARY KEY,
    combo_id TEXT REFERENCES combos(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
);

-- ==========================================
-- TABLA DE OFERTAS
-- ==========================================
CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLA DE PRODUCTOS EN OFERTA
-- ==========================================
CREATE TABLE IF NOT EXISTS offer_products (
    id SERIAL PRIMARY KEY,
    offer_id TEXT REFERENCES offers(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    discounted_price DECIMAL(10,2)
);

-- ==========================================
-- TABLA DE CUPONES
-- ==========================================
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
);

-- ==========================================
-- TABLA DE CUPONES USADOS POR USUARIO
-- ==========================================
CREATE TABLE IF NOT EXISTS user_coupons (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    coupon_id TEXT REFERENCES coupons(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLA DE DIRECCIONES DE USUARIO
-- ==========================================
CREATE TABLE IF NOT EXISTS user_addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLA DE LOGS DE ADMINISTRADOR
-- ==========================================
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
);

-- ==========================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

-- ==========================================
-- PRODUCTOS DE EJEMPLO
-- ==========================================
INSERT INTO products (id, name, description, price, currency, stock, category, image, featured) VALUES
    ('1', 'Smartphone Pro Max', 'Teléfono inteligente con cámara de 108MP y batería de larga duración', 899.99, 'USD', 25, 'Electrónica', '', 1),
    ('2', 'Laptop Ultra Slim', 'Computadora portátil ultraligera con procesador Intel Core i7', 1299.99, 'USD', 15, 'Electrónica', '', 1),
    ('3', 'Auriculares Bluetooth', 'Audífonos inalámbricos con cancelación de ruido activa', 79.99, 'USD', 50, 'Electrónica', '', 0),
    ('4', 'Camiseta Deportiva', 'Camiseta de algodón transpirable ideal para hacer ejercicio', 24.99, 'USD', 100, 'Ropa', '', 0),
    ('5', 'Mochila Ejecutiva', 'Mochila resistente al agua con compartimento para laptop', 59.99, 'USD', 40, 'Accesorios', '', 1),
    ('6', 'Reloj Inteligente', 'Monitor de ritmo cardíaco, GPS y notificaciones', 159.99, 'USD', 30, 'Electrónica', '', 1),
    ('7', 'Set de Cocina', 'Utensilios de cocina profesionales antiadherentes', 89.99, 'USD', 20, 'Hogar', '', 0),
    ('8', 'Zapatillas Running', 'Zapatillas deportivas con amortiguación avanzada', 79.99, 'USD', 45, 'Ropa', '', 0)
ON CONFLICT (id) DO NOTHING;