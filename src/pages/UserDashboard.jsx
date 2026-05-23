import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';
import InvoicePrinter from '../components/InvoicePrinter';

const UserDashboard = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'orders';
  
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    isDefault: false
  });
  const { success, error: toastError } = useToast();
  const { businessInfo } = useBusiness();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token) {
      navigate('/login');
      return;
    }
    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchOrders();
      fetchAddresses();
    }
  }, []);

  // Actualizar activeTab cuando cambia el parámetro URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['orders', 'addresses', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/my-orders', {
        headers: { Authorization: token }
      });
      setOrders(res.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toastError('Error al cargar tus pedidos');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/orders/${orderId}/items`, {
        headers: { Authorization: token }
      });
      setOrderItems(res.data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
      toastError('Error al cargar los detalles del pedido');
    }
  };

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/user-addresses', {
        headers: { Authorization: token }
      });
      setSavedAddresses(res.data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setSavedAddresses([]);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    
    if (!newAddress.name || !newAddress.phone || !newAddress.address || !newAddress.city) {
      toastError('Por favor completa todos los campos');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/user-addresses', {
        name: newAddress.name,
        phone: newAddress.phone,
        address: newAddress.address,
        city: newAddress.city,
        isDefault: newAddress.isDefault
      }, {
        headers: { Authorization: token }
      });
      fetchAddresses();
      setShowAddressForm(false);
      setNewAddress({ name: '', phone: '', address: '', city: '', isDefault: false });
      success('Dirección agregada correctamente');
    } catch (error) {
      console.error('Error adding address:', error);
      toastError(error.response?.data?.error || 'Error al agregar dirección');
    }
  };

  const deleteAddress = async (id) => {
    if (confirm('¿Eliminar esta dirección?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/user-addresses/${id}`, {
          headers: { Authorization: token }
        });
        fetchAddresses();
        success('Dirección eliminada');
      } catch (error) {
        console.error('Error deleting address:', error);
        toastError('Error al eliminar dirección');
      }
    }
  };

  const setDefaultAddress = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/user-addresses/${id}/default`, {}, {
        headers: { Authorization: token }
      });
      fetchAddresses();
      success('Dirección principal actualizada');
    } catch (error) {
      console.error('Error setting default address:', error);
      toastError('Error al actualizar dirección principal');
    }
  };

  const openOrderDetails = async (order) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setShowOrderModal(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return '⏳';
      case 'processing': return '⚙️';
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      default: return '📦';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Pendiente';
      case 'processing': return 'Procesando';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getCurrencySymbol = (currency = 'USD') => {
    const symbols = { USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs' };
    return symbols[currency] || '$';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 h-64 bg-gray-200 rounded"></div>
            <div className="col-span-2 h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">¡Bienvenido, {user?.name}!</h1>
          <p className="text-gray-500">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Menú lateral */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition ${
                activeTab === 'orders' ? 'bg-emerald-50 text-emerald-600 border-r-4 border-emerald-600' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">📦</span>
              <span className="font-medium">Mis Pedidos</span>
              {orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition ${
                activeTab === 'addresses' ? 'bg-emerald-50 text-emerald-600 border-r-4 border-emerald-600' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">📍</span>
              <span className="font-medium">Mis Direcciones</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition ${
                activeTab === 'profile' ? 'bg-emerald-50 text-emerald-600 border-r-4 border-emerald-600' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">👤</span>
              <span className="font-medium">Mi Perfil</span>
            </button>
            <Link
              to="/"
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition border-t"
            >
              <span className="text-xl">🏠</span>
              <span className="font-medium">Volver a la tienda</span>
            </Link>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="col-span-1 md:col-span-3">
          {/* Pedidos */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">📦 Mis Pedidos</h2>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-500">No has realizado ningún pedido aún</p>
                  <Link to="/products" className="text-emerald-600 mt-2 inline-block">
                    Comenzar a comprar →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="border rounded-lg hover:shadow-md transition-all duration-200">
                      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                        <div className="flex flex-wrap justify-between items-center gap-3">
                          <div>
                            <p className="text-sm text-gray-500">Pedido #{order.id.slice(-8)}</p>
                            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
                          </div>
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            <span>{getStatusIcon(order.status)}</span>
                            <span>{getStatusText(order.status)}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-600">{getCurrencySymbol(order.currency)}{order.total?.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>Destinatario:</strong> {order.recipient_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Entrega:</strong> {order.recipient_address}
                            </p>
                          </div>
                          <button
                            onClick={() => openOrderDetails(order)}
                            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                          >
                            Ver detalles
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Direcciones */}
          {activeTab === 'addresses' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📍 Mis Direcciones</h2>
                <button
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                >
                  <span className="text-lg">+</span> Agregar dirección
                </button>
              </div>

              {showAddressForm && (
                <form onSubmit={handleAddAddress} className="mb-6 p-4 border rounded-lg bg-gray-50 animate-fade-in">
                  <h3 className="font-bold mb-3">Nueva dirección</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      placeholder="Nombre *" 
                      className="input" 
                      value={newAddress.name} 
                      onChange={e => setNewAddress({...newAddress, name: e.target.value})} 
                      required 
                    />
                    <input 
                      type="tel" 
                      placeholder="Teléfono *" 
                      className="input" 
                      value={newAddress.phone} 
                      onChange={e => setNewAddress({...newAddress, phone: e.target.value})} 
                      required 
                    />
                    <input 
                      type="text" 
                      placeholder="Dirección *" 
                      className="input md:col-span-2" 
                      value={newAddress.address} 
                      onChange={e => setNewAddress({...newAddress, address: e.target.value})} 
                      required 
                    />
                    <input 
                      type="text" 
                      placeholder="Ciudad *" 
                      className="input" 
                      value={newAddress.city} 
                      onChange={e => setNewAddress({...newAddress, city: e.target.value})} 
                      required 
                    />
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={newAddress.isDefault} 
                        onChange={e => setNewAddress({...newAddress, isDefault: e.target.checked})} 
                      />
                      <span className="text-sm">Establecer como dirección principal</span>
                    </label>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button type="submit" className="btn-primary text-sm px-4">Guardar</button>
                    <button type="button" onClick={() => setShowAddressForm(false)} className="btn-secondary text-sm px-4">Cancelar</button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {savedAddresses.map(address => (
                  <div key={address.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{address.name}</p>
                          {address.is_default === 1 && (
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">Principal</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{address.phone}</p>
                        <p className="text-sm text-gray-600 mt-1">{address.address}, {address.city}</p>
                      </div>
                      <div className="flex gap-2">
                        {address.is_default !== 1 && (
                          <button onClick={() => setDefaultAddress(address.id)} className="text-emerald-600 text-sm">Principal</button>
                        )}
                        <button onClick={() => deleteAddress(address.id)} className="text-red-600 text-sm">Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
                {savedAddresses.length === 0 && !showAddressForm && (
                  <p className="text-center text-gray-500 py-8">No tienes direcciones guardadas</p>
                )}
              </div>
            </div>
          )}

          {/* Perfil */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">👤 Mi Perfil</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nombre completo</label>
                    <p className="font-medium">{user?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Correo electrónico</label>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Rol</label>
                    <p className="font-medium capitalize">{user?.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Miembro desde</label>
                    <p className="font-medium">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <button 
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      navigate('/login');
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles del pedido */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Detalles del Pedido #{selectedOrder.id.slice(-8)}</h2>
                <button onClick={() => setShowOrderModal(false)} className="text-2xl hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">&times;</button>
              </div>

              <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${getStatusColor(selectedOrder.status)}`}>
                <span className="text-2xl">{getStatusIcon(selectedOrder.status)}</span>
                <div>
                  <p className="font-semibold">Estado: {getStatusText(selectedOrder.status)}</p>
                  <p className="text-sm opacity-75">Pedido realizado el {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <span>📤</span> Remitente (Quien envía)
                </h3>
                <p className="text-sm"><strong>Nombre:</strong> {selectedOrder.sender_name || selectedOrder.customer_name}</p>
                <p className="text-sm"><strong>Teléfono:</strong> {selectedOrder.sender_phone || selectedOrder.customer_phone}</p>
                <p className="text-sm"><strong>Email:</strong> {selectedOrder.sender_email}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                  <span>📥</span> Destinatario (Quien recibe)
                </h3>
                <p className="text-sm"><strong>Nombre:</strong> {selectedOrder.recipient_name}</p>
                <p className="text-sm"><strong>Teléfono:</strong> {selectedOrder.recipient_phone}</p>
                <p className="text-sm"><strong>Dirección:</strong> {selectedOrder.recipient_address}</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                  <span>🚚</span> Información de Entrega
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><strong>Método de pago:</strong> {selectedOrder.payment_method === 'cash' ? 'Efectivo contra entrega' : selectedOrder.payment_method}</p>
                  {selectedOrder.delivery_date && <p><strong>Fecha preferida:</strong> {new Date(selectedOrder.delivery_date).toLocaleDateString()}</p>}
                </div>
                {selectedOrder.delivery_notes && (
                  <p className="mt-2 text-sm"><strong>Notas:</strong> {selectedOrder.delivery_notes}</p>
                )}
              </div>

              <h3 className="font-bold text-lg mb-3">🛍️ Productos</h3>
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {orderItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 border-b pb-2">
                    <img src={item.image || 'https://via.placeholder.com/50'} className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Cantidad: {item.quantity} x {getCurrencySymbol()}{item.price}</p>
                    </div>
                    <p className="font-bold">{getCurrencySymbol()}{(item.quantity * item.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-emerald-600">{getCurrencySymbol()}{selectedOrder.total?.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <InvoicePrinter order={selectedOrder} items={orderItems} businessInfo={businessInfo} />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UserDashboard;