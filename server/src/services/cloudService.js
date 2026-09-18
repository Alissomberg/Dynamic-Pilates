import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';
import { config } from '../config/env.js';
import { db } from '../db/db.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export function hashSecret(secret) {
  return crypto.createHmac('sha256', config.tokenPepper).update(String(secret).trim()).digest('hex');
}

function encryptionKey() {
  return crypto.createHash('sha256').update(config.backupEncryptionKey).digest();
}

function encryptBackup(compressed) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  return Buffer.concat([Buffer.from('ZEL1'), iv, cipher.getAuthTag(), encrypted]);
}

function decryptBackup(contents) {
  if (contents.subarray(0, 4).toString('utf8') !== 'ZEL1') throw new Error('Formato de backup armazenado inválido.');
  const iv = contents.subarray(4, 16);
  const tag = contents.subarray(16, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(contents.subarray(32)), decipher.final()]);
}

export function findAccountByToken(token) {
  if (!token) return null;
  return db.prepare(`SELECT id, display_name, token_hint, support_tier, support_active, support_complimentary, created_at
    FROM cloud_accounts WHERE token_hash = ? AND token_active = 1`).get(hashSecret(token)) || null;
}

export function publicAccount(account) {
  return {
    id: account.id,
    name: account.display_name,
    tokenHint: account.token_hint,
    support: {
      tier: account.support_tier,
      active: Boolean(account.support_active),
      complimentary: Boolean(account.support_complimentary)
    }
  };
}

export function createAccountToken(displayName, supportTier = 'premium', complimentary = true) {
  const token = `zel_live_${crypto.randomBytes(24).toString('base64url')}`;
  const account = {
    id: crypto.randomUUID(),
    name: String(displayName || 'Cliente Zello').trim(),
    tokenHint: `${token.slice(0, 12)}…${token.slice(-4)}`,
    supportTier
  };
  db.prepare(`INSERT INTO cloud_accounts
    (id, display_name, token_hash, token_hint, token_active, support_tier, support_active, support_complimentary, created_at)
    VALUES (?, ?, ?, ?, 1, ?, 1, ?, ?)`).run(
    account.id, account.name, hashSecret(token), account.tokenHint, account.supportTier,
    complimentary ? 1 : 0, new Date().toISOString()
  );
  return { ...account, token };
}

export function createRestoreCode(accountId, lifetimeHours = 24) {
  const account = db.prepare('SELECT id, display_name FROM cloud_accounts WHERE id = ?').get(accountId);
  if (!account) throw new Error('Conta não encontrada.');
  const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
  const code = `${raw.slice(0, 5)}-${raw.slice(5)}`;
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + lifetimeHours * 60 * 60 * 1000);
  db.prepare(`INSERT INTO cloud_restore_codes
    (id, account_id, code_hash, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, ?, NULL)`)
    .run(crypto.randomUUID(), accountId, hashSecret(code), createdAt.toISOString(), expiresAt.toISOString());
  return { account, code, expiresAt: expiresAt.toISOString() };
}

function safeAccountDirectory(accountId) {
  return path.join(config.storagePath, 'backups', accountId);
}

export async function saveBackup(account, payload) {
  if (!account.support_active || account.support_tier !== 'premium') {
    const error = new Error('O backup no servidor está disponível para o suporte premium.');
    error.statusCode = 403;
    throw error;
  }
  if (!payload?.backup?.database || !['Zello', 'Dynamic Pilates'].includes(payload.backup.app)) {
    const error = new Error('O conteúdo enviado não é um backup válido do Zello.');
    error.statusCode = 400;
    throw error;
  }

  const serialized = Buffer.from(JSON.stringify(payload.backup), 'utf8');
  if (serialized.byteLength > config.maxBackupBytes) {
    const error = new Error('O backup ultrapassa o tamanho permitido pelo servidor.');
    error.statusCode = 413;
    throw error;
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const relativePath = path.join(account.id, `${createdAt.replace(/[:.]/g, '-')}-${id}.zel`);
  const directory = safeAccountDirectory(account.id);
  const finalPath = path.join(config.storagePath, 'backups', relativePath);
  const temporaryPath = `${finalPath}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporaryPath, encryptBackup(await gzipAsync(serialized)));
  await fs.rename(temporaryPath, finalPath);

  const sha256 = crypto.createHash('sha256').update(serialized).digest('hex');
  db.prepare(`INSERT INTO cloud_backups
    (id, account_id, relative_path, created_at, app_version, device_id, size_bytes, sha256)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    account.id,
    relativePath,
    createdAt,
    String(payload.appVersion || 'desconhecida').slice(0, 32),
    String(payload.deviceId || 'desconhecido').slice(0, 100),
    serialized.byteLength,
    sha256
  );

  const oldBackups = db.prepare(`SELECT id, relative_path FROM cloud_backups
    WHERE account_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET ?`)
    .all(account.id, config.maxBackupsPerAccount);
  for (const old of oldBackups) {
    db.prepare('DELETE FROM cloud_backups WHERE id = ?').run(old.id);
    await fs.rm(path.join(config.storagePath, 'backups', old.relative_path), { force: true });
  }

  return { id, createdAt, sizeBytes: serialized.byteLength, sha256 };
}

export function getBackupStatus(accountId) {
  const row = db.prepare(`SELECT id, created_at, app_version, device_id, size_bytes
    FROM cloud_backups WHERE account_id = ? ORDER BY created_at DESC LIMIT 1`).get(accountId);
  return row ? {
    id: row.id,
    createdAt: row.created_at,
    appVersion: row.app_version,
    deviceId: row.device_id,
    sizeBytes: row.size_bytes
  } : null;
}

export async function restoreLatestBackup(accountId, restoreCode) {
  const now = new Date().toISOString();
  const code = db.prepare(`SELECT id FROM cloud_restore_codes
    WHERE account_id = ? AND code_hash = ? AND used_at IS NULL AND expires_at > ?`)
    .get(accountId, hashSecret(restoreCode), now);
  if (!code) {
    const error = new Error('Código de restauração inválido ou expirado.');
    error.statusCode = 403;
    throw error;
  }
  const backup = db.prepare(`SELECT id, relative_path, created_at FROM cloud_backups
    WHERE account_id = ? ORDER BY created_at DESC LIMIT 1`).get(accountId);
  if (!backup) {
    const error = new Error('Nenhum backup foi encontrado para esta conta.');
    error.statusCode = 404;
    throw error;
  }
  const encrypted = await fs.readFile(path.join(config.storagePath, 'backups', backup.relative_path));
  const payload = JSON.parse((await gunzipAsync(decryptBackup(encrypted))).toString('utf8'));
  db.prepare('UPDATE cloud_restore_codes SET used_at = ? WHERE id = ?').run(now, code.id);
  return { backup: payload, backupId: backup.id, createdAt: backup.created_at };
}

export async function readReleaseManifest() {
  try {
    const raw = await fs.readFile(path.join(config.releasesPath, 'release.json'), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
