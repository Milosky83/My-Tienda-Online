import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CouponManager = () => {
  const [coupons, setCoupons] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: '',
    max_discount: '',
    start_date: '',
    end_date: '',
    usage_limit: '',
    active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/coupons', { headers: { Authorization: token } });
      setCoupons(res.data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      if (editingCoupon) {
        await axios.put(`/api/admin/coupons/${editingCoupon.id}`, formData, {
          headers: { Authorization: token }
        });
        alert('✅ Cupón actualizado');
      } else {
        await axios.post('/api/admin/coupons', formData, {
          headers: { Authorization: token }
        });
        alert('✅ Cupón creado');
      }
      fetchCoupons();
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este cupón?')) {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/coupons/${id}`, { headers: { Authorization: token } });
      fetchCoupons();
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_purchase: '',
      max_discount: '',
      start_date: '',
      end_date: '',
      usage_limit: '',
      active: true
    });
    setEditingCoupon(null);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase: coupon.min_purchase || '',
      max_discount: coupon.max_discount || '',
      start_date: coupon.start_date?.split('T')[0] || '',
      end_date: coupon.end_date?.split('T')[0] || '',
      usage_limit: coupon.usage_limit || '',
      active: coupon.active === 1
    });
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🎫 Cupones de Descuento</h2>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          + Nuevo Cupón
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Código</th>
              <th className="p-3 text-left">Descripción</th>
              <th className="p-3 text-center">Descuento</th>
              <th className="p-3 text-center">Usos</th>
              <th className="p-3 text-center">Vigencia</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map(coupon => (
              <tr key={coupon.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono font-bold text-emerald-600">{coupon.code}</td>
                <td className="p-3 text-sm">{coupon.description}</td>
                <td className="p-3 text-center">
                  {coupon.discount_type === 'percentage' 
                    ? `${coupon.discount_value}%` 
                    : `$${coupon.discount_value}`}
                </td>
                <td className="p-3 text-center">
                  {coupon.used_count}/{coupon.usage_limit || '∞'}
                </td>
                <td className="p-3 text-center text-xs">
                  {coupon.start_date ? new Date(coupon.start_date).toLocaleDateString() : 'Siempre'}
                  <br />
                  {coupon.end_date ? new Date(coupon.end_date).toLocaleDateString() : ''}
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${coupon.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {coupon.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => openEditModal(coupon)} className="text-yellow-600">✏️</button>
                    <button onClick={() => handleDelete(coupon.id)} className="text-red-600">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Modal de cupón */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}</h2>
                <button onClick={() => setShowModal(false)} className="text-2xl">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Código *</label>
                  <input type="text" className="input uppercase" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <input type="text" className="input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo</label>
                    <select className="input" value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto fijo ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valor *</label>
                    <input type="number" step="0.01" className="input" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Compra mínima</label>
                    <input type="number" step="0.01" className="input" value={formData.min_purchase} onChange={e => setFormData({...formData, min_purchase: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Máx. descuento</label>
                    <input type="number" step="0.01" className="input" value={formData.max_discount} onChange={e => setFormData({...formData, max_discount: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha inicio</label>
                    <input type="date" className="input" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha fin</label>
                    <input type="date" className="input" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Límite de usos</label>
                    <input type="number" className="input" value={formData.usage_limit} onChange={e => setFormData({...formData, usage_limit: e.target.value})} placeholder="Ilimitado" />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                      <span>Activo</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? 'Guardando...' : (editingCoupon ? 'Actualizar' : 'Crear')}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManager;