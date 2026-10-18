import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBiometricSimilarity,
  matchFaceAgainstDatabase,
  generateBiometricHash,
  formatPersonalizedAlert,
} from './facialBiometrics.ts';
import type { FaceProfile } from './facialBiometrics.ts';

test('calculateBiometricSimilarity gives 1 for identical vectors and decreases with difference', () => {
  const vec1 = [0.1, 0.5, 0.8, 0.3];
  const identical = [0.1, 0.5, 0.8, 0.3];
  const different = [0.9, 0.1, 0.0, 0.8];

  const scoreIdentical = calculateBiometricSimilarity(vec1, identical);
  assert.ok(Math.abs(scoreIdentical - 1.0) < 0.0001);

  const scoreDiff = calculateBiometricSimilarity(vec1, different);
  assert.ok(scoreDiff < 0.8);
});

test('matchFaceAgainstDatabase correctly identifies AUTHORIZED profile and BLOCKED profile', () => {
  const profiles: FaceProfile[] = [
    {
      id: 'profile-1',
      name: 'Carlos Vega',
      category: 'AUTHORIZED',
      roleDescription: 'Propietario / Admin',
      registeredAt: Date.now(),
      encryptedBiometricHash: 'HASH1',
      biometricVector: [0.2, 0.4, 0.6, 0.8],
      accessAllowed: true,
      notifyOnDetection: true,
    },
    {
      id: 'profile-2',
      name: 'Sospechoso Reportado',
      category: 'BLOCKED',
      roleDescription: 'Intruso en Lista Negra',
      registeredAt: Date.now(),
      encryptedBiometricHash: 'HASH2',
      biometricVector: [0.8, 0.8, 0.1, 0.1],
      accessAllowed: false,
      notifyOnDetection: true,
    },
  ];

  // Test matching Carlos
  const probeCarlos = [0.21, 0.39, 0.61, 0.79];
  const resultCarlos = matchFaceAgainstDatabase(probeCarlos, profiles, 0.9);
  assert.equal(resultCarlos.status, 'AUTHORIZED');
  assert.equal(resultCarlos.matchedProfile?.name, 'Carlos Vega');

  // Test matching Blocked person
  const probeBlocked = [0.81, 0.79, 0.12, 0.09];
  const resultBlocked = matchFaceAgainstDatabase(probeBlocked, profiles, 0.9);
  assert.equal(resultBlocked.status, 'BLOCKED');
  assert.equal(resultBlocked.matchedProfile?.name, 'Sospechoso Reportado');

  // Test unknown person
  const probeUnknown = [0.0, 0.1, 0.9, 0.1];
  const resultUnknown = matchFaceAgainstDatabase(probeUnknown, profiles, 0.95);
  assert.equal(resultUnknown.status, 'UNKNOWN');
  assert.equal(resultUnknown.matchedProfile, null);
});

test('formatPersonalizedAlert generates appropriate notification text and severity', () => {
  const alertBlocked = formatPersonalizedAlert(
    {
      matchedProfile: {
        id: '1',
        name: 'Persona No Autorizada',
        category: 'BLOCKED',
        roleDescription: 'Bloqueado',
        registeredAt: Date.now(),
        encryptedBiometricHash: 'H',
        biometricVector: [],
        accessAllowed: false,
        notifyOnDetection: true,
      },
      status: 'BLOCKED',
      highestScore: 0.94,
    },
    'Cámara Cochera'
  );

  assert.equal(alertBlocked.severity, 'danger');
  assert.ok(alertBlocked.body.includes('Persona BLOQUEADA'));
  assert.ok(alertBlocked.body.includes('Cámara Cochera'));

  const alertUnknown = formatPersonalizedAlert(
    {
      matchedProfile: null,
      status: 'UNKNOWN',
      highestScore: 0.4,
    },
    'Cámara Principal'
  );
  assert.equal(alertUnknown.severity, 'warning');
});

test('generateBiometricHash creates secure prefixed identifier', () => {
  const hash = generateBiometricHash([0.1, 0.2, 0.3, 0.4]);
  assert.ok(hash.startsWith('E2EE-BIO-AES256-'));
  assert.ok(hash.endsWith('-4D'));
});
