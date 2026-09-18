import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection
} from '@capacitor-community/sqlite';

const DATABASE_NAME = 'dynamic_pilates';
const DATABASE_VERSION = 3;

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

  CREATE TABLE IF NOT EXISTS local_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    max_users INTEGER NOT NULL DEFAULT 0 CHECK (max_users >= 0),
    active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES local_users(id),
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS access_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES local_users(id),
    display_name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_hint TEXT NOT NULL,
    token_active INTEGER NOT NULL DEFAULT 1,
    support_tier TEXT NOT NULL DEFAULT 'premium',
    support_active INTEGER NOT NULL DEFAULT 1,
    support_complimentary INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    last_used_at TEXT
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
  CREATE INDEX IF NOT EXISTS idx_local_users_created_by ON local_users(created_by);
`;

function nowIso() {
  return new Date().toISOString();
}

function localDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function weekdayForOffset(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const day = date.getDay();
  return day === 0 ? 1 : day;
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

async function seedMockData(db) {
  const marker = await db.query("SELECT value FROM settings WHERE key = 'mock_data_seed_v1'");
  if (marker.values?.length) return;

  const students = await db.query('SELECT COUNT(*) AS total FROM alunos');
  if (Number(students.values?.[0]?.total || 0) > 0) {
    await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('mock_data_seed_v1', 'skipped-existing-data')", [], false);
    return;
  }

  const plans = await db.query('SELECT id, nome, duracao_meses, valor_centavos FROM plan_presets WHERE ativo = 1 ORDER BY duracao_meses');
  const monthly = plans.values?.find((plan) => Number(plan.duracao_meses) === 1) || plans.values?.[0];
  const quarterly = plans.values?.find((plan) => Number(plan.duracao_meses) === 3) || monthly;
  if (!monthly || !quarterly) return;

  const createdAt = nowIso();
  await db.beginTransaction();
  try {
    const addStudent = async ({ name, phone, notes, plan, dueOffset, paid, scheduleDay, scheduleTime }) => {
      const studentChange = await db.run(
        'INSERT INTO alunos (nome, telefone, observacoes, ativo, criado_em) VALUES (?, ?, ?, 1, ?)',
        [name, phone, notes, createdAt], false
      );
      const studentId = Number(studentChange.changes.lastId);
      const contractChange = await db.run(
        `INSERT INTO contratos (aluno_id, preset_id, nome_plano, tipo_plano,
          duracao_plano_meses, periodicidade_cobranca_meses, valor_centavos,
          dia_vencimento, data_inicio, ativo, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [studentId, plan.id, plan.nome, Number(plan.duracao_meses) === 3 ? 'trimestral' : 'mensal',
          plan.duracao_meses, plan.duracao_meses, plan.valor_centavos, 10,
          localDateString(-30), createdAt], false
      );
      const contractId = Number(contractChange.changes.lastId);
      await db.run(
        'INSERT INTO aluno_horarios (aluno_id, dia_semana, horario) VALUES (?, ?, ?)',
        [studentId, scheduleDay, scheduleTime], false
      );

      const dueDate = localDateString(dueOffset);
      const chargeChange = await db.run(
        `INSERT INTO cobrancas (aluno_id, contrato_id, competencia, data_vencimento,
          valor_centavos, status, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [studentId, contractId, dueDate.slice(0, 7), dueDate, plan.valor_centavos, paid ? 'pago' : 'pendente', createdAt], false
      );
      const chargeId = Number(chargeChange.changes.lastId);

      if (paid) {
        await db.run(
          `INSERT INTO pagamentos (cobranca_id, aluno_id, data_pagamento, valor_centavos,
            forma_pagamento, observacao, criado_em) VALUES (?, ?, ?, ?, 'pix', 'Pagamento de demonstração', ?)`,
          [chargeId, studentId, localDateString(-1), plan.valor_centavos, createdAt], false
        );
        const nextDueDate = localDateString(30);
        await db.run(
          `INSERT INTO cobrancas (aluno_id, contrato_id, competencia, data_vencimento,
            valor_centavos, status, criado_em) VALUES (?, ?, ?, ?, ?, 'pendente', ?)`,
          [studentId, contractId, nextDueDate.slice(0, 7), nextDueDate, plan.valor_centavos, createdAt], false
        );
      }

      await db.run(
        `INSERT INTO presencas (aluno_id, data, horario, status, criado_em)
         VALUES (?, ?, ?, 'presente', ?)`,
        [studentId, localDateString(-7), scheduleTime, createdAt], false
      );
      await db.run(
        `INSERT INTO presencas (aluno_id, data, horario, status, criado_em)
         VALUES (?, ?, ?, 'falta', ?)`,
        [studentId, localDateString(-14), scheduleTime, createdAt], false
      );
    };

    await addStudent({
      name: 'Ana Beatriz Oliveira', phone: '(85) 99999-1001',
      notes: 'Aluna de demonstração — dados fictícios.', plan: monthly,
      dueOffset: 2, paid: false, scheduleDay: weekdayForOffset(0), scheduleTime: '08:00'
    });
    await addStudent({
      name: 'Carlos Eduardo Lima', phone: '(85) 99999-1002',
      notes: 'Cenário de cobrança paga.', plan: quarterly,
      dueOffset: -5, paid: true, scheduleDay: weekdayForOffset(1), scheduleTime: '14:00'
    });
    await addStudent({
      name: 'Mariana Souza Costa', phone: '(85) 99999-1003',
      notes: 'Cenário de cobrança em atraso.', plan: monthly,
      dueOffset: -10, paid: false, scheduleDay: weekdayForOffset(2), scheduleTime: '18:00'
    });
    await db.run("INSERT INTO settings (key, value) VALUES ('mock_data_seed_v1', 'installed')", [], false);
    await db.commitTransaction();
  } catch (error) {
    await db.rollbackTransaction();
    throw error;
  }
}

async function migrateLocalUsers(db) {
  const columns = await db.query('PRAGMA table_info(access_tokens)');
  if (!columns.values?.some((column) => column.name === 'user_id')) {
    await db.execute('ALTER TABLE access_tokens ADD COLUMN user_id INTEGER REFERENCES local_users(id)', true);
  }
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
  await migrateLocalUsers(db);
  await db.run(
    'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
    [DATABASE_VERSION, nowIso()],
    true
  );
  await seedPlanPresets(db);
  await seedMockData(db);
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
