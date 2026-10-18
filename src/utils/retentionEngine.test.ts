import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isRecordingExpired,
  calculateDaysRemaining,
  isDownloadRecommended,
  purgeExpiredRecordings,
  calculateStorageMetrics,
  formatBytes,
  ONE_DAY_MS,
} from './retentionEngine.ts';
import type { RecordingItem } from './retentionEngine.ts';

test('isRecordingExpired correctly detects recordings older than retention window', () => {
  const now = 1700000000000;
  const retentionDays = 9;

  // 10 days old -> Expired
  const tenDaysOld = now - 10 * ONE_DAY_MS;
  assert.equal(isRecordingExpired(tenDaysOld, retentionDays, now), true);

  // 8 days old -> NOT expired under 9 days rule
  const eightDaysOld = now - 8 * ONE_DAY_MS;
  assert.equal(isRecordingExpired(eightDaysOld, retentionDays, now), false);

  // Exactly 9 days old -> Expired
  const exactNineDaysOld = now - 9 * ONE_DAY_MS;
  assert.equal(isRecordingExpired(exactNineDaysOld, retentionDays, now), true);
});

test('calculateDaysRemaining computes days left before purge', () => {
  const now = 1700000000000;
  const retentionDays = 10;

  // 7 days old -> 3 days remaining
  const sevenDaysOld = now - 7 * ONE_DAY_MS;
  assert.equal(calculateDaysRemaining(sevenDaysOld, retentionDays, now), 3);

  // 11 days old -> 0 days remaining (expired)
  const elevenDaysOld = now - 11 * ONE_DAY_MS;
  assert.equal(calculateDaysRemaining(elevenDaysOld, retentionDays, now), 0);
});

test('isDownloadRecommended flags recordings approaching the final 24 hours', () => {
  const now = 1700000000000;
  const retentionDays = 8;

  // 7.5 days old -> 0.5 days remaining (recommended to download!)
  const almostExpired = now - 7.5 * ONE_DAY_MS;
  assert.equal(isDownloadRecommended(almostExpired, retentionDays, now), true);

  // 2 days old -> 6 days remaining (plenty of time)
  const recent = now - 2 * ONE_DAY_MS;
  assert.equal(isDownloadRecommended(recent, retentionDays, now), false);
});

test('purgeExpiredRecordings deletes expired items and preserves locked evidence', () => {
  const now = 1700000000000;
  const retentionDays = 8;

  const mockRecordings: RecordingItem[] = [
    {
      id: 'rec-1',
      cameraId: 'cam-1',
      cameraName: 'Entrada Principal',
      timestamp: now - 9 * ONE_DAY_MS, // expired
      durationSeconds: 3600,
      fileSizeBytes: 500000000,
      format: 'mp4',
    },
    {
      id: 'rec-2-locked',
      cameraId: 'cam-1',
      cameraName: 'Entrada Principal',
      timestamp: now - 9.5 * ONE_DAY_MS, // expired BUT locked
      durationSeconds: 1800,
      fileSizeBytes: 250000000,
      format: 'mp4',
      isLocked: true,
    },
    {
      id: 'rec-3-recent',
      cameraId: 'cam-2',
      cameraName: 'Jardín Trasero',
      timestamp: now - 3 * ONE_DAY_MS, // fresh
      durationSeconds: 3600,
      fileSizeBytes: 500000000,
      format: 'mp4',
    },
  ];

  const result = purgeExpiredRecordings(mockRecordings, retentionDays, now);
  assert.equal(result.purged.length, 1);
  assert.equal(result.purged[0].id, 'rec-1');
  assert.equal(result.freedBytes, 500000000);
  assert.equal(result.retained.length, 2);
  assert.ok(result.retained.some((r) => r.id === 'rec-2-locked'));
  assert.ok(result.retained.some((r) => r.id === 'rec-3-recent'));
});

test('calculateStorageMetrics and formatBytes give accurate values', () => {
  const quota = 1000 * 1024 * 1024; // ~1GB
  const now = 1700000000000;
  const mockRecordings: RecordingItem[] = [
    {
      id: '1',
      cameraId: 'c1',
      cameraName: 'Test',
      timestamp: now - 1 * ONE_DAY_MS,
      durationSeconds: 60,
      fileSizeBytes: 200 * 1024 * 1024,
      format: 'mp4',
    },
  ];

  const metrics = calculateStorageMetrics(mockRecordings, quota, 8, now);
  assert.equal(metrics.recordingsCount, 1);
  assert.equal(metrics.usedPercentage, 20);
  assert.equal(formatBytes(1024 * 1024), '1 MB');
});
