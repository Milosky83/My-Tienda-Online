import React, { useState } from 'react';
import axios from 'axios';

const CouponInput = ({ total, onApplyCoupon }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Ingresa un código');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/validate-coupon', 
        { code: code, total },
        { headers: { Authorization: token } }
      );
      
      setSuccess(`¡Cupón aplicado! Descuento: $${res.data.discount.toFixed(2)}`);
      onApplyCoupon(res.data);
    } catch (error) {
      setError(error.response?.data?.error || 'Cupón inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t pt-4 mt-4">
      <label className="block text-sm font-medium mb-2">🎫 ¿Tienes un cupón?</label>
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder="Ingresa tu código"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button
          onClick={handleApply}
          disabled={loading}
          className="btn-secondary whitespace-nowrap"
        >
          {loading ? '...' : 'Aplicar'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      {success && <p className="text-green-600 text-sm mt-1">{success}</p>}
    </div>
  );
};

export default CouponInput;