import { query, run } from '../db/localDatabase.js';

const AUTH_KEY = 'zello.local.auth';
export const DEMO_TOKEN = 'zello-demo-2026';

const SEEDED_USERS = [
  { username: 'admin', displayName: 'Administrador', password: 'ZelloAdmin#2026', role: 'admin', maxUsers: 0 },
  { username: 'sue9', displayName: 'Sue9', password: 'Sue9@2026', role: 'manager', maxUsers: 2 },
  { username: 'joao', displayName: 'Doutor João', password: 'Joao@2026', role: 'user', maxUsers: 0 },
  { username: 'demo', displayName: 'Usuário de demonstração', password: 'Demo@2026', role: 'user', maxUsers: 0 }
];

function normalizeToken(token) {
  return String(token || '').trim();
}

async function hashValue(value) {
  const normalized = String(value || '');
  if (!normalized) throw new Error('O valor informado não pode ficar vazio.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
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

function accountFromUser(row) {
  return {
    id: `local-${row.id}`,
    userId: Number(row.id),
    username: row.username,
    name: row.display_name,
    role: row.role,
    maxUsers: Number(row.max_users || 0),
    support: { tier: 'premium', active: true, complimentary: true },
    local: true
  };
}

function accountFromToken(row) {
  if (row.user_id) return accountFromUser(row);
  return {
    id: `local-token-${row.id}`,
    userId: null,
    username: null,
    name: row.display_name,
    role: row.role || 'user',
    maxUsers: Number(row.max_users || 0),
    tokenHint: row.token_hint,
    support: {
      tier: row.support_tier,
      active: Boolean(row.support_active),
      complimentary: Boolean(row.support_complimentary)
    },
    local: true
  };
}

async function getUserByUsername(username) {
  const rows = await query(
    `SELECT id, username, display_name, password_hash, role, max_users, active
       FROM local_users WHERE LOWER(username) = LOWER(?)`,
    [String(username || '').trim()]
  );
  return rows[0] || null;
}

async function getUserById(userId) {
  const rows = await query(
    `SELECT id, username, display_name, role, max_users, active
       FROM local_users WHERE id = ?`,
    [Number(userId)]
  );
  return rows[0] || null;
}

async function seedUser(definition) {
  const existing = await getUserByUsername(definition.username);
  if (existing) return existing;
  const result = await run(
    `INSERT INTO local_users
      (username, display_name, password_hash, role, max_users, active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [definition.username, definition.displayName, await hashValue(definition.password), definition.role, definition.maxUsers, new Date().toISOString()]
  );
  return getUserById(result.lastId);
}

export async function initializeLocalAuth() {
  await query('SELECT id FROM local_users LIMIT 1');
  const users = {};
  for (const definition of SEEDED_USERS) users[definition.username] = await seedUser(definition);

  const demoHash = await hashValue(DEMO_TOKEN);
  const demoToken = (await query('SELECT id, user_id FROM access_tokens WHERE token_hash = ?', [demoHash]))[0];
  if (!demoToken) {
    await run(
      `INSERT INTO access_tokens
        (user_id, display_name, token_hash, token_hint, token_active, support_tier, support_active, support_complimentary, created_at)
       VALUES (?, ?, ?, ?, 1, 'premium', 1, 1, ?)`,
      [users.demo.id, users.demo.display_name, demoHash, tokenHint(DEMO_TOKEN), new Date().toISOString()]
    );
  } else if (!demoToken.user_id) {
    await run('UPDATE access_tokens SET user_id = ? WHERE id = ?', [users.demo.id, demoToken.id]);
  }
}

export async function validateLocalToken(token) {
  const normalized = normalizeToken(token);
  if (!normalized) throw new Error('Digite o token entregue pela equipe técnica.');
  const hash = await hashValue(normalized);
  const rows = await query(
    `SELECT access_tokens.id, access_tokens.user_id, access_tokens.display_name,
            access_tokens.token_hint, access_tokens.support_tier,
            access_tokens.support_active, access_tokens.support_complimentary,
            local_users.username, local_users.role, local_users.max_users
       FROM access_tokens LEFT JOIN local_users ON local_users.id = access_tokens.user_id
      WHERE access_tokens.token_hash = ? AND access_tokens.token_active = 1
        AND (local_users.id IS NULL OR local_users.active = 1)`,
    [hash]
  );
  const row = rows[0];
  if (!row) throw new Error('Token local inválido ou desativado.');
  await run('UPDATE access_tokens SET last_used_at = ? WHERE id = ?', [new Date().toISOString(), row.id]);
  return { account: accountFromToken(row), loginType: 'token' };
}

export async function validateLocalCredentials(username, password) {
  const row = await getUserByUsername(username);
  if (!row || !row.active || !String(password || '')) {
    throw new Error('Usuário ou senha inválidos.');
  }
  if ((await hashValue(password)) !== row.password_hash) throw new Error('Usuário ou senha inválidos.');
  await run('UPDATE local_users SET last_login_at = ? WHERE id = ?', [new Date().toISOString(), row.id]);
  return { account: accountFromUser(row), loginType: 'password' };
}

export async function validateCachedAccount(cached) {
  if (cached?.token) return validateLocalToken(cached.token);
  const row = cached?.account?.userId ? await getUserById(cached.account.userId) : null;
  if (!row || !row.active) throw new Error('A conta local não está mais ativa.');
  return { account: accountFromUser(row), loginType: 'password' };
}

export async function listLocalUsers(actor) {
  if (!['admin', 'manager'].includes(actor?.role)) throw new Error('Apenas administradores podem ver os usuários.');
  const visibility = actor.role === 'manager' ? 'WHERE u.id = ? OR u.created_by = ?' : '';
  const visibilityParams = actor.role === 'manager' ? [actor.userId, actor.userId] : [];
  const rows = await query(
    `SELECT u.id, u.username, u.display_name, u.role, u.max_users, u.active,
            u.created_at, creator.username AS creator_username,
            (SELECT COUNT(*) FROM access_tokens t WHERE t.user_id = u.id AND t.token_active = 1) AS token_count
       FROM local_users u LEFT JOIN local_users creator ON creator.id = u.created_by
      ${visibility} ORDER BY u.created_at, u.id`,
    visibilityParams
  );
  return rows.map((row) => ({ ...row, id: Number(row.id), max_users: Number(row.max_users), token_count: Number(row.token_count) }));
}

export async function createLocalUser(actor, { username, displayName, password }) {
  if (!['admin', 'manager'].includes(actor?.role)) throw new Error('Apenas admin ou sue9 podem cadastrar usuários.');
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedName = String(displayName || '').trim();
  if (!/^[a-z0-9_.-]{3,32}$/.test(normalizedUsername)) throw new Error('O usuário deve ter de 3 a 32 caracteres simples.');
  if (!normalizedName) throw new Error('Informe o nome do usuário.');
  if (String(password || '').length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
  if (actor.role === 'manager') {
    const rows = await query('SELECT COUNT(*) AS total FROM local_users WHERE created_by = ?', [actor.userId]);
    if (Number(rows[0]?.total || 0) >= actor.maxUsers) throw new Error(`Sue9 pode cadastrar no máximo ${actor.maxUsers} usuários.`);
  }
  const result = await run(
    `INSERT INTO local_users
      (username, display_name, password_hash, role, max_users, active, created_by, created_at)
     VALUES (?, ?, ?, 'user', 0, 1, ?, ?)`,
    [normalizedUsername, normalizedName, await hashValue(password), actor.userId, new Date().toISOString()]
  );
  return { id: Number(result.lastId), username: normalizedUsername, name: normalizedName };
}

export async function createLocalToken(actor, userId) {
  if (actor?.role !== 'admin') throw new Error('Apenas o admin pode registrar tokens.');
  const user = await getUserById(userId);
  if (!user || !user.active) throw new Error('Usuário não encontrado ou inativo.');
  const token = generateToken();
  const result = await run(
    `INSERT INTO access_tokens
      (user_id, display_name, token_hash, token_hint, token_active, support_tier, support_active, support_complimentary, created_at)
     VALUES (?, ?, ?, ?, 1, 'premium', 1, 1, ?)`,
    [user.id, user.display_name, await hashValue(token), tokenHint(token), new Date().toISOString()]
  );
  return { id: Number(result.lastId), userId: Number(user.id), name: user.display_name, token, tokenHint: tokenHint(token) };
}

export function getCachedAuth() {
  try {
    const value = JSON.parse(localStorage.getItem(AUTH_KEY));
    return (value?.token || value?.account?.userId) && value?.account ? value : null;
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
