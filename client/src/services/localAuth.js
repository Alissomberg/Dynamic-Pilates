import { query, run } from '../db/localDatabase.js';

const AUTH_KEY = 'zello.local.auth';
const AUTH_MODEL_KEY = 'auth_pin_model_v2';
export const INITIAL_ADMIN_PIN = '731946';
export const INITIAL_JOAO_PIN = '482615';
export const INITIAL_JOAO_TOKEN = 'zello_joao_2026_superusr';

const SEEDED_USERS = [
  { username: 'admin', displayName: 'Administrador', pin: INITIAL_ADMIN_PIN, role: 'admin', maxUsers: 0 },
  { username: 'joao', displayName: 'Doutor João', pin: INITIAL_JOAO_PIN, role: 'manager', maxUsers: 2 }
];

async function hashValue(value) {
  const normalized = String(value || '');
  if (!normalized) throw new Error('O valor informado não pode ficar vazio.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function assertPin(pin) {
  const normalized = String(pin || '').trim();
  if (!/^\d{6}$/.test(normalized)) throw new Error('O PIN deve ter exatamente 6 números.');
  return normalized;
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

async function getUserByUsername(username) {
  const rows = await query(
    `SELECT id, username, display_name, password_hash, role, max_users, active, created_by
       FROM local_users WHERE LOWER(username) = LOWER(?)`,
    [String(username || '').trim()]
  );
  return rows[0] || null;
}

async function getUserById(userId) {
  const rows = await query(
    `SELECT id, username, display_name, role, max_users, active, created_by
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
    [definition.username, definition.displayName, await hashValue(definition.pin), definition.role, definition.maxUsers, new Date().toISOString()]
  );
  return getUserById(result.lastId);
}

async function applyPinModelMigration(users) {
  const marker = await query('SELECT value FROM settings WHERE key = ?', [AUTH_MODEL_KEY]);
  if (marker.length) return;

  await run(
    `UPDATE local_users SET display_name = ?, password_hash = ?, role = 'admin', max_users = 0, active = 1
      WHERE id = ?`,
    ['Administrador', await hashValue(INITIAL_ADMIN_PIN), users.admin.id]
  );
  await run(
    `UPDATE local_users SET display_name = ?, password_hash = ?, role = 'manager', max_users = 2, active = 1
      WHERE id = ?`,
    ['Doutor João', await hashValue(INITIAL_JOAO_PIN), users.joao.id]
  );
  await run(
    `DELETE FROM access_tokens
      WHERE user_id IN (
        SELECT id FROM local_users
         WHERE username IN ('sue9', 'demo') AND created_by IS NULL
      )`
  );
  await run(
    `DELETE FROM local_users
      WHERE username IN ('sue9', 'demo') AND created_by IS NULL`
  );

  const joaoTokenHash = await hashValue(INITIAL_JOAO_TOKEN);
  const joaoToken = (await query('SELECT id FROM access_tokens WHERE token_hash = ?', [joaoTokenHash]))[0];
  if (!joaoToken) {
    await run(
      `INSERT INTO access_tokens
        (user_id, display_name, token_hash, token_hint, token_active, support_tier, support_active, support_complimentary, created_at)
       VALUES (?, ?, ?, ?, 1, 'premium', 1, 1, ?)`,
      [users.joao.id, users.joao.display_name, joaoTokenHash, tokenHint(INITIAL_JOAO_TOKEN), new Date().toISOString()]
    );
  }
  await run('INSERT INTO settings (key, value) VALUES (?, ?)', [AUTH_MODEL_KEY, new Date().toISOString()]);
}

export async function initializeLocalAuth() {
  await query('SELECT id FROM local_users LIMIT 1');
  const users = {};
  for (const definition of SEEDED_USERS) users[definition.username] = await seedUser(definition);
  await applyPinModelMigration(users);
}

export async function validateLocalPin(pin) {
  const normalized = assertPin(pin);
  const rows = await query(
    `SELECT id, username, display_name, role, max_users, active, created_by
       FROM local_users WHERE password_hash = ? AND active = 1`,
    [await hashValue(normalized)]
  );
  if (rows.length !== 1) throw new Error('PIN inválido.');
  const row = rows[0];
  await run('UPDATE local_users SET last_login_at = ? WHERE id = ?', [new Date().toISOString(), row.id]);
  return { account: accountFromUser(row) };
}

export async function validateCachedAccount(cached) {
  const row = cached?.account?.userId ? await getUserById(cached.account.userId) : null;
  if (!row || !row.active) throw new Error('A conta local não está mais ativa.');
  return { account: accountFromUser(row) };
}

export async function listLocalUsers(actor) {
  if (!['admin', 'manager'].includes(actor?.role)) throw new Error('Este perfil não pode ver outros usuários.');
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

export async function createLocalUser(actor, { username, displayName, pin }) {
  if (!['admin', 'manager'].includes(actor?.role)) throw new Error('Este perfil não pode cadastrar usuários.');
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedName = String(displayName || '').trim();
  const normalizedPin = assertPin(pin);
  if (!/^[a-z0-9_.-]{3,32}$/.test(normalizedUsername)) throw new Error('O usuário deve ter de 3 a 32 caracteres simples.');
  if (!normalizedName) throw new Error('Informe o nome do usuário.');
  if (actor.role === 'manager') {
    const rows = await query('SELECT COUNT(*) AS total FROM local_users WHERE created_by = ? AND active = 1', [actor.userId]);
    if (Number(rows[0]?.total || 0) >= actor.maxUsers) throw new Error(`Este SuperUser pode cadastrar no máximo ${actor.maxUsers} afiliados.`);
  }
  const pinHash = await hashValue(normalizedPin);
  if ((await query('SELECT id FROM local_users WHERE password_hash = ?', [pinHash])).length) {
    throw new Error('Este PIN já pertence a outro usuário. Escolha outro PIN.');
  }
  const result = await run(
    `INSERT INTO local_users
      (username, display_name, password_hash, role, max_users, active, created_by, created_at)
     VALUES (?, ?, ?, 'user', 0, 1, ?, ?)`,
    [normalizedUsername, normalizedName, pinHash, actor.userId, new Date().toISOString()]
  );
  return { id: Number(result.lastId), username: normalizedUsername, name: normalizedName };
}

export async function createLocalToken(actor, userId) {
  if (actor?.role !== 'admin') throw new Error('Apenas o admin pode registrar tokens.');
  const user = await getUserById(userId);
  if (!user || !user.active || user.role === 'admin') throw new Error('Escolha um usuário ativo que não seja admin.');
  const token = generateToken();
  const result = await run(
    `INSERT INTO access_tokens
      (user_id, display_name, token_hash, token_hint, token_active, support_tier, support_active, support_complimentary, created_at)
     VALUES (?, ?, ?, ?, 1, 'premium', 1, 1, ?)`,
    [user.id, user.display_name, await hashValue(token), tokenHint(token), new Date().toISOString()]
  );
  await run("UPDATE local_users SET role = 'manager', max_users = 2 WHERE id = ?", [user.id]);
  return { id: Number(result.lastId), userId: Number(user.id), name: user.display_name, token, tokenHint: tokenHint(token) };
}

export function getCachedAuth() {
  try {
    const value = JSON.parse(localStorage.getItem(AUTH_KEY));
    return value?.account?.userId ? value : null;
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
