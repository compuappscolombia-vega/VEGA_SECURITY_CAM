import test from 'node:test';
import assert from 'node:assert/strict';
import {
  identifyManufacturer,
  buildStreamUrl,
  isValidIp,
} from './networkScanner.ts';

test('identifyManufacturer detects TP-Link Tapo by port 2020 or hostname', () => {
  const byPort = identifyManufacturer(2020);
  assert.equal(byPort.brandKey, 'tplink_tapo');
  assert.equal(byPort.spec.brand, 'TP-Link Tapo');

  const byHost = identifyManufacturer(554, 'Tapo_C200_Cam');
  assert.equal(byHost.brandKey, 'tplink_tapo');
});

test('identifyManufacturer detects Hikvision, Dahua, and Axis', () => {
  assert.equal(identifyManufacturer(8000).brandKey, 'hikvision');
  assert.equal(identifyManufacturer(554, 'Dahua-NVR-Ch1').brandKey, 'dahua');
  assert.equal(identifyManufacturer(8080).brandKey, 'axis');
  assert.equal(identifyManufacturer(888).brandKey, 'foscam');
});

test('buildStreamUrl constructs well-formed RTSP URLs with manufacturer patterns', () => {
  const urlTapo = buildStreamUrl('192.168.1.55', 'tplink_tapo', 'vega', 'pass123');
  assert.equal(urlTapo, 'rtsp://vega:pass123@192.168.1.55:554/stream1');

  const urlHik = buildStreamUrl('192.168.1.100', 'hikvision', 'admin', '12345');
  assert.equal(urlHik, 'rtsp://admin:12345@192.168.1.100:554/Streaming/Channels/101');
});

test('isValidIp validates IPv4 notation correctly', () => {
  assert.equal(isValidIp('192.168.1.1'), true);
  assert.equal(isValidIp('10.0.0.254'), true);
  assert.equal(isValidIp('256.0.0.1'), false);
  assert.equal(isValidIp('192.168.1'), false);
  assert.equal(isValidIp('abc.def.ghi.jkl'), false);
});
