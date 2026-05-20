import React, { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';

const BusinessSettings = () => {
  const { businessInfo, updateBusinessInfo, loading: contextLoading } = useBusiness();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    description: '',
    logo: null
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (businessInfo) {
      setFormData({
        name: businessInfo.name || '',
        phone: businessInfo.phone || '',
        email: businessInfo.email || '',
        address: businessInfo.address || '',
        website: businessInfo.website || '',
        description: businessInfo.description || '',
        logo: null
      });
      setLogoPreview(businessInfo.logo || '');
    }
  }, [businessInfo]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, logo: file });
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    
    const dataToSend = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      website: formData.website,
      description: formData.description
    };
    
    if (formData.logo) {
      dataToSend.logo = formData.logo;
    }
    
    const success = await updateBusinessInfo(dataToSend);
    
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert('Error al guardar la configuración');
    }
    
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🏪 Configuración del Negocio</h2>
          <p className="text-gray-500 text-sm mt-1">Información que aparecerá en pedidos y facturas</p>
        </div>
        {saved && (
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm animate-fade-in">
            ✅ Guardado correctamente
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo del negocio */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <label className="block text-sm font-medium mb-2">Logo del negocio</label>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-300">
              {logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">🛍️</span>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              <p className="text-xs text-gray-400 mt-2">Recomendado: 200x200px. Formatos: PNG, JPG</p>
            </div>
          </div>
        </div>
        
        {/* Información general */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del negocio *</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono / WhatsApp *</label>
            <input
              type="tel"
              className="input"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required
              placeholder="Ej: 573001234567"
            />
            <p className="text-xs text-gray-400 mt-1">Incluir código de país sin el signo +</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Correo electrónico *</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sitio web</label>
            <input
              type="text"
              className="input"
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              placeholder="www.mitienda.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Dirección *</label>
            <input
              type="text"
              className="input"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Descripción del negocio</label>
            <textarea
              className="input"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Breve descripción de tu negocio..."
            />
          </div>
        </div>
        
        <div className="flex gap-3 pt-4 border-t">
          <button type="submit" className="btn-primary flex-1" disabled={loading || contextLoading}>
            {loading ? 'Guardando...' : '💾 Guardar configuración'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BusinessSettings;