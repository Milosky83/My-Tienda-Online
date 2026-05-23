import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdvancedDashboard = () => {
  const [stats, setStats] = useState({
    sales: { daily: [], weekly: [], monthly: [] },
    topProducts: [],
    topCategories: [],
    customerStats: {},
    inventoryAlert: []
  });
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/admin/advanced-stats?period=${period}`, {
        headers: { Authorization: token }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Cargando estadísticas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="flex gap-2">
        <button onClick={() => setPeriod('daily')} className={`px-4 py-2 rounded-lg ${period === 'daily' ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>Diario</button>
        <button onClick={() => setPeriod('weekly')} className={`px-4 py-2 rounded-lg ${period === 'weekly' ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>Semanal</button>
        <button onClick={() => setPeriod('monthly')} className={`px-4 py-2 rounded-lg ${period === 'monthly' ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>Mensual</button>
      </div>
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-6 text-white">
          <p className="text-sm opacity-90">Ventas totales</p>
          <p className="text-3xl font-bold">${stats.sales.total?.toFixed(2) || '0'}</p>
          <p className="text-xs mt-2">+12% vs período anterior</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <p className="text-sm opacity-90">Pedidos</p>
          <p className="text-3xl font-bold">{stats.sales.orders || 0}</p>
          <p className="text-xs mt-2">+8% vs período anterior</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <p className="text-sm opacity-90">Clientes nuevos</p>
          <p className="text-3xl font-bold">{stats.customerStats.newCustomers || 0}</p>
          <p className="text-xs mt-2">+15% vs período anterior</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <p className="text-sm opacity-90">Ticket promedio</p>
          <p className="text-3xl font-bold">${stats.sales.averageTicket?.toFixed(2) || '0'}</p>
          <p className="text-xs mt-2">+5% vs período anterior</p>
        </div>
      </div>
      
      {/* Top Productos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">🏆 Top 10 Productos Más Vendidos</h3>
        <div className="space-y-3">
          {stats.topProducts.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-4">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-600">{idx + 1}</div>
              <div className="flex-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-500">{p.category}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{p.total_sold} unidades</div>
                <div className="text-sm text-emerald-600">${p.total_revenue?.toFixed(2)}</div>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${(p.total_sold / stats.topProducts[0]?.total_sold) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Alertas de inventario */}
      {stats.inventoryAlert.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold text-yellow-800 mb-2">⚠️ Alertas de inventario</h3>
          <div className="space-y-2">
            {stats.inventoryAlert.map(product => (
              <div key={product.id} className="flex justify-between items-center">
                <span>{product.name}</span>
                <span className="text-red-600 font-bold">Stock: {product.stock} unidades</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedDashboard;