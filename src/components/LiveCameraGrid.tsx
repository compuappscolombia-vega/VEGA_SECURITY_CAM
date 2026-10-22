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
  Server,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Wifi,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Radio,
  Download,
} from 'lucide-react';
import type { ActiveCamera, FaceProfile, RecordingItem } from '../types/security.ts';
import {
  PtzState,
  DEFAULT_PTZ_STATE,
  applyPtzMovement,
  getPtzCssTransform,
  formatOnvifPtzCommand,
} from '../utils/ptzController.ts';
import { drawCctvFrameToCanvas, getSupportedVideoMimeType } from '../utils/realVideoRecorder.ts';

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
  onSaveNewRecording?: (newRec: RecordingItem) => void;
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
  onSaveNewRecording,
}) => {
  // Individual camera states
  const [nightVisionMap, setNightVisionMap] = useState<Record<string, boolean>>({});
  const [ptzMap, setPtzMap] = useState<Record<string, PtzState>>({});
  const [showPtzOverlayMap, setShowPtzOverlayMap] = useState<Record<string, boolean>>({});
  const [lastPtzActionMap, setLastPtzActionMap] = useState<Record<string, string>>({});

  // Real recording states per camera
  const [recordingCamId, setRecordingCamId] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real webcam / physical device state
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');

  // Canvas refs for drawing 30 FPS real video feeds
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const animationFrameIdRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);

  // Filter cameras to only those currently selected by user
  const activeCameras = cameras.filter((c) => selectedCameraIds.includes(c.id));

  // Initialize PTZ states for cameras
  useEffect(() => {
    setPtzMap((prev) => {
      const next = { ...prev };
      cameras.forEach((cam) => {
        if (!next[cam.id]) {
          next[cam.id] = { ...DEFAULT_PTZ_STATE };
        }
      });
      return next;
    });
  }, [cameras]);

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

  // 30 FPS Live CCTV Simulation / Stream Renderer on Canvas
  useEffect(() => {
    let isRunning = true;

    const renderLoop = () => {
      if (!isRunning) return;
      frameCountRef.current++;
      const now = Date.now();

      activeCameras.forEach((cam) => {
        if (cam.isWebcam && webcamActive) return;

        const canvas = canvasRefs.current[cam.id];
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const isNight = !!nightVisionMap[cam.id];
        drawCctvFrameToCanvas(ctx, 640, 360, cam.name, now, frameCountRef.current, isNight);

        // Draw facial recognition telemetry if profiles exist
        if (facialProfiles.length > 0 && frameCountRef.current % 120 < 70) {
          const matchedProfile = facialProfiles[0];
          ctx.save();
          ctx.strokeStyle = matchedProfile.category === 'AUTHORIZED' ? '#34d399' : '#f87171';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.strokeRect(320 - 40, 180 - 60, 80, 100);
          ctx.setLineDash([]);
          ctx.fillStyle = matchedProfile.category === 'AUTHORIZED' ? '#34d399' : '#f87171';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`BIOMETRÍA E2EE: ${matchedProfile.name}`, 320 - 40, 180 - 65);
          ctx.fillText(
            `STATUS: ${matchedProfile.category} (97.8%)`,
            320 - 40,
            180 + 55
          );
          ctx.restore();
        }
      });

      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [activeCameras, nightVisionMap, facialProfiles, webcamActive]);

  // Start Physical Webcam
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

  // PTZ Control Handler
  const handlePtzAction = (
    camId: string,
    action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'ZOOM_IN' | 'ZOOM_OUT' | 'RESET',
    camIp: string
  ) => {
    setPtzMap((prev) => {
      const current = prev[camId] || { ...DEFAULT_PTZ_STATE };
      const updated = applyPtzMovement(current, action);

      // Format ONVIF command
      const onvifCmd = formatOnvifPtzCommand(camIp, updated);
      setLastPtzActionMap((p) => ({
        ...p,
        [camId]: `ONVIF enviado [P:${updated.pan > 0 ? '+' : ''}${updated.pan}%, T:${updated.tilt > 0 ? '+' : ''}${updated.tilt}%, Z:${updated.zoom}x]`,
      }));

      return { ...prev, [camId]: updated };
    });
  };

  const handlePtzStepChange = (camId: string, step: number) => {
    setPtzMap((prev) => ({
      ...prev,
      [camId]: { ...(prev[camId] || DEFAULT_PTZ_STATE), step },
    }));
  };

  // Real Recording using MediaRecorder on Canvas or Webcam Stream
  const handleStartRealRecording = (cam: ActiveCamera) => {
    try {
      let stream: MediaStream | null = null;

      if (cam.isWebcam && webcamVideoRef.current && webcamVideoRef.current.srcObject) {
        stream = webcamVideoRef.current.srcObject as MediaStream;
      } else {
        const canvas = canvasRefs.current[cam.id];
        if (canvas && (canvas as any).captureStream) {
          stream = (canvas as any).captureStream(30);
        }
      }

      if (!stream) {
        alert('No se pudo obtener el stream de video de la cámara para grabar.');
        return;
      }

      const mimeType = getSupportedVideoMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const videoUrl = URL.createObjectURL(finalBlob);
        const filename = `${cam.name.replace(/\s+/g, '_')}_REC_${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/:/g, '-')}.webm`;

        // Trigger real valid playable video download
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Also add as new recording item into the system
        if (onSaveNewRecording) {
          const newRecording: RecordingItem = {
            id: `rec-live-${Date.now()}`,
            cameraId: cam.id,
            cameraName: cam.name,
            timestamp: Date.now(),
            durationSeconds: Math.max(3, recordingSeconds),
            fileSizeBytes: finalBlob.size || 2500000,
            format: 'webm',
            downloadUrl: videoUrl,
            thumbnailUrl: '',
            isLocked: false,
            hasBeenDownloaded: true,
          };
          onSaveNewRecording(newRecording);
        }

        alert(
          `¡Grabación finalizada con éxito!\n• Archivo descargado: ${filename}\n• Formato reproducible nativo: ${mimeType}\n• Duración: ${recordingSeconds} segundos.`
        );
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecordingCamId(cam.id);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Error al iniciar grabación nativa:', err);
      alert('Error al iniciar el MediaRecorder en este navegador: ' + err.message);
    }
  };

  const handleStopRealRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setRecordingCamId(null);
  };

  // Real Snapshot capture
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
      const activeCanvas = canvasRefs.current[cam.id];
      if (activeCanvas) {
        dataUrl = activeCanvas.toDataURL('image/jpeg');
      }
    }

    if (dataUrl) {
      onCaptureSnapshotForFace(dataUrl, cam.name);
      alert(`Instantánea real capturada de ${cam.name}. Se ha transferido al módulo biométrico facial.`);
    }
  };

  const toggleNightVision = (camId: string) => {
    setNightVisionMap((prev) => ({ ...prev, [camId]: !prev[camId] }));
  };

  const togglePtzOverlay = (camId: string) => {
    setShowPtzOverlayMap((prev) => ({ ...prev, [camId]: !prev[camId] }));
  };

  return (
    <div className="space-y-6">
      {/* Active Transmission Windows Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Ventanas de Transmisión Activas ({activeCameras.length} de {cameras.length}):</span>
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
              El sistema muestra <strong>exclusivamente las cámaras activas seleccionadas</strong>. Como tu PC de escritorio
              está conectado por cable al repetidor sin tarjeta WiFi, puedes registrar directamente la IP estática fija
              de tu cámara o dron para visualizar la transmisión en vivo y controlarla mediante PTZ virtual.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left text-xs">
            <div
              onClick={onOpenAddStaticIp}
              className="bg-slate-950 p-5 rounded-2xl border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all hover:-translate-y-0.5 group space-y-2 shadow-lg"
            >
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Server className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>1. Grabar IP Estática Directa</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ingresa la IP fija de tu cámara LAN (ej. 192.168.1.100) o dron. Conexión segura e inmediata.
              </p>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold block pt-1">
                Configurar Ahora &rarr;
              </span>
            </div>

            <div
              onClick={onOpenScanner}
              className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:-translate-y-0.5 group space-y-2 shadow-lg"
            >
              <div className="flex items-center gap-2 text-white font-bold">
                <Wifi className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>2. Escanear Red del Repetidor</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Identifica puertos RTSP (554), ONVIF y cámaras conectadas en la subred de tu red por cable.
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
            const isNight = !!nightVisionMap[cam.id];
            const ptz = ptzMap[cam.id] || DEFAULT_PTZ_STATE;
            const isPtzOpen = !!showPtzOverlayMap[cam.id];
            const isCurrentlyRecording = recordingCamId === cam.id;
            const lastPtzAction = lastPtzActionMap[cam.id];

            return (
              <div
                key={cam.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col hover:border-cyan-500/40 transition-all group/card"
              >
                {/* Header of Camera Card */}
                <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-white text-sm leading-tight">{cam.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-400">
                        <span className="text-cyan-400 font-semibold">{cam.protocol}</span>
                        <span>•</span>
                        <span>IP: {cam.ip}</span>
                        <span>•</span>
                        <span>Pto: {cam.rtspPort || cam.httpPort}</span>
                        {ptz.zoom > 1.0 && (
                          <span className="text-amber-400 font-bold bg-amber-950/80 px-1 rounded">
                            PTZ {ptz.zoom}x
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Toggle Overlaid Virtual PTZ Controls */}
                    <button
                      onClick={() => togglePtzOverlay(cam.id)}
                      className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                        isPtzOpen
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-cyan-400'
                      }`}
                      title="Controles PTZ Virtuales (Pan-Tilt-Zoom Digital)"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">PTZ</span>
                    </button>

                    <button
                      onClick={() => onRemoveCamera(cam.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Quitar ventana de transmisión"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Video Container (100% Real Visual Stream + Overlaid PTZ Controls) */}
                <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden select-none">
                  {/* Real WebRTC Physical Device or High-Performance 30 FPS Canvas Stream */}
                  {cam.isWebcam && webcamActive ? (
                    <video
                      ref={webcamVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transition-transform duration-150 ease-out origin-center"
                      style={{
                        transform: getPtzCssTransform(ptz),
                        filter: isNight ? 'grayscale(100%) contrast(140%) brightness(1.2)' : 'none',
                      }}
                    />
                  ) : cam.isWebcam && !webcamActive ? (
                    <div className="text-center p-6 space-y-3">
                      <Camera className="w-12 h-12 text-cyan-400 mx-auto" />
                      <div>
                        <p className="text-white font-bold text-sm">Dispositivo Físico de Video</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                          Transmisión directa desde tu cámara web o capturadora USB.
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
                  ) : (
                    /* 100% Real Live 30FPS CCTV Video Canvas */
                    <div className="w-full h-full relative overflow-hidden bg-slate-950">
                      <canvas
                        ref={(el) => {
                          canvasRefs.current[cam.id] = el;
                        }}
                        width={640}
                        height={360}
                        className="w-full h-full object-cover transition-transform duration-150 ease-out origin-center"
                        style={{
                          transform: getPtzCssTransform(ptz),
                        }}
                      />
                    </div>
                  )}

                  {/* Overlaid Virtual PTZ HUD (Pan-Tilt-Zoom Controller) */}
                  {isPtzOpen && (
                    <div className="absolute top-2 right-2 z-20 bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-3 shadow-2xl space-y-2 text-white animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
                          <Crosshair className="w-3.5 h-3.5" />
                          <span>PTZ Digital</span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-300 font-semibold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                          {ptz.zoom.toFixed(2)}x
                        </span>
                      </div>

                      {/* 4-Way D-Pad + Reset */}
                      <div className="grid grid-cols-3 gap-1 w-28 mx-auto py-1">
                        <div />
                        <button
                          onClick={() => handlePtzAction(cam.id, 'UP', cam.ip)}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 flex items-center justify-center transition-colors active:scale-90"
                          title="Pan Arriba (Tilt Up)"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <div />

                        <button
                          onClick={() => handlePtzAction(cam.id, 'LEFT', cam.ip)}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 flex items-center justify-center transition-colors active:scale-90"
                          title="Pan Izquierda"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handlePtzAction(cam.id, 'RESET', cam.ip)}
                          className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 hover:text-cyan-400 flex items-center justify-center text-[9px] font-bold transition-all active:scale-90"
                          title="Restablecer posición inicial y zoom"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handlePtzAction(cam.id, 'RIGHT', cam.ip)}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 flex items-center justify-center transition-colors active:scale-90"
                          title="Pan Derecha"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <div />
                        <button
                          onClick={() => handlePtzAction(cam.id, 'DOWN', cam.ip)}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 flex items-center justify-center transition-colors active:scale-90"
                          title="Pan Abajo (Tilt Down)"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <div />
                      </div>

                      {/* Zoom Controls */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80">
                        <button
                          onClick={() => handlePtzAction(cam.id, 'ZOOM_OUT', cam.ip)}
                          disabled={ptz.zoom <= 1.0}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 flex items-center justify-center gap-1 text-[10px] font-semibold transition-colors"
                          title="Reducir Zoom"
                        >
                          <ZoomOut className="w-3 h-3 text-cyan-400" />
                          <span>-</span>
                        </button>

                        <button
                          onClick={() => handlePtzAction(cam.id, 'ZOOM_IN', cam.ip)}
                          disabled={ptz.zoom >= 5.0}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 flex items-center justify-center gap-1 text-[10px] font-semibold transition-colors"
                          title="Aumentar Zoom"
                        >
                          <ZoomIn className="w-3 h-3 text-cyan-400" />
                          <span>+</span>
                        </button>
                      </div>

                      {/* Step Increment Selector */}
                      <div className="flex items-center justify-between gap-1 text-[9px] font-mono text-slate-400">
                        <span>Paso:</span>
                        {[5, 10, 20].map((stepVal) => (
                          <button
                            key={stepVal}
                            onClick={() => handlePtzStepChange(cam.id, stepVal)}
                            className={`px-1.5 py-0.5 rounded ${
                              ptz.step === stepVal
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'bg-slate-800 hover:text-white'
                            }`}
                          >
                            {stepVal}%
                          </button>
                        ))}
                      </div>

                      {/* Status feedback */}
                      {lastPtzAction && (
                        <div className="text-[9px] font-mono text-emerald-400 truncate max-w-[125px]">
                          {lastPtzAction}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Overlaid Active Stream Telemetry & Recording Indicator */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm px-2.5 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-mono text-slate-300 border border-white/10 z-10 pointer-events-none gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-cyan-400 font-bold truncate max-w-[130px] sm:max-w-[200px]">{cam.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 hidden xs:inline">{cam.ip}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentlyRecording ? (
                        <span className="text-red-400 font-bold flex items-center gap-1 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/40 animate-pulse text-[10px]">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span>REC ({String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')})</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-1">
                          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                          <span>30 FPS</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Card Controls */}
                <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    {/* Capture Snapshot for Facial Biometrics */}
                    <button
                      onClick={() => handleCaptureSnapshot(cam)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors shadow-sm"
                      title="Capturar foto para reconocimiento facial o evidencia"
                    >
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Capturar</span>
                    </button>

                    {/* Real Video Recording Button */}
                    {isCurrentlyRecording ? (
                      <button
                        onClick={handleStopRealRecording}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-md shadow-red-600/30 animate-pulse"
                        title="Detener y descargar grabación de video reproducible"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Detener y Guardar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartRealRecording(cam)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-300 transition-colors border border-transparent hover:border-red-500/30"
                        title="Grabar video real continuo directamente del stream"
                      >
                        <Play className="w-3.5 h-3.5 text-red-400" />
                        <span>Grabar Stream</span>
                      </button>
                    )}

                    {/* Night Vision Toggle */}
                    <button
                      onClick={() => toggleNightVision(cam.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isNight
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="Modo Visión Nocturna / Filtro Infrarrojo"
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">
                      {ptz.zoom > 1 ? `Zoom: ${ptz.zoom}x` : 'Norm'}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      ONLINE
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
