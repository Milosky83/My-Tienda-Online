import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';
import CheckoutStepper from '../components/CheckoutStepper';
import axios from 'axios';

const Checkout = () => {
  const { cart, total, clearCart } = useCart();
  const { success, error: toastError } = useToast();
  const { businessInfo } = useBusiness();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cart.length === 0) {
      toastError('Tu carrito está vacío');
      navigate('/products');
    }
  }, [cart, navigate, toastError]);

  const getCurrencySymbol = () => '$';

  const handleCompleteOrder = async (orderData) => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const finalTotal = total + (orderData.deliveryInfo.useDelivery ? orderData.deliveryInfo.cost : 0);
      
      const payload = {
        products: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          currency: item.currency || 'USD'
        })),
        total: finalTotal,
        currency: 'USD',
        senderInfo: {
          name: orderData.senderInfo.name,
          phone: orderData.senderInfo.phone,
          email: orderData.senderInfo.email || user.email
        },
        recipientInfo: {
          name: orderData.recipientInfo.name,
          phone: orderData.recipientInfo.phone,
          address: orderData.deliveryInfo.useDelivery ? orderData.recipientInfo.address : 'Retiro en tienda',
          city: orderData.deliveryInfo.city,
          zone: orderData.deliveryInfo.zone
        },
        deliveryInfo: {
          useDelivery: orderData.deliveryInfo.useDelivery,
          cost: orderData.deliveryInfo.cost,
          city: orderData.deliveryInfo.city,
          zone: orderData.deliveryInfo.zone
        },
        paymentMethod: 'cash'
      };
      
      console.log('Enviando pedido:', payload);
      
      const response = await axios.post('/api/orders', payload, {
        headers: { 
          Authorization: token,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Respuesta:', response.data);
      
      if (response.data.success) {
        // Crear mensaje para WhatsApp
        const businessPhone = businessInfo.phone || '573001234567';
        
        let message = '';
        message += `🆕 *NUEVO PEDIDO*\n`;
        message += `📅 ${new Date().toLocaleString()}\n`;
        message += `🆔 Pedido: #${response.data.orderId.slice(-8)}\n`;
        message += `═══════════════════════════\n\n`;
        
        message += `📤 *REMITENTE (Quien envía)*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `• *Nombre:* ${orderData.senderInfo.name}\n`;
        message += `• *Teléfono:* ${orderData.senderInfo.phone}\n`;
        message += `• *Email:* ${orderData.senderInfo.email || user.email}\n\n`;
        
        message += `📥 *DESTINATARIO (Quien recibe)*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `• *Nombre:* ${orderData.recipientInfo.name}\n`;
        message += `• *Teléfono:* ${orderData.recipientInfo.phone}\n`;
        message += `• *Dirección:* ${orderData.deliveryInfo.useDelivery ? orderData.recipientInfo.address : 'Retiro en tienda'}\n`;
        if (orderData.deliveryInfo.useDelivery) {
          message += `• *Ciudad:* ${orderData.deliveryInfo.city}\n`;
          message += `• *Zona/Barrio:* ${orderData.deliveryInfo.zone}\n`;
        }
        message += `\n`;
        
        message += `📦 *PRODUCTOS*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        cart.forEach((item, index) => {
          const subtotal = item.quantity * item.price;
          message += `${index + 1}. *${item.name}*\n`;
          message += `   └─ Cantidad: ${item.quantity}\n`;
          message += `   └─ Precio unitario: ${getCurrencySymbol()}${item.price}\n`;
          message += `   └─ Subtotal: ${getCurrencySymbol()}${subtotal.toFixed(2)}\n\n`;
        });
        
        message += `💰 *RESUMEN DE PAGO*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `• *Subtotal:* ${getCurrencySymbol()}${total.toFixed(2)}\n`;
        if (orderData.deliveryInfo.useDelivery && orderData.deliveryInfo.cost > 0) {
          message += `• *Envío:* ${getCurrencySymbol()}${orderData.deliveryInfo.cost.toFixed(2)}\n`;
        }
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `💰 *TOTAL:* ${getCurrencySymbol()}${finalTotal.toFixed(2)}\n\n`;
        
        message += `🚚 *ENTREGA*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `• *Método de pago:* Efectivo contra entrega\n`;
        message += `• *Tiempo estimado:* 2-3 días hábiles\n`;
        message += `═══════════════════════════\n`;
        message += `🙏 *¡Gracias por tu compra!*`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        
        success(`✅ Pedido #${response.data.orderId.slice(-8)} creado exitosamente`);
        clearCart();
        
        setTimeout(() => {
          navigate('/orders');
        }, 2000);
      } else {
        toastError(response.data.error || 'Error al procesar el pedido');
      }
    } catch (error) {
      console.error('Error detallado:', error);
      console.error('Response:', error.response?.data);
      toastError(error.response?.data?.error || 'Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Finalizar Compra</h1>
        <CheckoutStepper 
          onComplete={handleCompleteOrder} 
          onClose={() => navigate('/')} 
          loading={loading} 
        />
      </div>
    </div>
  );
};

export default Checkout;