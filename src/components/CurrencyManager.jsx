import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const CurrencyManager = () => {
  const [currencies, setCurrencies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [formData, setFormData] = useState({
    currency: '',
    rate: '',
    name: '',
    symbol: ''
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/currencies', { 
        headers: { Authorization: token } 
      });
      setCurrencies(res.data || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toastError('Error al cargar las monedas');
      // Datos por defecto en caso de error
      setCurrencies([
        { currency: 'USD', rate: 1, name: 'Dólar Americano', symbol: '$' },
        { currency: 'EUR', rate: 0.92, name: 'Euro', symbol: '€' },
        { currency: 'COP', rate: 4000, name: 'Peso Colombiano', symbol: '$' }
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    
    const token = localStorage.getItem('token');
    const data = {
      currency: formData.currency.toUpperCase(),
      rate: parseFloat(formData.rate),
      name: formData.name,
      symbol: formData.symbol
    };
    
    try {
      if (editingCurrency) {
        await axios.put(`/api/currencies/${editingCurrency.currency}`, data, {
          headers: { Authorization: token }
        });
        success('✅ Moneda actualizada correctamente');
      } else {
        await axios.post('/api/currencies', data, {
          headers: { Authorization: token }
        });
        success('✅ Moneda creada correctamente');
      }
      await fetchCurrencies();
      setShowModal(false);
      resetForm();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al guardar';
      setFormError(errorMsg);
      toastError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (currency) => {
    if (currency === 'USD') {
      toastError('❌ No se puede eliminar la moneda base (USD)');
      return;
    }
    
    if (window.confirm(`¿Eliminar la moneda ${currency}?`)) {
      const token = localStorage.getItem('token');
      try {
        await axios.delete(`/api/currencies/${currency}`, {
          headers: { Authorization: token }
        });
        success('✅ Moneda eliminada correctamente');
        await fetchCurrencies();
      } catch (err) {
        toastError(err.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  const openEditModal = (currency) => {
    setEditingCurrency(currency);
    setFormData({
      currency: currency.currency,
      rate: currency.rate,
      name: currency.name || '',
      symbol: currency.symbol || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      currency: '',
      rate: '',
      name: '',
      symbol: ''
    });
    setEditingCurrency(null);
    setFormError('');
  };

  const getCurrencySymbol = (symbol, currency) => {
    if (symbol) return symbol;
    const defaultSymbols = {
      USD: '$',
      EUR: '€',
      COP: '$',
      MXN: '$',
      ARS: '$',
      CLP: '$',
      PEN: 'S/',
      BOB: 'Bs'
    };
    return defaultSymbols[currency] || currency;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">💱 Gestión de Monedas</h2>
          <p className="text-sm text-gray-500 mt-1">Administra las monedas disponibles y sus tipos de cambio</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          + Nueva Moneda
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Moneda</th>
              <th className="p-3 text-left">Código</th>
              <th className="p-3 text-left">Símbolo</th>
              <th className="p-3 text-right">Tipo de Cambio</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map(currency => (
              <tr key={currency.currency} className="border-b hover:bg-gray-50 transition">
                <td className="p-3 font-medium">{currency.name || currency.currency}</td>
                <td className="p-3 font-mono font-bold">{currency.currency}</td>
                <td className="p-3 text-2xl">{getCurrencySymbol(currency.symbol, currency.currency)}</td>
                <td className="p-3 text-right font-mono">
                  {currency.currency === 'USD' ? (
                    <span className="text-gray-500">1.0000 (Base)</span>
                  ) : (
                    <span className="font-medium">1 USD = {currency.rate?.toFixed(4)} {currency.currency}</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => openEditModal(currency)}
                      className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-50 transition"
                      title="Editar moneda"
                    >
                      ✏️
                    </button>
                    {currency.currency !== 'USD' && (
                      <button
                        onClick={() => handleDelete(currency.currency)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition"
                        title="Eliminar moneda"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                 </td>
               </tr>
            ))}
            {currencies.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-8 text-gray-500">
                  No hay monedas configuradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingCurrency ? '✏️ Editar Moneda' : '➕ Nueva Moneda'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-2xl hover:text-gray-600">&times;</button>
              </div>
              
              {formError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  ❌ {formError}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Código de moneda *</label>
                  <input
                    type="text"
                    className={`input uppercase ${editingCurrency ? 'bg-gray-100 text-gray-600' : ''}`}
                    placeholder="Ej: USD, EUR, COP"
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    disabled={!!editingCurrency}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: Dólar Americano"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Símbolo</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: $, €"
                    value={formData.symbol}
                    onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de cambio *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="1 USD = ?"
                    value={formData.rate}
                    onChange={(e) => setFormData({...formData, rate: e.target.value})}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Cantidad de esta moneda equivalente a 1 USD</p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? 'Guardando...' : (editingCurrency ? 'Actualizar' : 'Crear')}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyManager;