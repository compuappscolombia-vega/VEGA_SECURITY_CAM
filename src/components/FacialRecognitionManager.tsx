import React, { useState } from 'react';
import {
  UserCheck,
  UserX,
  UserPlus,
  Shield,
  ShieldAlert,
  Search,
  Lock,
  Trash2,
  CheckCircle2,
  Clock,
  Camera,
  Upload,
  Sparkles,
  KeyRound,
  Filter,
} from 'lucide-react';
import type { FaceProfile, FaceCategory } from '../types/security.ts';
import { generateBiometricHash } from '../utils/facialBiometrics.ts';

interface FacialRecognitionManagerProps {
  profiles: FaceProfile[];
  onAddProfile: (newProfile: FaceProfile) => void;
  onUpdateProfile: (updated: FaceProfile) => void;
  onDeleteProfile: (id: string) => void;
  onSimulateDetection: (profile: FaceProfile) => void;
  capturedSnapshotUrl?: string | null;
}

export const FacialRecognitionManager: React.FC<FacialRecognitionManagerProps> = ({
  profiles,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onSimulateDetection,
  capturedSnapshotUrl,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);

  // New profile form state
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<FaceCategory>('AUTHORIZED');
  const [roleDescription, setRoleDescription] = useState<string>('Personal Autorizado');
  const [notes, setNotes] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string>(capturedSnapshotUrl || '');
  const [notifyOnDetection, setNotifyOnDetection] = useState<boolean>(true);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Generate random synthetic 16-point geometric landmark vector
    const vector = Array.from({ length: 16 }, () => Number(Math.random().toFixed(4)));
    const encryptedHash = generateBiometricHash(vector);

    const newProfile: FaceProfile = {
      id: `face-${Date.now()}`,
      name: name.trim(),
      category,
      roleDescription: roleDescription.trim() || (category === 'BLOCKED' ? 'Lista Negra' : 'Personal'),
      registeredAt: Date.now(),
      encryptedBiometricHash: encryptedHash,
      biometricVector: vector,
      accessAllowed: category !== 'BLOCKED',
      notifyOnDetection,
      notes: notes.trim(),
      avatarUrl: avatarPreview || undefined,
    };

    onAddProfile(newProfile);
    setIsRegisterOpen(false);
    // Reset form
    setName('');
    setRoleDescription('Personal Autorizado');
    setNotes('');
    setAvatarPreview('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.roleDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const authorizedCount = profiles.filter((p) => p.category === 'AUTHORIZED').length;
  const blockedCount = profiles.filter((p) => p.category === 'BLOCKED').length;

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                Módulo de Reconocimiento Facial Inteligente
              </h2>
              <span className="text-[10px] bg-cyan-950 border border-cyan-500/40 text-cyan-400 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-cyan-400" />
                BIOMETRÍA E2EE CIFRADA
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Gestione listas de personas autorizadas y bloqueadas. El sistema analiza las facciones geométricas en
              tiempo real y despacha alertas personalizadas instantáneas al detectar coincidencias.
            </p>
          </div>

          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/25 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Nuevo Rostro</span>
          </button>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Lista Blanca (Autorizados)</p>
              <p className="text-2xl font-black text-white mt-1">{authorizedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Lista Negra (Bloqueados)</p>
              <p className="text-2xl font-black text-white mt-1">{blockedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-950 flex items-center justify-center text-red-400">
              <UserX className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Protección Criptográfica</p>
              <p className="text-sm font-mono text-slate-300 mt-1">AES-256 + SHA-256 Salt</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-950 flex items-center justify-center text-cyan-400">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Registrar Identidad Facial</h3>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ing. Carlos Vega"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lista / Categoría *</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const cat = e.target.value as FaceCategory;
                      setCategory(cat);
                      if (cat === 'BLOCKED') setRoleDescription('Sujeto No Autorizado / Bloqueado');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="AUTHORIZED">Lista Blanca (Autorizado)</option>
                    <option value="BLOCKED">Lista Negra (Bloqueado / Intruso)</option>
                    <option value="VISITOR">Visitante / Temporal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rol / Cargo</label>
                  <input
                    type="text"
                    placeholder="Ej. Administrador, Proveedor, etc."
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fotografía de Referencia</label>
                <div className="flex items-center gap-3">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-cyan-500/50"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center text-slate-500">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Subir Foto</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400">
                      O use el botón "Capturar" en la vista En Vivo.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notas de Seguridad</label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales sobre autorización o protocolo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <input
                  type="checkbox"
                  id="notifyCheck"
                  checked={notifyOnDetection}
                  onChange={(e) => setNotifyOnDetection(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0"
                />
                <label htmlFor="notifyCheck" className="text-slate-300 text-xs">
                  Enviar Notificación Push Inmediata al detectar a esta persona
                </label>
              </div>

              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-[11px] text-cyan-300 flex items-start gap-2">
                <Lock className="w-4 h-4 flex-shrink-0 text-cyan-400 mt-0.5" />
                <span>
                  Los puntos biométricos se encriptarán automáticamente con sal criptográfica AES-256 para proteger la
                  privacidad y cumplir con normativas de protección de datos.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20"
                >
                  Guardar Perfil Biométrico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">Filtrar por:</span>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'AUTHORIZED', 'BLOCKED', 'VISITOR'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterCategory === cat
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'ALL'
                  ? 'Todos'
                  : cat === 'AUTHORIZED'
                  ? 'Autorizados'
                  : cat === 'BLOCKED'
                  ? 'Bloqueados'
                  : 'Visitantes'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o rol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-64"
          />
        </div>
      </div>

      {/* Profiles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map((p) => {
          const isBlocked = p.category === 'BLOCKED';

          return (
            <div
              key={p.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition-all relative flex flex-col justify-between ${
                isBlocked
                  ? 'border-red-500/40 hover:border-red-500 bg-gradient-to-b from-red-950/20 to-slate-900'
                  : 'border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base ${
                        isBlocked
                          ? 'bg-red-950 border border-red-500/50 text-red-400'
                          : 'bg-emerald-950 border border-emerald-500/50 text-emerald-400'
                      }`}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        p.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                      <p className="text-xs text-slate-400">{p.roleDescription}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isBlocked
                        ? 'bg-red-950 border-red-500/60 text-red-300'
                        : 'bg-emerald-950 border-emerald-500/60 text-emerald-300'
                    }`}
                  >
                    {isBlocked ? 'LISTA NEGRA' : 'AUTORIZADO'}
                  </span>
                </div>

                {/* Biometric Hash & Security Details */}
                <div className="mt-4 p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Lock className="w-3 h-3 text-cyan-400" />
                      Hash E2EE:
                    </span>
                    <span className="font-mono text-cyan-300 text-[10px] truncate max-w-[170px]" title={p.encryptedBiometricHash}>
                      {p.encryptedBiometricHash}
                    </span>
                  </div>

                  {p.lastSeenTimestamp && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Último avistamiento:
                      </span>
                      <span className="text-slate-300 text-[10px]">
                        {new Date(p.lastSeenTimestamp).toLocaleTimeString()} en {p.lastSeenCamera || 'Cámara'}
                      </span>
                    </div>
                  )}

                  {p.notes && <p className="text-slate-400 italic text-[10px] pt-1">"{p.notes}"</p>}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                {/* Test / Verify Biometrics button */}
                <button
                  onClick={() => onSimulateDetection(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isBlocked
                      ? 'bg-red-950/60 border-red-500/40 text-red-300 hover:bg-red-900/60'
                      : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  }`}
                  title="Verifica la coincidencia del patrón biométrico contra la lista autorizada/bloqueada"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Verificar Patrón</span>
                </button>

                <div className="flex items-center gap-1">
                  {/* Toggle Whitelist / Blacklist */}
                  <button
                    onClick={() => {
                      const updated: FaceProfile = {
                        ...p,
                        category: isBlocked ? 'AUTHORIZED' : 'BLOCKED',
                        accessAllowed: isBlocked,
                        roleDescription: isBlocked ? 'Personal Autorizado' : 'Lista Negra / Bloqueado',
                      };
                      onUpdateProfile(updated);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title={isBlocked ? 'Mover a Autorizados' : 'Mover a Lista Negra'}
                  >
                    {isBlocked ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <UserX className="w-4 h-4 text-red-400" />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteProfile(p.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                    title="Eliminar registro biométrico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
