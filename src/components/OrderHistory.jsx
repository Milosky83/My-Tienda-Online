import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const OrderHistory = ({ orders }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

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

  const getTimelineSteps = (status) => {
    const steps = [
      { name: 'Pedido recibido', icon: '📝', completed: true },
      { name: 'Confirmado', icon: '✅', completed: ['processing', 'completed'].includes(status) },
      { name: 'Preparando', icon: '📦', completed: ['processing', 'completed'].includes(status) },
      { name: 'En camino', icon: '🚚', completed: ['completed'] },
      { name: 'Entregado', icon: '🏠', completed: ['completed'] }
    ];
    return steps;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-200">
            {/* Cabecera del pedido */}
            <div className="p-4 border-b bg-gray-50 rounded-t-xl">
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
                  <p className="font-bold text-emerald-600">${order.total?.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{order.total_items || 1} productos</p>
                </div>
              </div>
            </div>

            {/* Productos resumen */}
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">{order.recipient_name}</p>
                  <p className="text-sm text-gray-500 truncate">{order.recipient_address}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowDetails(!showDetails);
                  }}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                >
                  {showDetails && selectedOrder?.id === order.id ? 'Ocultar detalles' : 'Ver detalles'}
                  <svg className={`w-4 h-4 transition-transform ${showDetails && selectedOrder?.id === order.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Detalles expandidos */}
            {showDetails && selectedOrder?.id === order.id && (
              <div className="border-t p-4 bg-gray-50 rounded-b-xl animate-slide-down">
                {/* Timeline de estado */}
                <div className="mb-6">
                  <h4 className="font-medium text-sm mb-3">Seguimiento del pedido</h4>
                  <div className="relative">
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200"></div>
                    <div className="relative flex justify-between">
                      {getTimelineSteps(order.status).map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center flex-1">
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
                            step.completed ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'
                          }`}>
                            {step.icon}
                          </div>
                          <p className="text-xs text-center mt-2 font-medium">{step.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Productos del pedido */}
                <h4 className="font-medium text-sm mb-3">Productos</h4>
                <div className="space-y-2 mb-4">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded-lg">
                      <img src={item.image || 'https://via.placeholder.com/50'} className="w-12 h-12 object-cover rounded" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-emerald-600">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Información de entrega */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <h4 className="font-medium text-sm mb-2">📤 Remitente</h4>
                    <p className="text-sm">{order.sender_name || order.customer_name}</p>
                    <p className="text-sm text-gray-500">{order.sender_phone || order.customer_phone}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">📥 Destinatario</h4>
                    <p className="text-sm">{order.recipient_name}</p>
                    <p className="text-sm text-gray-500">{order.recipient_phone}</p>
                    <p className="text-sm text-gray-500">{order.recipient_address}</p>
                  </div>
                </div>

                {/* Botón de ayuda */}
                <div className="mt-4 flex justify-end">
                  <button className="text-emerald-600 text-sm hover:text-emerald-700 flex items-center gap-1">
                    <span>📞</span> ¿Necesitas ayuda con este pedido?
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-gray-500 text-lg">No has realizado ningún pedido aún</p>
          <Link to="/products" className="text-emerald-600 mt-2 inline-block font-medium hover:underline">
            Comenzar a comprar →
          </Link>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default OrderHistory;