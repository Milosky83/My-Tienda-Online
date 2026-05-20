import React, { useState } from 'react';

const CheckoutForm = ({ onSubmit, onCancel, loading }) => {
  const [senderInfo, setSenderInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  
  const [recipientInfo, setRecipientInfo] = useState({
    name: '',
    phone: '',
    address: ''
  });
  
  const [deliveryInfo, setDeliveryInfo] = useState({
    deliveryDate: '',
    deliveryNotes: '',
    paymentMethod: 'cash'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      senderInfo,
      recipientInfo,
      deliveryInfo
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sección del Remitente (Quien envía) */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">📤</span> Envia
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre completo *</label>
            <input
              type="text"
              className="input"
              value={senderInfo.name}
              onChange={(e) => setSenderInfo({...senderInfo, name: e.target.value})}
              required
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono *</label>
            <input
              type="tel"
              className="input"
              value={senderInfo.phone}
              onChange={(e) => setSenderInfo({...senderInfo, phone: e.target.value})}
              required
              placeholder="Ej: 3001234567"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Correo electrónico *</label>
            <input
              type="email"
              className="input"
              value={senderInfo.email}
              onChange={(e) => setSenderInfo({...senderInfo, email: e.target.value})}
              required
              placeholder="Ej: juan@email.com"
            />
          </div>
        </div>
      </div>

      {/* Sección del Destinatario (Quien recibe) */}
      <div className="bg-green-50 rounded-lg p-4">
        <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">📥</span> Recibe
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre completo *</label>
            <input
              type="text"
              className="input"
              value={recipientInfo.name}
              onChange={(e) => setRecipientInfo({...recipientInfo, name: e.target.value})}
              required
              placeholder="Ej: María García"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono *</label>
            <input
              type="tel"
              className="input"
              value={recipientInfo.phone}
              onChange={(e) => setRecipientInfo({...recipientInfo, phone: e.target.value})}
              required
              placeholder="Ej: 3007654321"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Dirección de entrega *</label>
            <textarea
              className="input"
              rows="2"
              value={recipientInfo.address}
              onChange={(e) => setRecipientInfo({...recipientInfo, address: e.target.value})}
              required
              placeholder="Dirección completa donde se entregará el pedido"
            />
          </div>
        </div>
      </div>

      {/* Sección de Información de Entrega */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h3 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">🚚</span> Información de Entrega
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de entrega preferida</label>
            <input
              type="date"
              className="input"
              value={deliveryInfo.deliveryDate}
              onChange={(e) => setDeliveryInfo({...deliveryInfo, deliveryDate: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Método de pago *</label>
            <select
              className="input"
              value={deliveryInfo.paymentMethod}
              onChange={(e) => setDeliveryInfo({...deliveryInfo, paymentMethod: e.target.value})}
              required
            >
              <option value="cash">💰 Efectivo</option>
              <option value="transfer">🏦 Zelle</option>
              <option value="Paypal">💳 Paypal</option>
              <option value="CashApp">📱 CashApp</option>             
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Notas adicionales</label>
            <textarea
              className="input"
              rows="2"
              value={deliveryInfo.deliveryNotes}
              onChange={(e) => setDeliveryInfo({...deliveryInfo, deliveryNotes: e.target.value})}
              placeholder="Instrucciones especiales para la entrega, horario preferido, etc."
            />
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 pt-4">
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Procesando...' : '�?Confirmar Pedido'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default CheckoutForm;