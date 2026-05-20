import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ComboManager = () => {
  const [combos, setCombos] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'USD',
    active: true,
    products: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCombos();
    fetchProducts();
  }, []);

  const fetchCombos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/combos', { headers: { Authorization: token } });
      setCombos(res.data);
    } catch (error) {
      console.error('Error fetching combos:', error);
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

  const calculateComboTotal = (productsList) => {
    return productsList.reduce((sum, p) => {
      const quantity = p.quantity || 0;
      const unitPrice = p.unit_price || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    
    const validProducts = formData.products.filter(p => p.product_id && p.quantity > 0 && p.unit_price > 0);
    
    const productsToSend = validProducts.map(p => ({
      product_id: p.product_id,
      quantity: p.quantity,
      unit_price: p.unit_price,
      total_price: p.quantity * p.unit_price
    }));
    
    const totalCombo = calculateComboTotal(validProducts);
    
    const dataToSend = {
      name: formData.name,
      description: formData.description,
      total_price: totalCombo,
      currency: formData.currency,
      active: formData.active,
      products: productsToSend
    };
    
    try {
      if (editingCombo) {
        await axios.put(`/api/combos/${editingCombo.id}`, dataToSend, {
          headers: { Authorization: token }
        });
        alert('✅ Combo actualizado correctamente');
      } else {
        await axios.post('/api/combos', dataToSend, {
          headers: { Authorization: token }
        });
        alert('✅ Combo creado correctamente');
      }
      fetchCombos();
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este combo?')) {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/combos/${id}`, { headers: { Authorization: token } });
      fetchCombos();
    }
  };

  const addProductToCombo = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { 
        product_id: '', 
        quantity: 1, 
        unit_price: 0,
        total_price: 0
      }]
    });
  };

  const removeProductFromCombo = (index) => {
    const newProducts = formData.products.filter((_, i) => i !== index);
    setFormData({ ...formData, products: newProducts });
  };

  const updateProductInCombo = (index, field, value) => {
    const newProducts = [...formData.products];
    newProducts[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? parseFloat(value) : newProducts[index].quantity;
      const unitPrice = field === 'unit_price' ? parseFloat(value) : newProducts[index].unit_price;
      newProducts[index].total_price = (quantity || 0) * (unitPrice || 0);
    }
    
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct && newProducts[index].unit_price === 0) {
        newProducts[index].unit_price = selectedProduct.price;
        newProducts[index].total_price = (newProducts[index].quantity || 1) * selectedProduct.price;
      }
    }
    
    setFormData({ ...formData, products: newProducts });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      currency: 'USD',
      active: true,
      products: []
    });
    setEditingCombo(null);
  };

  const openEditModal = (combo) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || '',
      currency: combo.currency || 'USD',
      active: combo.active === 1,
      products: combo.products.map(p => ({
        product_id: p.product_id,
        quantity: p.quantity,
        unit_price: p.unit_price,
        total_price: p.total_price || (p.quantity * p.unit_price)
      }))
    });
    setShowModal(true);
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs' };
    return symbols[currency] || '$';
  };

  const comboTotal = calculateComboTotal(formData.products);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-emerald-700">🎁 Gestión de Combos</h2>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          + Nuevo Combo
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-emerald-50">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Descripción</th>
              <th className="p-3 text-right">Precio Combo</th>
              <th className="p-3 text-center">Productos</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {combos.map(combo => (
              <tr key={combo.id} className="border-b hover:bg-emerald-50 transition">
                <td className="p-3 font-medium text-emerald-800">{combo.name}</td>
                <td className="p-3 text-sm">{combo.description?.substring(0, 50)}...</td>
                <td className="p-3 text-right font-bold text-emerald-600">
                  {getCurrencySymbol(combo.currency)}{combo.total_price?.toFixed(2)}
                </td>
                <td className="p-3 text-center">{combo.products?.length || 0} productos</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${combo.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                    {combo.active ? 'Activo' : 'Inactivo'}
                  </span>
                 </td>
                <td className="p-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => openEditModal(combo)} className="text-emerald-600 hover:text-emerald-800">✏️</button>
                    <button onClick={() => handleDelete(combo.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                  </div>
                 </td>
               </tr>
            ))}
            {combos.length === 0 && (
              <tr><td colSpan="6" className="text-center p-8 text-gray-500">No hay combos creados</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Modal de creación/edición de combo */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-emerald-700">{editingCombo ? 'Editar Combo' : 'Nuevo Combo'}</h2>
                <button onClick={() => setShowModal(false)} className="text-2xl hover:text-gray-600">×</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Formulario existente... */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre del Combo *</label>
                    <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Moneda</label>
                    <select className="input" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                      <option value="USD">🇺🇸 USD - Dólar</option>
                      <option value="EUR">🇪🇺 EUR - Euro</option>
                      <option value="COP">🇨🇴 COP - Peso Colombiano</option>
                      <option value="MXN">🇲🇽 MXN - Peso Mexicano</option>
                      <option value="ARS">🇦🇷 ARS - Peso Argentino</option>
                      <option value="CLP">🇨🇱 CLP - Peso Chileno</option>
                      <option value="PEN">🇵🇪 PEN - Sol Peruano</option>
                      <option value="BOB">🇧🇴 BOB - Boliviano</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea className="input" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select className="input" value={formData.active} onChange={e => setFormData({...formData, active: e.target.value === 'true'})}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Productos del Combo</label>
                    <button type="button" onClick={addProductToCombo} className="text-emerald-600 text-sm hover:text-emerald-800">+ Agregar producto</button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                    {formData.products.map((product, idx) => (
                      <div key={idx} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                        <select
                          className="flex-1 input text-sm"
                          value={product.product_id}
                          onChange={(e) => updateProductInCombo(idx, 'product_id', e.target.value)}
                          required
                        >
                          <option value="">Seleccionar producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} - Precio normal: {getCurrencySymbol(p.currency)}{p.price}
                            </option>
                          ))}
                        </select>
                        
                        <div className="w-24">
                          <label className="text-xs text-gray-500">Cantidad</label>
                          <input
                            type="number"
                            className="input text-sm"
                            value={product.quantity}
                            onChange={(e) => updateProductInCombo(idx, 'quantity', parseInt(e.target.value))}
                            min="1"
                            required
                          />
                        </div>
                        
                        <div className="w-32">
                          <label className="text-xs text-gray-500">Precio x unidad</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input text-sm"
                            value={product.unit_price}
                            onChange={(e) => updateProductInCombo(idx, 'unit_price', parseFloat(e.target.value))}
                            min="0.01"
                            required
                          />
                        </div>
                        
                        <div className="w-28 text-right">
                          <label className="text-xs text-gray-500">Subtotal</label>
                          <p className="font-bold text-emerald-600">
                            {getCurrencySymbol(formData.currency)}{(product.quantity * product.unit_price).toFixed(2)}
                          </p>
                        </div>
                        
                        <button type="button" onClick={() => removeProductFromCombo(idx)} className="text-red-600 mt-4">🗑️</button>
                      </div>
                    ))}
                    {formData.products.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No hay productos agregados. Haz clic en "Agregar producto"</p>
                    )}
                  </div>
                </div>
                
                {/* Resumen del Combo */}
                {formData.products.length > 0 && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-2 text-emerald-800">📊 Resumen del Combo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Desglose de productos:</p>
                        <ul className="text-sm mt-1 space-y-1">
                          {formData.products.map((p, idx) => {
                            const product = products.find(prod => prod.id === p.product_id);
                            return product && (
                              <li key={idx} className="text-gray-600">
                                • {product.name}: {p.quantity} x {getCurrencySymbol(formData.currency)}{p.unit_price} = {getCurrencySymbol(formData.currency)}{(p.quantity * p.unit_price).toFixed(2)}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total del Combo:</p>
                        <p className="text-3xl font-bold text-emerald-600">
                          {getCurrencySymbol(formData.currency)}{comboTotal.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Precio por todo el paquete
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? 'Guardando...' : (editingCombo ? 'Actualizar Combo' : 'Crear Combo')}
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

export default ComboManager;