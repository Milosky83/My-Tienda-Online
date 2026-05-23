import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import QuickViewModal from './QuickViewModal';
import { useToast } from '../context/ToastContext';

const ProductCard = ({ product }) => {
  const [showQuickView, setShowQuickView] = useState(false);
  const { addToCart } = useCart();
  const { error: toastError } = useToast();

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

  const stockStatus = () => {
    if (product.stock === 0) return { text: 'Agotado', color: 'bg-red-100 text-red-800', icon: '❌' };
    if (product.stock < 5) return { text: '¡Últimas unidades!', color: 'bg-orange-100 text-orange-800', icon: '⚠️' };
    if (product.stock < 10) return { text: 'Pocas unidades', color: 'bg-yellow-100 text-yellow-800', icon: '📦' };
    return { text: `${product.stock} disponibles`, color: 'bg-emerald-100 text-emerald-800', icon: '✅' };
  };

  const handleAddToCart = () => {
    if (product.stock === 0) {
      toastError('❌ Producto agotado');
      return;
    }
    addToCart(product, 1);
  };

  const status = stockStatus();

  return (
    <>
      <div className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-2 relative">
        <Link to={`/products/${product.id}`}>
          <div className="relative overflow-hidden h-64">
            <img 
              src={product.image || 'https://via.placeholder.com/400'} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/400'; }}
            />
            {product.featured === 1 && (
              <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                ⭐ Destacado
              </div>
            )}
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-lg">AGOTADO</span>
              </div>
            )}
            
            {/* Botón de vista rápida */}
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowQuickView(true);
              }}
              className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white"
            >
              👁️ Vista rápida
            </button>
          </div>
        </Link>
        
        <div className="p-5">
          <Link to={`/products/${product.id}`}>
            <h3 className="font-bold text-lg text-gray-800 mb-1 hover:text-emerald-600 transition line-clamp-1">
              {product.name}
            </h3>
          </Link>
          
          <p className="text-gray-500 text-sm mb-3 line-clamp-2 min-h-[40px]">
            {product.description || 'Sin descripción'}
          </p>
          
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-2xl font-bold text-emerald-600">
                {getCurrencySymbol(product.currency || 'USD')}{(product.price || 0).toFixed(2)}
              </span>
              {product.original_price && (
                <span className="text-sm text-gray-400 line-through ml-2">
                  {getCurrencySymbol(product.original_currency || 'USD')}{(product.original_price || 0).toFixed(2)}
                </span>
              )}
            </div>
            <div className={`badge ${status.color}`}>
              {status.icon} {status.text}
            </div>
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`w-full py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              product.stock > 0
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🛒 {product.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
          </button>
        </div>
      </div>
      
      {showQuickView && (
        <QuickViewModal product={product} onClose={() => setShowQuickView(false)} />
      )}
    </>
  );
};

export default ProductCard;