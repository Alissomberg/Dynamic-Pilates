import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env.js';

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(config.dbPath);

// Habilitar foreign keys e modo WAL
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase(forceDrop = false) {
  if (forceDrop) {
    db.exec(`
      DROP TABLE IF EXISTS presencas;
      DROP TABLE IF EXISTS pagamentos;
      DROP TABLE IF EXISTS cobrancas;
      DROP TABLE IF EXISTS aluno_horarios;
      DROP TABLE IF EXISTS contratos;
      DROP TABLE IF EXISTS alunos;
      DROP TABLE IF EXISTS system_settings;
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      observacoes TEXT,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS contratos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      tipo_plano TEXT NOT NULL, -- 'mensal' | 'trimestral'
      periodicidade_cobranca TEXT DEFAULT 'mensal', -- sempre 'mensal'
      duracao_fidelidade_meses INTEGER DEFAULT 0, -- 0 para mensal, 3 para trimestral
      valor REAL NOT NULL, -- Valor da mensalidade (R$/mês)
      dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
      data_inicio TEXT NOT NULL, -- 'YYYY-MM-DD'
      data_fim_fidelidade TEXT, -- 'YYYY-MM-DD' (data_inicio + fidelidade)
      data_fim TEXT, -- Data de encerramento efetivo caso cancelado
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS aluno_horarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 6), -- 1=Segunda ... 6=Sábado
      horario TEXT NOT NULL -- '07:00', '08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00', '18:00'
    );

    CREATE TABLE IF NOT EXISTS cobrancas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      contrato_id INTEGER REFERENCES contratos(id),
      competencia TEXT NOT NULL, -- '2026-08'
      data_vencimento TEXT NOT NULL, -- 'YYYY-MM-DD'
      valor_esperado REAL NOT NULL, -- Valor mensal (ex: 185.00)
      status TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'atrasado'
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cobranca_id INTEGER REFERENCES cobrancas(id),
      aluno_id INTEGER NOT NULL REFERENCES alunos(id),
      data_pagamento TEXT NOT NULL, -- 'YYYY-MM-DD'
      valor_pago REAL NOT NULL,
      forma_pagamento TEXT DEFAULT 'pix', -- 'pix', 'dinheiro', 'cartao'
      observacao TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS presencas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      data TEXT NOT NULL, -- 'YYYY-MM-DD'
      horario TEXT NOT NULL, -- '08:00'
      status TEXT NOT NULL CHECK (status IN ('presente', 'falta')),
      criado_em TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(aluno_id, data, horario)
    );
  `);

  const scenarioSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'active_scenario'").get();
  if (!scenarioSetting) {
    db.prepare("INSERT INTO system_settings (key, value) VALUES ('active_scenario', 'PADRAO')").run();
  }
}
