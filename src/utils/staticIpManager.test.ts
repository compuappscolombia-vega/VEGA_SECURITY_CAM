import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStaticIpConfig,
  createActiveCameraFromStaticIp,
  filterSelectedTransmissionCameras,
} from './staticIpManager.ts';
import type { StaticIpConfig } from './staticIpManager.ts';
import type { ActiveCamera } from '../types/security.ts';

test('validateStaticIpConfig catches invalid IP or missing name', () => {
  const invalid = validateStaticIpConfig({
    name: '',
    ip: '999.999.999.999',
    port: 554,
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.length >= 2);

  const valid = validateStaticIpConfig({
    name: 'Cámara Patio',
    ip: '192.168.1.105',
    port: 554,
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);
});

test('createActiveCameraFromStaticIp sets up correct streamUrl and real mode', () => {
  const config: StaticIpConfig = {
    id: 'cfg-1',
    name: 'Cámara Cableada',
    ip: '192.168.1.50',
    port: 554,
    protocol: 'RTSP',
    path: '/live/ch0',
    brand: 'hikvision',
    username: 'admin',
    password: 'password123',
    isEnabled: true,
    notes: 'Conectada al repetidor por cable',
  };

  const cam = createActiveCameraFromStaticIp(config);
  assert.equal(cam.id, 'cfg-1');
  assert.equal(cam.ip, '192.168.1.50');
  assert.equal(cam.isRealMode, true);
  assert.ok(cam.streamUrl.startsWith('rtsp://admin:password123@192.168.1.50:554/'));
});

test('createActiveCameraFromStaticIp creates proper MJPEG URL', () => {
  const configMjpeg: StaticIpConfig = {
    id: 'cfg-2',
    name: 'Dron / ESP32',
    ip: '192.168.4.1',
    port: 81,
    protocol: 'MJPEG',
    path: '/stream',
    brand: 'generic_onvif',
    isEnabled: true,
  };

  const camMjpeg = createActiveCameraFromStaticIp(configMjpeg);
  assert.equal(camMjpeg.streamUrl, 'http://192.168.4.1:81/stream');
});

test('filterSelectedTransmissionCameras only returns cameras present in selectedIds', () => {
  const cams: ActiveCamera[] = [
    { id: 'cam-1', name: 'Cam 1' } as ActiveCamera,
    { id: 'cam-2', name: 'Cam 2' } as ActiveCamera,
    { id: 'cam-3', name: 'Cam 3' } as ActiveCamera,
  ];

  const selected = filterSelectedTransmissionCameras(cams, ['cam-2']);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, 'cam-2');

  const none = filterSelectedTransmissionCameras(cams, []);
  assert.equal(none.length, 0);
});
