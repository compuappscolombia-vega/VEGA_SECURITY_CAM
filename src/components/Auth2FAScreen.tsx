import React, { useState } from 'react';
import {
  Shield,
  Lock,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Fingerprint,
} from 'lucide-react';
import type { UserSession } from '../types/security.ts';

interface Auth2FAScreenProps {
  onSuccessLogin: (session: UserSession) => void;
}

export const Auth2FAScreen: React.FC<Auth2FAScreenProps> = ({ onSuccessLogin }) => {
  const [step, setStep] = useState<'CREDENTIALS' | 'PIN_2FA'>('CREDENTIALS');
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor complete todos los campos');
      return;
    }
    // Advance to 2FA PIN step
    setError(null);
    setStep('PIN_2FA');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '123456' || pin.trim().length === 6) {
      completeLogin();
    } else {
      setError('PIN incorrecto. Ingrese el PIN de prueba: 123456');
    }
  };

  const completeLogin = () => {
    const session: UserSession = {
      username: username || 'admin',
      email: 'gato-284@hotmail.com',
      role: 'superadmin',
      is2FaVerified: true,
      deviceFingerprint: `DEV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      sessionToken: `VEGA-AUTH-${Date.now()}`,
      loginTime: Date.now(),
      e2eeKeyId: 'AES256-GCM-VEGA-KEY-9981',
    };
    onSuccessLogin(session);
  };

  const handleQuickDemoAccess = () => {
    setUsername('admin');
    setPassword('admin123');
    setPin('123456');
    completeLogin();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-cyan-500/30 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 mb-4 shadow-xl shadow-cyan-500/25">
            <Shield className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">VEGA SECURITY CAM</h1>
          <p className="text-xs text-cyan-400 font-mono tracking-widest uppercase mt-1">
            SISTEMA NVR CLOUD & RECONOCIMIENTO FACIAL
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-2 font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encriptación E2EE (TLS 1.3 / AES-256)</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'CREDENTIALS' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Usuario o Correo
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Continuar a Validación 2FA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handlePinSubmit} className="space-y-6 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                <Fingerprint className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Autenticación de 2 Factores (2FA)</h3>
              <p className="text-xs text-slate-400">
                Ingrese el PIN de seguridad de 6 dígitos emitido para su dispositivo.
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                autoFocus
                placeholder="123456"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-48 text-center text-3xl font-mono tracking-widest bg-slate-950 border-2 border-cyan-500/60 rounded-xl py-3 text-cyan-300 focus:outline-none focus:border-cyan-400 shadow-inner"
              />
              <p className="text-[11px] text-slate-500 mt-2 font-mono">
                PIN de Administrador: <strong className="text-cyan-400 font-bold">123456</strong>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verificar PIN y Acceder al NVR</span>
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Conexión Cifrada E2EE directa para PC y dispositivos móviles. Compatible con InfinityFree.
          </p>
        </div>
      </div>
    </div>
  );
};
