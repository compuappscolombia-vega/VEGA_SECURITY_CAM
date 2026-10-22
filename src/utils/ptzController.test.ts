import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PTZ_STATE,
  applyPtzMovement,
  getPtzCssTransform,
  formatOnvifPtzCommand,
  type PtzState,
} from './ptzController.ts';

test('DEFAULT_PTZ_STATE initializes at zero offset and 1.0x zoom', () => {
  assert.equal(DEFAULT_PTZ_STATE.pan, 0);
  assert.equal(DEFAULT_PTZ_STATE.tilt, 0);
  assert.equal(DEFAULT_PTZ_STATE.zoom, 1.0);
  assert.equal(DEFAULT_PTZ_STATE.step, 5);
});

test('applyPtzMovement handles ZOOM_IN and ZOOM_OUT within 1.0x to 5.0x limits', () => {
  let state: PtzState = { ...DEFAULT_PTZ_STATE };

  // Zoom in
  state = applyPtzMovement(state, 'ZOOM_IN');
  assert.equal(state.zoom, 1.25);

  state = applyPtzMovement(state, 'ZOOM_IN');
  assert.equal(state.zoom, 1.5);

  // Zoom out
  state = applyPtzMovement(state, 'ZOOM_OUT');
  assert.equal(state.zoom, 1.25);

  state = applyPtzMovement(state, 'ZOOM_OUT');
  assert.equal(state.zoom, 1.0);

  // Cannot zoom out below 1.0x
  state = applyPtzMovement(state, 'ZOOM_OUT');
  assert.equal(state.zoom, 1.0);
});

test('applyPtzMovement pans and tilts within boundaries when zoomed in', () => {
  // At 2.0x zoom, maxOffset = (2.0 - 1) * 25 = 25%
  let state: PtzState = { pan: 0, tilt: 0, zoom: 2.0, step: 10 };

  state = applyPtzMovement(state, 'RIGHT');
  assert.equal(state.pan, 10);

  state = applyPtzMovement(state, 'RIGHT');
  assert.equal(state.pan, 20);

  state = applyPtzMovement(state, 'RIGHT');
  assert.equal(state.pan, 25); // Clamped to maxOffset 25

  state = applyPtzMovement(state, 'LEFT');
  assert.equal(state.pan, 15);

  state = applyPtzMovement(state, 'DOWN');
  assert.equal(state.tilt, 10);

  state = applyPtzMovement(state, 'UP');
  assert.equal(state.tilt, 0);
});

test('applyPtzMovement RESET restores default coordinates', () => {
  const altered: PtzState = { pan: 20, tilt: -15, zoom: 3.5, step: 10 };
  const reset = applyPtzMovement(altered, 'RESET');
  assert.equal(reset.pan, 0);
  assert.equal(reset.tilt, 0);
  assert.equal(reset.zoom, 1.0);
});

test('getPtzCssTransform returns valid CSS scale and translate', () => {
  const ptz: PtzState = { pan: 12.5, tilt: -5, zoom: 2.0, step: 5 };
  const css = getPtzCssTransform(ptz);
  assert.equal(css, 'scale(2) translate(-12.5%, 5%)');
});

test('formatOnvifPtzCommand creates correct ONVIF URL and normalized payload', () => {
  const ptz: PtzState = { pan: 25, tilt: -25, zoom: 2.5, step: 5 };
  const cmd = formatOnvifPtzCommand('192.168.1.120', ptz);

  assert.equal(cmd.url, 'http://192.168.1.120/onvif/ptz_service');
  assert.equal(cmd.payload.panNormalized, 0.5);
  assert.equal(cmd.payload.tiltNormalized, -0.5);
  assert.equal(cmd.payload.zoomLevel, 2.5);
});
