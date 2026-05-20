import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import axios from 'axios';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  useEffect(() => {
    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/products/${id}`);
      setProduct(response.data);
      setSelectedImage(response.data.image || 'https://via.placeholder.com/600');
      
      if (response.data.category) {
        const relatedRes = await axios.get(`/api/products?category=${response.data.category}&limit=4`);
        const related = relatedRes.data.products?.filter(p => p.id !== id) || [];
        setRelatedProducts(related.slice(0, 4));
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (quantity <= product.stock) {
      addToCart(product, quantity);
      alert(`✅ ${quantity} unidad(es) de "${product.name}" agregadas al carrito`);
    } else {
      alert(`⚠️ Solo hay ${product.stock} unidades disponibles en stock`);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      alert('Debes iniciar sesión para realizar una compra');
      navigate('/login');
      return;
    }
    
    if (quantity <= product.stock) {
      addToCart(product, quantity);
      navigate('/');
      setTimeout(() => {
        const cartButton = document.querySelector('[data-cart-button]');
        if (cartButton) cartButton.click();
      }, 100);
    } else {
      alert(`⚠️ Solo hay ${product.stock} unidades disponibles en stock`);
    }
  };

  const getStockStatus = () => {
    if (product.stock === 0) return { text: 'Agotado', color: 'bg-red-100 text-red-800', icon: '❌' };
    if (product.stock < 10) return { text: `¡Últimas ${product.stock} unidades!`, color: 'bg-orange-100 text-orange-800', icon: '⚠️' };
    if (product.stock < 30) return { text: `Stock: ${product.stock} unidades`, color: 'bg-yellow-100 text-yellow-800', icon: '📦' };
    return { text: `Stock disponible: ${product.stock} unidades`, color: 'bg-green-100 text-green-800', icon: '✅' };
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      COP: '$',
      MXN: '$',
      ARS: '$',
      CLP: '$',
      PEN: 'S/',
      BOB: 'Bs'
    };
    return symbols[currency] || '$';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-96 rounded-lg"></div>
          <div className="mt-4 space-y-3">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const stockStatus = getStockStatus();

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="flex mb-6 text-sm">
        <Link to="/" className="text-gray-500 hover:text-blue-600">Inicio</Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link to="/products" className="text-gray-500 hover:text-blue-600">Productos</Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <img 
              src={selectedImage} 
              alt={product.name}
              className="w-full h-96 object-cover"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/600x400?text=Producto'; }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2">
            {product.featured === 1 && (
              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mb-2">
                ⭐ Producto Destacado
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-bold text-blue-600">
              {getCurrencySymbol(product.currency || 'USD')}{product.price} {product.currency || 'USD'}
            </span>
          </div>

          <div className="mb-4">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${stockStatus.color}`}>
              {stockStatus.icon} {stockStatus.text}
            </span>
          </div>

          <div className="border-t border-b py-4 mb-4">
            <h3 className="font-semibold text-lg mb-2">Descripción del Producto</h3>
            <p className="text-gray-600 leading-relaxed">
              {product.description || 'Sin descripción disponible'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-lg mb-3">Especificaciones</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Categoría:</span>
                <span className="font-medium">{product.category || 'Sin categoría'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Código:</span>
                <span className="font-mono text-sm">#{product.id?.slice(-8)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Stock disponible:</span>
                <span className="font-medium">{product.stock} unidades</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Moneda:</span>
                <span className="font-medium">{product.currency || 'USD'}</span>
              </div>
            </div>
          </div>

          {product.stock > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Cantidad:</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 bg-gray-200 rounded-lg hover:bg-gray-300 transition flex items-center justify-center text-xl font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center border rounded-lg px-3 py-2"
                  min="1"
                  max={product.stock}
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-10 h-10 bg-gray-200 rounded-lg hover:bg-gray-300 transition flex items-center justify-center text-xl font-bold"
                >
                  +
                </button>
                <span className="text-sm text-gray-500 ml-2">
                  ({product.stock} disponibles)
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                product.stock > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              🛒 {product.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={product.stock === 0}
              className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                product.stock > 0
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              ⚡ Comprar Ahora
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">📋 Información de Compra</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2"><span>🚚</span><span>Envíos a todo el país</span></div>
              <div className="flex items-center gap-2"><span>💰</span><span>Pago contra entrega</span></div>
              <div className="flex items-center gap-2"><span>🔄</span><span>Garantía de 30 días</span></div>
              <div className="flex items-center gap-2"><span>⭐</span><span>Calificación 4.8/5</span></div>
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">🔄 Productos Relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(related => (
              <Link key={related.id} to={`/products/${related.id}`} className="block">
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                  <img src={related.image || 'https://via.placeholder.com/300'} alt={related.name} className="w-full h-48 object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/300'; }} />
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{related.name}</h3>
                    <p className="text-blue-600 font-bold">{getCurrencySymbol(related.currency || 'USD')}{related.price} {related.currency || 'USD'}</p>
                    <p className="text-sm text-gray-500">Stock: {related.stock} unidades</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;