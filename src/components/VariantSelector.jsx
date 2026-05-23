import React, { useState } from 'react';

const VariantSelector = ({ variants, onVariantChange }) => {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const colors = [
    { name: 'Negro', value: '#000000', code: 'black' },
    { name: 'Blanco', value: '#FFFFFF', code: 'white' },
    { name: 'Rojo', value: '#EF4444', code: 'red' },
    { name: 'Azul', value: '#3B82F6', code: 'blue' },
    { name: 'Verde', value: '#10B981', code: 'green' },
    { name: 'Amarillo', value: '#F59E0B', code: 'yellow' },
    { name: 'Morado', value: '#8B5CF6', code: 'purple' },
    { name: 'Rosa', value: '#EC4899', code: 'pink' }
  ];

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    onVariantChange?.({ size, color: selectedColor });
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    onVariantChange?.({ size: selectedSize, color });
  };

  return (
    <div className="space-y-4">
      {/* Selector de talla */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">Talla</label>
          <button className="text-xs text-emerald-600 hover:text-emerald-700">Guía de tallas</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => handleSizeSelect(size)}
              className={`w-12 h-12 rounded-lg font-medium transition-all duration-200 ${
                selectedSize === size
                  ? 'bg-emerald-600 text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex flex-wrap gap-3">
          {colors.map(color => (
            <button
              key={color.code}
              onClick={() => handleColorSelect(color)}
              className="group relative"
            >
              <div
                className={`w-10 h-10 rounded-full transition-all duration-200 ${
                  selectedColor?.code === color.code
                    ? 'ring-2 ring-offset-2 ring-emerald-600 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color.value, border: color.value === '#FFFFFF' ? '1px solid #e5e7eb' : 'none' }}
              />
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                {color.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Resumen de selección */}
      {(selectedSize || selectedColor) && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg animate-fade-in">
          <p className="text-sm text-gray-600">
            <strong>Seleccionado:</strong>{' '}
            {selectedSize && `Talla ${selectedSize}`}
            {selectedSize && selectedColor && ' • '}
            {selectedColor && `Color ${selectedColor.name}`}
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default VariantSelector;