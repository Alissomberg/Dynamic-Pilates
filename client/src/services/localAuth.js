import { query, run } from '../db/localDatabase.js';

const AUTH_KEY = 'zello.local.auth';
export const DEMO_TOKEN = 'zello-demo-2026';

function normalizeToken(token) {
  return String(token || '').trim();
}

async function hashToken(token) {
  const value = normalizeToken(token);
  if (!value) throw new Error('Digite o token entregue pela equipe técnica.');
  const data = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function tokenHint(token) {
  return `${token.slice(0, 8)}…${token.slice(-4)}`;
}

function generateToken() {
  const bytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
    .slice(0, 24);
}

function accountFromRow(row) {
  return {
    id: `local-${row.id}`,
    name: row.display_name,
    tokenHint: row.token_hint,
    support: {
      tier: row.support_tier,
      active: Boolean(row.support_active),
      complimentary: Boolean(row.support_complimentary)
    },
    local: true
  };
}

export async function initializeLocalAuth() {
  const existing = await query('SELECT id FROM access_tokens LIMIT 1');
  if (existing.length > 0) return;

  const hash = await hashToken(DEMO_TOKEN);
  await run(
    `INSERT OR IGNORE INTO access_tokens
      (display_name, token_hash, token_hint, token_active, support_tier, support_active, support_complimentary, created_at)
     VALUES (?, ?, ?, 1, 'premium', 1, 1, ?)`,
    ['Usuário de demonstração', hash, tokenHint(DEMO_TOKEN), new Date().toISOString()]
  );
}

export async function validateLocalToken(token) {
  const normalized = normalizeToken(token);
  const hash = await hashToken(normalized);
  const rows = await query(
    `SELECT id, display_name, token_hint, support_tier, support_active, support_complimentary
       FROM access_tokens WHERE token_hash = ? AND token_active = 1`,
    [hash]
  );
  const row = rows[0];
  if (!row) throw new Error('Token local inválido ou desativado.');
  await run('UPDATE access_tokens SET last_used_at = ? WHERE id = ?', [new Date().toISOString(), row.id]);
  return { account: accountFromRow(row) };
}

export async function createLocalToken(name) {
  const displayName = String(name || '').trim();
  if (!displayName) throw new Error('Informe o nome do usuário do token.');
  const token = generateToken();
  const hash = await hashToken(token);
  const result = await run(
    `INSERT INTO access_tokens
      (display_name, token_hash, token_hint, token_active, support_tier, support_active, support_complimentary, created_at)
     VALUES (?, ?, ?, 1, 'premium', 1, 1, ?)`,
    [displayName, hash, tokenHint(token), new Date().toISOString()]
  );
  return { id: result.lastId, name: displayName, token, tokenHint: tokenHint(token) };
}

export function getCachedAuth() {
  try {
    const value = JSON.parse(localStorage.getItem(AUTH_KEY));
    return value?.token && value?.account ? value : null;
  } catch {
    return null;
  }
}

export function saveAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ ...auth, validatedAt: new Date().toISOString() }));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}
