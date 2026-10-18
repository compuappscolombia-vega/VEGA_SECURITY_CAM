/**
 * VEGA SECURITY CAM - Unified Data Types
 */

import type { FaceProfile, FaceCategory } from '../utils/facialBiometrics.ts';
import type { RecordingItem, StorageMetrics } from '../utils/retentionEngine.ts';
import type { DiscoveredCamera } from '../utils/networkScanner.ts';

export type { FaceProfile, FaceCategory, RecordingItem, StorageMetrics, DiscoveredCamera };

export interface ActiveCamera {
  id: string;
  name: string;
  location: string;
  ip: string;
  rtspPort: number;
  onvifPort: number;
  httpPort: number;
  brand: string;
  model: string;
  protocol: 'WebRTC' | 'RTSP' | 'ONVIF' | 'MJPEG';
  streamUrl: string;
  status: 'ONLINE' | 'OFFLINE' | 'RECORDING' | 'MOTION_DETECTED';
  fps: number;
  resolution: string;
  bitrateKbps: number;
  connectionType: 'LAN' | 'WIFI_AP' | 'WIFI_CLIENT';
  signalStrengthDbm?: number;
  isNightVision: boolean;
  ptzSupport: boolean;
  isWebcam?: boolean;
  isRealMode?: boolean;
  realStreamUrl?: string;
  realDeviceId?: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  cameraId: string;
  cameraName: string;
  type: 'MOTION' | 'FACE_AUTHORIZED' | 'FACE_BLOCKED' | 'FACE_UNKNOWN' | 'CAMERA_DISCONNECTED' | 'PURGE_COMPLETED' | 'TAMPERING';
  severity: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  thumbnailUrl?: string;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface UserSession {
  username: string;
  email: string;
  role: 'superadmin' | 'operator' | 'viewer';
  is2FaVerified: boolean;
  deviceFingerprint: string;
  sessionToken: string;
  loginTime: number;
  e2eeKeyId: string;
}
