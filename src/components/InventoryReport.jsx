import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const InventoryReport = () => {
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState({
    total_entries: 0,
    total_exits: 0,
    net_change: 0,
    products_affected: 0
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    productId: 'todos',
    type: 'todos'
  });
  const [reasonFilter, setReasonFilter] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchInventoryReport();
  }, [filters, reasonFilter]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchInventoryReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (filters.from && filters.from !== '') params.from = filters.from;
      if (filters.to && filters.to !== '') params.to = filters.to;
      if (filters.productId && filters.productId !== 'todos') params.productId = filters.productId;
      if (filters.type && filters.type !== 'todos') params.type = filters.type;
      
      const res = await axios.get('/api/inventory-report', { 
        params,
        headers: { Authorization: token } 
      });
      
      let filteredMovements = res.data.movements || [];
      
      // Filtrar por razón si se seleccionó
      if (reasonFilter && reasonFilter !== '') {
        filteredMovements = filteredMovements.filter(m => 
          m.reason && m.reason.toLowerCase().includes(reasonFilter.toLowerCase())
        );
      }
      
      setMovements(filteredMovements);
      setSummary(res.data.summary || {
        total_entries: 0,
        total_exits: 0,
        net_change: 0,
        products_affected: 0
      });
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      setMovements([]);
      setSummary({
        total_entries: 0,
        total_exits: 0,
        net_change: 0,
        products_affected: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      from: '',
      to: '',
      productId: 'todos',
      type: 'todos'
    });
    setReasonFilter('');
  };

  const exportToPDF = () => {
    if (!movements || movements.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 200);
    doc.text('Reporte de Inventario', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });
    
    if (filters.from || filters.to) {
      let filterText = 'Filtros: ';
      if (filters.from) filterText += `Desde ${filters.from} `;
      if (filters.to) filterText += `Hasta ${filters.to}`;
      doc.text(filterText, pageWidth / 2, 38, { align: 'center' });
    }
    
    const tableColumnas = ["Producto", "Categoría", "Tipo", "Cantidad", "Stock Anterior", "Stock Nuevo", "Razón", "Fecha"];
    const tableDatos = movements.map(m => [
      m.product_name,
      m.category || '-',
      m.type === 'entry' ? '📥 Entrada' : '📤 Salida',
      m.quantity.toString(),
      m.previous_stock?.toString() || '0',
      m.new_stock?.toString() || '0',
      m.reason || '-',
      new Date(m.created_at).toLocaleString()
    ]);
    
    autoTable(doc, {
      head: [tableColumnas],
      body: tableDatos,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Resumen:`, 14, finalY);
    doc.setFontSize(10);
    doc.text(`Total Entradas: ${summary.total_entries} unidades`, 14, finalY + 7);
    doc.text(`Total Salidas: ${summary.total_exits} unidades`, 14, finalY + 14);
    doc.text(`Cambio Neto: ${summary.net_change >= 0 ? '+' : ''}${summary.net_change} unidades`, 14, finalY + 21);
    doc.text(`Productos Afectados: ${summary.products_affected}`, 14, finalY + 28);
    
    doc.save(`reporte_inventario_${new Date().toISOString().slice(0, 19)}.pdf`);
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

  if (loading && movements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📊 Reporte de Inventario</h2>
        <button onClick={exportToPDF} className="btn-primary text-sm">
          📄 Exportar PDF
        </button>
      </div>
      
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-100 rounded-lg p-4">
          <p className="text-sm text-green-600">📥 Total Entradas</p>
          <p className="text-2xl font-bold text-green-700">+{summary.total_entries}</p>
        </div>
        <div className="bg-red-100 rounded-lg p-4">
          <p className="text-sm text-red-600">📤 Total Salidas</p>
          <p className="text-2xl font-bold text-red-700">-{summary.total_exits}</p>
        </div>
        <div className={`rounded-lg p-4 ${summary.net_change >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
          <p className="text-sm text-gray-600">🔄 Cambio Neto</p>
          <p className={`text-2xl font-bold ${summary.net_change >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {summary.net_change >= 0 ? '+' : ''}{summary.net_change}
          </p>
        </div>
        <div className="bg-purple-100 rounded-lg p-4">
          <p className="text-sm text-purple-600">📦 Productos Afectados</p>
          <p className="text-2xl font-bold text-purple-700">{summary.products_affected}</p>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">📅 Fecha desde</label>
          <input
            type="date"
            className="input"
            value={filters.from}
            onChange={(e) => setFilters({...filters, from: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">📅 Fecha hasta</label>
          <input
            type="date"
            className="input"
            value={filters.to}
            onChange={(e) => setFilters({...filters, to: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">📦 Producto</label>
          <select
            className="input"
            value={filters.productId}
            onChange={(e) => setFilters({...filters, productId: e.target.value})}
          >
            <option value="todos">Todos los productos</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">🔄 Tipo</label>
          <select
            className="input"
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
          >
            <option value="todos">Todos</option>
            <option value="entry">📥 Entradas</option>
            <option value="exit">📤 Salidas</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">📝 Razón</label>
          <select
            className="input"
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
          >
            <option value="">Todas las razones</option>
            <option value="Venta">🛒 Venta</option>
            <option value="Cancelado">❌ Cancelación</option>
            <option value="Devolución">🔄 Devolución</option>
            <option value="Compra">🏭 Compra a proveedor</option>
            <option value="Ajuste">⚙️ Ajuste manual</option>
            <option value="Eliminado">🗑️ Pedido eliminado</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end mb-4">
        <button onClick={clearFilters} className="btn-secondary text-sm">
          🗑️ Limpiar filtros
        </button>
      </div>
      
      {/* Tabla de movimientos */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Producto</th>
              <th className="p-3 text-left">Categoría</th>
              <th className="p-3 text-center">Tipo</th>
              <th className="p-3 text-center">Cantidad</th>
              <th className="p-3 text-center">Stock Anterior</th>
              <th className="p-3 text-center">Stock Nuevo</th>
              <th className="p-3 text-left">Razón</th>
              <th className="p-3 text-center">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{m.product_name}</td>
                <td className="p-3">{m.category || '-'}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${m.type === 'entry' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {m.type === 'entry' ? '📥 Entrada' : '📤 Salida'}
                  </span>
                 </td>
                <td className="p-3 text-center font-bold">{m.quantity}</td>
                <td className="p-3 text-center">{m.previous_stock}</td>
                <td className="p-3 text-center font-bold">{m.new_stock}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${getReasonBadgeColor(m.reason)}`}>
                    {m.reason || '-'}
                  </span>
                </td>
                <td className="p-3 text-center text-sm">{new Date(m.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center p-8 text-gray-500">
                  No hay movimientos de inventario registrados
                 </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Información adicional */}
      {movements.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
          <p>💡 <strong>Nota:</strong> Las salidas incluyen ventas de pedidos. Las entradas incluyen devoluciones por cancelación/eliminación de pedidos.</p>
        </div>
      )}
    </div>
  );
};

export default InventoryReport;