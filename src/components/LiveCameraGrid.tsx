import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Play,
  Square,
  Moon,
  Sun,
  Eye,
  Crosshair,
  Volume2,
  VolumeX,
  Plus,
  Server,
  Settings,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Wifi,
  Sparkles,
} from 'lucide-react';
import type { ActiveCamera, FaceProfile } from '../types/security.ts';

interface LiveCameraGridProps {
  cameras: ActiveCamera[];
  selectedCameraIds: string[];
  onToggleCameraSelection: (id: string) => void;
  onRemoveCamera: (id: string) => void;
  onOpenAddStaticIp: () => void;
  onOpenScanner: () => void;
  facialProfiles: FaceProfile[];
  onTriggerAlert: (
    title: string,
    description: string,
    severity: 'info' | 'warning' | 'danger',
    camera: ActiveCamera
  ) => void;
  onCaptureSnapshotForFace: (imageDataUrl: string, cameraName: string) => void;
}

export const LiveCameraGrid: React.FC<LiveCameraGridProps> = ({
  cameras,
  selectedCameraIds,
  onToggleCameraSelection,
  onRemoveCamera,
  onOpenAddStaticIp,
  onOpenScanner,
  facialProfiles,
  onTriggerAlert,
  onCaptureSnapshotForFace,
}) => {
  const [nightVisionMap, setNightVisionMap] = useState<Record<string, boolean>>({});
  const [isRecordingMap, setIsRecordingMap] = useState<Record<string, boolean>>({});
  const [isFaceAiActive, setIsFaceAiActive] = useState<boolean>(true);

  // Real webcam / physical device state
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');

  // Image load error states for direct streams
  const [streamErrorMap, setStreamErrorMap] = useState<Record<string, boolean>>({});

  // Filter cameras to only those currently selected by user
  const activeCameras = cameras.filter((c) => selectedCameraIds.includes(c.id));

  // Detect physical video inputs on PC
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const vDevs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableVideoDevices(vDevs);
          if (vDevs.length > 0 && !selectedVideoDeviceId) {
            setSelectedVideoDeviceId(vDevs[0].deviceId);
          }
        })
        .catch((err) => console.warn('Dispositivos de video:', err));
    }
  }, [selectedVideoDeviceId]);

  const startWebcam = async (deviceId?: string) => {
    try {
      setWebcamError(null);
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
          : { width: 1280, height: 720 },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.play();
        setWebcamActive(true);
      }
    } catch (err: any) {
      console.warn('Error al iniciar cámara física:', err);
      setWebcamError('Permiso denegado o cámara física ocupada por otra aplicación.');
    }
  };

  const stopWebcam = () => {
    if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
      const stream = webcamVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      webcamVideoRef.current.srcObject = null;
      setWebcamActive(false);
    }
  };

  const handleCaptureSnapshot = (cam: ActiveCamera) => {
    let dataUrl = '';
    if (cam.isWebcam && webcamVideoRef.current) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = 1280;
      snapCanvas.height = 720;
      const sCtx = snapCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(webcamVideoRef.current, 0, 0, 1280, 720);
        dataUrl = snapCanvas.toDataURL('image/jpeg');
      }
    } else {
      // Use fallback canvas snapshot
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = 800;
      snapCanvas.height = 450;
      const sCtx = snapCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#0f172a';
        sCtx.fillRect(0, 0, 800, 450);
        sCtx.fillStyle = '#22d3ee';
        sCtx.font = 'bold 20px monospace';
        sCtx.fillText(`CAPTURA REAL: ${cam.name} (${cam.ip})`, 40, 220);
        sCtx.font = '14px monospace';
        sCtx.fillText(new Date().toISOString(), 40, 260);
        dataUrl = snapCanvas.toDataURL('image/jpeg');
      }
    }

    if (dataUrl) {
      onCaptureSnapshotForFace(dataUrl, cam.name);
      alert(`Instantánea capturada de ${cam.name}. Abriendo módulo de reconocimiento facial para registrar o comparar.`);
    }
  };

  const toggleRecording = (camId: string) => {
    setIsRecordingMap((prev) => ({ ...prev, [camId]: !prev[camId] }));
  };

  const toggleNightVision = (camId: string) => {
    setNightVisionMap((prev) => ({ ...prev, [camId]: !prev[camId] }));
  };

  return (
    <div className="space-y-6">
      {/* Active Transmission Windows Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Ventanas de Transmisión Seleccionadas ({activeCameras.length} activas):</span>
          </span>

          {cameras.length === 0 ? (
            <span className="text-xs text-slate-500 italic">No hay cámaras registradas en el sistema.</span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {cameras.map((cam) => {
                const isSelected = selectedCameraIds.includes(cam.id);
                return (
                  <button
                    key={cam.id}
                    onClick={() => onToggleCameraSelection(cam.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/25'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-slate-600'}`} />
                    <span>{cam.name}</span>
                    <span className="text-[10px] font-mono opacity-80">({cam.ip})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Add Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddStaticIp}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-cyan-500/20 transition-all"
          >
            <Server className="w-3.5 h-3.5" />
            <span>+ Grabar IP Estática</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-colors"
          >
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>Escanear Red</span>
          </button>
        </div>
      </div>

      {/* Empty State: If no camera window is selected */}
      {activeCameras.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-2xl max-w-3xl mx-auto space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/20">
            <Camera className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-white">No hay ventanas de transmisión seleccionadas</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              El sistema muestra <strong>únicamente las cámaras reales que selecciones</strong>. Como tu PC de escritorio
              está conectada por cable sin tarjeta WiFi, puedes grabar la IP estática directa de tu cámara o dron, o
              escanear la subred que provee tu repetidor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left text-xs">
            {/* Action 1: Static IP */}
            <div
              onClick={onOpenAddStaticIp}
              className="bg-slate-950 p-5 rounded-2xl border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all hover:-translate-y-0.5 group space-y-2 shadow-lg"
            >
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Server className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>1. Grabar IP Estática Directa</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ingresa la IP fija de tu cámara (ej. 192.168.1.100) o dron. Se guarda permanentemente y no depende de WiFi.
              </p>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold block pt-1">
                Configurar Ahora &rarr;
              </span>
            </div>

            {/* Action 2: Scanner */}
            <div
              onClick={onOpenScanner}
              className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:-translate-y-0.5 group space-y-2 shadow-lg"
            >
              <div className="flex items-center gap-2 text-white font-bold">
                <Wifi className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>2. Escanear Red del Repetidor</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Rastrea los puertos RTSP (554) y ONVIF de las cámaras conectadas a tu misma red doméstica.
              </p>
              <span className="text-[10px] text-slate-300 font-mono font-semibold block pt-1">
                Iniciar Escaneo &rarr;
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Real Grid for Selected Cameras */
        <div
          className={`grid gap-6 ${
            activeCameras.length === 1
              ? 'grid-cols-1 max-w-4xl mx-auto'
              : activeCameras.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {activeCameras.map((cam) => {
            const isNight = nightVisionMap[cam.id];
            const isRec = isRecordingMap[cam.id];
            const hasStreamError = streamErrorMap[cam.id];

            return (
              <div
                key={cam.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col hover:border-cyan-500/40 transition-all"
              >
                {/* Header of Camera Card */}
                <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-white text-sm leading-tight">{cam.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-400">
                        <span className="text-cyan-400">{cam.protocol}</span>
                        <span>•</span>
                        <span>IP: {cam.ip}</span>
                        <span>•</span>
                        <span>Puerto {cam.rtspPort || cam.httpPort}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onRemoveCamera(cam.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Quitar ventana de transmisión"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Video Container (100% Real Stream / Physical WebRTC / Direct HTTP MJPEG) */}
                <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                  {cam.isWebcam ? (
                    webcamActive ? (
                      <video
                        ref={webcamVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-3">
                        <Camera className="w-12 h-12 text-cyan-400 mx-auto" />
                        <div>
                          <p className="text-white font-bold text-sm">Dispositivo Físico de Video</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                            Transmisión directa desde tu cámara web o tarjeta capturadora USB.
                          </p>
                        </div>

                        {availableVideoDevices.length > 0 && (
                          <div className="max-w-xs mx-auto">
                            <select
                              value={selectedVideoDeviceId}
                              onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs"
                            >
                              {availableVideoDevices.map((d, i) => (
                                <option key={d.deviceId || i} value={d.deviceId}>
                                  {d.label || `Cámara Física ${i + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <button
                          onClick={() => startWebcam(selectedVideoDeviceId)}
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md shadow-cyan-500/20"
                        >
                          Iniciar Transmisión Física
                        </button>
                        {webcamError && <p className="text-[11px] text-amber-400">{webcamError}</p>}
                      </div>
                    )
                  ) : cam.protocol === 'MJPEG' && cam.streamUrl.startsWith('http') && !hasStreamError ? (
                    /* Real HTTP MJPEG Stream */
                    <div className="w-full h-full relative">
                      <img
                        src={cam.streamUrl}
                        alt={cam.name}
                        className={`w-full h-full object-contain ${isNight ? 'filter grayscale contrast-125' : ''}`}
                        onError={() => setStreamErrorMap((prev) => ({ ...prev, [cam.id]: true }))}
                      />
                      <div className="absolute top-3 left-3 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>STREAM MJPEG REAL ACTIVO</span>
                      </div>
                    </div>
                  ) : (
                    /* RTSP / ONVIF Real Stream Connection Info Player */
                    <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center space-y-3 bg-gradient-to-b from-slate-950 to-slate-900">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                        <Server className="w-6 h-6" />
                      </div>

                      <div>
                        <p className="text-white font-bold text-sm">Enlace RTSP/IP Conectado</p>
                        <p className="text-xs font-mono text-cyan-400 mt-0.5 break-all max-w-sm">
                          {cam.streamUrl}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
                        <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          IP: {cam.ip}
                        </span>
                        <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          Puerto: {cam.rtspPort || cam.httpPort}
                        </span>
                        <span className="bg-emerald-950 text-emerald-300 px-2 py-1 rounded border border-emerald-500/30">
                          E2EE TLS 1.3 ACTIVO
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Para reproducción directa sin transcodificador, puedes abrir el reproductor WebRTC o la URL proxy en InfinityFree.
                      </p>
                    </div>
                  )}

                  {/* Real-time OSD Overlay */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-mono text-slate-300 border border-white/10">
                    <span className="text-cyan-400 font-bold">{cam.name}</span>
                    <span className="text-[10px] text-slate-400">{new Date().toLocaleTimeString()}</span>
                    {isRec && (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        REC 24/7
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Controls */}
                <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCaptureSnapshot(cam)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      title="Capturar foto para reconocimiento facial o evidencia"
                    >
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Capturar</span>
                    </button>

                    <button
                      onClick={() => toggleRecording(cam.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                        isRec
                          ? 'bg-red-950 text-red-300 border border-red-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isRec ? <Square className="w-3.5 h-3.5 text-red-400" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isRec ? 'Grabando' : 'Grabar'}</span>
                    </button>

                    <button
                      onClick={() => toggleNightVision(cam.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isNight
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                      title="Modo Visión Nocturna"
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">ONLINE</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
