import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/users', {
        headers: { Authorization: token }
      });
      setUsers(res.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error al cargar los usuarios');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      if (editingUser) {
        await axios.put(`/api/admin/users/${editingUser.id}`, formData, {
          headers: { Authorization: token }
        });
        alert('✅ Usuario actualizado correctamente');
      }
      fetchUsers();
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (confirm(`¿Eliminar al usuario ${user.name}?`)) {
      const token = localStorage.getItem('token');
      try {
        await axios.delete(`/api/admin/users/${user.id}`, {
          headers: { Authorization: token }
        });
        alert('✅ Usuario eliminado correctamente');
        fetchUsers();
      } catch (error) {
        alert(error.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'user',
      password: ''
    });
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Administrador</span>;
    }
    return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Usuario</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">👥 Gestión de Usuarios</h2>
          <p className="text-sm text-gray-500 mt-1">Administra los usuarios registrados en la plataforma</p>
        </div>
      </div>
      
      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar usuario por nombre o email..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-center">Rol</th>
              <th className="p-3 text-center">Fecha registro</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b hover:bg-gray-50 transition">
                <td className="p-3 font-medium">{user.name}</td>
                <td className="p-3 text-gray-600">{user.email}</td>
                <td className="p-3 text-center">{getRoleBadge(user.role)}</td>
                <td className="p-3 text-center text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-50 transition"
                      title="Editar usuario"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition"
                      title="Eliminar usuario"
                    >
                      🗑️
                    </button>
                  </div>
                 </td>
               </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-8 text-gray-500">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Modal de edición de usuario */}
      {showModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  ✏️ Editar Usuario
                </h2>
                <button onClick={() => setShowModal(false)} className="text-2xl hover:text-gray-600">&times;</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre completo *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Correo electrónico *</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Rol</label>
                  <select
                    className="input"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="user">👤 Usuario</option>
                    <option value="admin">👑 Administrador</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nueva contraseña
                    <span className="text-xs text-gray-400 ml-2">(dejar en blanco para no cambiar)</span>
                  </label>
                  <input
                    type="password"
                    className="input"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? 'Guardando...' : '💾 Guardar cambios'}
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
          <strong>Nota:</strong> Los administradores tienen acceso completo al panel de control. 
          No puedes eliminar tu propia cuenta.
        </p>
      </div>
    </div>
  );
};

export default UserManager;