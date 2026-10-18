import React, { useState, useEffect } from 'react';
import {
  Shield,
  Video,
  UserCheck,
  Film,
  Wifi,
  FileText,
  Download,
  Lock,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  LogOut,
  Radio,
} from 'lucide-react';
import type { UserSession } from '../types/security.ts';

interface NavigationHeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userSession: UserSession;
  onLogout: () => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
  onOpenReportModal: () => void;
  isSirenActive: boolean;
  onToggleSiren: () => void;
  notificationPermission: NotificationPermission;
  onRequestNotifications: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentTab,
  onSelectTab,
  userSession,
  onLogout,
  unreadAlertsCount,
  onOpenAlerts,
  onOpenReportModal,
  isSirenActive,
  onToggleSiren,
  notificationPermission,
  onRequestNotifications,
}) => {
  const [clock, setClock] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('es-ES', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'live', label: 'En Vivo', icon: Video, badge: '30 FPS' },
    { id: 'facial', label: 'Reconocimiento Facial', icon: UserCheck, badge: 'IA E2EE' },
    { id: 'recordings', label: 'Grabaciones 24/7', icon: Film, badge: 'Purga 8-10D' },
    { id: 'scanner', label: 'Escáner IP/WiFi', icon: Wifi, badge: 'Auto-ONVIF' },
    { id: 'infinityfree', label: 'Exportar InfinityFree', icon: Download, badge: 'PHP + JS' },
  ];

  return (
    <header className="bg-slate-900 border-b border-cyan-900/40 text-slate-100 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      {/* Upper Status Strip */}
      <div className="max-w-7xl mx-auto px-4 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            <span>VEGA NVR CLOUD ONLINE</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-emerald-400" title="Cifrado AES-256-GCM extremo a extremo verificado">
            <Lock className="w-3.5 h-3.5" />
            <span className="font-mono">E2EE ACTIVO (TLS 1.3)</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="hidden sm:flex items-center gap-1 text-cyan-300 font-mono">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Latencia Directa: &lt; 42 ms</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="font-mono text-slate-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {clock || '00:00:00'}
          </div>

          {/* Push notification toggle */}
          {notificationPermission !== 'granted' && (
            <button
              onClick={onRequestNotifications}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors"
              title="Activar notificaciones push en este navegador"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Activar Push</span>
            </button>
          )}

          {/* Siren / Alarm toggle */}
          <button
            onClick={onToggleSiren}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              isSirenActive
                ? 'bg-red-600 text-white animate-pulse font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Activar o silenciar alarma disuasiva sonora"
          >
            {isSirenActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{isSirenActive ? 'SIRENA ACTIVA' : 'Alarma'}</span>
          </button>

          {/* Alerts center */}
          <button
            onClick={onOpenAlerts}
            className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Centro de alertas"
          >
            <BellRing className="w-4 h-4 text-cyan-400" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-500 text-white font-bold rounded-full text-[10px] animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Report Button */}
          <button
            onClick={onOpenReportModal}
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reportes CSV/PDF</span>
          </button>

          {/* User profile & logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <span className="text-slate-300 font-medium hidden lg:inline">{userSession.username} (2FA)</span>
            <button
              onClick={onLogout}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('live')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wider text-white">VEGA</span>
              <span className="text-xs bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">
                SECURITY CAM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-tight">NVR Inteligente & Reconocimiento Facial</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-cyan-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
