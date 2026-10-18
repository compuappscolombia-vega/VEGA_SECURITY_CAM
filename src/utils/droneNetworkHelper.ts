/**
 * VEGA SECURITY CAM - Drone & Local Repeater Network Diagnostics Helper
 * Diagnoses network topology between PC (cable to repeater), LAN cameras,
 * and isolated WiFi Access Points emitted by drones.
 */

export interface NetworkTopologyAnalysis {
  pcConnectionType: 'ETHERNET_TO_REPEATER';
  repeaterBridged: boolean;
  lanCameraReachable: boolean;
  droneReachableDirectly: boolean;
  recommendedAction: string;
  droneCommonIps: { brand: string; defaultIp: string; defaultPort: number; protocol: string; defaultUrl: string }[];
}

export const COMMON_DRONE_CAMERA_PRESETS = [
  {
    brand: 'Dron WiFi FPV Genérico / Syma / Hubsan',
    defaultIp: '192.168.10.1',
    defaultPort: 554,
    protocol: 'RTSP',
    defaultUrl: 'rtsp://192.168.10.1:554/live/ch0',
    notes: 'Requiere conectar el adaptador WiFi de la PC a la red del dron o usar puente.'
  },
  {
    brand: 'Dron / Cámara ESP32-CAM / Mini FPV',
    defaultIp: '192.168.4.1',
    defaultPort: 81,
    protocol: 'MJPEG over HTTP',
    defaultUrl: 'http://192.168.4.1:81/stream',
    notes: 'Transmisión directa por navegador sin latencia vía HTTP MJPEG.'
  },
  {
    brand: 'Dron DJI Tello / SDK Stream',
    defaultIp: '192.168.10.1',
    defaultPort: 8889,
    protocol: 'UDP / H.264',
    defaultUrl: 'udp://@:11111',
    notes: 'Emite stream UDP tras comando SDK "command" y "streamon".'
  },
  {
    brand: 'Cámara IP Doméstica en Repetidor (Hikvision / Tapo / Dahua)',
    defaultIp: '192.168.1.100',
    defaultPort: 554,
    protocol: 'RTSP / ONVIF',
    defaultUrl: 'rtsp://admin:admin123@192.168.1.100:554/stream1',
    notes: 'Está en la misma subred que la PC conectada al repetidor.'
  }
];

/**
 * Analyzes the user network topology.
 * If PC is on Ethernet from Repeater, it shares the router subnet with the LAN camera,
 * but CANNOT see an isolated Drone WiFi AP unless bridged or connected via a second WiFi card.
 */
export function analyzeTopology(hasSecondWifiAdapter: boolean, isDroneInStaMode: boolean): NetworkTopologyAnalysis {
  let droneReachable = false;
  let recommendedAction = '';

  if (isDroneInStaMode) {
    droneReachable = true;
    recommendedAction = 'Dron en modo cliente (STA): Comparte la misma red WiFi del repetidor y es accesible directamente por la PC.';
  } else if (hasSecondWifiAdapter) {
    droneReachable = true;
    recommendedAction = 'PC con 2 adaptadores (Cable + WiFi): Conecte el WiFi a la red del dron y mantenga el cable al repetidor para internet.';
  } else {
    droneReachable = false;
    recommendedAction = 'El dron emite su propia red WiFi aislada. Para verlo desde la PC por cable: configure el dron en modo STA hacia su repetidor, o use un adaptador USB WiFi en su PC para asociarse a la red del dron.';
  }

  return {
    pcConnectionType: 'ETHERNET_TO_REPEATER',
    repeaterBridged: true,
    lanCameraReachable: true,
    droneReachableDirectly: droneReachable,
    recommendedAction,
    droneCommonIps: COMMON_DRONE_CAMERA_PRESETS,
  };
}

/**
 * Validates whether an entered video URL is a valid real stream source.
 */
export function validateRealStreamSource(url: string): {
  isValid: boolean;
  type: 'WEBRTC' | 'MJPEG_HTTP' | 'HLS' | 'RTSP_TCP' | 'UNKNOWN';
  error?: string;
} {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: false, type: 'UNKNOWN', error: 'URL de transmisión requerida' };
  }

  if (trimmed.startsWith('webrtc://') || trimmed.includes('/webrtc') || trimmed.startsWith('wss://') || trimmed.startsWith('ws://')) {
    return { isValid: true, type: 'WEBRTC' };
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.endsWith('.m3u8')) {
      return { isValid: true, type: 'HLS' };
    }
    // HTTP MJPEG or snapshot endpoint
    return { isValid: true, type: 'MJPEG_HTTP' };
  }

  if (trimmed.startsWith('rtsp://')) {
    return { isValid: true, type: 'RTSP_TCP' };
  }

  return {
    isValid: false,
    type: 'UNKNOWN',
    error: 'Protocolo no reconocido. Use http:// (MJPEG/HLS), rtsp:// (RTSP) o webrtc://',
  };
}
