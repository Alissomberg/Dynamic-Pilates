import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zello-cloud-test-'));
process.env.DB_PATH = path.join(testRoot, 'zello.db');
process.env.STORAGE_PATH = path.join(testRoot, 'storage');
process.env.RELEASES_PATH = path.join(testRoot, 'releases');
process.env.TOKEN_PEPPER = 'integration-test-pepper';
process.env.BACKUP_ENCRYPTION_KEY = 'integration-test-encryption-key';

const [{ buildServer }, { db, initDatabase }, { createAccountToken, createRestoreCode }] = await Promise.all([
  import('../src/app.js'),
  import('../src/db/db.js'),
  import('../src/services/cloudService.js')
]);

initDatabase();
const server = await buildServer({ logger: false });
await server.ready();

after(async () => {
  await server.close();
  db.close();
  fs.rmSync(testRoot, { recursive: true, force: true });
});

test('token autentica, envia backup e restaura com código de uso único', async () => {
  const account = createAccountToken('Cliente de teste');
  const authorization = { authorization: `Bearer ${account.token}` };

  const authResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/auth/validate',
    headers: authorization
  });
  assert.equal(authResponse.statusCode, 200);
  assert.equal(authResponse.json().account.support.tier, 'premium');

  const backup = {
    app: 'Zello',
    backupFormat: 2,
    exportedAt: new Date().toISOString(),
    database: { encrypted: false, mode: 'full', tables: [] }
  };
  const uploadResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/backups',
    headers: authorization,
    payload: { backup, deviceId: 'test-device', appVersion: '1.1.0' }
  });
  assert.equal(uploadResponse.statusCode, 201);
  assert.ok(uploadResponse.json().backup.id);

  const restore = createRestoreCode(account.id);
  const restoreResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/backups/restore',
    headers: authorization,
    payload: { code: restore.code }
  });
  assert.equal(restoreResponse.statusCode, 200);
  assert.deepEqual(restoreResponse.json().backup, backup);

  const repeatedResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/backups/restore',
    headers: authorization,
    payload: { code: restore.code }
  });
  assert.equal(repeatedResponse.statusCode, 403);
});

test('token inválido não acessa a nuvem', async () => {
  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/backups/status',
    headers: { authorization: 'Bearer token-invalido' }
  });
  assert.equal(response.statusCode, 401);
});

test('API anuncia a versão mais recente e fornece URL do APK', async () => {
  const account = createAccountToken('Cliente de atualização');
  fs.mkdirSync(process.env.RELEASES_PATH, { recursive: true });
  fs.writeFileSync(path.join(process.env.RELEASES_PATH, 'release.json'), JSON.stringify({
    version: '1.2.0',
    versionCode: 3,
    notes: 'Versão de teste',
    fileName: 'zello-1.2.0.apk',
    sizeBytes: 123,
    sha256: 'abc',
    publishedAt: new Date().toISOString()
  }));

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/updates/latest',
    headers: { authorization: `Bearer ${account.token}`, host: 'zello.test' }
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().release.versionCode, 3);
  assert.equal(response.json().release.downloadUrl, 'http://zello.test/downloads/zello-1.2.0.apk');
});
