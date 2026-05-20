import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { BusinessProvider } from './context/BusinessContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Offers from './pages/Offers';
import Combos from './pages/Combos';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';

function App() {
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(localStorage.getItem('user') || '{}') : null;

  return (
    <BrowserRouter>
      <BusinessProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col bg-gray-50">
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
                <Route path="/admin" element={
                  user?.role === 'admin' ? <Admin /> : <Navigate to="/" />
                } />
              </Routes>
            </main>
            <Footer />
          </div>
        </CartProvider>
      </BusinessProvider>
    </BrowserRouter>
  );
}

export default App;