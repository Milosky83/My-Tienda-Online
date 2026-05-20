import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import HeroSection from '../components/HeroSection';
import axios from 'axios';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [featuredCombos, setFeaturedCombos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [featuredRes, bestSellersRes, combosRes] = await Promise.all([
        axios.get('/api/featured'),
        axios.get('/api/bestsellers'),
        axios.get('/api/combos')
      ]);
      setFeaturedProducts(featuredRes.data);
      setBestSellers(bestSellersRes.data);
      setFeaturedCombos(combosRes.data.slice(0, 2));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs' };
    return symbols[currency] || '$';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="skeleton h-96 rounded-3xl mb-12"></div>
        <div className="skeleton h-8 w-48 mx-auto mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-80 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <HeroSection />
      
      {/* Combos Destacados */}
      {featuredCombos.length > 0 && (
        <div className="mb-16 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
              <span>🎁</span> Combos Especiales
            </h2>
            <Link to="/combos" className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 group">
              Ver todos 
              <span className="group-hover:translate-x-1 transition">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {featuredCombos.map(combo => (
              <Link key={combo.id} to="/combos" className="block group">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-purple-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-purple-800">{combo.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{combo.description}</p>
                    </div>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      COMBO
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div>
                      <p className="text-sm text-gray-500">{combo.products?.length || 0} productos incluidos</p>
                      <p className="text-2xl font-bold text-green-600">
                        {getCurrencySymbol(combo.currency)}{combo.total_price?.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-purple-600 font-semibold group-hover:translate-x-1 transition">Ver combo →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Productos Destacados */}
      {featuredProducts.length > 0 && (
        <div className="mb-16 animate-fade-in">
          <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">
            <span>⭐</span> Productos Destacados
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Más Vendidos */}
      {bestSellers.length > 0 && (
        <div className="mb-16 animate-fade-in">
          <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">
            <span>🔥</span> Los Más Vendidos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
      
      {/* Banner de suscripción */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-center text-white animate-fade-in">
        <h3 className="text-2xl font-bold mb-2">📧 ¡No te pierdas las mejores ofertas!</h3>
        <p className="text-gray-300 mb-4">Suscríbete para recibir descuentos exclusivos</p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input type="email" placeholder="Tu correo electrónico" className="input bg-white text-gray-900" />
          <button className="btn-primary whitespace-nowrap">Suscribirme</button>
        </div>
      </div>
    </div>
  );
};

export default Home;