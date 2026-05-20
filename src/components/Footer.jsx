import React from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';

const Footer = () => {
  const { businessInfo } = useBusiness();

  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              {businessInfo.logo ? (
                <img 
                  src={businessInfo.logo} 
                  alt={businessInfo.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <span className="text-2xl">🛍️</span>
              )}
              <h3 className="text-xl font-bold">{businessInfo.name}</h3>
            </div>
            <p className="text-gray-300 text-sm">{businessInfo.description}</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-3">Enlaces</h3>
            <ul className="space-y-1">
              <li><Link to="/" className="text-gray-300 hover:text-white transition">Inicio</Link></li>
              <li><Link to="/products" className="text-gray-300 hover:text-white transition">Productos</Link></li>
              <li><Link to="/combos" className="text-gray-300 hover:text-white transition">Combos</Link></li>
              <li><Link to="/offers" className="text-gray-300 hover:text-white transition">Ofertas</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-3">Contacto</h3>
            <ul className="space-y-1 text-gray-300 text-sm">
              <li>📧 {businessInfo.email}</li>
              <li>📞 {businessInfo.phone}</li>
              <li>📍 {businessInfo.address}</li>
              {businessInfo.website && (
                <li>🌐 {businessInfo.website}</li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-6 pt-6 text-center text-gray-300 text-sm">
          <p>&copy; {new Date().getFullYear()} {businessInfo.name}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;