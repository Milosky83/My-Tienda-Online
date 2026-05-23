import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DeliveryCalculator = ({ onDeliveryChange }) => {
  const [cities, setCities] = useState([
    { name: 'Bogotá', zones: ['Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño', 'Puente Aranda', 'La Candelaria', 'Rafael Uribe', 'Ciudad Bolívar', 'Kennedy', 'Fontibón', 'Engativá', 'Bosa'] },
    { name: 'Medellín', zones: ['El Poblado', 'Laureles', 'Belén', 'La América', 'Robledo', 'Aranjuez', 'Manrique', 'Buenos Aires', 'Villa Hermosa', 'San Javier', 'Popular', 'Santa Cruz', 'Doce de Octubre', 'Castilla'] },
    { name: 'Cali', zones: ['San Fernando', 'Granada', 'El Peñón', 'Santa Mónica', 'Ciudad Jardín', 'La Flora', 'Pance', 'Meléndez', 'Siloe', 'Aguablanca'] },
    { name: 'Barranquilla', zones: ['Norte', 'Centro', 'Sur', 'Riomar', 'Villa Country', 'El Prado', 'Bellavista'] },
    { name: 'Cartagena', zones: ['Bocagrande', 'El Laguito', 'Castillogrande', 'Centro', 'Getsemaní', 'Manga', 'La Boquilla'] },
    { name: 'Otra ciudad', zones: ['Fuera del área metropolitana'] }
  ]);
  
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [useDelivery, setUseDelivery] = useState(true);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [availableZones, setAvailableZones] = useState([]);

  useEffect(() => {
    if (selectedCity) {
      const city = cities.find(c => c.name === selectedCity);
      setAvailableZones(city?.zones || []);
      setSelectedZone('');
    }
  }, [selectedCity]);

  useEffect(() => {
    calculateDeliveryCost();
  }, [selectedCity, selectedZone, useDelivery]);

  const calculateDeliveryCost = () => {
    if (!useDelivery) {
      setDeliveryCost(0);
      onDeliveryChange({ useDelivery: false, cost: 0, city: null, zone: null });
      return;
    }
    
    if (!selectedCity || !selectedZone) {
      setDeliveryCost(0);
      onDeliveryChange({ useDelivery: true, cost: 0, city: selectedCity, zone: selectedZone, pending: true });
      return;
    }
    
    // Calcular costo basado en ciudad y zona
    let cost = 0;
    if (selectedCity === 'Bogotá') {
      cost = selectedZone === 'Suba' || selectedZone === 'Kennedy' || selectedZone === 'Bosa' || selectedZone === 'Ciudad Bolívar' ? 12000 : 8000;
    } else if (selectedCity === 'Medellín') {
      cost = selectedZone === 'San Javier' || selectedZone === 'Popular' || selectedZone === 'Santa Cruz' ? 10000 : 7000;
    } else if (selectedCity === 'Cali') {
      cost = selectedZone === 'Siloe' || selectedZone === 'Aguablanca' ? 10000 : 7000;
    } else if (selectedCity === 'Barranquilla') {
      cost = 8000;
    } else if (selectedCity === 'Cartagena') {
      cost = 8000;
    } else {
      cost = 15000; // Otra ciudad
    }
    
    setDeliveryCost(cost);
    onDeliveryChange({ useDelivery: true, cost, city: selectedCity, zone: selectedZone });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useDelivery}
            onChange={(e) => setUseDelivery(e.target.checked)}
            className="w-5 h-5 text-emerald-600 rounded"
          />
          <span className="text-sm font-medium">📦 Necesito envío a domicilio</span>
        </label>
        {useDelivery && deliveryCost > 0 && (
          <span className="text-sm font-bold text-emerald-600">+ ${deliveryCost.toFixed(2)}</span>
        )}
      </div>
      
      {useDelivery && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
          <div>
            <label className="block text-sm font-medium mb-1">Ciudad</label>
            <select
              className="input"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              required={useDelivery}
            >
              <option value="">Seleccionar ciudad</option>
              {cities.map(city => (
                <option key={city.name} value={city.name}>{city.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Zona/Barrio</label>
            <select
              className="input"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              disabled={!selectedCity}
              required={useDelivery && !!selectedCity}
            >
              <option value="">Seleccionar zona</option>
              {availableZones.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {useDelivery && selectedCity && selectedZone && deliveryCost > 0 && (
        <div className="p-3 bg-emerald-50 rounded-lg text-sm">
          <p className="text-emerald-800">
            🚚 Costo de envío a <strong>{selectedZone}, {selectedCity}</strong>: <strong className="text-lg">${deliveryCost.toFixed(2)}</strong>
          </p>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DeliveryCalculator;