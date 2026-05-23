import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length > 1) {
      const delayDebounce = setTimeout(() => {
        searchProducts();
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query]);

  const searchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/products?search=${encodeURIComponent(query)}&limit=5`);
      setResults(res.data.products || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching products:', error);
      toastError('Error al buscar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
      setShowResults(false);
    }
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs' };
    return symbols[currency] || '$';
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productos..."
          className="w-full px-4 py-2 pl-10 pr-12 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {/* Resultados del autocompletado */}
      {showResults && query.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto animate-fade-in">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-pulse flex items-center justify-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
                <span className="ml-2">Buscando...</span>
              </div>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="p-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Productos encontrados ({results.length})</span>
              </div>
              {results.map(product => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  onClick={() => setShowResults(false)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 transition group"
                >
                  <img
                    src={product.image || 'https://via.placeholder.com/50'}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/50'; }}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 group-hover:text-emerald-600 transition line-clamp-1">
                      {product.name}
                    </h4>
                    <p className="text-sm text-gray-500 line-clamp-1">
                      {product.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600">
                      {getCurrencySymbol(product.currency || 'USD')}{product.price}
                    </span>
                    {product.stock < 10 && product.stock > 0 && (
                      <p className="text-xs text-orange-500">¡Últimas!</p>
                    )}
                  </div>
                </Link>
              ))}
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={handleSearch}
                  className="w-full text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium py-1"
                >
                  Ver todos los resultados ({results.length}+)
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">No se encontraron productos</p>
              <p className="text-sm text-gray-400 mt-1">Intenta con otras palabras</p>
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce {
          animation: bounce 0.6s ease-in-out infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
      `}</style>
    </div>
  );
};

export default SearchBar;