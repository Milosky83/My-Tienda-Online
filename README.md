# 🛍️ Tienda Virtual - Plataforma de Comercio Electrónico

## 📋 Descripción
Plataforma de comercio electrónico completa con carrito de compras, múltiples monedas, gestión de inventario, panel de administración y sistema de pedidos vía WhatsApp.

## ✨ Características Principales
- ✅ Autenticación de usuarios (Login/Registro)
- ✅ Carrito de compras con persistencia
- ✅ Múltiples monedas (USD, EUR, COP, MXN, etc.)
- ✅ Panel de administración completo
- ✅ Gestión de inventario con historial
- ✅ Sistema de combos y ofertas
- ✅ Reportes de ventas e inventario
- ✅ Envío de pedidos por WhatsApp
- ✅ Diseño 100% responsive
- ✅ Productos destacados
- ✅ Seguimiento de pedidos

## 🚀 Despliegue Rápido

### Opción 1: Render.com (Recomendado)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Haz clic en el botón de arriba
2. Conecta tu repositorio de GitHub
3. Configura las variables de entorno
4. ¡Listo!

### Opción 2: Railway.app

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/tienda-virtual)

### Opción 3: Manual

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/tienda-virtual.git
cd tienda-virtual

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar en desarrollo
npm run dev      # Frontend
npm run server   # Backend