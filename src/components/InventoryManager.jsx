import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const InventoryManager = ({ product, onUpdate, onClose }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'entry',
    quantity: '',
    reason: '',
    customReason: ''
  });
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (product && product.id) {
      fetchMovements();
    }
  }, [product]);

  const fetchMovements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/inventory-movements?productId=${product.id}&limit=50`, {
        headers: { Authorization: token }
      });
      setMovements(res.data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
      toastError('Error al cargar el historial');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.quantity || formData.quantity <= 0) {
      toastError('❌ La cantidad debe ser mayor a 0');
      return;
    }

    const finalReason = formData.customReason || formData.reason;
    if (!finalReason) {
      toastError('❌ Debes especificar una razón para el movimiento');
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
      
      success(`✅ ${formData.type === 'entry' ? 'Entrada' : 'Salida'} registrada correctamente`);
      fetchMovements();
      if (onUpdate) onUpdate();
      setFormData({ type: 'entry', quantity: '', reason: '', customReason: '' });
    } catch (error) {
      console.error('Error:', error);
      toastError(error.response?.data?.error || '❌ Error al actualizar inventario');
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

  if (!product) {
    return null;
  }

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
                <p className="text-2xl font-bold text-blue-600">{product.stock || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Precio</p>
                <p className="text-lg font-bold text-green-600">
                  ${product.price} {product.currency || 'USD'}
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
          
          {/* Formulario */}
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
                    </>
                  ) : (
                    <>
                      <option value="Venta realizada - Salida de stock">🛒 Venta realizada</option>
                      <option value="Devolución a proveedor - Salida de stock">🏭 Devolución a proveedor</option>
                      <option value="Merma o pérdida - Salida de stock">⚠️ Merma o pérdida</option>
                      <option value="Traslado a otra sucursal - Salida">🚚 Traslado a otra sucursal</option>
                      <option value="Ajuste manual negativo - Salida">⚙️ Ajuste manual negativo</option>
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
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesando...
                </div>
              ) : (
                <>
                  {formData.type === 'entry' ? '📥 Agregar Stock' : '📤 Quitar Stock'}
                </>
              )}
            </button>
          </form>
          
          {/* Historial */}
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
                    <td className="p-2 text-xs">{m.reason || '-'}</td>
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
          
          {/* Nota */}
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            <p>💡 <strong>Nota:</strong> Los pedidos de clientes generan salidas automáticas. Las cancelaciones generan entradas automáticas.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;