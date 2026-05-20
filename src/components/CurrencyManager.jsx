import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/currencies', { headers: { Authorization: token } });
      setCurrencies(res.data || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      alert('Error al cargar las monedas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
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
        alert('✅ Moneda actualizada correctamente');
      } else {
        await axios.post('/api/currencies', data, {
          headers: { Authorization: token }
        });
        alert('✅ Moneda creada correctamente');
      }
      fetchCurrencies();
      setShowModal(false);
      resetForm();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al guardar';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (currency) => {
    if (currency === 'USD') {
      alert('❌ No se puede eliminar la moneda base (USD)');
      return;
    }
    
    if (confirm(`¿Eliminar la moneda ${currency}?`)) {
      const token = localStorage.getItem('token');
      try {
        await axios.delete(`/api/currencies/${currency}`, {
          headers: { Authorization: token }
        });
        alert('✅ Moneda eliminada correctamente');
        fetchCurrencies();
      } catch (error) {
        alert(error.response?.data?.error || 'Error al eliminar');
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
    setError('');
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
              <th className="p-3 text-right">Tipo de Cambio (1 USD = ?)</th>
              <th className="p-3 text-center">Última actualización</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map(currency => (
              <tr key={currency.currency} className="border-b hover:bg-gray-50 transition">
                <td className="p-3 font-medium">
                  {currency.name || (
                    currency.currency === 'USD' ? 'Dólar Americano' :
                    currency.currency === 'EUR' ? 'Euro' :
                    currency.currency === 'COP' ? 'Peso Colombiano' :
                    currency.currency === 'MXN' ? 'Peso Mexicano' :
                    currency.currency === 'ARS' ? 'Peso Argentino' :
                    currency.currency === 'CLP' ? 'Peso Chileno' :
                    currency.currency === 'PEN' ? 'Sol Peruano' :
                    currency.currency === 'BOB' ? 'Boliviano' : currency.currency
                  )}
                </td>
                <td className="p-3 font-mono font-bold">{currency.currency}</td>
                <td className="p-3 text-2xl">{getCurrencySymbol(currency.symbol, currency.currency)}</td>
                <td className="p-3 text-right font-mono">
                  {currency.currency === 'USD' ? (
                    <span className="text-gray-500">1.0000 (Base)</span>
                  ) : (
                    <span className="font-medium">{currency.rate.toFixed(4)}</span>
                  )}
                </td>
                <td className="p-3 text-center text-xs text-gray-500">
                  {new Date(currency.updated_at).toLocaleString()}
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
                <td colSpan="6" className="text-center p-8 text-gray-500">
                  No hay monedas configuradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Modal de creación/edición */}
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
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  ❌ {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Código de moneda *</label>
                  <input
                    type="text"
                    className="input uppercase"
                    placeholder="Ej: USD, EUR, COP"
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    disabled={!!editingCurrency}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Código de 3 letras (ISO 4217)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre de la moneda</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: Dólar Americano, Euro"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Símbolo</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: $, €, S/"
                    value={formData.symbol}
                    onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo de cambio (1 USD = ?) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Ej: 1.00, 0.92, 4000"
                    value={formData.rate}
                    onChange={(e) => setFormData({...formData, rate: e.target.value})}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Cantidad de esta moneda equivalente a 1 USD
                  </p>
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
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800 flex items-center gap-2">
          <span>💡</span>
          <strong>Nota:</strong> El tipo de cambio determina el valor de cada moneda en relación al USD.
          La moneda base (USD) no se puede eliminar.
        </p>
      </div>
    </div>
  );
};

export default CurrencyManager;