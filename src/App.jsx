import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { BusinessProvider } from './context/BusinessContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Offers from './pages/Offers';
import Combos from './pages/Combos';
import Login from './pages/Login';
import Register from './pages/Register';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import UserDashboard from './pages/UserDashboard';
import Admin from './pages/Admin';
import InstallPrompt from './pages/InstallPrompt';

function App() {
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(localStorage.getItem('user') || '{}') : null;

  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <BusinessProvider>
            <CartProvider>
              <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
                <Header />
                <main className="flex-grow">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/offers" element={<Offers />} />
                    <Route path="/combos" element={<Combos />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/orders" element={
                      user ? <Orders /> : <Navigate to="/login" />
                    } />
                    <Route path="/dashboard" element={
                      user ? <UserDashboard /> : <Navigate to="/login" />
                    } />
                    <Route path="/admin" element={
                      user?.role === 'admin' ? <Admin /> : <Navigate to="/" />
                    } />
                  </Routes>
                </main>
				<InstallPrompt />
                <Footer />
              </div>
            </CartProvider>
          </BusinessProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;