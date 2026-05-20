import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const BusinessContext = createContext();

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider = ({ children }) => {
  const [businessInfo, setBusinessInfo] = useState({
    name: 'Tienda Virtual',
    phone: '573001234567',
    email: 'info@tiendavirtual.com',
    address: 'Cra 1 # 2-3, Bogotá, Colombia',
    website: 'www.tiendavirtual.com',
    description: 'Tu tienda de confianza',
    logo: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinessInfo();
  }, []);

  const fetchBusinessInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: token } } : {};
      const res = await axios.get('/api/business-settings', config);
      if (res.data) {
        setBusinessInfo(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBusinessInfo = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });
      
      const res = await axios.post('/api/business-settings', formData, {
        headers: { 
          Authorization: token,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (res.data.success) {
        await fetchBusinessInfo();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating business info:', error);
      return false;
    }
  };

  return (
    <BusinessContext.Provider value={{ businessInfo, loading, updateBusinessInfo, fetchBusinessInfo }}>
      {children}
    </BusinessContext.Provider>
  );
};