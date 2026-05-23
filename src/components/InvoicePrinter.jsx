import React from 'react';

const InvoicePrinter = ({ order, items, businessInfo }) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Factura #${order.id.slice(-8)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 150px; margin-bottom: 10px; }
          .company-name { font-size: 24px; font-weight: bold; color: #059669; }
          .invoice-title { font-size: 20px; margin: 20px 0; text-align: center; }
          .info-section { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="margin-bottom: 20px; padding: 10px 20px;">🖨️ Imprimir</button>
        
        <div class="header">
          ${businessInfo.logo ? `<img src="${businessInfo.logo}" class="logo" />` : ''}
          <div class="company-name">${businessInfo.name}</div>
          <div>${businessInfo.address}</div>
          <div>Tel: ${businessInfo.phone} | Email: ${businessInfo.email}</div>
        </div>
        
        <div class="invoice-title">
          FACTURA DE VENTA
        </div>
        
        <div class="info-section">
          <table style="border: none; width: 100%;">
            <tr style="border: none;">
              <td style="border: none;"><strong>Factura N°:</strong> ${order.id.slice(-8)}</td>
              <td style="border: none;"><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleString()}</td>
            </tr>
            <tr style="border: none;">
              <td style="border: none;"><strong>Cliente:</strong> ${order.sender_name || order.customer_name}</td>
              <td style="border: none;"><strong>Teléfono:</strong> ${order.sender_phone || order.customer_phone}</td>
             </tr>
            <tr style="border: none;">
              <td style="border: none;"><strong>Destinatario:</strong> ${order.recipient_name}</td>
              <td style="border: none;"><strong>Dirección:</strong> ${order.recipient_address}</td>
             </tr>
          </table>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Cantidad</th>
              <th>Producto</th>
              <th>Precio Unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.quantity}</td>
                <td>${item.name}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${(item.quantity * item.price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right;"><strong>TOTAL:</strong></td>
              <td><strong>$${order.total?.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div class="total">
          <p>Método de pago: ${order.payment_method === 'cash' ? 'Efectivo contra entrega' : order.payment_method}</p>
        </div>
        
        <div class="footer">
          <p>¡Gracias por su compra!</p>
          <p>${businessInfo.website}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <button onClick={handlePrint} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
      🖨️ Imprimir
    </button>
  );
};

export default InvoicePrinter;