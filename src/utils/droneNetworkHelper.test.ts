import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTopology,
  validateRealStreamSource,
  COMMON_DRONE_CAMERA_PRESETS,
} from './droneNetworkHelper.ts';

test('analyzeTopology flags drone unreachable without second wifi or sta mode', () => {
  const topoIsolated = analyzeTopology(false, false);
  assert.equal(topoIsolated.lanCameraReachable, true);
  assert.equal(topoIsolated.droneReachableDirectly, false);
  assert.ok(topoIsolated.recommendedAction.includes('El dron emite su propia red WiFi'));

  const topoWithAdapter = analyzeTopology(true, false);
  assert.equal(topoWithAdapter.droneReachableDirectly, true);

  const topoSta = analyzeTopology(false, true);
  assert.equal(topoSta.droneReachableDirectly, true);
});

test('validateRealStreamSource detects RTSP, MJPEG, HLS, and WebRTC protocols', () => {
  assert.equal(validateRealStreamSource('rtsp://admin:pass@192.168.1.108:554/ch1').type, 'RTSP_TCP');
  assert.equal(validateRealStreamSource('http://192.168.4.1:81/stream').type, 'MJPEG_HTTP');
  assert.equal(validateRealStreamSource('http://192.168.1.50/live.m3u8').type, 'HLS');
  assert.equal(validateRealStreamSource('webrtc://192.168.1.100/live').type, 'WEBRTC');
  assert.equal(validateRealStreamSource('ftp://invalid').isValid, false);
});

test('COMMON_DRONE_CAMERA_PRESETS contains default IPs for FPV, ESP32-CAM, and Tello', () => {
  assert.ok(COMMON_DRONE_CAMERA_PRESETS.length >= 3);
  assert.ok(COMMON_DRONE_CAMERA_PRESETS.some((p) => p.defaultIp === '192.168.10.1'));
  assert.ok(COMMON_DRONE_CAMERA_PRESETS.some((p) => p.defaultIp === '192.168.4.1'));
});
