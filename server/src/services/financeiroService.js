import { db } from '../db/db.js';
import { evaluateFinancialStatus, calculateNextDueDate } from '../rules/billingEngine.js';

export function listPendencias() {
  const query = `
    SELECT 
      c.id AS cobranca_id, c.competencia, c.data_vencimento, c.valor_esperado, c.status AS cobranca_status,
      a.id AS aluno_id, a.nome AS aluno_nome, a.telefone,
      ct.tipo_plano, ct.valor AS valor_plano, ct.dia_vencimento, ct.id AS contrato_id,
      ct.duracao_fidelidade_meses, ct.data_inicio, ct.data_fim_fidelidade
    FROM cobrancas c
    JOIN alunos a ON a.id = c.aluno_id AND a.ativo = 1
    JOIN contratos ct ON ct.id = c.contrato_id AND ct.ativo = 1
    WHERE c.status != 'pago'
    ORDER BY c.data_vencimento ASC
  `;

  const rows = db.prepare(query).all();

  const stmtUltimoPag = db.prepare(`
    SELECT data_pagamento, valor_pago 
    FROM pagamentos 
    WHERE aluno_id = ? 
    ORDER BY data_pagamento DESC 
    LIMIT 1
  `);

  return rows.map(r => {
    const ultimoPag = stmtUltimoPag.get(r.aluno_id);
    const statusInfo = evaluateFinancialStatus(
      r.data_vencimento,
      ultimoPag ? ultimoPag.data_pagamento : null
    );

    return {
      cobrancaId: r.cobranca_id,
      alunoId: r.aluno_id,
      alunoNome: r.aluno_nome,
      telefone: r.telefone,
      tipoPlano: r.tipo_plano,
      duracaoFidelidade: r.duracao_fidelidade_meses,
      valorEsperado: r.valor_esperado,
      diaVencimento: r.dia_vencimento,
      dataVencimento: r.data_vencimento,
      competencia: r.competencia,
      ultimoPagamento: ultimoPag || null,
      situacao: statusInfo
    };
  });
}

export function registrarPagamento({ alunoId, cobrancaId, valorPago, dataPagamento, formaPagamento = 'pix', observacao = '' }) {
  const dataPag = dataPagamento || new Date().toISOString().split('T')[0];

  let cobranca;
  if (cobrancaId) {
    cobranca = db.prepare(`SELECT * FROM cobrancas WHERE id = ?`).get(cobrancaId);
  } else {
    cobranca = db.prepare(`SELECT * FROM cobrancas WHERE aluno_id = ? AND status != 'pago' ORDER BY data_vencimento ASC LIMIT 1`).get(alunoId);
  }

  const contrato = db.prepare(`SELECT * FROM contratos WHERE aluno_id = ? AND ativo = 1`).get(alunoId);
  if (!contrato) {
    throw new Error('Contrato ativo não encontrado para este aluno.');
  }

  const valorEfetivo = Number(valorPago || (cobranca ? cobranca.valor_esperado : contrato.valor));

  // 1. Inserir registro de pagamento
  const insertPag = db.prepare(`
    INSERT INTO pagamentos (cobranca_id, aluno_id, data_pagamento, valor_pago, forma_pagamento, observacao)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const pagRes = insertPag.run(
    cobranca ? cobranca.id : null,
    alunoId,
    dataPag,
    valorEfetivo,
    formaPagamento,
    observacao
  );
  const pagamentoId = Number(pagRes.lastInsertRowid);

  // 2. Marcar cobrança atual como paga
  if (cobranca) {
    db.prepare(`UPDATE cobrancas SET status = 'pago' WHERE id = ?`).run(cobranca.id);
  }

  // 3. Gerar a próxima cobrança mensal (+1 mês para Mensal e Trimestral)
  const baseVencimento = cobranca ? cobranca.data_vencimento : dataPag;
  const proximaDataVencimento = calculateNextDueDate(
    baseVencimento,
    contrato.tipo_plano,
    contrato.dia_vencimento
  );

  const proxCompetencia = proximaDataVencimento.substring(0, 7);

  const cobrancaExistente = db.prepare(`
    SELECT id FROM cobrancas 
    WHERE aluno_id = ? AND data_vencimento = ?
  `).get(alunoId, proximaDataVencimento);

  if (!cobrancaExistente) {
    db.prepare(`
      INSERT INTO cobrancas (aluno_id, contrato_id, competencia, data_vencimento, valor_esperado, status)
      VALUES (?, ?, ?, ?, ?, 'pendente')
    `).run(
      alunoId,
      contrato.id,
      proxCompetencia,
      proximaDataVencimento,
      contrato.valor
    );
  }

  return {
    success: true,
    pagamentoId,
    alunoId,
    valorPago: valorEfetivo,
    dataPagamento: dataPag,
    proximaDataVencimento,
    formaPagamento
  };
}

export function getHistoricoFinanceiro({ limit = 50 } = {}) {
  const query = `
    SELECT 
      p.id, p.data_pagamento, p.valor_pago, p.forma_pagamento, p.observacao, p.criado_em,
      a.id AS aluno_id, a.nome AS aluno_nome,
      c.competencia, c.data_vencimento,
      ct.tipo_plano, ct.duracao_fidelidade_meses
    FROM pagamentos p
    JOIN alunos a ON a.id = p.aluno_id
    LEFT JOIN cobrancas c ON c.id = p.cobranca_id
    LEFT JOIN contratos ct ON ct.id = c.contrato_id
    ORDER BY p.data_pagamento DESC, p.id DESC
    LIMIT ?
  `;

  return db.prepare(query).all(limit);
}

export function getResumoFinanceiro(mesAno = new Date().toISOString().substring(0, 7)) {
  const recebidoRow = db.prepare(`
    SELECT COALESCE(SUM(valor_pago), 0) AS total_recebido, COUNT(id) AS qtd_pagamentos
    FROM pagamentos
    WHERE strftime('%Y-%m', data_pagamento) = ?
  `).get(mesAno);

  const pendenciasRow = db.prepare(`
    SELECT 
      COALESCE(SUM(valor_esperado), 0) AS total_pendente,
      COUNT(id) AS qtd_pendencias
    FROM cobrancas
    WHERE status != 'pago'
  `).get();

  const todayStr = new Date().toISOString().split('T')[0];
  const atrasadosRow = db.prepare(`
    SELECT 
      COALESCE(SUM(valor_esperado), 0) AS total_atrasado,
      COUNT(id) AS qtd_atrasados
    FROM cobrancas
    WHERE status != 'pago' AND data_vencimento < ?
  `).get(todayStr);

  const alunosRow = db.prepare(`
    SELECT COUNT(id) AS total_ativos FROM alunos WHERE ativo = 1
  `).get();

  return {
    competencia: mesAno,
    totalRecebido: recebidoRow.total_recebido,
    qtdPagamentos: recebidoRow.qtd_pagamentos,
    totalPendente: pendenciasRow.total_pendente,
    qtdPendencias: pendenciasRow.qtd_pendencias,
    totalAtrasado: atrasadosRow.total_atrasado,
    qtdAtrasados: atrasadosRow.qtd_atrasados,
    totalAlunosAtivos: alunosRow.total_ativos
  };
}
