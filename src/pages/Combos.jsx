import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

const Combos = () => {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetchCombos();
  }, []);

  const fetchCombos = async () => {
    try {
      const response = await axios.get('/api/combos');
      console.log('Combos recibidos:', response.data);
      setCombos(response.data);
    } catch (error) {
      console.error('Error fetching combos:', error);
      toastError('Error al cargar los combos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComboToCart = (combo) => {
    let hasStock = true;
    let outOfStockProducts = [];
    
    combo.products.forEach(product => {
      if (product.stock < product.quantity) {
        hasStock = false;
        outOfStockProducts.push(`${product.name} (Stock: ${product.stock}, Necesario: ${product.quantity})`);
      }
    });
    
    if (!hasStock) {
      toastError(`❌ No hay suficiente stock:\n${outOfStockProducts.join('\n')}`);
      return;
    }
    
    // Agregar cada producto al carrito con la cantidad del combo
    combo.products.forEach(product => {
      const productToAdd = {
        id: product.product_id,
        name: product.name,
        price: product.unit_price,
        original_price: product.price,
        currency: product.currency || 'USD',
        image: product.image,
        stock: product.stock,
        combo_id: combo.id,
        combo_name: combo.name
      };
      
      addToCart(productToAdd, product.quantity);
    });
    
    success(`✅ Combo "${combo.name}" agregado al carrito!`);
  };

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-gray-200 h-96 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
          🎁 Combos Especiales
        </h1>
        <p className="text-gray-600">Lleva todo lo que necesitas en un solo combo y ahorra</p>
      </div>

      {combos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎁</div>
          <p className="text-gray-500 text-lg">No hay combos disponibles en este momento</p>
          <Link to="/products" className="text-emerald-600 hover:text-emerald-800 mt-2 inline-block">
            Ver productos →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {combos.map(combo => (
            <div key={combo.id} className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-emerald-200 hover:shadow-xl transition-all duration-300">
              {/* Header del combo */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">{combo.name}</h2>
                    <p className="text-sm opacity-90 mt-1">{combo.description}</p>
                  </div>
                  <div className="bg-yellow-400 text-emerald-800 px-3 py-1 rounded-full font-bold text-sm">
                    COMBO
                  </div>
                </div>
              </div>
              
              {/* Productos del combo */}
              <div className="p-5">
                <h3 className="font-semibold text-lg mb-3 text-emerald-700">📦 Productos incluidos:</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {combo.products.map(product => (
                    <div key={product.id} className="flex items-center gap-3 border-b border-emerald-100 pb-3">
                      <img 
                        src={product.image || 'https://via.placeholder.com/60'} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/60'; }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-sm bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            Cantidad: {product.quantity}
                          </span>
                          <span className="text-sm text-emerald-600 font-semibold">
                            {getCurrencySymbol(product.currency)}{product.unit_price} c/u
                          </span>
                          {product.unit_price < product.price && (
                            <span className="text-xs text-gray-400 line-through">
                              {getCurrencySymbol(product.currency)}{product.price}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">
                          {getCurrencySymbol(product.currency)}{(product.unit_price * product.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Resumen de precios */}
                <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Valor normal:</span>
                    <span className="text-gray-500 line-through">
                      {getCurrencySymbol(combo.currency)}{combo.products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                    <div>
                      <p className="text-sm text-gray-500">Total de productos:</p>
                      <p className="font-bold text-emerald-700">{combo.products.reduce((sum, p) => sum + p.quantity, 0)} unidades</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Precio del Combo:</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {getCurrencySymbol(combo.currency)}{combo.total_price?.toFixed(2)}
                      </p>
                      <p className="text-xs text-emerald-500">
                        Ahorro: {getCurrencySymbol(combo.currency)}{(combo.products.reduce((sum, p) => sum + (p.price * p.quantity), 0) - combo.total_price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleAddComboToCart(combo)}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition flex items-center justify-center gap-2"
                >
                  🛒 Agregar Combo al Carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Combos;