import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InventoryManager = ({ product, onUpdate, onClose }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'entry',
    quantity: '',
    reason: '',
    customReason: ''
  });

  useEffect(() => {
    fetchMovements();
  }, [product.id]);

  const fetchMovements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/inventory-movements?productId=${product.id}`, {
        headers: { Authorization: token }
      });
      setMovements(res.data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.quantity || formData.quantity <= 0) {
      alert('❌ La cantidad debe ser mayor a 0');
      return;
    }

    const finalReason = formData.customReason || formData.reason;
    if (!finalReason) {
      alert('❌ Debes especificar una razón para el movimiento');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/inventory-movements', {
        product_id: product.id,
        type: formData.type,
        quantity: parseInt(formData.quantity),
        reason: finalReason
      }, {
        headers: { Authorization: token }
      });
      
      alert(`✅ Inventario actualizado correctamente`);
      fetchMovements();
      onUpdate(); // Actualizar la lista de productos
      setFormData({ type: 'entry', quantity: '', reason: '', customReason: '' });
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || '❌ Error al actualizar inventario');
    } finally {
      setLoading(false);
    }
  };

  const getTypeText = (type) => {
    return type === 'entry' ? '📥 Entrada' : '📤 Salida';
  };

  const getTypeColor = (type) => {
    return type === 'entry' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getReasonBadgeColor = (reason) => {
    if (!reason) return 'bg-gray-100 text-gray-800';
    if (reason.includes('Venta') || reason.includes('venta')) return 'bg-red-100 text-red-800';
    if (reason.includes('Cancelado') || reason.includes('cancelado')) return 'bg-orange-100 text-orange-800';
    if (reason.includes('Devolución') || reason.includes('devolución')) return 'bg-green-100 text-green-800';
    if (reason.includes('Compra') || reason.includes('proveedor')) return 'bg-blue-100 text-blue-800';
    if (reason.includes('Ajuste')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">📦 Gestión de Inventario</h2>
            <button onClick={onClose} className="text-2xl hover:text-gray-600">×</button>
          </div>
          
          {/* Información del producto */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg mb-4">
            <h3 className="font-bold text-lg text-blue-800">{product.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <div>
                <p className="text-xs text-gray-500">Stock actual</p>
                <p className="text-2xl font-bold text-blue-600">{product.stock}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Precio</p>
                <p className="text-lg font-bold text-green-600">
                  {getCurrencySymbol(product.currency || 'USD')}{product.price}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Categoría</p>
                <p className="font-medium">{product.category || 'Sin categoría'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Código</p>
                <p className="font-mono text-sm">#{product.id?.slice(-8)}</p>
              </div>
            </div>
          </div>
          
          {/* Formulario de movimiento */}
          <form onSubmit={handleSubmit} className="mb-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span>➕</span> Agregar Movimiento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de movimiento *</label>
                <select
                  className="input"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="entry">📥 Entrada (Agregar stock)</option>
                  <option value="exit">📤 Salida (Quitar stock)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cantidad *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  min="1"
                  placeholder="Ej: 10"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Razón / Motivo *</label>
                <select
                  className="input mb-2"
                  value={formData.reason}
                  onChange={(e) => {
                    setFormData({...formData, reason: e.target.value, customReason: ''});
                  }}
                >
                  <option value="">Seleccionar razón predefinida...</option>
                  {formData.type === 'entry' ? (
                    <>
                      <option value="Compra a proveedor - Entrada de mercancía">🏭 Compra a proveedor</option>
                      <option value="Devolución de cliente - Entrada de stock">🔄 Devolución de cliente</option>
                      <option value="Traslado desde otra sucursal - Entrada">🚚 Traslado desde otra sucursal</option>
                      <option value="Inventario inicial - Entrada">📋 Inventario inicial</option>
                      <option value="Ajuste manual positivo - Entrada">⚙️ Ajuste manual positivo</option>
                      <option value="Reactivación de pedido - Entrada">🔄 Reactivación de pedido cancelado</option>
                    </>
                  ) : (
                    <>
                      <option value="Venta realizada - Salida de stock">🛒 Venta realizada</option>
                      <option value="Devolución a proveedor - Salida de stock">🏭 Devolución a proveedor</option>
                      <option value="Merma o pérdida - Salida de stock">⚠️ Merma o pérdida</option>
                      <option value="Traslado a otra sucursal - Salida">🚚 Traslado a otra sucursal</option>
                      <option value="Ajuste manual negativo - Salida">⚙️ Ajuste manual negativo</option>
                      <option value="Cancelación de pedido - Salida">❌ Cancelación de pedido</option>
                    </>
                  )}
                </select>
                <input
                  type="text"
                  className="input"
                  placeholder="O escribir una razón personalizada..."
                  value={formData.customReason}
                  onChange={(e) => setFormData({...formData, customReason: e.target.value, reason: ''})}
                />
              </div>
            </div>
            <button 
              type="submit" 
              className={`w-full mt-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                formData.type === 'entry' 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              disabled={loading}
            >
              {loading ? (
                'Procesando...'
              ) : (
                <>
                  {formData.type === 'entry' ? '📥 Agregar Stock' : '📤 Quitar Stock'}
                </>
              )}
            </button>
          </form>
          
          {/* Historial de movimientos */}
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <span>📜</span> Historial de Movimientos
          </h3>
          <div className="overflow-x-auto max-h-80 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-center">Tipo</th>
                  <th className="p-2 text-center">Cantidad</th>
                  <th className="p-2 text-center">Stock anterior</th>
                  <th className="p-2 text-center">Stock nuevo</th>
                  <th className="p-2 text-left">Razón</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, idx) => (
                  <tr key={m.id || idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-xs whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(m.type)}`}>
                        {getTypeText(m.type)}
                      </span>
                    </td>
                    <td className="p-2 text-center font-bold">{m.quantity}</td>
                    <td className="p-2 text-center">{m.previous_stock}</td>
                    <td className="p-2 text-center font-bold">{m.new_stock}</td>
                    <td className="p-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${getReasonBadgeColor(m.reason)}`}>
                        {m.reason || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center p-8 text-gray-500">
                      No hay movimientos registrados para este producto
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Información de notas */}
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            <p className="font-semibold mb-1">💡 Notas importantes:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Las <strong>entradas</strong> aumentan el stock (compras, devoluciones, ajustes positivos)</li>
              <li>Las <strong>salidas</strong> disminuyen el stock (ventas, mermas, ajustes negativos)</li>
              <li>Los pedidos de clientes generan <strong>salidas automáticas</strong> en el inventario</li>
              <li>Las cancelaciones de pedidos generan <strong>entradas automáticas</strong> (devolución de stock)</li>
              <li>Registrar una razón clara ayuda al seguimiento del inventario</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;