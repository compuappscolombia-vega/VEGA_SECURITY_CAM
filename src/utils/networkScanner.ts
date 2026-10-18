/**
 * VEGA SECURITY CAM - Network Scanner & Manufacturer Protocol Registry
 * Handles automatic IP subnet scanning, camera WiFi discovery,
 * and port identification specific to camera manufacturers (Hikvision, Dahua, Axis, TP-Link Tapo, etc.).
 */

export interface CameraManufacturerSpec {
  brand: string;
  defaultRtspPort: number;
  defaultHttpPort: number;
  defaultOnvifPort: number;
  rtspPathPattern: string; // e.g. /h264Preview_01_main or /live/ch0
  supportedCodecs: ('H.264' | 'H.265' | 'MJPEG')[];
  defaultUsername: string;
}

export const KNOWN_MANUFACTURERS: Record<string, CameraManufacturerSpec> = {
  hikvision: {
    brand: 'Hikvision',
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    defaultOnvifPort: 8000,
    rtspPathPattern: '/Streaming/Channels/101',
    supportedCodecs: ['H.264', 'H.265', 'MJPEG'],
    defaultUsername: 'admin',
  },
  dahua: {
    brand: 'Dahua / Imou',
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    defaultOnvifPort: 80,
    rtspPathPattern: '/cam/realmonitor?channel=1&subtype=0',
    supportedCodecs: ['H.264', 'H.265'],
    defaultUsername: 'admin',
  },
  axis: {
    brand: 'Axis Communications',
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    defaultOnvifPort: 8080,
    rtspPathPattern: '/axis-media/media.amp',
    supportedCodecs: ['H.264', 'H.265', 'MJPEG'],
    defaultUsername: 'root',
  },
  tplink_tapo: {
    brand: 'TP-Link Tapo',
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    defaultOnvifPort: 2020,
    rtspPathPattern: '/stream1',
    supportedCodecs: ['H.264'],
    defaultUsername: 'admin',
  },
  foscam: {
    brand: 'Foscam',
    defaultRtspPort: 554,
    defaultHttpPort: 88,
    defaultOnvifPort: 888,
    rtspPathPattern: '/videoMain',
    supportedCodecs: ['H.264', 'MJPEG'],
    defaultUsername: 'admin',
  },
  ezviz_tuya: {
    brand: 'EZVIZ / Tuya Smart',
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    defaultOnvifPort: 8000,
    rtspPathPattern: '/live/ch0',
    supportedCodecs: ['H.264', 'H.265'],
    defaultUsername: 'admin',
  },
  generic_onvif: {
    brand: 'Genérica ONVIF / RTSP',
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    defaultOnvifPort: 8899,
    rtspPathPattern: '/live/ch0',
    supportedCodecs: ['H.264', 'MJPEG'],
    defaultUsername: 'admin',
  },
};

export interface DiscoveredCamera {
  id: string;
  ip: string;
  mac: string;
  hostname: string;
  brandKey: string;
  brandName: string;
  model: string;
  connectionType: 'LAN_ETHERNET' | 'WIFI_AP' | 'WIFI_CLIENT';
  rtspPort: number;
  httpPort: number;
  onvifPort: number;
  protocol: 'ONVIF' | 'RTSP' | 'WebRTC' | 'MJPEG';
  streamUrl: string;
  status: 'ONLINE' | 'OFFLINE' | 'AUTH_REQUIRED' | 'CONNECTED';
  signalStrengthDbm?: number; // For WiFi cameras (-40 to -90 dBm)
  fps: number;
  resolution: string;
}

/**
 * Identifies camera manufacturer based on open ports, MAC address OUI, or hostname.
 */
export function identifyManufacturer(
  openPort: number,
  hostname: string = '',
  mac: string = ''
): { brandKey: string; spec: CameraManufacturerSpec } {
  const normHost = hostname.toLowerCase();
  const normMac = mac.toUpperCase();

  if (normHost.includes('tapo') || openPort === 2020) {
    return { brandKey: 'tplink_tapo', spec: KNOWN_MANUFACTURERS.tplink_tapo };
  }
  if (normHost.includes('hikvision') || normHost.includes('hik') || openPort === 8000) {
    return { brandKey: 'hikvision', spec: KNOWN_MANUFACTURERS.hikvision };
  }
  if (normHost.includes('dahua') || normHost.includes('imou') || normMac.startsWith('38:AF:29')) {
    return { brandKey: 'dahua', spec: KNOWN_MANUFACTURERS.dahua };
  }
  if (normHost.includes('axis') || openPort === 8080 || normMac.startsWith('00:40:8C')) {
    return { brandKey: 'axis', spec: KNOWN_MANUFACTURERS.axis };
  }
  if (normHost.includes('foscam') || openPort === 888 || openPort === 88) {
    return { brandKey: 'foscam', spec: KNOWN_MANUFACTURERS.foscam };
  }
  if (normHost.includes('ezviz') || normHost.includes('tuya')) {
    return { brandKey: 'ezviz_tuya', spec: KNOWN_MANUFACTURERS.ezviz_tuya };
  }

  return { brandKey: 'generic_onvif', spec: KNOWN_MANUFACTURERS.generic_onvif };
}

/**
 * Constructs the stream RTSP / WebRTC URL based on credentials and manufacturer.
 */
export function buildStreamUrl(
  ip: string,
  brandKey: string,
  user: string = 'admin',
  pass: string = 'admin123',
  customPort?: number
): string {
  const spec = KNOWN_MANUFACTURERS[brandKey] || KNOWN_MANUFACTURERS.generic_onvif;
  const port = customPort || spec.defaultRtspPort;
  return `rtsp://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${ip}:${port}${spec.rtspPathPattern}`;
}

/**
 * Validates IPv4 address string.
 */
export function isValidIp(ip: string): boolean {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const num = Number(p);
    return !isNaN(num) && num >= 0 && num <= 255 && String(num) === p;
  });
}
