import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({ USD: 1 });
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedCurrency = localStorage.getItem('currency');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    if (savedCurrency) {
      setCurrency(savedCurrency);
      setDisplayCurrency(savedCurrency);
    }
    fetchExchangeRates();
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    calculateTotal();
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
    calculateTotal();
  }, [currency, exchangeRates]);

  const fetchExchangeRates = async () => {
    try {
      const res = await axios.get('/api/exchange-rates');
      const rates = {};
      res.data.forEach(rate => {
        rates[rate.currency] = rate.rate;
      });
      setExchangeRates(rates);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    }
  };

  const calculateTotal = () => {
    const newTotal = cart.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      // Convertir a la moneda seleccionada
      const rate = exchangeRates[currency] || 1;
      const convertedTotal = itemTotal / rate;
      return sum + convertedTotal;
    }, 0);
    setTotal(newTotal);
  };

  const convertPrice = (price, fromCurrency = 'USD') => {
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[displayCurrency] || 1;
    const priceInUSD = price / fromRate;
    return priceInUSD * toRate;
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { ...product, quantity, original_currency: product.currency || 'USD' }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const changeCurrency = (newCurrency) => {
    setDisplayCurrency(newCurrency);
    setCurrency(newCurrency);
  };

  const getCurrencySymbol = (curr = displayCurrency) => {
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
    return symbols[curr] || '$';
  };

  const sendOrder = async (customerInfo) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Debes iniciar sesión');
    
    // Convertir total a USD para guardar en la base de datos
    const rate = exchangeRates[displayCurrency] || 1;
    const totalInUSD = total * rate;
    
    const response = await axios.post('/api/orders', {
      products: cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        original_price: item.original_price,
        currency: item.original_currency || 'USD'
      })),
      total: totalInUSD,
      currency: 'USD',
      customerInfo
    }, {
      headers: { Authorization: token }
    });
    
    // Crear mensaje de WhatsApp con la moneda seleccionada
    const message = `NUEVO PEDIDO\nMoneda: ${displayCurrency}\nTotal: ${getCurrencySymbol()}${total.toFixed(2)}\n\nCliente: ${customerInfo.name}\nTel: ${customerInfo.phone}\nDir: ${customerInfo.address}\n\nProductos:\n${cart.map(p => `- ${p.name} x${p.quantity} = ${getCurrencySymbol()}${(convertPrice(p.price, p.original_currency) * p.quantity).toFixed(2)}`).join('\n')}`;
    
    window.open(`https://wa.me/1234567890?text=${encodeURIComponent(message)}`, '_blank');
    clearCart();
    return response.data;
  };

  return (
    <CartContext.Provider value={{
      cart,
      total,
      currency: displayCurrency,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      sendOrder,
      changeCurrency,
      getCurrencySymbol,
      convertPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};