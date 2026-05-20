import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await axios.get('/api/offers');
      setOffers(response.data);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOfferToCart = (offer) => {
    // Verificar stock de todos los productos
    let hasStock = true;
    let outOfStockProducts = [];
    
    offer.products.forEach(product => {
      if (product.stock < product.quantity) {
        hasStock = false;
        outOfStockProducts.push(`${product.name} (Stock: ${product.stock}, Necesario: ${product.quantity})`);
      }
    });
    
    if (!hasStock) {
      alert(`No hay suficiente stock para los siguientes productos:\n${outOfStockProducts.join('\n')}`);
      return;
    }
    
    // Agregar cada producto al carrito con la cantidad de la oferta
    offer.products.forEach(product => {
      const productToAdd = {
        id: product.product_id,
        name: product.name,
        price: product.discounted_price || product.price,
        original_price: product.price,
        currency: product.currency || 'USD',
        image: product.image,
        stock: product.stock,
        offer_id: offer.id,
        offer_name: offer.name
      };
      
      addToCart(productToAdd, product.quantity);
    });
    
    alert(`✅ Oferta "${offer.name}" agregada al carrito!\nSe agregaron ${offer.products.length} productos diferentes.`);
  };

  const getDiscountText = (offer) => {
    if (offer.discount_percent > 0) {
      return `${offer.discount_percent}% OFF`;
    }
    return 'Oferta especial';
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
        <h1 className="text-4xl font-bold text-red-600 mb-2">🔥 Ofertas Especiales</h1>
        <p className="text-gray-600">Aprovecha estas ofertas por tiempo limitado</p>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay ofertas activas en este momento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {offers.map(offer => (
            <div key={offer.id} className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-red-200 hover:shadow-xl transition">
              {/* Header de oferta */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">{offer.name}</h2>
                    <p className="text-sm opacity-90 mt-1">{offer.description}</p>
                  </div>
                  <div className="bg-yellow-400 text-red-700 px-3 py-1 rounded-full font-bold text-sm">
                    {getDiscountText(offer)}
                  </div>
                </div>
              </div>
              
              {/* Productos de la oferta */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-3">Productos incluidos:</h3>
                <div className="space-y-3">
                  {offer.products.map(product => (
                    <div key={product.id} className="flex items-center gap-3 border-b pb-3">
                      <img 
                        src={product.image || 'https://via.placeholder.com/60'} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/60'; }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500">Cantidad: {product.quantity}</span>
                          {product.discounted_price ? (
                            <>
                              <span className="text-red-600 font-bold">
                                {getCurrencySymbol(product.currency)}{product.discounted_price}
                              </span>
                              <span className="text-gray-400 line-through text-sm">
                                {getCurrencySymbol(product.currency)}{product.price}
                              </span>
                            </>
                          ) : (
                            <span className="text-blue-600 font-bold">
                              {getCurrencySymbol(product.currency)}{product.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Calcular precio total de la oferta */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Valor normal:</p>
                      <p className="text-gray-400 line-through">
                        {getCurrencySymbol(offer.products[0]?.currency || 'USD')}
                        {offer.products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Precio de oferta:</p>
                      <p className="text-2xl font-bold text-red-600">
                        {getCurrencySymbol(offer.products[0]?.currency || 'USD')}
                        {offer.products.reduce((sum, p) => sum + ((p.discounted_price || p.price) * p.quantity), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {offer.discount_percent > 0 && (
                    <div className="mt-2 text-center">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Ahorro: {getCurrencySymbol(offer.products[0]?.currency || 'USD')}
                        {(offer.products.reduce((sum, p) => sum + (p.price * p.quantity), 0) - 
                          offer.products.reduce((sum, p) => sum + ((p.discounted_price || p.price) * p.quantity), 0)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleAddOfferToCart(offer)}
                  className="w-full mt-4 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  🛒 Agregar Oferta al Carrito
                </button>
              </div>
              
              {/* Fechas de la oferta */}
              <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 flex justify-between">
                <span>📅 Desde: {new Date(offer.start_date).toLocaleDateString()}</span>
                <span>📅 Hasta: {new Date(offer.end_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Offers;