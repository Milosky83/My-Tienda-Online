import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OfferManager = () => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percent: 0,
    start_date: '',
    end_date: '',
    active: true,
    products: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, []);

  const fetchOffers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/offers', { headers: { Authorization: token } });
      setOffers(res.data);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    
    const dataToSend = {
      ...formData,
      products: formData.products.filter(p => p.product_id)
    };
    
    try {
      if (editingOffer) {
        await axios.put(`/api/offers/${editingOffer.id}`, dataToSend, {
          headers: { Authorization: token }
        });
        alert('Oferta actualizada correctamente');
      } else {
        await axios.post('/api/offers', dataToSend, {
          headers: { Authorization: token }
        });
        alert('Oferta creada correctamente');
      }
      fetchOffers();
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar esta oferta?')) {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/offers/${id}`, { headers: { Authorization: token } });
      fetchOffers();
    }
  };

  const addProductToOffer = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { product_id: '', quantity: 1, discounted_price: '' }]
    });
  };

  const removeProductFromOffer = (index) => {
    const newProducts = formData.products.filter((_, i) => i !== index);
    setFormData({ ...formData, products: newProducts });
  };

  const updateProductInOffer = (index, field, value) => {
    const newProducts = [...formData.products];
    newProducts[index][field] = value;
    
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct && !newProducts[index].discounted_price) {
        newProducts[index].discounted_price = selectedProduct.price;
      }
    }
    
    setFormData({ ...formData, products: newProducts });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_percent: 0,
      start_date: '',
      end_date: '',
      active: true,
      products: []
    });
    setEditingOffer(null);
  };

  const openEditModal = (offer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      description: offer.description || '',
      discount_percent: offer.discount_percent || 0,
      start_date: offer.start_date?.split('T')[0] || '',
      end_date: offer.end_date?.split('T')[0] || '',
      active: offer.active === 1,
      products: offer.products.map(p => ({
        product_id: p.product_id,
        quantity: p.quantity,
        discounted_price: p.discounted_price || ''
      }))
    });
    setShowModal(true);
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs' };
    return symbols[currency] || '$';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🎯 Gestión de Ofertas</h2>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          + Nueva Oferta
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Descuento</th>
              <th className="p-3 text-center">Productos</th>
              <th className="p-3 text-center">Vigencia</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {offers.map(offer => (
              <tr key={offer.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <div className="font-medium">{offer.name}</div>
                  <div className="text-xs text-gray-500">{offer.description}</div>
                </td>
                <td className="p-3">{offer.discount_percent > 0 ? `${offer.discount_percent}%` : 'Precio especial'}</td>
                <td className="p-3 text-center">{offer.products?.length || 0} productos</td>
                <td className="p-3 text-center text-sm">
                  {new Date(offer.start_date).toLocaleDateString()}<br />
                  <span className="text-xs">hasta</span><br />
                  {new Date(offer.end_date).toLocaleDateString()}
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${offer.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {offer.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => openEditModal(offer)} className="text-yellow-600 hover:text-yellow-800">✏️</button>
                    <button onClick={() => handleDelete(offer.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr><td colSpan="6" className="text-center p-8 text-gray-500">No hay ofertas creadas</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{editingOffer ? 'Editar Oferta' : 'Nueva Oferta'}</h2>
                <button onClick={() => setShowModal(false)} className="text-2xl hover:text-gray-600">×</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre de la oferta *</label>
                  <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea className="input" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">% Descuento</label>
                    <input type="number" step="0.01" className="input" value={formData.discount_percent} onChange={e => setFormData({...formData, discount_percent: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estado</label>
                    <select className="input" value={formData.active} onChange={e => setFormData({...formData, active: e.target.value === 'true'})}>
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha inicio *</label>
                    <input type="date" className="input" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha fin *</label>
                    <input type="date" className="input" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} required />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Productos de la oferta</label>
                    <button type="button" onClick={addProductToOffer} className="text-blue-600 text-sm hover:text-blue-800">+ Agregar producto</button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {formData.products.map((product, idx) => (
                      <div key={idx} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                        <select
                          className="flex-1 input text-sm"
                          value={product.product_id}
                          onChange={(e) => updateProductInOffer(idx, 'product_id', e.target.value)}
                          required
                        >
                          <option value="">Seleccionar producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - {getCurrencySymbol(p.currency)}{p.price} {p.currency}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                                          placeholder="Cantidad"
                          className="w-24 input text-sm"
                          value={product.quantity}
                          onChange={(e) => updateProductInOffer(idx, 'quantity', parseInt(e.target.value))}
                          min="1"
                          required
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Precio oferta"
                          className="w-32 input text-sm"
                          value={product.discounted_price}
                          onChange={(e) => updateProductInOffer(idx, 'discounted_price', parseFloat(e.target.value))}
                        />
                        <button type="button" onClick={() => removeProductFromOffer(idx)} className="text-red-600">🗑️</button>
                      </div>
                    ))}
                    {formData.products.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No hay productos agregados. Haz clic en "Agregar producto"</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? 'Guardando...' : (editingOffer ? 'Actualizar' : 'Crear')}
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

export default OfferManager;