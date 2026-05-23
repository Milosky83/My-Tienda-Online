import React, { useState } from 'react';
import axios from 'axios';

const MultiImageUpload = ({ productId, images, onImagesUpdate }) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    formData.append('productId', productId);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/products/upload-images', formData, {
        headers: { Authorization: token, 'Content-Type': 'multipart/form-data' }
      });
      onImagesUpdate(res.data.images);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSetMain = async (imageId) => {
    const token = localStorage.getItem('token');
    await axios.put(`/api/products/set-main-image/${imageId}`, {}, {
      headers: { Authorization: token }
    });
    onImagesUpdate(images.map(img => ({
      ...img,
      is_main: img.id === imageId
    })));
  };

  const handleDeleteImage = async (imageId) => {
    const token = localStorage.getItem('token');
    await axios.delete(`/api/products/delete-image/${imageId}`, {
      headers: { Authorization: token }
    });
    onImagesUpdate(images.filter(img => img.id !== imageId));
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Imágenes del producto</label>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {images.map(img => (
          <div key={img.id} className="relative group">
            <img src={img.image_url} className="w-full h-24 object-cover rounded-lg border" />
            {img.is_main && (
              <span className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1 rounded">Principal</span>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 rounded-lg">
              <button onClick={() => handleSetMain(img.id)} className="text-white text-sm">⭐</button>
              <button onClick={() => handleDeleteImage(img.id)} className="text-red-500 text-sm">🗑️</button>
            </div>
          </div>
        ))}
        <label className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 h-24">
          <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
          <span className="text-2xl">+</span>
          <span className="text-xs text-gray-500">Agregar</span>
        </label>
      </div>
      {uploading && <p className="text-sm text-gray-500">Subiendo imágenes...</p>}
    </div>
  );
};

export default MultiImageUpload;