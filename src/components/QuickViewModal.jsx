import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const QuickViewModal = ({ product, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product.image);
  const { addToCart } = useCart();

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs' };
    return symbols[currency] || '$';
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    alert(`✅ ${quantity} unidad(es) de "${product.name}" agregadas al carrito`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Imagen */}
            <div>
              <div className="bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={selectedImage || 'https://via.placeholder.com/400'}
                  alt={product.name}
                  className="w-full h-80 object-cover"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/400'; }}
                />
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img.image_url)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                        selectedImage === img.image_url ? 'border-emerald-500' : 'border-gray-200'
                      }`}
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Información */}
            <div>
              <div className="mb-2">
                {product.featured === 1 && (
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mb-2">
                    ⭐ Destacado
                  </span>
                )}
                <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl font-bold text-emerald-600">
                  {getCurrencySymbol(product.currency || 'USD')}{product.price}
                </span>
                {product.stock < 10 && product.stock > 0 && (
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                    ⚠️ ¡Últimas {product.stock}!
                  </span>
                )}
              </div>
              
              <p className="text-gray-600 mb-4 leading-relaxed">{product.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Categoría:</span>
                  <span className="font-medium">{product.category || 'Sin categoría'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Stock disponible:</span>
                  <span className={`font-medium ${product.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {product.stock} unidades
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Moneda:</span>
                  <span className="font-medium">{product.currency || 'USD'}</span>
                </div>
              </div>
              
              {product.stock > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Cantidad:</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 bg-gray-200 rounded-lg hover:bg-gray-300 transition font-bold"
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
                      className="w-10 h-10 bg-gray-200 rounded-lg hover:bg-gray-300 transition font-bold"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-500">({product.stock} disponibles)</span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                    product.stock > 0
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  🛒 Agregar al Carrito
                </button>
                <Link
                  to={`/products/${product.id}`}
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
                >
                  Ver detalles
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default QuickViewModal;