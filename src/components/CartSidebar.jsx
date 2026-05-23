import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

const CartSidebar = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { success, error: toastError } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const getCurrencySymbol = () => {
    return '$';
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toastError('Tu carrito está vacío');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      toastError('Debes iniciar sesión para continuar');
      navigate('/login');
      onClose();
      return;
    }
    
    setIsCheckingOut(true);
    setTimeout(() => {
      onClose();
      navigate('/checkout');
      setIsCheckingOut(false);
    }, 300);
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-all duration-300 z-50 ${
          isOpen ? 'opacity-50 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            <h2 className="text-xl font-bold">Mi Carrito</h2>
            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-sm">
              {cart.reduce((a, b) => a + (b.quantity || 0), 0)} items
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500 text-lg">Tu carrito está vacío</p>
              <Link 
                to="/products" 
                onClick={onClose} 
                className="text-emerald-600 mt-4 inline-block font-medium hover:underline"
              >
                Ver productos →
              </Link>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex gap-3 border-b pb-4">
                <img 
                  src={item.image || 'https://via.placeholder.com/80'} 
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-lg shadow-sm"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-emerald-600 font-bold">{getCurrencySymbol()}{(item.price || 0).toFixed(2)}</p>
                  {item.combo_name && (
                    <p className="text-xs text-emerald-600">🎁 {item.combo_name}</p>
                  )}
                  {item.offer_name && (
                    <p className="text-xs text-red-500">🎯 {item.offer_name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)} 
                      className="w-8 h-8 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity || 1}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)} 
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
            ))
          )}
        </div>
        
        {/* Resumen de compra */}
        {cart.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{getCurrencySymbol()}{subtotal.toFixed(2)}</span>
              </div>
            </div>
            
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesando...
                </div>
              ) : (
                <>
                  📝 Proceder al pago
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
            
            <button 
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
                  clearCart();
                  success('Carrito vaciado correctamente');
                }
              }} 
              className="w-full mt-2 text-gray-500 text-sm py-2 hover:text-red-600 transition"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;