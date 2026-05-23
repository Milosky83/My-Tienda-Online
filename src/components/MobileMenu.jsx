import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useBusiness } from '../context/BusinessContext';

const MobileMenu = ({ isOpen, onClose }) => {
  const [categories, setCategories] = useState([]);
  const [showCategories, setShowCategories] = useState(false);
  const [user, setUser] = useState(null);
  const { cart } = useCart();
  const { businessInfo } = useBusiness();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleNavigation = (path) => {
    onClose();
    navigate(path);
  };

  const handleCategoryClick = (category) => {
    onClose();
    // Navegar a la página de productos con el parámetro de categoría
    navigate(`/products?category=${encodeURIComponent(category)}`);
    // Forzar recarga de la página de productos
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const cartCount = cart.reduce((a, b) => a + (b.quantity || 0), 0);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
      />
      
      {/* Menú lateral */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header del menú */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              {businessInfo.logo ? (
                <img src={businessInfo.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  🛍️
                </div>
              )}
              <div>
                <div className="font-bold">{businessInfo.name}</div>
                <div className="text-xs opacity-80">Bienvenido</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Resumen del carrito */}
          <button 
            onClick={() => handleNavigation('/cart')}
            className="flex items-center gap-3 bg-white/20 rounded-lg p-3 w-full"
          >
            <span className="text-2xl">🛒</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">Mi Carrito</div>
              <div className="text-xs opacity-80">{cartCount} productos</div>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* Menú de navegación */}
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Enlaces principales */}
          <div className="space-y-1 mb-4">
            <button
              onClick={() => handleNavigation('/')}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 transition"
            >
              <span className="text-2xl">🏠</span>
              <span className="font-medium">Inicio</span>
            </button>
            
            <button
              onClick={() => handleNavigation('/products')}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 transition"
            >
              <span className="text-2xl">🛍️</span>
              <span className="font-medium">Productos</span>
            </button>
            
            <button
              onClick={() => handleNavigation('/combos')}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 transition"
            >
              <span className="text-2xl">🎁</span>
              <span className="font-medium">Combos</span>
            </button>
            
            <button
              onClick={() => handleNavigation('/offers')}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 transition"
            >
              <span className="text-2xl">🔥</span>
              <span className="font-medium">Ofertas</span>
            </button>
          </div>
          
          {/* Sección de categorías desplegable */}
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📂</span>
                <span className="font-medium">Categorías</span>
              </div>
              <svg className={`w-5 h-5 transition-transform duration-200 ${showCategories ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${showCategories ? 'max-h-96' : 'max-h-0'}`}>
              <div className="pl-12 space-y-2 mt-2">
                {categories.length > 0 ? (
                  categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className="block w-full text-left py-2 text-gray-600 hover:text-emerald-600 transition"
                    >
                      {cat}
                    </button>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm py-2">No hay categorías</p>
                )}
              </div>
            </div>
          </div>
        </nav>
        
        {/* Footer del menú - Datos del usuario */}
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleNavigation('/dashboard')}
                  className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                >
                  Mi Perfil
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    handleNavigation('/login');
                  }}
                  className="flex-1 bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => handleNavigation('/login')}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-xl font-medium"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => handleNavigation('/register')}
                className="w-full border border-emerald-600 text-emerald-600 px-4 py-3 rounded-xl font-medium hover:bg-emerald-50 transition"
              >
                Registrarse
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileMenu;