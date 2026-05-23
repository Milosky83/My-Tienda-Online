import nodemailer from 'nodemailer';

// Configuración del transporter (usa tus credenciales)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOrderConfirmation = async (order, user, items) => {
  const itemsList = items.map(item => 
    `${item.quantity}x ${item.name} - $${item.price} = $${(item.quantity * item.price).toFixed(2)}`
  ).join('\n');
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `Confirmación de Pedido #${order.id.slice(-8)}`,
    text: `
      ¡Gracias por tu compra!
      
      Pedido #${order.id.slice(-8)}
      Fecha: ${new Date(order.created_at).toLocaleString()}
      
      Productos:
      ${itemsList}
      
      Total: $${order.total}
      
      Dirección de envío:
      ${order.recipient_address}
      
      ¡Gracias por confiar en nosotros!
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">¡Gracias por tu compra!</h2>
        <p><strong>Pedido #${order.id.slice(-8)}</strong></p>
        <p><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleString()}</p>
        
        <h3>Productos:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Producto</th>
            <th style="padding: 8px; text-align: center;">Cantidad</th>
            <th style="padding: 8px; text-align: right;">Subtotal</th>
          </tr>
          ${items.map(item => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px;">${item.name}</td>
              <td style="padding: 8px; text-align: center;">${item.quantity}</td>
              <td style="padding: 8px; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="background: #f3f4f6;">
            <td colspan="2" style="padding: 8px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 8px; text-align: right;"><strong>$${order.total}</strong></td>
          </tr>
        </table>
        
        <h3>Dirección de envío:</h3>
        <p>${order.recipient_address}</p>
        
        <p style="margin-top: 20px; color: #6b7280;">¡Gracias por confiar en nosotros!</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email enviado a ${user.email}`);
  } catch (error) {
    console.error('Error al enviar email:', error);
  }
};

export const sendWelcomeEmail = async (user) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Bienvenido a Tienda Virtual',
    text: `¡Bienvenido ${user.name}! Gracias por registrarte en nuestra tienda.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">¡Bienvenido ${user.name}!</h2>
        <p>Gracias por registrarte en <strong>Tienda Virtual</strong>.</p>
        <p>Explora nuestros productos y aprovecha las mejores ofertas.</p>
        <a href="${process.env.FRONTEND_URL}" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">Ir a la tienda</a>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email de bienvenida enviado a ${user.email}`);
  } catch (error) {
    console.error('Error al enviar email de bienvenida:', error);
  }
};