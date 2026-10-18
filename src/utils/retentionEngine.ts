/**
 * VEGA SECURITY CAM - Retention & Storage Management Engine
 * Handles 24/7 continuous recording lifecycle, 8-10 day auto-purge rule,
 * and client download flags before permanent elimination.
 */

export interface RecordingItem {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: number; // Unix timestamp in ms
  durationSeconds: number;
  fileSizeBytes: number;
  format: 'mp4' | 'webm';
  downloadUrl?: string;
  thumbnailUrl?: string;
  isLocked?: boolean; // Client can lock critical evidence so it's not purged
  hasBeenDownloaded?: boolean;
  eventTags?: string[];
}

export interface StorageMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPercentage: number;
  recordingsCount: number;
  expiredCount: number;
  impendingPurgeCount: number; // Will be deleted within 24 hours
}

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Checks if a recording has exceeded the retention threshold (8 to 10 days).
 */
export function isRecordingExpired(
  recordingTimestamp: number,
  retentionDays: number,
  currentTime: number = Date.now()
): boolean {
  if (retentionDays < 1) return false;
  const ageMs = currentTime - recordingTimestamp;
  const maxAgeMs = retentionDays * ONE_DAY_MS;
  return ageMs >= maxAgeMs;
}

/**
 * Calculates remaining days/hours before a recording is permanently deleted.
 * Returns days with decimals (e.g., 1.5 days). If <= 0, it is expired.
 */
export function calculateDaysRemaining(
  recordingTimestamp: number,
  retentionDays: number,
  currentTime: number = Date.now()
): number {
  const maxAgeMs = retentionDays * ONE_DAY_MS;
  const elapsedMs = currentTime - recordingTimestamp;
  const remainingMs = maxAgeMs - elapsedMs;
  return Math.max(0, Number((remainingMs / ONE_DAY_MS).toFixed(2)));
}

/**
 * Indicates if a recording is in the critical download window (within 24 hours of deletion).
 * The client should be prompted to download before permanent deletion.
 */
export function isDownloadRecommended(
  recordingTimestamp: number,
  retentionDays: number,
  currentTime: number = Date.now()
): boolean {
  const daysRemaining = calculateDaysRemaining(recordingTimestamp, retentionDays, currentTime);
  return daysRemaining > 0 && daysRemaining <= 1.0;
}

/**
 * Purges expired recordings according to the 8-10 day retention policy.
 * Preserves locked recordings if the client explicitly flagged them as evidence.
 */
export function purgeExpiredRecordings(
  recordings: RecordingItem[],
  retentionDays: number,
  currentTime: number = Date.now()
): {
  retained: RecordingItem[];
  purged: RecordingItem[];
  freedBytes: number;
} {
  const retained: RecordingItem[] = [];
  const purged: RecordingItem[] = [];
  let freedBytes = 0;

  for (const item of recordings) {
    if (item.isLocked) {
      // Locked recordings are safeguarded from automatic purge
      retained.push(item);
      continue;
    }

    if (isRecordingExpired(item.timestamp, retentionDays, currentTime)) {
      purged.push(item);
      freedBytes += item.fileSizeBytes;
    } else {
      retained.push(item);
    }
  }

  return { retained, purged, freedBytes };
}

/**
 * Computes storage usage and counts for recordings.
 */
export function calculateStorageMetrics(
  recordings: RecordingItem[],
  quotaBytes: number = 100 * 1024 * 1024 * 1024, // Default 100GB
  retentionDays: number = 9,
  currentTime: number = Date.now()
): StorageMetrics {
  let usedBytes = 0;
  let expiredCount = 0;
  let impendingPurgeCount = 0;

  for (const rec of recordings) {
    usedBytes += rec.fileSizeBytes;
    if (isRecordingExpired(rec.timestamp, retentionDays, currentTime)) {
      expiredCount++;
    } else if (isDownloadRecommended(rec.timestamp, retentionDays, currentTime)) {
      impendingPurgeCount++;
    }
  }

  const freeBytes = Math.max(0, quotaBytes - usedBytes);
  const usedPercentage = Math.min(100, Number(((usedBytes / quotaBytes) * 100).toFixed(1)));

  return {
    totalBytes: quotaBytes,
    usedBytes,
    freeBytes,
    usedPercentage,
    recordingsCount: recordings.length,
    expiredCount,
    impendingPurgeCount,
  };
}

/**
 * Formats bytes to human-readable string (KB, MB, GB, TB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
