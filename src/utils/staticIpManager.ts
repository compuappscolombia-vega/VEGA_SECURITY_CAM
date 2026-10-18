/**
 * VEGA SECURITY CAM - Static IP & Camera Registry Manager
 * Manages direct persistent static IP connections for desktop PCs without WiFi adapter,
 * ensuring seamless LAN communication through Ethernet/repeater bridges.
 */

import type { ActiveCamera } from '../types/security.ts';
import { KNOWN_MANUFACTURERS, buildStreamUrl, isValidIp } from './networkScanner.ts';

export interface StaticIpConfig {
  id: string;
  name: string;
  ip: string;
  port: number;
  protocol: 'RTSP' | 'ONVIF' | 'MJPEG' | 'WebRTC';
  path: string;
  brand: string;
  username?: string;
  password?: string;
  isEnabled: boolean;
  notes?: string;
}

export const STORAGE_KEY_STATIC_CAMERAS = 'vega_static_cameras_v1';

/**
 * Validates a static IP camera configuration entry.
 */
export function validateStaticIpConfig(config: Partial<StaticIpConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('El nombre de la cámara es obligatorio');
  }

  if (!config.ip || !isValidIp(config.ip.trim())) {
    errors.push('La dirección IP debe tener un formato IPv4 válido (ej. 192.168.1.100)');
  }

  if (!config.port || isNaN(config.port) || config.port < 1 || config.port > 65535) {
    errors.push('El puerto debe ser un número válido entre 1 y 65535');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Converts a static IP configuration into an ActiveCamera transmission instance.
 */
export function createActiveCameraFromStaticIp(config: StaticIpConfig): ActiveCamera {
  const spec = KNOWN_MANUFACTURERS[config.brand] || KNOWN_MANUFACTURERS.generic_onvif;
  
  let streamUrl = '';
  if (config.protocol === 'MJPEG') {
    const cleanPath = config.path.startsWith('/') ? config.path : `/${config.path}`;
    streamUrl = `http://${config.ip}:${config.port}${cleanPath || '/stream'}`;
  } else if (config.protocol === 'WebRTC') {
    streamUrl = `webrtc://${config.ip}:${config.port}${config.path || '/live'}`;
  } else {
    streamUrl = buildStreamUrl(
      config.ip,
      config.brand,
      config.username || 'admin',
      config.password || '',
      config.port
    );
  }

  return {
    id: config.id,
    name: config.name,
    location: config.notes || 'Conexión IP Estática por Cable',
    ip: config.ip,
    rtspPort: config.protocol === 'RTSP' ? config.port : spec.defaultRtspPort,
    onvifPort: config.protocol === 'ONVIF' ? config.port : spec.defaultOnvifPort,
    httpPort: config.protocol === 'MJPEG' ? config.port : spec.defaultHttpPort,
    brand: spec.brand,
    model: `${spec.brand} IP Estática`,
    protocol: config.protocol,
    streamUrl,
    status: 'ONLINE',
    fps: 30,
    resolution: '1920x1080 (FHD)',
    bitrateKbps: 3000,
    connectionType: 'LAN',
    isNightVision: false,
    ptzSupport: config.brand === 'tplink_tapo',
    isRealMode: true,
    realStreamUrl: streamUrl,
  };
}

/**
 * Filters the active transmission windows to only show those currently selected/enabled.
 */
export function filterSelectedTransmissionCameras(
  cameras: ActiveCamera[],
  selectedIds: string[]
): ActiveCamera[] {
  if (selectedIds.length === 0) return [];
  const idSet = new Set(selectedIds);
  return cameras.filter((cam) => idSet.has(cam.id));
}
