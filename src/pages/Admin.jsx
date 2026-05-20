import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InventoryManager from '../components/InventoryManager';
import CurrencyManager from '../components/CurrencyManager';
import OfferManager from '../components/OfferManager';
import ComboManager from '../components/ComboManager';
import InventoryReport from '../components/InventoryReport';
import BusinessSettings from '../components/BusinessSettings';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingOrderItems, setEditingOrderItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [currencyReport, setCurrencyReport] = useState([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedProductForInventory, setSelectedProductForInventory] = useState(null);
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    stock: '',
    category: '',
    featured: false,
    image: null
  });
  const [loading, setLoading] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [productsPerPage] = useState(6);
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [reportsCurrentPage, setReportsCurrentPage] = useState(1);
  const [reportsPerPage] = useState(10);
  
  // Filtros
  const [saleFilter, setSaleFilter] = useState({
    category: 'todas',
    search: '',
    sortBy: 'total_sold',
    sortOrder: 'desc',
    currency: 'todas'
  });
  
  const [saleDateFilter, setSaleDateFilter] = useState({
    from: '',
    to: ''
  });
  
  const [orderFilter, setOrderFilter] = useState({
    status: 'todos',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchReports();
    fetchAvailableProducts();
    fetchExchangeRates();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, saleFilter, saleDateFilter]);

  useEffect(() => {
    filterOrders();
  }, [orders, orderFilter]);

  useEffect(() => {
    setReportsCurrentPage(1);
  }, [saleFilter, saleDateFilter]);

  useEffect(() => {
    setOrdersCurrentPage(1);
  }, [orderFilter]);

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchCurrencyReport();
    }
  }, [saleDateFilter, activeTab]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data.products || []);
      setTotalPages(Math.ceil((res.data.products || []).length / productsPerPage));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/orders', { headers: { Authorization: token } });
      setOrders(res.data || []);
      setFilteredOrders(res.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (saleDateFilter.from) params.from = saleDateFilter.from;
      if (saleDateFilter.to) params.to = saleDateFilter.to;
      if (saleFilter.category && saleFilter.category !== 'todas') params.category = saleFilter.category;
      if (saleFilter.search) params.search = saleFilter.search;
      if (saleFilter.currency && saleFilter.currency !== 'todas') params.currency = saleFilter.currency;
      
      const res = await axios.get('/api/sales-report', { 
        params,
        headers: { Authorization: token } 
      });
      setReports(res.data || []);
      setFilteredReports(res.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchCurrencyReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (saleDateFilter.from) params.from = saleDateFilter.from;
      if (saleDateFilter.to) params.to = saleDateFilter.to;
      
      const res = await axios.get('/api/sales-report-by-currency', { 
        params,
        headers: { Authorization: token } 
      });
      setCurrencyReport(res.data || []);
    } catch (error) {
      console.error('Error fetching currency report:', error);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/exchange-rates', { headers: { Authorization: token } });
      setRates(res.data || []);
    } catch (error) {
      console.error('Error fetching rates:', error);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setAvailableProducts(res.data.products || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchOrderItems = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/orders/${orderId}/items`, { headers: { Authorization: token } });
      setOrderItems(res.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    
    if (orderFilter.status !== 'todos') {
      filtered = filtered.filter(o => o.status === orderFilter.status);
    }
    
    if (orderFilter.search) {
      const searchLower = orderFilter.search.toLowerCase();
      filtered = filtered.filter(o => 
        (o.sender_name || o.customer_name || '').toLowerCase().includes(searchLower) ||
        (o.recipient_name || '').toLowerCase().includes(searchLower) ||
        (o.sender_phone || o.customer_phone || '').includes(orderFilter.search) ||
        (o.recipient_phone || '').includes(orderFilter.search) ||
        o.id?.includes(orderFilter.search)
      );
    }
    
    if (orderFilter.dateFrom) {
      const fromDate = new Date(orderFilter.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= fromDate;
      });
    }
    
    if (orderFilter.dateTo) {
      const toDate = new Date(orderFilter.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate <= toDate;
      });
    }
    
    setFilteredOrders(filtered);
  };

  const filterReports = () => {
    let filtered = [...reports];
    
    if (saleFilter.category !== 'todas') {
      filtered = filtered.filter(r => r.category === saleFilter.category);
    }
    
    if (saleFilter.search) {
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(saleFilter.search.toLowerCase())
      );
    }
    
    if (saleFilter.currency && saleFilter.currency !== 'todas') {
      filtered = filtered.filter(r => r.product_currency === saleFilter.currency);
    }
    
    if (saleDateFilter.from) {
      const fromDate = new Date(saleDateFilter.from);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(r => {
        if (!r.last_sale_date) return false;
        const saleDate = new Date(r.last_sale_date);
        return saleDate >= fromDate;
      });
    }
    
    if (saleDateFilter.to) {
      const toDate = new Date(saleDateFilter.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => {
        if (!r.last_sale_date) return false;
        const saleDate = new Date(r.last_sale_date);
        return saleDate <= toDate;
      });
    }
    
    filtered.sort((a, b) => {
      let aVal = a[saleFilter.sortBy] || 0;
      let bVal = b[saleFilter.sortBy] || 0;
      if (saleFilter.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    setFilteredReports(filtered);
  };

  const clearSaleFilters = () => {
    setSaleFilter({
      category: 'todas',
      search: '',
      sortBy: 'total_sold',
      sortOrder: 'desc',
      currency: 'todas'
    });
    setSaleDateFilter({ from: '', to: '' });
    setReportsCurrentPage(1);
    fetchReports();
    fetchCurrencyReport();
  };

  const clearOrderFilters = () => {
    setOrderFilter({
      status: 'todos',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
    setOrdersCurrentPage(1);
  };

  const getPaginatedProducts = () => {
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    return products.slice(start, end);
  };

  const getPaginatedOrders = () => {
    const start = (ordersCurrentPage - 1) * ordersPerPage;
    const end = start + ordersPerPage;
    return filteredOrders.slice(start, end);
  };

  const getPaginatedReports = () => {
    const start = (reportsCurrentPage - 1) * reportsPerPage;
    const end = start + reportsPerPage;
    return filteredReports.slice(start, end);
  };

  const getTotalOrdersPages = () => {
    return Math.ceil(filteredOrders.length / ordersPerPage);
  };

  const getTotalReportsPages = () => {
    return Math.ceil(filteredReports.length / reportsPerPage);
  };

  const resetForm = () => {
    setForm({ 
      name: '', 
      description: '', 
      price: '', 
      currency: 'USD',
      stock: '', 
      category: '', 
      featured: false,
      image: null 
    });
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    const data = new FormData();
    data.append('name', form.name);
    data.append('description', form.description);
    data.append('price', form.price);
    data.append('currency', form.currency);
    data.append('stock', form.stock);
    data.append('category', form.category);
    data.append('featured', form.featured ? 'true' : 'false');
    if (form.image) data.append('image', form.image);
    
    try {
      if (editingProduct) {
        await axios.put(`/api/products/${editingProduct.id}`, data, {
          headers: { Authorization: token, 'Content-Type': 'multipart/form-data' }
        });
        alert('✅ Producto actualizado correctamente');
      } else {
        await axios.post('/api/products', data, {
          headers: { Authorization: token, 'Content-Type': 'multipart/form-data' }
        });
        alert('✅ Producto creado correctamente');
      }
      fetchProducts();
      fetchAvailableProducts();
      setShowProductModal(false);
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || '❌ Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar producto?')) {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/products/${id}`, { headers: { Authorization: token } });
      fetchProducts();
      fetchAvailableProducts();
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      currency: product.currency || 'USD',
      stock: product.stock,
      category: product.category || '',
      featured: product.featured === 1,
      image: null
    });
    setShowProductModal(true);
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(`/api/orders/${orderId}/status`, { status }, { 
        headers: { Authorization: token } 
      });
      
      if (response.data.success) {
        alert(`✅ Pedido ${status === 'cancelled' ? 'cancelado' : 'actualizado'} correctamente`);
        fetchOrders();
        fetchReports();
        fetchProducts();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('❌ Error al actualizar el estado del pedido');
    }
  };

  const openEditOrderModal = async (order) => {
    setEditingOrder({ ...order });
    setShowEditOrderModal(true);
    
    try {
      const token = localStorage.getItem('token');
      const itemsRes = await axios.get(`/api/orders/${order.id}/items`, { headers: { Authorization: token } });
      setEditingOrderItems(itemsRes.data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
    }
  };

  const addItemToOrder = (product) => {
    const existingItem = editingOrderItems.find(item => item.product_id === product.id);
    if (existingItem) {
      setEditingOrderItems(editingOrderItems.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, price: product.price }
          : item
      ));
    } else {
      setEditingOrderItems([...editingOrderItems, {
        id: Date.now(),
        order_id: editingOrder.id,
        product_id: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        image: product.image
      }]);
    }
    const newTotal = editingOrderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0) + product.price;
    setEditingOrder({ ...editingOrder, total: newTotal });
  };

  const updateItemQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeItemFromOrder(index);
      return;
    }
    const newItems = [...editingOrderItems];
    newItems[index].quantity = quantity;
    setEditingOrderItems(newItems);
    const newTotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setEditingOrder({ ...editingOrder, total: newTotal });
  };

  const removeItemFromOrder = (index) => {
    const newItems = editingOrderItems.filter((_, i) => i !== index);
    setEditingOrderItems(newItems);
    const newTotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setEditingOrder({ ...editingOrder, total: newTotal });
  };

  const handleDeleteOrder = async (orderId) => {
    if (confirm('¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer y devolverá el stock.')) {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.delete(`/api/orders/${orderId}`, { 
          headers: { Authorization: token } 
        });
        
        if (response.data.success) {
          alert('✅ Pedido eliminado correctamente. Stock devuelto.');
          fetchOrders();
          fetchReports();
          fetchProducts();
        }
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('❌ Error al eliminar el pedido');
      }
    }
  };

  const handleUpdateOrder = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.put(`/api/orders/${editingOrder.id}`, {
        sender_name: editingOrder.sender_name,
        sender_phone: editingOrder.sender_phone,
        sender_email: editingOrder.sender_email,
        recipient_name: editingOrder.recipient_name,
        recipient_phone: editingOrder.recipient_phone,
        recipient_address: editingOrder.recipient_address,
        status: editingOrder.status,
        total: editingOrder.total,
        payment_method: editingOrder.payment_method,
        delivery_date: editingOrder.delivery_date,
        delivery_notes: editingOrder.delivery_notes
      }, { headers: { Authorization: token } });
      
      const itemsToSend = editingOrderItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }));
      
      await axios.put(`/api/orders/${editingOrder.id}/items`, { items: itemsToSend }, { 
        headers: { Authorization: token } 
      });
      
      alert('✅ Pedido actualizado correctamente');
      setShowEditOrderModal(false);
      fetchOrders();
      fetchReports();
      fetchProducts();
      
    } catch (error) {
      console.error('Error updating order:', error);
      alert('❌ Error al actualizar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueCategories = () => {
    const categories = reports.map(r => r.category).filter(c => c);
    return ['todas', ...new Set(categories)];
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

  const getPaymentMethodText = (method) => {
    const methods = {
      cash: '💰 Efectivo contra entrega',
      transfer: '🏦 Transferencia bancaria',
      card: '💳 Tarjeta de crédito/débito',
      nequi: '📱 Nequi',
      daviplata: '📱 Daviplata'
    };
    return methods[method] || method;
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      COP: '$',
      MXN: '$',
      ARS: '$',
      CLP: '$',
      PEN: 'S/',
      BOB: 'Bs'
    };
    return symbols[currency] || '$';
  };

  const getCurrencyName = (currency) => {
    const names = {
      USD: 'Dólar Americano',
      EUR: 'Euro',
      COP: 'Peso Colombiano',
      MXN: 'Peso Mexicano',
      ARS: 'Peso Argentino',
      CLP: 'Peso Chileno',
      PEN: 'Sol Peruano',
      BOB: 'Boliviano'
    };
    return names[currency] || currency;
  };

  const getTotalSales = () => {
    return filteredReports.reduce((sum, r) => sum + (r.total_revenue || 0), 0);
  };

  const getTotalUnits = () => {
    return filteredReports.reduce((sum, r) => sum + (r.total_sold || 0), 0);
  };

  const getTotalOrders = () => {
    return filteredReports.reduce((sum, r) => sum + (r.total_orders || 0), 0);
  };

  const exportToPDF = (data) => {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 200);
    doc.text('Reporte de Ventas', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });
    
    const tableColumnas = ["Producto", "Categoría", "Moneda", "Unidades", "Ingresos Local", "Ingresos USD", "Pedidos"];
    const tableDatos = data.map(item => {
      const usdRevenue = item.total_revenue / (rates.find(r => r.currency === item.product_currency)?.rate || 1);
      return [
        item.name,
        item.category || '-',
        item.product_currency || 'USD',
        item.total_sold?.toString() || '0',
        `${getCurrencySymbol(item.product_currency || 'USD')}${(item.total_revenue || 0).toFixed(2)}`,
        `$${usdRevenue.toFixed(2)}`,
        item.total_orders?.toString() || '0'
      ];
    });
    
    autoTable(doc, {
      head: [tableColumnas],
      body: tableDatos,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 }
    });
    
    doc.save(`reporte_ventas_${new Date().toISOString().slice(0, 19)}.pdf`);
  };

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center gap-2 mt-6">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition"
        >
          ← Anterior
        </button>
        
        <div className="flex gap-1">
          {[...Array(Math.min(totalPages, 5))].map((_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button
                key={i}
                onClick={() => onPageChange(pageNum)}
                className={`w-10 h-10 rounded-lg transition ${
                  currentPage === pageNum
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition"
        >
          Siguiente →
        </button>
      </div>
    );
  };

  const TabButton = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-6 py-3 font-semibold transition-all duration-200 ${
        activeTab === id
          ? 'border-b-2 border-emerald-600 text-emerald-600 bg-emerald-50'
          : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-gray-600 mt-1">Gestiona tu tienda de manera eficiente</p>
        </div>
        {activeTab === 'products' && (
          <button onClick={() => { resetForm(); setShowProductModal(true); }} className="btn-primary flex items-center gap-2">
            <span className="text-xl">+</span> Nuevo Producto
          </button>
        )}
      </div>
      
      <div className="border-b border-gray-200">
        <div className="flex flex-wrap gap-1">
          <TabButton id="dashboard" label="Dashboard" icon="📈" />
          <TabButton id="products" label="Productos" icon="🛍️" />
          <TabButton id="orders" label="Pedidos" icon="📦" />
          <TabButton id="sales" label="Reporte de Ventas" icon="📊" />
          <TabButton id="inventory" label="Inventario" icon="📦" />
          <TabButton id="combos" label="Combos" icon="🎁" />
          <TabButton id="offers" label="Ofertas" icon="🎯" />
          <TabButton id="currencies" label="Monedas" icon="💱" />
          <TabButton id="business" label="Negocio" icon="🏪" />
        </div>
      </div>
      
      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Productos</p>
                  <p className="text-3xl font-bold">{products.length}</p>
                </div>
                <div className="text-4xl">🛍️</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Pedidos Totales</p>
                  <p className="text-3xl font-bold">{orders.length}</p>
                </div>
                <div className="text-4xl">📦</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Pedidos Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {orders.filter(o => o.status === 'pending').length}
                  </p>
                </div>
                <div className="text-4xl">⏳</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Ingresos Totales</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    ${reports.reduce((sum, r) => sum + (r.total_revenue || 0), 0).toFixed(2)} USD
                  </p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">🏆 Top 5 Productos Más Vendidos</h3>
            <div className="space-y-3">
              {reports.slice(0, 5).map((r, idx) => (
                <div key={r.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-600">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-gray-500">{r.category || 'Sin categoría'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{r.total_sold} unidades</div>
                    <div className="text-sm text-emerald-600">{getCurrencySymbol(r.product_currency || 'USD')}{(r.total_revenue || 0).toFixed(2)}</div>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <p className="text-center text-gray-500 py-4">No hay ventas registradas</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">📋 Últimos 5 Pedidos</h3>
            <div className="space-y-3">
              {orders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{order.sender_name || order.customer_name}</p>
                    <p className="text-sm text-gray-500">#{order.id.slice(-6)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{getCurrencySymbol(order.currency || 'USD')}{order.total?.toFixed(2)} {order.currency || 'USD'}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-center text-gray-500 py-4">No hay pedidos registrados</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Productos */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getPaginatedProducts().map(p => (
              <div key={p.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                <img 
                  src={p.image || 'https://via.placeholder.com/300'} 
                  alt={p.name}
                  className="w-full h-48 object-cover rounded mb-3"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/300'; }}
                />
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  {p.featured === 1 && (
                    <span className="text-yellow-500 text-lg" title="Producto Destacado">⭐</span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{p.description}</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {getCurrencySymbol(p.currency || 'USD')}{p.price} {p.currency || 'USD'}
                </p>
                <p className="text-sm text-gray-500">
                  Stock: {p.stock} | {p.category || 'Sin categoría'}
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEditModal(p)} className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600">
                    ✏️ Editar
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedProductForInventory(p);
                      setShowInventoryModal(true);
                    }} 
                    className="flex-1 bg-emerald-500 text-white px-3 py-2 rounded hover:bg-emerald-600"
                  >
                    📦 Inventario
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="flex-1 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600">
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
      
      {/* Pedidos */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select
                value={orderFilter.status}
                onChange={(e) => setOrderFilter({...orderFilter, status: e.target.value})}
                className="input"
              >
                <option value="todos">Todos</option>
                <option value="pending">📋 Pendiente</option>
                <option value="processing">⚙️ Procesando</option>
                <option value="completed">✅ Completado</option>
                <option value="cancelled">❌ Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Cliente, teléfono o ID"
                className="input"
                value={orderFilter.search}
                onChange={(e) => setOrderFilter({...orderFilter, search: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">📅 Fecha desde</label>
              <input
                type="date"
                className="input"
                value={orderFilter.dateFrom}
                onChange={(e) => setOrderFilter({...orderFilter, dateFrom: e.target.value})}
                max={orderFilter.dateTo || undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">📅 Fecha hasta</label>
              <input
                type="date"
                className="input"
                value={orderFilter.dateTo}
                onChange={(e) => setOrderFilter({...orderFilter, dateTo: e.target.value})}
                min={orderFilter.dateFrom || undefined}
              />
            </div>
            <div className="flex items-end">
              <button onClick={clearOrderFilters} className="btn-secondary w-full">
                🗑️ Limpiar filtros
              </button>
            </div>
          </div>
          
          {(orderFilter.status !== 'todos' || orderFilter.search || orderFilter.dateFrom || orderFilter.dateTo) && (
            <div className="bg-blue-50 p-3 rounded-lg mb-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-blue-700">Filtros activos:</span>
              {orderFilter.status !== 'todos' && (
                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                  Estado: {orderFilter.status === 'pending' ? 'Pendiente' : 
                          orderFilter.status === 'processing' ? 'Procesando' :
                          orderFilter.status === 'completed' ? 'Completado' : 'Cancelado'}
                </span>
              )}
              {orderFilter.search && (
                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                  Búsqueda: {orderFilter.search}
                </span>
              )}
              {orderFilter.dateFrom && (
                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                  Desde: {new Date(orderFilter.dateFrom).toLocaleDateString()}
                </span>
              )}
              {orderFilter.dateTo && (
                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                  Hasta: {new Date(orderFilter.dateTo).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Remitente</th>
                  <th className="p-3 text-left">Destinatario</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Fecha</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedOrders().map(order => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono">#{order.id.slice(-8)}</td>
                    <td className="p-3">
                      <div className="font-medium">{order.sender_name || order.customer_name}</div>
                      <div className="text-xs text-gray-500">{order.sender_phone || order.customer_phone}</div>
                    </td>
                    <td className="p-3">
                      <div>{order.recipient_name}</div>
                      <div className="text-xs text-gray-500">{order.recipient_phone}</div>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600">
                      {getCurrencySymbol(order.currency || 'USD')}{order.total?.toFixed(2)} {order.currency || 'USD'}
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold border-0 cursor-pointer ${getStatusColor(order.status)}`}
                      >
                        <option value="pending">📋 Pendiente</option>
                        <option value="processing">⚙️ Procesando</option>
                        <option value="completed">✅ Completado</option>
                        <option value="cancelled">❌ Cancelado</option>
                      </select>
                    </td>
                    <td className="p-3 text-center text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            fetchOrderItems(order.id);
                            setShowOrderModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => openEditOrderModal(order)}
                          className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                          title="Editar pedido"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          title="Eliminar pedido"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center p-8 text-gray-500">
                      No hay pedidos que coincidan con los filtros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <Pagination 
            currentPage={ordersCurrentPage}
            totalPages={getTotalOrdersPages()}
            onPageChange={setOrdersCurrentPage}
          />
          
          <div className="mt-4 text-center text-sm text-gray-500">
            Mostrando {getPaginatedOrders().length} de {filteredOrders.length} pedidos
          </div>
        </div>
      )}
      
      {/* Reporte de Ventas */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">💱 Resumen de Ventas por Moneda</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {currencyReport.map(currency => (
                <div key={currency.currency} className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-4 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm opacity-90">{getCurrencyName(currency.currency)}</p>
                      <p className="text-2xl font-bold">{currency.currency}</p>
                    </div>
                    <div className="text-3xl">{getCurrencySymbol(currency.currency)}</div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm">
                      <span className="opacity-75">Total ventas:</span>{' '}
                      <span className="font-bold">{getCurrencySymbol(currency.currency)}{currency.total_revenue?.toFixed(2)}</span>
                    </p>
                    <p className="text-sm">
                      <span className="opacity-75">Pedidos:</span>{' '}
                      <span className="font-bold">{currency.total_orders}</span>
                    </p>
                    <p className="text-sm">
                      <span className="opacity-75">Unidades:</span>{' '}
                      <span className="font-bold">{currency.total_items_sold}</span>
                    </p>
                  </div>
                </div>
              ))}
              {currencyReport.length === 0 && (
                <div className="col-span-full text-center p-8 text-gray-500">
                  No hay ventas registradas en el período seleccionado
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">📊 Detalle de Ventas por Producto</h2>
              <div className="flex gap-2">
                <select
                  value={saleFilter.currency}
                  onChange={(e) => setSaleFilter({...saleFilter, currency: e.target.value})}
                  className="input text-sm w-40"
                >
                  <option value="todas">Todas las monedas</option>
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="COP">COP - Peso Colombiano</option>
                  <option value="MXN">MXN - Peso Mexicano</option>
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="CLP">CLP - Peso Chileno</option>
                  <option value="PEN">PEN - Sol Peruano</option>
                  <option value="BOB">BOB - Boliviano</option>
                </select>
                <button onClick={() => exportToPDF(filteredReports)} className="btn-primary text-sm">
                  📄 Exportar PDF
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <select
                    value={saleFilter.category}
                    onChange={(e) => setSaleFilter({...saleFilter, category: e.target.value})}
                    className="input"
                  >
                    {getUniqueCategories().map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'todas' ? 'Todas las categorías' : cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Buscar producto</label>
                  <input
                    type="text"
                    placeholder="Nombre del producto"
                    className="input"
                    value={saleFilter.search}
                    onChange={(e) => setSaleFilter({...saleFilter, search: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ordenar por</label>
                  <select
                    value={saleFilter.sortBy}
                    onChange={(e) => setSaleFilter({...saleFilter, sortBy: e.target.value})}
                    className="input"
                  >
                    <option value="total_sold">Unidades vendidas</option>
                    <option value="total_revenue">Ingresos totales</option>
                    <option value="total_orders">Número de pedidos</option>
                    <option value="name">Nombre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Orden</label>
                  <select
                    value={saleFilter.sortOrder}
                    onChange={(e) => setSaleFilter({...saleFilter, sortOrder: e.target.value})}
                    className="input"
                  >
                    <option value="desc">Descendente</option>
                    <option value="asc">Ascendente</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">📅 Fecha desde</label>
                  <input
                    type="date"
                    className="input"
                    value={saleDateFilter.from}
                    onChange={(e) => setSaleDateFilter({...saleDateFilter, from: e.target.value})}
                    max={saleDateFilter.to || undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">📅 Fecha hasta</label>
                  <input
                    type="date"
                    className="input"
                    value={saleDateFilter.to}
                    onChange={(e) => setSaleDateFilter({...saleDateFilter, to: e.target.value})}
                    min={saleDateFilter.from || undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">&nbsp;</label>
                  <button onClick={clearSaleFilters} className="btn-secondary w-full">
                    🗑️ Limpiar filtros
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">&nbsp;</label>
                  <button onClick={() => { fetchReports(); fetchCurrencyReport(); }} className="btn-secondary w-full">
                    🔄 Actualizar
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-4 text-white">
                <p className="text-sm opacity-90">Total Ingresos</p>
                <p className="text-2xl font-bold">${getTotalSales().toFixed(2)} USD*</p>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                <p className="text-sm opacity-90">Unidades Vendidas</p>
                <p className="text-2xl font-bold">{getTotalUnits()}</p>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                <p className="text-sm opacity-90">Pedidos</p>
                <p className="text-2xl font-bold">{getTotalOrders()}</p>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                <p className="text-sm opacity-90">Ticket Promedio</p>
                <p className="text-2xl font-bold">${getTotalOrders() > 0 ? (getTotalSales() / getTotalOrders()).toFixed(2) : '0'} USD</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Producto</th>
                    <th className="p-3 text-left">Categoría</th>
                    <th className="p-3 text-center">Moneda</th>
                    <th className="p-3 text-center">Unidades</th>
                    <th className="p-3 text-right">Ingresos (Local)</th>
                    <th className="p-3 text-right">Ingresos (USD)</th>
                    <th className="p-3 text-center">Pedidos</th>
                    <th className="p-3 text-center">Rendimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedReports().map(r => {
                    const maxSold = Math.max(...filteredReports.map(x => x.total_sold || 0), 1);
                    const percentage = maxSold ? ((r.total_sold || 0) / maxSold) * 100 : 0;
                    const usdRevenue = r.total_revenue / (rates.find(rate => rate.currency === r.product_currency)?.rate || 1);
                    
                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                            {r.category || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold">{r.product_currency || 'USD'}</td>
                        <td className="p-3 text-center font-semibold">{r.total_sold}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">
                          {getCurrencySymbol(r.product_currency || 'USD')}{(r.total_revenue || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          ${usdRevenue.toFixed(2)} USD
                        </td>
                        <td className="p-3 text-center">{r.total_orders}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-xs font-medium">{Math.round(percentage)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center p-8 text-gray-500">
                        No hay datos de ventas que coincidan con los filtros
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr className="border-t-2">
                    <td colSpan="3" className="p-3 text-right">TOTALES:</td>
                    <td className="p-3 text-center">{getTotalUnits()}</td>
                    <td className="p-3 text-right text-emerald-700">-</td>
                    <td className="p-3 text-right text-emerald-700">${getTotalSales().toFixed(2)} USD</td>
                    <td className="p-3 text-center">{getTotalOrders()}</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <Pagination 
              currentPage={reportsCurrentPage}
              totalPages={getTotalReportsPages()}
              onPageChange={setReportsCurrentPage}
            />
            
            <div className="mt-4 text-center text-sm text-gray-500">
              Mostrando {getPaginatedReports().length} de {filteredReports.length} productos
            </div>
          </div>
        </div>
      )}
      
      {/* Inventario */}
      {activeTab === 'inventory' && (
        <InventoryReport />
      )}
      
      {/* Combos */}
      {activeTab === 'combos' && (
        <ComboManager />
      )}
      
      {/* Ofertas */}
      {activeTab === 'offers' && (
        <OfferManager />
      )}
      
      {/* Monedas */}
      {activeTab === 'currencies' && (
        <CurrencyManager />
      )}
      
      {/* Configuración del Negocio */}
      {activeTab === 'business' && (
        <BusinessSettings />
      )}
      
      {/* Modales */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Detalles del Pedido #{selectedOrder.id.slice(-8)}</h2>
                <button onClick={() => setShowOrderModal(false)} className="text-2xl hover:text-gray-600">×</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-blue-800 mb-2">📤 Remitente</h3>
                  <p className="text-sm"><strong>Nombre:</strong> {selectedOrder.sender_name || selectedOrder.customer_name}</p>
                  <p className="text-sm"><strong>Teléfono:</strong> {selectedOrder.sender_phone || selectedOrder.customer_phone}</p>
                  <p className="text-sm"><strong>Email:</strong> {selectedOrder.sender_email}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-bold text-green-800 mb-2">📥 Destinatario</h3>
                  <p className="text-sm"><strong>Nombre:</strong> {selectedOrder.recipient_name}</p>
                  <p className="text-sm"><strong>Teléfono:</strong> {selectedOrder.recipient_phone}</p>
                  <p className="text-sm"><strong>Dirección:</strong> {selectedOrder.recipient_address}</p>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-purple-800 mb-2">🚚 Información de Entrega</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><strong>Estado:</strong> <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedOrder.status)}`}>{getStatusText(selectedOrder.status)}</span></p>
                  <p><strong>Método de pago:</strong> {getPaymentMethodText(selectedOrder.payment_method)}</p>
                  {selectedOrder.delivery_date && <p><strong>Fecha preferida:</strong> {new Date(selectedOrder.delivery_date).toLocaleDateString()}</p>}
                  <p><strong>Fecha del pedido:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                {selectedOrder.delivery_notes && (
                  <p className="mt-2 text-sm"><strong>Notas:</strong> {selectedOrder.delivery_notes}</p>
                )}
              </div>
              
              <h3 className="font-bold text-lg mb-3">🛍️ Productos</h3>
              <div className="space-y-2 mb-4">
                {orderItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 border-b pb-2">
                    <img src={item.image || 'https://via.placeholder.com/50'} className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Cantidad: {item.quantity} x {getCurrencySymbol(item.currency || 'USD')}{item.price}</p>
                      {item.combo_id && <p className="text-xs text-emerald-600">🎁 Comprado en combo</p>}
                      {item.offer_id && <p className="text-xs text-red-500">🎯 Incluido en oferta</p>}
                    </div>
                    <p className="font-bold">{getCurrencySymbol(item.currency || 'USD')}{(item.quantity * item.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-emerald-600">{getCurrencySymbol(selectedOrder.currency || 'USD')}{selectedOrder.total?.toFixed(2)} {selectedOrder.currency || 'USD'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showEditOrderModal && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">✏️ Editar Pedido #{editingOrder.id.slice(-8)}</h2>
                <button onClick={() => setShowEditOrderModal(false)} className="text-2xl hover:text-gray-600">×</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-blue-800 mb-3">📤 Datos del Remitente</h3>
                  <div className="space-y-2">
                    <input type="text" placeholder="Nombre" className="input" value={editingOrder.sender_name || ''} onChange={(e) => setEditingOrder({...editingOrder, sender_name: e.target.value})} />
                    <input type="text" placeholder="Teléfono" className="input" value={editingOrder.sender_phone || ''} onChange={(e) => setEditingOrder({...editingOrder, sender_phone: e.target.value})} />
                    <input type="email" placeholder="Email" className="input" value={editingOrder.sender_email || ''} onChange={(e) => setEditingOrder({...editingOrder, sender_email: e.target.value})} />
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-bold text-green-800 mb-3">📥 Datos del Destinatario</h3>
                  <div className="space-y-2">
                    <input type="text" placeholder="Nombre" className="input" value={editingOrder.recipient_name || ''} onChange={(e) => setEditingOrder({...editingOrder, recipient_name: e.target.value})} />
                    <input type="text" placeholder="Teléfono" className="input" value={editingOrder.recipient_phone || ''} onChange={(e) => setEditingOrder({...editingOrder, recipient_phone: e.target.value})} />
                    <textarea placeholder="Dirección" className="input" rows="2" value={editingOrder.recipient_address || ''} onChange={(e) => setEditingOrder({...editingOrder, recipient_address: e.target.value})} />
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-purple-800 mb-3">🚚 Información de Entrega</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select className="input" value={editingOrder.status} onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}>
                    <option value="pending">📋 Pendiente</option>
                    <option value="processing">⚙️ Procesando</option>
                    <option value="completed">✅ Completado</option>
                    <option value="cancelled">❌ Cancelado</option>
                  </select>
                  <select className="input" value={editingOrder.payment_method || 'cash'} onChange={(e) => setEditingOrder({...editingOrder, payment_method: e.target.value})}>
                    <option value="cash">💰 Efectivo contra entrega</option>
                    <option value="transfer">🏦 Transferencia bancaria</option>
                    <option value="card">💳 Tarjeta de crédito/débito</option>
                    <option value="nequi">📱 Nequi</option>
                    <option value="daviplata">📱 Daviplata</option>
                  </select>
                  <input type="date" className="input" value={editingOrder.delivery_date || ''} onChange={(e) => setEditingOrder({...editingOrder, delivery_date: e.target.value})} />
                  <input type="number" step="0.01" placeholder="Total" className="input font-bold" value={editingOrder.total || 0} onChange={(e) => setEditingOrder({...editingOrder, total: parseFloat(e.target.value)})} />
                  <textarea className="input md:col-span-2" rows="2" placeholder="Notas adicionales" value={editingOrder.delivery_notes || ''} onChange={(e) => setEditingOrder({...editingOrder, delivery_notes: e.target.value})} />
                </div>
              </div>
              
              <h3 className="font-bold text-lg mb-3">🛍️ Productos</h3>
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {editingOrderItems.map((item, idx) => {
                  const product = availableProducts.find(p => p.id === item.product_id);
                  const stockWarning = product && item.quantity > product.stock;
                  
                  return (
                    <div key={item.id || idx} className={`flex items-center gap-3 p-3 rounded-lg ${stockWarning ? 'bg-red-50 border border-red-300' : 'bg-gray-50'}`}>
                      <img src={item.image || 'https://via.placeholder.com/50'} className="w-12 h-12 object-cover rounded" />
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <div className="flex gap-2 mt-1">
                          <input type="number" className="w-20 input text-sm" value={item.quantity} onChange={(e) => updateItemQuantity(idx, parseInt(e.target.value))} min="1" />
                          <input type="number" step="0.01" className="w-28 input text-sm" value={item.price} onChange={(e) => {
                            const newItems = [...editingOrderItems];
                            newItems[idx].price = parseFloat(e.target.value);
                            setEditingOrderItems(newItems);
                            const newTotal = newItems.reduce((sum, i) => sum + (i.quantity * i.price), 0);
                            setEditingOrder({...editingOrder, total: newTotal});
                          }} />
                        </div>
                        {stockWarning && <p className="text-xs text-red-600 mt-1">⚠️ Stock disponible: {product.stock} unidades</p>}
                      </div>
                      <p className="font-bold">{getCurrencySymbol(item.currency || 'USD')}{(item.quantity * item.price).toFixed(2)}</p>
                      <button onClick={() => removeItemFromOrder(idx)} className="text-red-600 hover:text-red-800">🗑️</button>
                    </div>
                  );
                })}
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Agregar producto</label>
                <select className="input" onChange={(e) => {
                  const product = availableProducts.find(p => p.id === e.target.value);
                  if (product) addItemToOrder(product);
                  e.target.value = '';
                }} value="">
                  <option value="">Seleccionar producto...</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {getCurrencySymbol(p.currency || 'USD')}{p.price} {p.currency || 'USD'} (Stock: {p.stock})</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <button onClick={handleUpdateOrder} className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : '💾 Guardar Cambios'}</button>
                <button onClick={() => setShowEditOrderModal(false)} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                <button onClick={() => setShowProductModal(false)} className="text-2xl hover:text-gray-600">×</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Nombre" className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                <textarea placeholder="Descripción" className="input" rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                <input type="number" step="0.01" placeholder="Precio" className="input" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
                <select className="input" value={form.currency} onChange={(e) => setForm({...form, currency: e.target.value})} required>
                  <option value="USD">🇺🇸 USD - Dólar Americano</option>
                  <option value="EUR">🇪🇺 EUR - Euro</option>
                  <option value="COP">🇨🇴 COP - Peso Colombiano</option>
                  <option value="MXN">🇲🇽 MXN - Peso Mexicano</option>
                  <option value="ARS">🇦🇷 ARS - Peso Argentino</option>
                  <option value="CLP">🇨🇱 CLP - Peso Chileno</option>
                  <option value="PEN">🇵🇪 PEN - Sol Peruano</option>
                  <option value="BOB">🇧🇴 BOB - Boliviano</option>
                </select>
                <input type="number" placeholder="Stock" className="input" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
                <input type="text" placeholder="Categoría" className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={form.featured === true}
                      onChange={(e) => setForm({...form, featured: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-gray-700">⭐ Marcar como producto destacado</span>
                  </label>
                </div>
                
                <input type="file" accept="image/*" onChange={e => setForm({...form, image: e.target.files[0]})} />
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Crear')}</button>
                  <button type="button" onClick={() => setShowProductModal(false)} className="btn-secondary flex-1">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {showInventoryModal && selectedProductForInventory && (
        <InventoryManager 
          product={selectedProductForInventory} 
          onUpdate={() => { 
            fetchProducts(); 
            fetchAvailableProducts(); 
          }} 
          onClose={() => setShowInventoryModal(false)} 
        />
      )}
    </div>
  );
};

export default Admin;