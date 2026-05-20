import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <div className="relative bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl shadow-xl overflow-hidden min-h-[380px] mb-8">
      {/* Olas líquidas SVG */}
      <div className="absolute inset-0 opacity-20">
        <svg className="absolute bottom-0 w-full h-32" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="white" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
        </svg>
        <svg className="absolute bottom-0 w-full h-20 opacity-50" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ animation: 'wave 6s ease-in-out infinite' }}>
          <path fill="white" fillOpacity="0.5" d="M0,192L48,186.7C96,181,192,171,288,170.7C384,171,480,181,576,192C672,203,768,213,864,208C960,203,1056,181,1152,165.3C1248,149,1344,139,1392,133.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
        </svg>
      </div>
      
      <div className="relative container mx-auto px-6 py-12 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Texto */}
        <div className="flex-1 text-center lg:text-left animate-slide-in-left">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full mb-4">
            <span className="text-yellow-400 text-sm">🌟</span>
            <span className="text-xs font-medium text-white">¡Ofertas imperdibles!</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
            Sumérgete en el
            <span className="text-yellow-300"> mejor</span>
            <br />
            mundo de compras
          </h1>
          
          <p className="text-sm text-white/90 mb-6 max-w-md mx-auto lg:mx-0">
            Descubre una experiencia única con productos de alta calidad y precios que te encantarán.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link to="/products" className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full font-semibold text-sm hover:bg-yellow-300 hover:shadow-lg transition-all flex items-center justify-center gap-2">
              🚀 Explorar Ahora
            </Link>
            <Link to="/offers" className="border-2 border-white/30 text-white px-6 py-2 rounded-full font-semibold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              🎯 Ver Ofertas
            </Link>
          </div>
        </div>
        
        {/* Ilustración flotante - más pequeña */}
        <div className="flex-1 relative animate-float-liquid">
          <div className="relative w-56 h-56 mx-auto">
            <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">🛍️</div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-white font-bold text-lg">-30% OFF</p>
                  <p className="text-white/80 text-xs">en tu primera compra</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes float-liquid {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes wave {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-15px); }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.6s ease-out forwards;
        }
        .animate-float-liquid {
          animation: float-liquid 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default HeroSection;