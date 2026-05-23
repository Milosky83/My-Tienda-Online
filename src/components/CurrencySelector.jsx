import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CurrencySelector = ({ onCurrencyChange, selectedCurrency }) => {
  const [currencies, setCurrencies] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const res = await axios.get('/api/exchange-rates');
      setCurrencies(res.data || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      // Datos por defecto en caso de error
      setCurrencies([
        { currency: 'USD', rate: 1, name: 'Dólar Americano', symbol: '$' },
        { currency: 'EUR', rate: 0.92, name: 'Euro', symbol: '€' },
        { currency: 'COP', rate: 4000, name: 'Peso Colombiano', symbol: '$' },
        { currency: 'MXN', rate: 17.5, name: 'Peso Mexicano', symbol: '$' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency) => {
    const found = currencies.find(c => c.currency === currency);
    if (found && found.symbol) return found.symbol;
    const defaultSymbols = {
      USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs'
    };
    return defaultSymbols[currency] || currency;
  };

  const getCurrencyName = (currency) => {
    const found = currencies.find(c => c.currency === currency);
    if (found && found.name) return found.name;
    return currency;
  };

  if (loading) {
    return (
      <div className="w-24 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
    );
  }

  const selectedCurrencyData = currencies.find(c => c.currency === selectedCurrency) || currencies[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
      >
        <span className="text-lg">{getCurrencySymbol(selectedCurrency)}</span>
        <span className="font-medium">{selectedCurrency}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <p className="text-xs text-gray-500 px-3 py-1">Selecciona tu moneda</p>
            {currencies.map(currency => (
              <button
                key={currency.currency}
                onClick={() => {
                  onCurrencyChange(currency.currency);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition flex items-center justify-between ${
                  selectedCurrency === currency.currency ? 'bg-emerald-50 text-emerald-600' : ''
                }`}
              >
                <div>
                  <span className="font-medium">{currency.currency}</span>
                  <span className="text-xs text-gray-500 ml-2">{currency.name || getCurrencyName(currency.currency)}</span>
                </div>
                <span className="text-lg">{getCurrencySymbol(currency.currency)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;