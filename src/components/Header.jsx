import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useBusiness } from '../context/BusinessContext';
import axios from 'axios';
import CheckoutForm from './CheckoutForm';
import CurrencySelector from './CurrencySelector';

const Header = () => {
  const [user, setUser] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cart, removeFromCart, updateQuantity, total, clearCart, changeCurrency, currency } = useCart();
  const { businessInfo } = useBusiness();
  const [sending, setSending] = useState(false);
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
    navigate('/login');
    window.location.reload();
  };

  const getPaymentMethodText = (method) => {
    const methods = {
      cash: 'Efectivo contra entrega',
      transfer: 'Transferencia bancaria',
      card: 'Tarjeta crédito/débito',
      nequi: 'Nequi',
      daviplata: 'Daviplata'
    };
    return methods[method] || method;
  };

  const getCurrencySymbol = (curr = currency) => {
    const symbols = {
      USD: '$'
    };
    return symbols[curr] || '$';
  };

  const handleCheckoutSubmit = async (formData) => {
    if (!user) {
      alert('Debes iniciar sesión para realizar un pedido');
      navigate('/login');
      return;
    }
    
    if (cart.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }
    
    setSending(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const orderData = {
        products: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          offer_id: item.offer_id || null,
          combo_id: item.combo_id || null
        })),
        total: total,
        currency: currency,
        senderInfo: {
          name: formData.senderInfo.name,
          phone: formData.senderInfo.phone,
          email: formData.senderInfo.email
        },
        recipientInfo: {
          name: formData.recipientInfo.name,
          phone: formData.recipientInfo.phone,
          address: formData.recipientInfo.address
        },
        deliveryDate: formData.deliveryInfo.deliveryDate,
        deliveryNotes: formData.deliveryInfo.deliveryNotes,
        paymentMethod: formData.deliveryInfo.paymentMethod
      };
      
      const orderResponse = await axios.post('http://localhost:3000/api/orders', orderData, {
        headers: { 
          Authorization: token,
          'Content-Type': 'application/json'
        }
      });
      
      const orderId = orderResponse.data.orderId;
      
      // Usar la información del negocio del contexto
      const businessPhone = businessInfo.phone || '573001234567';
      
      let message = '';
      message += `🆕 *NUEVO PEDIDO*\n`;
      message += `📅 ${new Date().toLocaleString()}\n`;
      message += `🆔 Pedido: #${orderId.slice(-8)}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      message += `📤 *REMITENTE*\n`;
      message += `${formData.senderInfo.name}\n`;
      message += `${formData.senderInfo.phone}\n`;
      message += `${formData.senderInfo.email}\n\n`;
      
      message += `📥 *DESTINATARIO*\n`;
      message += `${formData.recipientInfo.name}\n`;
      message += `${formData.recipientInfo.phone}\n`;
      message += `${formData.recipientInfo.address}\n\n`;
      
      message += `📦 *PRODUCTOS*\n`;
      cart.forEach((item, index) => {
        const subtotal = item.quantity * item.price;
        message += `${index + 1}. ${item.name}\n`;
        message += `   ${item.quantity} x $${item.price} = $${subtotal.toFixed(2)}\n`;
      });
      message += `\n`;
      
      message += `💰 *TOTAL: $${total.toFixed(2)}*\n\n`;
      
      message += `🚚 *ENTREGA*\n`;
      message += `Pago: ${getPaymentMethodText(formData.deliveryInfo.paymentMethod)}\n`;
      if (formData.deliveryInfo.deliveryNotes) {
        message += `Notas: ${formData.deliveryInfo.deliveryNotes}\n`;
      }
      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `🙏 Gracias por su compra`;
      
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
      
      alert(`✅ Pedido #${orderId.slice(-8)} creado`);
      clearCart();
      setShowCheckout(false);
      setShowCart(false);
      
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al enviar el pedido');
    } finally {
      setSending(false);
    }
  };

  const cartCount = cart.reduce((a, b) => a + (b.quantity || 0), 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white shadow-md'
      }`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo - Usando la configuración del negocio */}
            <Link to="/" className="flex items-center gap-3 group">
              {businessInfo.logo ? (
                <img 
                  src={businessInfo.logo} 
                  alt={businessInfo.name}
                  className="w-10 h-10 rounded-xl object-cover shadow-lg group-hover:scale-105 transition"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                  <span className="text-white text-xl">🛍️</span>
                </div>
              )}
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                {businessInfo.name}
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-gray-700 hover:text-emerald-600 transition font-medium">Inicio</Link>
              <Link to="/products" className="text-gray-700 hover:text-emerald-600 transition font-medium">Productos</Link>
              <Link to="/combos" className="text-gray-700 hover:text-emerald-600 transition font-medium flex items-center gap-1">
                <span>🎁</span> Combos
              </Link>
              <Link to="/offers" className="text-gray-700 hover:text-emerald-600 transition font-medium flex items-center gap-1">
                <span>🔥</span> Ofertas
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-gray-700 hover:text-emerald-600 transition font-medium">Admin</Link>
              )}
            </nav>
            
            {/* Right section */}
            <div className="flex items-center gap-4">
              <CurrencySelector onCurrencyChange={changeCurrency} selectedCurrency={currency} />
              
              <button 
                onClick={() => setShowCart(true)} 
                className="relative p-2 hover:bg-gray-100 rounded-full transition group"
                data-cart-button
              >
                <svg className="w-6 h-6 text-gray-700 group-hover:text-emerald-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6M12 18v3" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </button>
              
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden lg:inline">{user.name}</span>
                  </div>
                  <button 
                    onClick={logout} 
                    className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn-primary text-sm px-4 py-2">
                  Ingresar
                </Link>
              )}
              
              {/* Mobile menu button */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t animate-fade-in">
              <nav className="flex flex-col gap-3">
                <Link to="/" className="text-gray-700 hover:text-emerald-600 transition font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>Inicio</Link>
                <Link to="/products" className="text-gray-700 hover:text-emerald-600 transition font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>Productos</Link>
                <Link to="/combos" className="text-gray-700 hover:text-emerald-600 transition font-medium py-2 flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                  <span>🎁</span> Combos
                </Link>
                <Link to="/offers" className="text-gray-700 hover:text-emerald-600 transition font-medium py-2 flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                  <span>🔥</span> Ofertas
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="text-gray-700 hover:text-emerald-600 transition font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>Admin</Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>
      
      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end animate-fade-in">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-in">
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                🛒 Mi Carrito
                {cartCount > 0 && (
                  <span className="text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-2 py-0.5 rounded-full">{cartCount}</span>
                )}
              </h2>
              <button onClick={() => setShowCart(false)} className="text-2xl hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition">&times;</button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="text-gray-500 text-lg">Tu carrito está vacío</p>
                  <Link to="/products" className="text-emerald-600 mt-4 inline-block font-medium hover:underline" onClick={() => setShowCart(false)}>
                    Ver productos →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex gap-3 border-b pb-4 hover:bg-gray-50 p-2 rounded-lg transition">
                      <img 
                        src={item.image || 'https://via.placeholder.com/80'} 
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg shadow-sm"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                        <p className="text-emerald-600 font-bold">{getCurrencySymbol()}{item.price.toFixed(2)}</p>
                        {item.combo_name && (
                          <p className="text-xs text-emerald-600">🎁 {item.combo_name}</p>
                        )}
                        {item.offer_name && (
                          <p className="text-xs text-red-500">🎯 {item.offer_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                            className="w-8 h-8 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                            className="w-8 h-8 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-bold"
                          >
                            +
                          </button>
                          <button 
                            onClick={() => removeFromCart(item.id)} 
                            className="ml-auto text-red-500 text-sm hover:text-red-700 font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="border-t p-4 bg-gray-50">
                <div className="flex justify-between font-bold text-lg mb-4">
                  <span>Total:</span>
                  <span className="text-emerald-600">{getCurrencySymbol()}{cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => {
                    setShowCart(false);
                    setShowCheckout(true);
                  }}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  📝 Continuar con la compra
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  📋 Confirmar Pedido
                </h2>
                <button onClick={() => setShowCheckout(false)} className="text-2xl hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">&times;</button>
              </div>
              
              <CheckoutForm 
                onSubmit={handleCheckoutSubmit}
                onCancel={() => setShowCheckout(false)}
                loading={sending}
              />
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default Header;