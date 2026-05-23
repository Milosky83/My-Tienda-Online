import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const { error: toastError } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

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
      toastError('Error al cargar los detalles');
    }
  };

  const openOrderDetails = async (order) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setShowModal(true);
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

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Pendiente';
      case 'processing': return 'Procesando';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getCurrencySymbol = () => '$';

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">📦 Mis Pedidos</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-gray-500 text-lg">No has realizado ningún pedido aún</p>
          <Link to="/products" className="text-emerald-600 mt-4 inline-block font-medium hover:underline">
            Comenzar a comprar →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Pedido #{order.id.slice(-8)}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">${order.total?.toFixed(2)}</p>
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
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                  >
                    Ver detalles →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalles */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Pedido #{selectedOrder.id.slice(-8)}</h2>
                <button onClick={() => setShowModal(false)} className="text-2xl hover:text-gray-600">&times;</button>
              </div>

              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${getStatusColor(selectedOrder.status)}`}>
                {getStatusText(selectedOrder.status)}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold mb-2">📤 Remitente</h3>
                <p className="text-sm">{selectedOrder.sender_name || selectedOrder.customer_name}</p>
                <p className="text-sm">{selectedOrder.sender_phone || selectedOrder.customer_phone}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold mb-2">📥 Destinatario</h3>
                <p className="text-sm">{selectedOrder.recipient_name}</p>
                <p className="text-sm">{selectedOrder.recipient_phone}</p>
                <p className="text-sm">{selectedOrder.recipient_address}</p>
              </div>

              <h3 className="font-bold mb-3">🛍️ Productos</h3>
              <div className="space-y-2 mb-4">
                {orderItems.map(item => (
                  <div key={item.id} className="flex justify-between border-b pb-2">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-bold">${(item.quantity * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-emerald-600">${selectedOrder.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;