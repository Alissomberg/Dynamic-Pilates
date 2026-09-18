import { query, run } from '../db/localDatabase.js';

const AUTH_KEY = 'zello.local.auth';
const AUTH_MODEL_KEY = 'auth_pin_pbkdf2_v1';
const PIN_HASH_ITERATIONS = 120000;
export const INITIAL_ADMIN_PIN = '731946';
export const INITIAL_JOAO_PIN = '482615';

const SEEDED_USERS = [
  { username: 'admin', displayName: 'Administrador', pin: INITIAL_ADMIN_PIN, role: 'admin', maxUsers: 0 },
  { username: 'joao', displayName: 'Doutor João', pin: INITIAL_JOAO_PIN, role: 'manager', maxUsers: 2 }
];

async function legacyHashValue(value) {
  const normalized = String(value || '');
  if (!normalized) throw new Error('O valor informado não pode ficar vazio.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function derivePinHash(pin, salt, iterations = PIN_HASH_ITERATIONS) {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

async function createPinHash(pin) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePinHash(pin, salt);
  return `pbkdf2$${PIN_HASH_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
}

async function verifyPin(pin, storedHash) {
  const [algorithm, iterationsText, saltText, hashText] = String(storedHash || '').split('$');
  if (algorithm !== 'pbkdf2' || !iterationsText || !saltText || !hashText) {
    return (await legacyHashValue(pin)) === storedHash;
  }
  const expected = base64ToBytes(hashText);
  const actual = await derivePinHash(pin, base64ToBytes(saltText), Number(iterationsText));
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

function assertPin(pin) {
  const normalized = String(pin || '').trim();
  if (!/^\d{6}$/.test(normalized)) throw new Error('O PIN deve ter exatamente 6 números.');
  return normalized;
}

function accountFromUser(row) {
  return {
    id: `local-${row.id}`,
    userId: Number(row.id),
    username: row.username,
    name: row.display_name,
    role: row.role,
    maxUsers: Number(row.max_users || 0),
    createdBy: row.created_by ? Number(row.created_by) : null,
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
    [definition.username, definition.displayName, await createPinHash(definition.pin), definition.role, definition.maxUsers, new Date().toISOString()]
  );
  return getUserById(result.lastId);
}

async function applyPinModelMigration(users) {
  const marker = await query('SELECT value FROM settings WHERE key = ?', [AUTH_MODEL_KEY]);
  if (marker.length) return;

  await run(
    `UPDATE local_users SET display_name = ?, password_hash = ?, role = 'admin', max_users = 0, active = 1
      WHERE id = ?`,
    ['Administrador', await createPinHash(INITIAL_ADMIN_PIN), users.admin.id]
  );
  await run(
    `UPDATE local_users SET display_name = ?, password_hash = ?, role = 'manager', max_users = 2, active = 1
      WHERE id = ?`,
    ['Doutor João', await createPinHash(INITIAL_JOAO_PIN), users.joao.id]
  );
  await run(
    `DELETE FROM local_users
      WHERE username IN ('sue9', 'demo') AND created_by IS NULL`
  );
  await run('INSERT INTO settings (key, value) VALUES (?, ?)', [AUTH_MODEL_KEY, new Date().toISOString()]);
}

export async function initializeLocalAuth() {
  await query('SELECT id FROM local_users LIMIT 1');
  const users = {};
  for (const definition of SEEDED_USERS) users[definition.username] = await seedUser(definition);
  await applyPinModelMigration(users);
  await run('UPDATE alunos SET owner_user_id = ? WHERE owner_user_id IS NULL', [users.joao.id]);
}

export async function validateLocalPin(pin) {
  const normalized = assertPin(pin);
  const rows = await query(
    `SELECT id, username, display_name, password_hash, role, max_users, active, created_by
       FROM local_users WHERE active = 1`
  );
  const matches = [];
  for (const candidate of rows) {
    if (await verifyPin(normalized, candidate.password_hash)) matches.push(candidate);
  }
  if (matches.length !== 1) throw new Error('PIN inválido.');
  const row = matches[0];
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
            u.created_at, creator.username AS creator_username
       FROM local_users u LEFT JOIN local_users creator ON creator.id = u.created_by
      ${visibility} ORDER BY u.created_at, u.id`,
    visibilityParams
  );
  return rows.map((row) => ({ ...row, id: Number(row.id), max_users: Number(row.max_users) }));
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
  const existingPins = await query('SELECT password_hash FROM local_users');
  for (const existing of existingPins) {
    if (await verifyPin(normalizedPin, existing.password_hash)) {
      throw new Error('Este PIN já pertence a outro usuário. Escolha outro PIN.');
    }
  }
  const pinHash = await createPinHash(normalizedPin);
  const createdRole = actor.role === 'admin' ? 'manager' : 'user';
  const createdLimit = actor.role === 'admin' ? 2 : 0;
  const result = await run(
    `INSERT INTO local_users
      (username, display_name, password_hash, role, max_users, active, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [normalizedUsername, normalizedName, pinHash, createdRole, createdLimit, actor.userId, new Date().toISOString()]
  );
  return { id: Number(result.lastId), username: normalizedUsername, name: normalizedName, role: createdRole };
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
