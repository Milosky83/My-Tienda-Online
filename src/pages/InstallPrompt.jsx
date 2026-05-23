import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl border border-emerald-200 p-4 z-50 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-2xl">
          🛍️
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Instalar App</h3>
          <p className="text-sm text-gray-500">Instala nuestra app para una mejor experiencia</p>
        </div>
        <button onClick={handleInstall} className="btn-primary text-sm px-4 py-2">
          Instalar
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;