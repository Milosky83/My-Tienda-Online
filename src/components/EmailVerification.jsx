import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const EmailVerification = ({ onVerified, onEmailChange }) => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const { success, error: toastError } = useToast();

  const startTimer = () => {
    setTimer(60);
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!email) {
      toastError('Ingresa tu correo electrónico');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toastError('Ingresa un correo electrónico válido');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post('/api/send-email-verification', { email });
      if (res.data.success) {
        success(`✅ Código enviado a ${email}`);
        setStep('code');
        startTimer();
        if (res.data.code) {
          setVerificationCode(res.data.code);
          console.log('Código de desarrollo:', res.data.code);
        }
      }
    } catch (error) {
      toastError(error.response?.data?.error || 'Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      toastError('Ingresa el código de 6 dígitos');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post('/api/verify-email-code', { email, code });
      if (res.data.success) {
        success('✅ Correo verificado correctamente');
        onVerified(email, code);
      }
    } catch (error) {
      toastError(error.response?.data?.error || 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/send-email-verification', { email });
      if (res.data.success) {
        success('✅ Código reenviado');
        startTimer();
        if (res.data.code) {
          setVerificationCode(res.data.code);
        }
      }
    } catch (error) {
      toastError('Error al reenviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    onEmailChange?.(value);
  };

  return (
    <div className="space-y-3">
      {step === 'email' ? (
        <div>
          <label className="block text-sm font-medium mb-1">Correo electrónico *</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="email"
                className="input"
                placeholder="Ej: usuario@ejemplo.com"
                value={email}
                onChange={handleEmailChange}
              />
            </div>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading || !email}
              className="btn-primary whitespace-nowrap disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Verificar'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              📧 Enviamos un código al correo <strong>{email}</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Revisa tu bandeja de entrada y carpeta de spam
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Código de verificación</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </div>
          
          <div className="text-center">
            {timer > 0 ? (
              <p className="text-sm text-gray-500">
                Reenviar código en <span className="font-bold">{timer}</span> segundos
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendCode}
                className="text-emerald-600 hover:text-emerald-700 text-sm"
              >
                Reenviar código
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmailVerification;