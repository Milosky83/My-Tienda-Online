import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportToExcel = (data, filename, sheetName = 'Reporte') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Autoajustar columnas
  const maxWidth = data.reduce((w, r) => Math.max(w, r.length), 10);
  worksheet['!cols'] = [{ width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }];
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportSalesReportToExcel = (reports, filters) => {
  const data = reports.map(r => ({
    'Producto': r.name,
    'Categoría': r.category || '-',
    'Moneda': r.product_currency || 'USD',
    'Unidades Vendidas': r.total_sold,
    'Ingresos (Local)': r.total_revenue,
    'Ingresos (USD)': (r.total_revenue / (r.exchange_rate || 1)).toFixed(2),
    'Pedidos': r.total_orders
  }));
  
  exportToExcel(data, `reporte_ventas_${new Date().toISOString().slice(0, 19)}`);
};

export const exportInventoryToExcel = (movements) => {
  const data = movements.map(m => ({
    'Producto': m.product_name,
    'Categoría': m.category || '-',
    'Tipo': m.type === 'entry' ? 'Entrada' : 'Salida',
    'Cantidad': m.quantity,
    'Stock Anterior': m.previous_stock,
    'Stock Nuevo': m.new_stock,
    'Razón': m.reason || '-',
    'Fecha': new Date(m.created_at).toLocaleString()
  }));
  
  exportToExcel(data, `reporte_inventario_${new Date().toISOString().slice(0, 19)}`);
};