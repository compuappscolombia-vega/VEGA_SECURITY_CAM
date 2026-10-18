import React, { useState } from 'react';
import {
  Server,
  Save,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  Cpu,
  Layers,
  Plane,
  Cable,
  Check,
} from 'lucide-react';
import { KNOWN_MANUFACTURERS } from '../utils/networkScanner.ts';
import { validateStaticIpConfig } from '../utils/staticIpManager.ts';
import type { StaticIpConfig } from '../utils/staticIpManager.ts';

interface StaticIpModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedConfigs: StaticIpConfig[];
  onSaveConfig: (config: StaticIpConfig) => void;
  onDeleteConfig: (id: string) => void;
}

export const StaticIpModal: React.FC<StaticIpModalProps> = ({
  isOpen,
  onClose,
  savedConfigs,
  onSaveConfig,
  onDeleteConfig,
}) => {
  const [name, setName] = useState<string>('Cámara IP Cableada');
  const [ip, setIp] = useState<string>('192.168.1.100');
  const [port, setPort] = useState<number>(554);
  const [protocol, setProtocol] = useState<'RTSP' | 'ONVIF' | 'MJPEG' | 'WebRTC'>('RTSP');
  const [path, setPath] = useState<string>('/stream1');
  const [brand, setBrand] = useState<string>('generic_onvif');
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [notes, setNotes] = useState<string>('Conectada por cable a través del repetidor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBrandChange = (b: string) => {
    setBrand(b);
    const spec = KNOWN_MANUFACTURERS[b];
    if (spec) {
      setPort(spec.defaultRtspPort);
      setPath(spec.rtspPathPattern);
      setName(`Cámara ${spec.brand}`);
    }
  };

  const handleApplyDronePreset = () => {
    setName('Dron WiFi Stream');
    setIp('192.168.10.1');
    setPort(554);
    setProtocol('RTSP');
    setPath('/live/ch0');
    setBrand('generic_onvif');
    setNotes('Dron conectado por IP estática');
  };

  const handleApplyEsp32Preset = () => {
    setName('Cámara ESP32-CAM / Mini Dron');
    setIp('192.168.4.1');
    setPort(81);
    setProtocol('MJPEG');
    setPath('/stream');
    setBrand('generic_onvif');
    setNotes('Stream HTTP MJPEG directo');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const configData: Partial<StaticIpConfig> = {
      name: name.trim(),
      ip: ip.trim(),
      port: Number(port),
      protocol,
      path: path.trim(),
      brand,
      username: username.trim(),
      password: password.trim(),
      isEnabled: true,
      notes: notes.trim(),
    };

    const validation = validateStaticIpConfig(configData);
    if (!validation.isValid) {
      setErrorMsg(validation.errors.join('. '));
      return;
    }

    const newConfig: StaticIpConfig = {
      id: `static-${Date.now()}`,
      name: configData.name!,
      ip: configData.ip!,
      port: configData.port!,
      protocol: configData.protocol!,
      path: configData.path!,
      brand: configData.brand!,
      username: configData.username,
      password: configData.password,
      isEnabled: true,
      notes: configData.notes,
    };

    onSaveConfig(newConfig);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Grabar IP Estática Directa</h3>
              <p className="text-xs text-slate-400">
                Conexión permanente sin depender de tarjetas WiFi en tu PC de escritorio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technical Notice Banner */}
        <div className="my-4 p-3.5 bg-slate-950 border border-cyan-500/30 rounded-2xl text-xs flex items-start gap-3">
          <Cable className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-cyan-300">La falta de tarjeta WiFi no es un limitante:</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tu PC conectada por cable Ethernet al repetidor puede comunicarse por protocolo TCP/IP directamente con
              cualquier IP estática de tu cámara o dron. Los datos se guardan permanentemente en el sistema.
            </p>
          </div>
        </div>

        {/* Preset Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Plantillas Rápidas:</span>
          <button
            type="button"
            onClick={handleApplyDronePreset}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg font-mono text-[11px] flex items-center gap-1 transition-colors"
          >
            <Plane className="w-3 h-3" />
            <span>Dron WiFi (192.168.10.1:554)</span>
          </button>
          <button
            type="button"
            onClick={handleApplyEsp32Preset}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg font-mono text-[11px] flex items-center gap-1 transition-colors"
          >
            <Cpu className="w-3 h-3" />
            <span>ESP32-CAM (192.168.4.1:81)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nombre Descriptivo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Cámara Entrada, Dron FPV"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Fabricante / Modelo</label>
              <select
                value={brand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                {Object.entries(KNOWN_MANUFACTURERS).map(([k, s]) => (
                  <option key={k} value={k}>
                    {s.brand}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Dirección IP Estática *</label>
              <input
                type="text"
                required
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Puerto de Video *</label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Protocolo *</label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="RTSP">RTSP (TCP/UDP)</option>
                <option value="ONVIF">ONVIF Profile S</option>
                <option value="MJPEG">HTTP MJPEG</option>
                <option value="WebRTC">WebRTC Directo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Ruta del Stream (Path)</label>
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/stream1 o /live/ch0"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Usuario (Opcional)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Contraseña (Opcional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notas / Ubicación</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Conectada por cable a través del repetidor"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Grabar IP Estática y Conectar</span>
            </button>
          </div>
        </form>

        {/* Previously Saved Static Cameras List */}
        {savedConfigs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-xs">Cámaras con IP Estática Guardadas en el Sistema:</h4>
            <div className="space-y-2">
              {savedConfigs.map((cfg) => (
                <div
                  key={cfg.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{cfg.name}</p>
                    <p className="text-[11px] font-mono text-cyan-400">
                      {cfg.ip}:{cfg.port} ({cfg.protocol})
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteConfig(cfg.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
