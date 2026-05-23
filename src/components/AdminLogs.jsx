import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: 'todos',
    entity_type: 'todos',
    from: '',
    to: '',
    limit: 50,
    offset: 0
  });
  const [total, setTotal] = useState(0);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.action !== 'todos') params.append('action', filters.action);
      if (filters.entity_type !== 'todos') params.append('entity_type', filters.entity_type);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      params.append('limit', filters.limit);
      params.append('offset', filters.offset);
      
      const res = await axios.get(`/api/admin/logs?${params.toString()}`, {
        headers: { Authorization: token }
      });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toastError(error.response?.data?.error || 'Error al cargar logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/logs/stats', {
        headers: { Authorization: token }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDeleteOldLogs = async () => {
    if (confirm('¿Eliminar logs antiguos (más de 30 días)?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete('/api/admin/logs?days=30', {
          headers: { Authorization: token }
        });
        success('✅ Logs antiguos eliminados');
        fetchLogs();
        fetchStats();
      } catch (error) {
        toastError('Error al eliminar logs');
      }
    }
  };

  const handleDeleteLog = async (id) => {
    if (confirm('¿Eliminar este registro?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/admin/logs/${id}`, {
          headers: { Authorization: token }
        });
        success('✅ Log eliminado');
        fetchLogs();
        fetchStats();
      } catch (error) {
        toastError('Error al eliminar log');
      }
    }
  };

  const getActionBadge = (action) => {
    switch(action) {
      case 'CREATE': return <span className="badge bg-green-100 text-green-800">📝 Crear</span>;
      case 'UPDATE': return <span className="badge bg-blue-100 text-blue-800">✏️ Actualizar</span>;
      case 'DELETE': return <span className="badge bg-red-100 text-red-800">🗑️ Eliminar</span>;
      case 'LOGIN': return <span className="badge bg-purple-100 text-purple-800">🔐 Login</span>;
      default: return <span className="badge bg-gray-100 text-gray-800">{action}</span>;
    }
  };

  const getEntityBadge = (entityType) => {
    switch(entityType) {
      case 'product': return <span className="badge bg-emerald-100 text-emerald-800">🛍️ Producto</span>;
      case 'order': return <span className="badge bg-orange-100 text-orange-800">📦 Pedido</span>;
      case 'user': return <span className="badge bg-blue-100 text-blue-800">👤 Usuario</span>;
      case 'combo': return <span className="badge bg-purple-100 text-purple-800">🎁 Combo</span>;
      case 'offer': return <span className="badge bg-pink-100 text-pink-800">🎯 Oferta</span>;
      case 'coupon': return <span className="badge bg-yellow-100 text-yellow-800">🎫 Cupón</span>;
      default: return <span className="badge bg-gray-100 text-gray-800">{entityType}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">Total de registros</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total_logs}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">Acciones únicas</p>
            <p className="text-2xl font-bold text-gray-800">{stats.unique_actions}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">Administradores</p>
            <p className="text-2xl font-bold text-gray-800">{stats.unique_admins}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">Acciones más frecuentes</p>
            <p className="text-sm font-medium text-gray-800">
              {stats.top_actions?.slice(0, 2).map(a => `${a.action} (${a.count})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Acción</label>
            <select
              className="input"
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value, offset: 0})}
            >
              <option value="todos">Todas</option>
              <option value="CREATE">Crear</option>
              <option value="UPDATE">Actualizar</option>
              <option value="DELETE">Eliminar</option>
              <option value="LOGIN">Login</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entidad</label>
            <select
              className="input"
              value={filters.entity_type}
              onChange={(e) => setFilters({...filters, entity_type: e.target.value, offset: 0})}
            >
              <option value="todos">Todas</option>
              <option value="product">Producto</option>
              <option value="order">Pedido</option>
              <option value="user">Usuario</option>
              <option value="combo">Combo</option>
              <option value="offer">Oferta</option>
              <option value="coupon">Cupón</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha desde</label>
            <input
              type="date"
              className="input"
              value={filters.from}
              onChange={(e) => setFilters({...filters, from: e.target.value, offset: 0})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha hasta</label>
            <input
              type="date"
              className="input"
              value={filters.to}
              onChange={(e) => setFilters({...filters, to: e.target.value, offset: 0})}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setFilters({...filters, offset: 0, action: 'todos', entity_type: 'todos', from: '', to: ''})}
              className="btn-secondary flex-1"
            >
              Limpiar
            </button>
            <button
              onClick={handleDeleteOldLogs}
              className="btn-danger flex-1"
            >
              Limpiar antiguos
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de logs */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Fecha/Hora</th>
                <th className="p-3 text-left">Administrador</th>
                <th className="p-3 text-center">Acción</th>
                <th className="p-3 text-center">Entidad</th>
                <th className="p-3 text-left">Detalles</th>
                <th className="p-3 text-center">IP</th>
                <th className="p-3 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center p-8">
                    <div className="animate-pulse">Cargando logs...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-gray-500">
                    No hay registros de actividad
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{log.admin_name}</div>
                      <div className="text-xs text-gray-500">ID: {log.admin_id}</div>
                    </td>
                    <td className="p-3 text-center">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="p-3 text-center">
                      {getEntityBadge(log.entity_type)}
                    </td>
                    <td className="p-3 text-sm max-w-md">
                      {log.details}
                      {log.entity_id && (
                        <span className="text-xs text-gray-400 ml-1">(ID: {log.entity_id})</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-xs font-mono">
                      {log.ip_address || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="Eliminar registro"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        {total > filters.limit && (
          <div className="p-4 border-t flex justify-between items-center">
            <button
              onClick={() => setFilters({...filters, offset: Math.max(0, filters.offset - filters.limit)})}
              disabled={filters.offset === 0}
              className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-500">
              Mostrando {logs.length} de {total} registros
            </span>
            <button
              onClick={() => setFilters({...filters, offset: filters.offset + filters.limit})}
              disabled={filters.offset + filters.limit >= total}
              className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Nota de seguridad */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800 flex items-center gap-2">
          <span>🔒</span>
          <strong>Seguridad:</strong> Solo el administrador principal (ID: 1) tiene acceso a estos logs.
          Los registros se mantienen por 30 días.
        </p>
      </div>
    </div>
  );
};

export default AdminLogs;