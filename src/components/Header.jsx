import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useBusiness } from '../context/BusinessContext';
import { useToast } from '../context/ToastContext';
import SearchBar from './SearchBar';
import MobileMenu from './MobileMenu';

const Header = () => {
  const [user, setUser] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { businessInfo } = useBusiness();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

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
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    setUser(null);
    success('👋 Sesión cerrada correctamente');
    navigate('/login');
    setTimeout(() => window.location.reload(), 500);
  };

  const cartCount = cart.reduce((a, b) => a + (b.quantity || 0), 0);
  const cartTotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  const getCurrencySymbol = () => '$';

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white shadow-md'
      }`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Botón menú móvil */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🛍️</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent hidden sm:inline">
                {businessInfo.name}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link to="/" className="text-gray-700 hover:text-emerald-600 transition font-medium">Inicio</Link>
              <Link to="/products" className="text-gray-700 hover:text-emerald-600 transition font-medium">Productos</Link>
              <Link to="/combos" className="text-gray-700 hover:text-emerald-600 transition font-medium">🎁 Combos</Link>
              <Link to="/offers" className="text-gray-700 hover:text-emerald-600 transition font-medium">🔥 Ofertas</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-gray-700 hover:text-emerald-600 transition font-medium">Admin</Link>
              )}
            </nav>

            {/* Search Bar Desktop */}
            <div className="hidden lg:block flex-1 max-w-md mx-4">
              <SearchBar />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button onClick={() => setShowCart(true)} className="relative p-2 hover:bg-gray-100 rounded-full transition">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6M12 18v3" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </button>

              {user ? (
                <div className="relative hidden lg:block">
                  <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium hidden xl:inline">{user.name}</span>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <Link to="/dashboard" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setShowUserMenu(false)}>📊 Dashboard</Link>
                      <Link to="/orders" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setShowUserMenu(false)}>📦 Mis Pedidos</Link>
                      <Link to="/dashboard?tab=addresses" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setShowUserMenu(false)}>📍 Direcciones</Link>
                      <div className="border-t my-1"></div>
                      <button onClick={logout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">🚪 Cerrar Sesión</button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="btn-primary text-sm px-4 py-2 hidden lg:block">Ingresar</Link>
              )}
            </div>
          </div>

          {/* Search Bar Mobile */}
          <div className="mt-3 lg:hidden">
            <SearchBar />
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
              <h2 className="text-xl font-bold">🛒 Mi Carrito</h2>
              <button onClick={() => setShowCart(false)} className="text-2xl hover:text-gray-600">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Tu carrito está vacío</p>
                  <Link to="/products" onClick={() => setShowCart(false)} className="text-emerald-600 mt-2 inline-block">Ver productos →</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex gap-3 border-b pb-4">
                      <img src={item.image || 'https://via.placeholder.com/80'} className="w-20 h-20 object-cover rounded" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-emerald-600 font-bold">{getCurrencySymbol()}{item.price}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 bg-gray-100 rounded">-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 bg-gray-100 rounded">+</button>
                          <button onClick={() => removeFromCart(item.id)} className="ml-auto text-red-500">Eliminar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t p-4">
                <div className="flex justify-between font-bold text-lg mb-3">
                  <span>Total:</span>
                  <span className="text-emerald-600">{getCurrencySymbol()}{cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={() => { setShowCart(false); navigate('/checkout'); }} className="btn-primary w-full">
                  📝 Proceder al pago
                </button>
                <button onClick={clearCart} className="w-full mt-2 text-gray-500 text-sm">Vaciar carrito</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;