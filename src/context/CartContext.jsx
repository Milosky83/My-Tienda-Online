import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({});
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedCurrency = localStorage.getItem('currency');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing cart:', e);
      }
    }
    if (savedCurrency) {
      setCurrency(savedCurrency);
      setDisplayCurrency(savedCurrency);
    }
    fetchExchangeRates();
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('cart');
    }
    calculateTotal();
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
    calculateTotal();
  }, [currency, exchangeRates]);

  const fetchExchangeRates = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/exchange-rates`);
      const rates = {};
      res.data.forEach(rate => {
        rates[rate.currency] = rate.rate;
      });
      setExchangeRates(rates);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Tasas por defecto
      setExchangeRates({ USD: 1, EUR: 0.92, COP: 4000, MXN: 17.5 });
    }
  };

  const calculateTotal = () => {
    const newTotal = cart.reduce((sum, item) => {
      const itemTotal = (item.price || 0) * (item.quantity || 0);
      const rate = exchangeRates[currency] || 1;
      return sum + (itemTotal / rate);
    }, 0);
    setTotal(newTotal);
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: (item.quantity || 0) + quantity }
            : item
        );
      }
      return [...prevCart, { 
        ...product, 
        quantity,
        price: product.price || 0,
        id: product.id || Date.now().toString()
      }];
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
      USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs'
    };
    return symbols[curr] || curr;
  };

  const convertPrice = (price, fromCurrency = 'USD') => {
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[displayCurrency] || 1;
    const priceInUSD = price / fromRate;
    return priceInUSD * toRate;
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
      changeCurrency,
      getCurrencySymbol,
      convertPrice,
      exchangeRates
    }}>
      {children}
    </CartContext.Provider>
  );
};