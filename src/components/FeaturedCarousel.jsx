import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const FeaturedCarousel = () => {
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % products.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [products.length]);

  const fetchFeaturedProducts = async () => {
    try {
      const res = await axios.get('/api/featured');
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % products.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + products.length) % products.length);
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs' };
    return symbols[currency] || '$';
  };

  if (loading) {
    return (
      <div className="relative bg-gray-200 rounded-2xl overflow-hidden h-[400px] animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300"></div>
      </div>
    );
  }

  if (products.length === 0) return null;

  const currentProduct = products[currentIndex];

  return (
    <div className="relative bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl overflow-hidden shadow-2xl mb-12">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full opacity-10"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white rounded-full opacity-10"></div>
      
      <div className="relative container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Product info */}
          <div className="text-white animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-yellow-400">⭐</span>
              <span className="text-sm font-medium">Producto Destacado</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{currentProduct.name}</h2>
            <p className="text-white/90 mb-4 line-clamp-3">{currentProduct.description}</p>
            
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold">
                {getCurrencySymbol(currentProduct.currency || 'USD')}{currentProduct.price}
              </span>
              {currentProduct.original_price && (
                <span className="text-lg text-white/60 line-through">
                  {getCurrencySymbol(currentProduct.original_currency)}{currentProduct.original_price}
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <Link
                to={`/products/${currentProduct.id}`}
                className="bg-white text-emerald-600 px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition flex items-center gap-2"
              >
                Ver detalles
              </Link>
              <button
                onClick={() => addToCart(currentProduct, 1)}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition flex items-center gap-2"
              >
                🛒 Agregar
              </button>
            </div>
          </div>
          
          {/* Product image */}
          <div className="relative flex justify-center animate-float">
            <img
              src={currentProduct.image || 'https://via.placeholder.com/400'}
              alt={currentProduct.name}
              className="w-80 h-80 object-cover rounded-2xl shadow-2xl hover:scale-105 transition duration-500"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/400'; }}
            />
            {currentProduct.discount && (
              <div className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-lg animate-pulse">
                -{currentProduct.discount}%
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Navigation buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      
      {/* Dots indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {products.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'bg-white w-6' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default FeaturedCarousel;