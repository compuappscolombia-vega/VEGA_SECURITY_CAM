import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMediaRecorderSupported,
  getSupportedVideoMimeType,
  createRealPlayableVideoBlob,
} from './realVideoRecorder.ts';

test('isMediaRecorderSupported returns boolean without throwing', () => {
  const supported = isMediaRecorderSupported();
  assert.equal(typeof supported, 'boolean');
});

test('getSupportedVideoMimeType returns valid video MIME type', () => {
  const mime = getSupportedVideoMimeType();
  assert.match(mime, /^video\/(webm|mp4)/);
});

test('createRealPlayableVideoBlob returns Blob with video mime type', async () => {
  const blob = await createRealPlayableVideoBlob('CAM-TEST-REPETIDOR', Date.now(), 1);
  assert.ok(blob);
  assert.equal(blob.type, 'video/webm');
  assert.ok(blob.size > 0);
});
