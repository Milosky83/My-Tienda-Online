import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import DeliveryCalculator from './DeliveryCalculator';

const CheckoutStepper = ({ onComplete, onClose, loading }) => {
  const [step, setStep] = useState(1);
  const [senderInfo, setSenderInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [recipientInfo, setRecipientInfo] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    zone: ''
  });
  const [deliveryInfo, setDeliveryInfo] = useState({
    useDelivery: true,
    cost: 0,
    city: '',
    zone: '',
    pending: true
  });
  const { cart, total } = useCart();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setSenderInfo({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || ''
    });
  }, []);

  const steps = [
    { number: 1, title: 'Remitente', icon: '📤', description: 'Quien envía' },
    { number: 2, title: 'Destinatario', icon: '📥', description: 'Quien recibe' },
    { number: 3, title: 'Entrega', icon: '🚚', description: 'Envío o retiro' },
    { number: 4, title: 'Confirmar', icon: '✅', description: 'Revisar pedido' }
  ];

  const handleNext = () => {
    // Validaciones por paso
    if (step === 1) {
      if (!senderInfo.name || !senderInfo.phone) {
        alert('Por favor completa tus datos de contacto');
        return;
      }
    }
    if (step === 2) {
      if (!recipientInfo.name || !recipientInfo.phone) {
        alert('Por favor completa los datos del destinatario');
        return;
      }
    }
    if (step === 3) {
      if (deliveryInfo.useDelivery && (!deliveryInfo.city || !deliveryInfo.zone)) {
        alert('Por favor completa la información de envío');
        return;
      }
      if (deliveryInfo.useDelivery && !recipientInfo.address) {
        alert('Por favor completa la dirección del destinatario');
        return;
      }
    }
    if (step < 4) setStep(step + 1);
    else onComplete({ senderInfo, recipientInfo, deliveryInfo });
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const getCurrencySymbol = () => '$';

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalTotal = subtotal + (deliveryInfo.useDelivery ? deliveryInfo.cost : 0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {steps.map(s => (
            <div key={s.number} className="flex-1 relative">
              <div className={`flex flex-col items-center ${step >= s.number ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step > s.number ? 'bg-emerald-600 text-white' : 
                  step === s.number ? 'bg-emerald-600 text-white ring-4 ring-emerald-200' : 
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step > s.number ? '✓' : s.icon}
                </div>
                <div className="text-xs mt-2 font-medium hidden sm:block">{s.title}</div>
                <div className="text-xs text-gray-400 hidden sm:block">{s.description}</div>
              </div>
              {s.number < 4 && (
                <div className={`absolute top-5 left-1/2 w-full h-0.5 transition-all duration-300 ${
                  step > s.number ? 'bg-emerald-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step 1: Datos del Remitente (Quien envía) */}
      {step === 1 && (
        <div className="bg-blue-50 rounded-xl p-6 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
              📤
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-800">Datos del Remitente</h3>
              <p className="text-sm text-blue-600">Esta información viene de tu cuenta</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo *</label>
              <input
                type="text"
                className="input bg-gray-100"
                value={senderInfo.name}
                readOnly
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">(De tu cuenta)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono *</label>
              <input
                type="tel"
                className="input"
                value={senderInfo.phone}
                onChange={(e) => setSenderInfo({...senderInfo, phone: e.target.value})}
                placeholder="Ej: 3001234567"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Correo electrónico</label>
              <input
                type="email"
                className="input bg-gray-100"
                value={senderInfo.email}
                readOnly
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">(De tu cuenta)</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Step 2: Datos del Destinatario (Quien recibe) */}
      {step === 2 && (
        <div className="bg-green-50 rounded-xl p-6 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
              📥
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-800">Datos del Destinatario</h3>
              <p className="text-sm text-green-600">Persona que recibirá el pedido</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo *</label>
              <input
                type="text"
                className="input"
                value={recipientInfo.name}
                onChange={(e) => setRecipientInfo({...recipientInfo, name: e.target.value})}
                placeholder="Ej: María García"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono *</label>
              <input
                type="tel"
                className="input"
                value={recipientInfo.phone}
                onChange={(e) => setRecipientInfo({...recipientInfo, phone: e.target.value})}
                placeholder="Ej: 3007654321"
                required
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Step 3: Información de entrega */}
      {step === 3 && (
        <div className="bg-purple-50 rounded-xl p-6 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
              🚚
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-800">Información de Entrega</h3>
              <p className="text-sm text-purple-600">Elige cómo recibirás tu pedido</p>
            </div>
          </div>
          
          <DeliveryCalculator onDeliveryChange={setDeliveryInfo} />
          
          {deliveryInfo.useDelivery && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Dirección completa *</label>
                <textarea
                  className="input"
                  rows="2"
                  value={recipientInfo.address}
                  onChange={(e) => setRecipientInfo({...recipientInfo, address: e.target.value})}
                  placeholder="Calle, número, edificio, apartamento, referencias..."
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ciudad</label>
                  <input
                    type="text"
                    className="input bg-gray-100"
                    value={deliveryInfo.city || ''}
                    readOnly
                    disabled
                    placeholder="Seleccionada arriba"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Zona/Barrio</label>
                  <input
                    type="text"
                    className="input bg-gray-100"
                    value={deliveryInfo.zone || ''}
                    readOnly
                    disabled
                    placeholder="Seleccionada arriba"
                  />
                </div>
              </div>
            </div>
          )}
          
          {!deliveryInfo.useDelivery && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-800 text-sm flex items-center gap-2">
                <span>🏪</span> El pedido estará disponible para retiro en nuestra tienda física
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Step 4: Confirmación */}
      {step === 4 && (
        <div className="bg-white rounded-xl p-6 shadow-sm animate-fade-in">
          <h3 className="text-xl font-bold mb-4">✅ Confirmar pedido</h3>
          
          <div className="space-y-4">
            {/* Resumen de productos */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <span>📦</span> Productos
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{getCurrencySymbol()}{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Datos del Remitente */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <span>📤</span> Remitente (Quien envía)
              </h4>
              <p className="text-sm"><strong>Nombre:</strong> {senderInfo.name}</p>
              <p className="text-sm"><strong>Teléfono:</strong> {senderInfo.phone}</p>
              <p className="text-sm"><strong>Email:</strong> {senderInfo.email}</p>
            </div>
            
            {/* Datos del Destinatario */}
            <div className="border rounded-lg p-4 bg-green-50">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <span>📥</span> Destinatario (Quien recibe)
              </h4>
              <p className="text-sm"><strong>Nombre:</strong> {recipientInfo.name}</p>
              <p className="text-sm"><strong>Teléfono:</strong> {recipientInfo.phone}</p>
              <p className="text-sm"><strong>Dirección:</strong> {deliveryInfo.useDelivery ? recipientInfo.address : 'Retiro en tienda'}</p>
              {deliveryInfo.useDelivery && (
                <>
                  <p className="text-sm"><strong>Ciudad:</strong> {deliveryInfo.city}</p>
                  <p className="text-sm"><strong>Zona/Barrio:</strong> {deliveryInfo.zone}</p>
                </>
              )}
            </div>
            
            {/* Resumen de totales */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{getCurrencySymbol()}{subtotal.toFixed(2)}</span>
                </div>
                {deliveryInfo.useDelivery && deliveryInfo.cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Envío:</span>
                    <span>{getCurrencySymbol()}{deliveryInfo.cost.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="text-emerald-600 text-xl">{getCurrencySymbol()}{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Botones de navegación */}
      <div className="flex justify-between gap-4 mt-6">
        {step > 1 && (
          <button onClick={handlePrevious} className="btn-secondary flex-1">
            ← Anterior
          </button>
        )}
        <button 
          onClick={handleNext} 
          className="btn-primary flex-1"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Procesando...
            </div>
          ) : (
            step === 4 ? 'Confirmar pedido ✅' : 'Continuar →'
          )}
        </button>
      </div>
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CheckoutStepper;