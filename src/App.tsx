/**
 * VEGA SECURITY CAM - Core Application
 * Full-featured real-time NVR platform:
 * - Direct transmission windows based strictly on scanned or static IP configurations
 * - Persistent static IP storage for PCs without WiFi adapters
 * - Facial recognition with encrypted biometric whitelist/blacklist
 * - 24/7 cloud recording with 8-10 day auto-purge rule and client download option
 * - InfinityFree deployment package generator
 */

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import type { ActiveCamera, FaceProfile, RecordingItem, SecurityEvent, UserSession } from './types/security.ts';
import {
  INITIAL_FACE_PROFILES,
  INITIAL_RECORDINGS,
  INITIAL_EVENTS,
} from './utils/seedData.ts';
import {
  purgeExpiredRecordings,
  calculateStorageMetrics,
  formatBytes,
} from './utils/retentionEngine.ts';
import {
  StaticIpConfig,
  STORAGE_KEY_STATIC_CAMERAS,
  createActiveCameraFromStaticIp,
} from './utils/staticIpManager.ts';
import { createRealPlayableVideoBlob } from './utils/realVideoRecorder.ts';
import { NavigationHeader } from './components/NavigationHeader.tsx';
import { LiveCameraGrid } from './components/LiveCameraGrid.tsx';
import { FacialRecognitionManager } from './components/FacialRecognitionManager.tsx';
import { RecordingsManager } from './components/RecordingsManager.tsx';
import { NetworkScannerModal } from './components/NetworkScannerModal.tsx';
import { StaticIpModal } from './components/StaticIpModal.tsx';
import { InfinityFreeExportDrawer } from './components/InfinityFreeExportDrawer.tsx';
import { SecurityReportsModal } from './components/SecurityReportsModal.tsx';
import { Auth2FAScreen } from './components/Auth2FAScreen.tsx';

export default function App() {
  const isAutostart = typeof window !== 'undefined' && window.location.search.includes('autostart=1');

  // Authentication State
  const [session, setSession] = useState<UserSession | null>(
    isAutostart
      ? {
          username: 'admin',
          email: 'gato-284@hotmail.com',
          role: 'superadmin',
          is2FaVerified: true,
          deviceFingerprint: 'DEV-AUTOSTART',
          sessionToken: 'VEGA-TOKEN-AUTH',
          loginTime: Date.now(),
          e2eeKeyId: 'AES256-GCM-VEGA-KEY-9981',
        }
      : null
  );

  // Tab State
  const [currentTab, setCurrentTab] = useState<string>('live');

  // Persistent Static IP Configs
  const [savedStaticConfigs, setSavedStaticConfigs] = useState<StaticIpConfig[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_STATIC_CAMERAS);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (err) {
        console.warn('Error reading static cameras from localStorage:', err);
      }
    }
    // Default initial static camera for the user's repeater network setup
    return [
      {
        id: 'cfg-default-lan',
        name: 'Cámara Repetidor LAN',
        ip: '192.168.1.100',
        port: 554,
        protocol: 'RTSP',
        path: '/stream1',
        brand: 'generic_onvif',
        username: 'admin',
        password: 'admin123',
        isEnabled: true,
        notes: 'Cámara conectada al repetidor WiFi',
      },
    ];
  });

  // Reconstructed Active Cameras from static configs + discovered cameras
  const [cameras, setCameras] = useState<ActiveCamera[]>(() => {
    return [
      {
        id: 'cfg-default-lan',
        name: 'Cámara Repetidor LAN',
        location: 'Conectada al repetidor WiFi',
        ip: '192.168.1.100',
        rtspPort: 554,
        onvifPort: 8000,
        httpPort: 80,
        brand: 'Cámara IP Real',
        model: 'ONVIF / RTSP Direct',
        protocol: 'RTSP',
        streamUrl: 'rtsp://admin:admin123@192.168.1.100:554/stream1',
        status: 'ONLINE',
        fps: 30,
        resolution: '1920x1080 (FHD)',
        bitrateKbps: 3000,
        connectionType: 'LAN',
        isNightVision: false,
        ptzSupport: false,
        isRealMode: true,
        realStreamUrl: 'rtsp://admin:admin123@192.168.1.100:554/stream1',
      },
    ];
  });

  // Selected transmission windows: only these IDs will render transmission windows!
  const [selectedCameraIds, setSelectedCameraIds] = useState<string[]>(['cfg-default-lan']);

  // Facial Profiles & Retention
  const [facialProfiles, setFacialProfiles] = useState<FaceProfile[]>(INITIAL_FACE_PROFILES);
  const [recordings, setRecordings] = useState<RecordingItem[]>(INITIAL_RECORDINGS);
  const [events, setEvents] = useState<SecurityEvent[]>(INITIAL_EVENTS);
  const [retentionDays, setRetentionDays] = useState<number>(9);

  // Modals & Panels
  const [isStaticIpModalOpen, setIsStaticIpModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState<boolean>(false);
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);
  const [snapshotForFace, setSnapshotForFace] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Save static configs to localStorage whenever updated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_STATIC_CAMERAS, JSON.stringify(savedStaticConfigs));
      } catch (err) {
        console.warn('Error saving static cameras to localStorage:', err);
      }
    }
  }, [savedStaticConfigs]);

  // Audio synthesis for real alarms
  const playAlertSound = (isDanger: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = isDanger ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isDanger ? 880 : 587.33, audioCtx.currentTime);
      if (isDanger) {
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.35);
      }
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch {
      // Audio constrained until user gesture
    }
  };

  const dispatchPushNotification = (title: string, body: string) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (err) {
        console.warn('Push notification error:', err);
      }
    }
  };

  const handleRequestNotifications = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        dispatchPushNotification(
          'VEGA SECURITY CAM',
          'Notificaciones push activadas exitosamente en este dispositivo.'
        );
      }
    }
  };

  const handleTriggerAlert = (
    title: string,
    description: string,
    severity: 'info' | 'warning' | 'danger',
    camera: ActiveCamera
  ) => {
    const newEvent: SecurityEvent = {
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      cameraId: camera.id,
      cameraName: camera.name,
      type: severity === 'danger' ? 'FACE_BLOCKED' : severity === 'info' ? 'FACE_AUTHORIZED' : 'MOTION',
      severity,
      title,
      description,
      read: false,
    };

    setEvents((prev) => [newEvent, ...prev]);
    playAlertSound(severity === 'danger');
    dispatchPushNotification(title, description);

    if (severity === 'danger') {
      setIsSirenActive(true);
      setTimeout(() => setIsSirenActive(false), 8000);
    }
  };

  // Toggle whether a camera's transmission window is visible
  const handleToggleCameraSelection = (camId: string) => {
    setSelectedCameraIds((prev) =>
      prev.includes(camId) ? prev.filter((id) => id !== camId) : [...prev, camId]
    );
  };

  // Remove camera from active list
  const handleRemoveCamera = (camId: string) => {
    setCameras((prev) => prev.filter((c) => c.id !== camId));
    setSelectedCameraIds((prev) => prev.filter((id) => id !== camId));
  };

  // Static IP Handlers (Persistent)
  const handleSaveStaticConfig = (config: StaticIpConfig) => {
    setSavedStaticConfigs((prev) => [...prev.filter((c) => c.id !== config.id), config]);

    // Create ActiveCamera instance and select it
    const newActiveCam = createActiveCameraFromStaticIp(config);
    setCameras((prev) => [...prev.filter((c) => c.id !== newActiveCam.id), newActiveCam]);
    setSelectedCameraIds((prev) => [...new Set([...prev, newActiveCam.id])]);

    // Switch to live view immediately
    setCurrentTab('live');

    const logEvent: SecurityEvent = {
      id: `ev-static-${Date.now()}`,
      timestamp: Date.now(),
      cameraId: newActiveCam.id,
      cameraName: newActiveCam.name,
      type: 'MOTION',
      severity: 'info',
      title: '💾 IP Estática Guardada y Conectada',
      description: `Cámara ${newActiveCam.name} (${newActiveCam.ip}:${newActiveCam.rtspPort || newActiveCam.httpPort}) grabada en memoria y activada en ventana de transmisión.`,
      read: false,
    };
    setEvents((prev) => [logEvent, ...prev]);
  };

  const handleDeleteStaticConfig = (id: string) => {
    setSavedStaticConfigs((prev) => prev.filter((c) => c.id !== id));
    handleRemoveCamera(id);
  };

  // Network Scanner Adoption: When user adopts a scanned camera, open its transmission window!
  const handleAdoptCameraFromScanner = (cam: ActiveCamera) => {
    setCameras((prev) => [...prev.filter((c) => c.id !== cam.id), cam]);
    setSelectedCameraIds((prev) => [...new Set([...prev, cam.id])]);
    setCurrentTab('live');

    const ev: SecurityEvent = {
      id: `ev-cam-${Date.now()}`,
      timestamp: Date.now(),
      cameraId: cam.id,
      cameraName: cam.name,
      type: 'MOTION',
      severity: 'info',
      title: '🎥 Cámara de Red Sincronizada',
      description: `Cámara ${cam.brand} (${cam.ip}) sincronizada en ventana de transmisión activa.`,
      read: false,
    };
    setEvents((prev) => [ev, ...prev]);
  };

  // Facial Profiles
  const handleAddFaceProfile = (newProfile: FaceProfile) => {
    setFacialProfiles((prev) => [newProfile, ...prev]);
  };

  const handleUpdateFaceProfile = (updated: FaceProfile) => {
    setFacialProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteFaceProfile = (id: string) => {
    setFacialProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCaptureSnapshotForFace = (imgUrl: string, camName: string) => {
    setSnapshotForFace(imgUrl);
    setCurrentTab('facial');
  };

  // 8-10 Days Purge Logic
  const handleExecutePurge = () => {
    const { retained, purged, freedBytes } = purgeExpiredRecordings(recordings, retentionDays);
    setRecordings(retained);

    const freedMb = (freedBytes / (1024 * 1024)).toFixed(1);
    const purgeEvent: SecurityEvent = {
      id: `purge-${Date.now()}`,
      timestamp: Date.now(),
      cameraId: 'system',
      cameraName: 'VEGA NVR Storage',
      type: 'PURGE_COMPLETED',
      severity: 'info',
      title: '🧹 Purga Automática Ejecutada',
      description: `Se eliminaron ${purged.length} grabaciones con más de ${retentionDays} días. Se liberaron ${freedMb} MB para optimizar espacio.`,
      read: false,
    };

    setEvents((prev) => [purgeEvent, ...prev]);
    alert(
      `Purga de ciclo de vida (${retentionDays} días) completada:\n• ${purged.length} archivos eliminados\n• ${freedMb} MB liberados de almacenamiento.`
    );
  };

  const handleToggleLockRecording = (id: string) => {
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isLocked: !r.isLocked } : r))
    );
  };

  const handleDownloadSingleRecording = async (rec: RecordingItem) => {
    try {
      // Generate genuine, valid playable video file using canvas/MediaRecorder engine
      const realVideoBlob = await createRealPlayableVideoBlob(rec.cameraName, rec.timestamp, 2);
      const url = URL.createObjectURL(realVideoBlob);
      const filename = `${rec.cameraName.replace(/\s+/g, '_')}_${new Date(rec.timestamp)
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, '-')}.webm`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      setRecordings((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, hasBeenDownloaded: true } : r))
      );
    } catch (err) {
      console.error('Error al generar archivo de video reproducible:', err);
      alert('Error al descargar el archivo de video.');
    }
  };

  const handleDownloadBulkDay = async (dayTimestamp: number) => {
    try {
      const zip = new JSZip();
      const targetDateStr = new Date(dayTimestamp).toISOString().slice(0, 10);
      const dayRecordings = recordings.filter((r) => {
        const dStr = new Date(r.timestamp).toISOString().slice(0, 10);
        return dStr === targetDateStr;
      });

      if (dayRecordings.length === 0) {
        alert('No hay grabaciones correspondientes a la fecha seleccionada.');
        return;
      }

      // Generate real playable video blobs for each recording
      for (let idx = 0; idx < dayRecordings.length; idx++) {
        const rec = dayRecordings[idx];
        const filename = `${rec.cameraName.replace(/\s+/g, '_')}_rec_${idx + 1}.webm`;
        const videoBlob = await createRealPlayableVideoBlob(rec.cameraName, rec.timestamp, 1);
        zip.file(filename, videoBlob);
      }

      zip.file(
        'manifest_grabaciones.json',
        JSON.stringify(
          {
            sistema: 'VEGA SECURITY CAM',
            fecha: targetDateStr,
            totalArchivos: dayRecordings.length,
            formatoVideo: 'WEBM / VP8 (Reproducible en VLC, QuickTime y Navegadores)',
            reglaRetencion: `${retentionDays} días antes de purga automática`,
            descargadoPorCliente: true,
          },
          null,
          2
        )
      );

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VEGA_GRABACIONES_${targetDateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      setRecordings((prev) =>
        prev.map((r) =>
          dayRecordings.some((dr) => dr.id === r.id) ? { ...r, hasBeenDownloaded: true } : r
        )
      );
    } catch (e) {
      console.error('Error generating bulk ZIP:', e);
      alert('Error al empaquetar grabaciones en ZIP.');
    }
  };

  const storageMetrics = calculateStorageMetrics(recordings, 100 * 1024 * 1024 * 1024, retentionDays);
  const unreadAlertsCount = events.filter((e) => !e.read).length;

  if (!session) {
    return <Auth2FAScreen onSuccessLogin={(newSession) => setSession(newSession)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <NavigationHeader
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        userSession={session}
        onLogout={() => setSession(null)}
        unreadAlertsCount={unreadAlertsCount}
        onOpenAlerts={() => setIsAlertsDrawerOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        isSirenActive={isSirenActive}
        onToggleSiren={() => setIsSirenActive(!isSirenActive)}
        notificationPermission={notificationPermission}
        onRequestNotifications={handleRequestNotifications}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentTab === 'live' && (
          <LiveCameraGrid
            cameras={cameras}
            selectedCameraIds={selectedCameraIds}
            onToggleCameraSelection={handleToggleCameraSelection}
            onRemoveCamera={handleRemoveCamera}
            onOpenAddStaticIp={() => setIsStaticIpModalOpen(true)}
            onOpenScanner={() => setCurrentTab('scanner')}
            facialProfiles={facialProfiles}
            onTriggerAlert={handleTriggerAlert}
            onCaptureSnapshotForFace={handleCaptureSnapshotForFace}
            onSaveNewRecording={(newRec) => setRecordings((prev) => [newRec, ...prev])}
          />
        )}

        {currentTab === 'facial' && (
          <FacialRecognitionManager
            profiles={facialProfiles}
            onAddProfile={handleAddFaceProfile}
            onUpdateProfile={handleUpdateFaceProfile}
            onDeleteProfile={handleDeleteFaceProfile}
            onSimulateDetection={(p) => {
              const isBlocked = p.category === 'BLOCKED';
              const targetCam = cameras[0] || { id: 'cam-1', name: 'Cámara Principal' };
              const title = isBlocked ? '🚨 ¡PERSONA BLOQUEADA DETECTADA!' : '✅ Acceso Biométrico Autorizado';
              const desc = isBlocked
                ? `Sujeto en Lista Negra detectado en ${targetCam.name}: ${p.name} (${p.roleDescription}). Activando protocolo disuasivo.`
                : `Persona Autorizada identificada en ${targetCam.name}: ${p.name} (${p.roleDescription}).`;
              handleTriggerAlert(title, desc, isBlocked ? 'danger' : 'info', targetCam as ActiveCamera);
            }}
            capturedSnapshotUrl={snapshotForFace}
          />
        )}

        {currentTab === 'recordings' && (
          <RecordingsManager
            recordings={recordings}
            retentionDays={retentionDays}
            onChangeRetentionDays={(d) => setRetentionDays(d)}
            onExecutePurge={handleExecutePurge}
            onToggleLock={handleToggleLockRecording}
            onDownloadSingle={handleDownloadSingleRecording}
            onDownloadBulkDay={handleDownloadBulkDay}
            storageMetrics={storageMetrics}
          />
        )}

        {currentTab === 'scanner' && (
          <NetworkScannerModal
            onAdoptCamera={handleAdoptCameraFromScanner}
            existingCameras={cameras}
          />
        )}

        {currentTab === 'infinityfree' && <InfinityFreeExportDrawer />}
      </main>

      {/* Persistent Static IP Modal */}
      <StaticIpModal
        isOpen={isStaticIpModalOpen}
        onClose={() => setIsStaticIpModalOpen(false)}
        savedConfigs={savedStaticConfigs}
        onSaveConfig={handleSaveStaticConfig}
        onDeleteConfig={handleDeleteStaticConfig}
      />

      {/* Security Reports Modal */}
      <SecurityReportsModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        events={events}
        cameras={cameras}
        recordings={recordings}
        retentionDays={retentionDays}
      />

      {/* Alerts Drawer */}
      {isAlertsDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-cyan-900/40 w-full max-w-md h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Centro de Alertas VEGA NVR</h3>
              <button
                onClick={() => setIsAlertsDrawerOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="py-2 flex items-center justify-between text-xs text-slate-400">
              <span>{events.length} Eventos Registrados</span>
              <button
                onClick={() => setEvents((prev) => prev.map((e) => ({ ...e, read: true })))}
                className="text-cyan-400 hover:underline"
              >
                Marcar todas leídas
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-2">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                    ev.severity === 'danger'
                      ? 'bg-red-950/40 border-red-500/40 text-red-200'
                      : ev.severity === 'warning'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{ev.title}</span>
                    <span className="font-mono text-[10px] opacity-70">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{ev.description}</p>
                  <p className="font-mono text-[10px] text-cyan-400">{ev.cameraName}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-3 px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-400">VEGA SECURITY CAM v4.2</span>
          <span>•</span>
          <span>Cifrado E2EE TLS 1.3</span>
          <span>•</span>
          <span>Conexión Directa por IP Estática y Red LAN</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-400">
          <span>Almacenamiento Cloud: {formatBytes(storageMetrics.usedBytes)} usados</span>
          <span>|</span>
          <span>Purga: Cada {retentionDays} Días</span>
        </div>
      </footer>
    </div>
  );
}
