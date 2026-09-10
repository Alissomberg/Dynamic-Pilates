import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection
} from '@capacitor-community/sqlite';

const DATABASE_NAME = 'dynamic_pilates';
const DATABASE_VERSION = 1;

const sqlite = new SQLiteConnection(CapacitorSQLite);
let connectionPromise;

const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plan_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    duracao_meses INTEGER NOT NULL CHECK (duracao_meses > 0),
    valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alunos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL DEFAULT '',
    observacoes TEXT NOT NULL DEFAULT '',
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contratos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    preset_id INTEGER REFERENCES plan_presets(id),
    nome_plano TEXT NOT NULL,
    tipo_plano TEXT NOT NULL,
    duracao_plano_meses INTEGER NOT NULL CHECK (duracao_plano_meses > 0),
    periodicidade_cobranca_meses INTEGER NOT NULL CHECK (periodicidade_cobranca_meses > 0),
    valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    data_inicio TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS aluno_horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 6),
    horario TEXT NOT NULL,
    UNIQUE (aluno_id, dia_semana)
  );

  CREATE TABLE IF NOT EXISTS cobrancas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    contrato_id INTEGER NOT NULL REFERENCES contratos(id),
    competencia TEXT NOT NULL,
    data_vencimento TEXT NOT NULL,
    valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    criado_em TEXT NOT NULL,
    UNIQUE (aluno_id, data_vencimento)
  );

  CREATE TABLE IF NOT EXISTS pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cobranca_id INTEGER REFERENCES cobrancas(id),
    aluno_id INTEGER NOT NULL REFERENCES alunos(id),
    data_pagamento TEXT NOT NULL,
    valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
    forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'dinheiro', 'cartao')),
    observacao TEXT NOT NULL DEFAULT '',
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS presencas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    horario TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('presente', 'falta')),
    criado_em TEXT NOT NULL,
    UNIQUE (aluno_id, data, horario)
  );

  CREATE INDEX IF NOT EXISTS idx_contratos_aluno_ativo ON contratos(aluno_id, ativo);
  CREATE INDEX IF NOT EXISTS idx_horarios_dia_hora ON aluno_horarios(dia_semana, horario);
  CREATE INDEX IF NOT EXISTS idx_cobrancas_status_vencimento ON cobrancas(status, data_vencimento);
  CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON pagamentos(data_pagamento);
  CREATE INDEX IF NOT EXISTS idx_presencas_data ON presencas(data, horario);
`;

function nowIso() {
  return new Date().toISOString();
}

async function persistWebDatabase() {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DATABASE_NAME);
  }
}

async function seedPlanPresets(db) {
  const result = await db.query('SELECT COUNT(*) AS total FROM plan_presets');
  if (Number(result.values?.[0]?.total || 0) > 0) return;

  const createdAt = nowIso();
  await db.run(
    `INSERT INTO plan_presets (nome, duracao_meses, valor_centavos, ativo, criado_em)
     VALUES (?, ?, ?, 1, ?)`,
    ['Mensal', 1, 18500, createdAt],
    false
  );
  await db.run(
    `INSERT INTO plan_presets (nome, duracao_meses, valor_centavos, ativo, criado_em)
     VALUES (?, ?, ?, 1, ?)`,
    ['Trimestral', 3, 55500, createdAt],
    false
  );
}

async function openDatabase() {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.initWebStore();
  }

  await sqlite.checkConnectionsConsistency();
  const existing = await sqlite.isConnection(DATABASE_NAME, false);
  const db = existing.result
    ? await sqlite.retrieveConnection(DATABASE_NAME, false)
    : await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', DATABASE_VERSION, false);

  const open = await db.isDBOpen();
  if (!open.result) await db.open();

  await db.execute(schema, true);
  await db.run(
    'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
    [DATABASE_VERSION, nowIso()],
    true
  );
  await seedPlanPresets(db);
  await persistWebDatabase();
  return db;
}

export function getDatabase() {
  if (!connectionPromise) connectionPromise = openDatabase();
  return connectionPromise;
}

export async function query(statement, values = []) {
  const db = await getDatabase();
  const result = await db.query(statement, values);
  return result.values || [];
}

export async function run(statement, values = [], transaction = true) {
  const db = await getDatabase();
  const result = await db.run(statement, values, transaction);
  await persistWebDatabase();
  return result.changes || {};
}

export async function inTransaction(callback) {
  const db = await getDatabase();
  await db.beginTransaction();
  try {
    const result = await callback(db);
    await db.commitTransaction();
    await persistWebDatabase();
    return result;
  } catch (error) {
    await db.rollbackTransaction();
    throw error;
  }
}

export async function exportDatabase() {
  const db = await getDatabase();
  return db.exportToJson('full');
}

export async function importDatabase(jsonData) {
  const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
  const json = JSON.stringify({ ...parsed, overwrite: true });
  const valid = await sqlite.isJsonValid(json);
  if (!valid.result) throw new Error('O arquivo selecionado não é um backup válido.');

  const existing = await sqlite.isConnection(DATABASE_NAME, false);
  if (existing.result) await sqlite.closeConnection(DATABASE_NAME, false);
  connectionPromise = undefined;
  await sqlite.importFromJson(json);
  await getDatabase();
  await persistWebDatabase();
  return true;
}

export { DATABASE_NAME, DATABASE_VERSION };
