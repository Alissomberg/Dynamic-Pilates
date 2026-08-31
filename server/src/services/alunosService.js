import { db } from '../db/db.js';
import { 
  evaluateFinancialStatus, 
  calculateNextDueDate, 
  calculateFidelityEndDate, 
  getFidelityStatus,
  PLANS 
} from '../rules/billingEngine.js';

export function listAlunos({ search = '', status = 'todos' } = {}) {
  let query = `
    SELECT 
      a.id, a.nome, a.telefone, a.observacoes, a.ativo, a.criado_em,
      c.id AS contrato_id, c.tipo_plano, c.periodicidade_cobranca, 
      c.duracao_fidelidade_meses, c.valor, c.dia_vencimento, 
      c.data_inicio, c.data_fim_fidelidade
    FROM alunos a
    LEFT JOIN contratos c ON c.aluno_id = a.id AND c.ativo = 1
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND a.nome LIKE ?`;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY a.nome ASC`;

  const alunos = db.prepare(query).all(...params);

  const stmtHorarios = db.prepare(`SELECT dia_semana, horario FROM aluno_horarios WHERE aluno_id = ? ORDER BY dia_semana, horario`);
  const stmtUltimoPagamento = db.prepare(`
    SELECT data_pagamento, valor_pago, forma_pagamento 
    FROM pagamentos 
    WHERE aluno_id = ? 
    ORDER BY data_pagamento DESC 
    LIMIT 1
  `);
  const stmtProximaCobranca = db.prepare(`
    SELECT id, competencia, data_vencimento, valor_esperado, status 
    FROM cobrancas 
    WHERE aluno_id = ? AND status != 'pago' 
    ORDER BY data_vencimento ASC 
    LIMIT 1
  `);

  const result = alunos.map(aluno => {
    const horarios = stmtHorarios.all(aluno.id);
    const ultimoPag = stmtUltimoPagamento.get(aluno.id);
    const proxCobranca = stmtProximaCobranca.get(aluno.id);

    let financialStatus;
    if (proxCobranca) {
      financialStatus = evaluateFinancialStatus(
        proxCobranca.data_vencimento,
        ultimoPag ? ultimoPag.data_pagamento : null
      );
    } else {
      financialStatus = {
        code: 'EM_DIA',
        label: 'Em dia',
        color: 'green',
        daysDiff: 30
      };
    }

    const fidelidadeInfo = getFidelityStatus(aluno.data_inicio, aluno.data_fim_fidelidade);

    return {
      ...aluno,
      horarios,
      ultimoPagamento: ultimoPag || null,
      proximaCobranca: proxCobranca || null,
      situacaoFinanceira: financialStatus,
      fidelidade: fidelidadeInfo
    };
  });

  if (status && status !== 'todos') {
    return result.filter(a => a.situacaoFinanceira.code.toLowerCase() === status.toLowerCase());
  }

  return result;
}

export function getAlunoById(id) {
  const aluno = db.prepare(`
    SELECT 
      a.id, a.nome, a.telefone, a.observacoes, a.ativo, a.criado_em,
      c.id AS contrato_id, c.tipo_plano, c.periodicidade_cobranca, 
      c.duracao_fidelidade_meses, c.valor, c.dia_vencimento, 
      c.data_inicio, c.data_fim_fidelidade
    FROM alunos a
    LEFT JOIN contratos c ON c.aluno_id = a.id AND c.ativo = 1
    WHERE a.id = ?
  `).get(id);

  if (!aluno) return null;

  const horarios = db.prepare(`
    SELECT id, dia_semana, horario 
    FROM aluno_horarios 
    WHERE aluno_id = ? 
    ORDER BY dia_semana, horario
  `).all(id);

  const proxCobranca = db.prepare(`
    SELECT id, competencia, data_vencimento, valor_esperado, status 
    FROM cobrancas 
    WHERE aluno_id = ? AND status != 'pago' 
    ORDER BY data_vencimento ASC 
    LIMIT 1
  `).get(id);

  const ultimoPag = db.prepare(`
    SELECT data_pagamento, valor_pago, forma_pagamento
    FROM pagamentos
    WHERE aluno_id = ?
    ORDER BY data_pagamento DESC
    LIMIT 1
  `).get(id);

  const situacaoFinanceira = proxCobranca
    ? evaluateFinancialStatus(proxCobranca.data_vencimento, ultimoPag ? ultimoPag.data_pagamento : null)
    : { code: 'EM_DIA', label: 'Em dia', color: 'green', daysDiff: 30 };

  const fidelidadeInfo = getFidelityStatus(aluno.data_inicio, aluno.data_fim_fidelidade);

  return {
    ...aluno,
    horarios,
    proximaCobranca: proxCobranca || null,
    ultimoPagamento: ultimoPag || null,
    situacaoFinanceira,
    fidelidade: fidelidadeInfo
  };
}

export function getAlunoHistoricoMensal(alunoId, mesAno = '2026-08') {
  const aluno = db.prepare(`SELECT id, nome FROM alunos WHERE id = ?`).get(alunoId);
  if (!aluno) return null;

  const cobrancas = db.prepare(`
    SELECT id, competencia, data_vencimento, valor_esperado, status
    FROM cobrancas
    WHERE aluno_id = ? AND competencia = ?
    ORDER BY data_vencimento ASC
  `).all(alunoId, mesAno);

  const pagamentos = db.prepare(`
    SELECT p.id, p.data_pagamento, p.valor_pago, p.forma_pagamento, p.observacao,
           c.competencia, c.data_vencimento
    FROM pagamentos p
    LEFT JOIN cobrancas c ON c.id = p.cobranca_id
    WHERE p.aluno_id = ? AND strftime('%Y-%m', p.data_pagamento) = ?
    ORDER BY p.data_pagamento ASC
  `).all(alunoId, mesAno);

  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor_pago, 0);
  const totalPendente = cobrancas.filter(c => c.status !== 'pago').reduce((acc, c) => acc + c.valor_esperado, 0);

  let statusFinanceiroMes = 'EM_DIA';
  if (totalPendente > 0) {
    const temAtraso = cobrancas.some(c => c.status === 'atrasado' || c.data_vencimento < new Date().toISOString().split('T')[0]);
    statusFinanceiroMes = temAtraso ? 'EM_ATRASO' : 'PENDENTE';
  }

  const presencas = db.prepare(`
    SELECT id, data, horario, status, criado_em
    FROM presencas
    WHERE aluno_id = ? AND strftime('%Y-%m', data) = ?
    ORDER BY data ASC, horario ASC
  `).all(alunoId, mesAno);

  const totalAulas = presencas.length;
  const totalPresentes = presencas.filter(p => p.status === 'presente').length;
  const totalFaltas = presencas.filter(p => p.status === 'falta').length;
  const frequenciaPercentual = totalAulas > 0 ? ((totalPresentes / totalAulas) * 100).toFixed(1) : '100.0';

  return {
    alunoId,
    mesAno,
    financeiro: {
      totalCobrancas: cobrancas.length,
      totalPago,
      totalPendente,
      status: statusFinanceiroMes,
      cobrancas,
      pagamentos
    },
    frequencia: {
      totalAulas,
      totalPresentes,
      totalFaltas,
      frequenciaPercentual: Number(frequenciaPercentual),
      presencas
    }
  };
}

export function updateAlunoHorarios(alunoId, novosHorarios) {
  if (!Array.isArray(novosHorarios) || novosHorarios.length === 0) {
    throw new Error('Pelo menos um horário deve ser informado.');
  }

  db.prepare(`DELETE FROM aluno_horarios WHERE aluno_id = ?`).run(alunoId);

  const insertStmt = db.prepare(`
    INSERT INTO aluno_horarios (aluno_id, dia_semana, horario)
    VALUES (?, ?, ?)
  `);

  for (const h of novosHorarios) {
    if (h.dia && h.hora) {
      insertStmt.run(alunoId, Number(h.dia), h.hora);
    }
  }

  return getAlunoById(alunoId);
}

export function createAluno(data) {
  const { 
    nome, 
    telefone, 
    observacoes, 
    plano = 'mensal', 
    valor = 185, 
    dia_vencimento = 10, 
    data_inicio = new Date().toISOString().split('T')[0],
    horarios = [] 
  } = data;

  const isTrimestral = plano.toLowerCase() === 'trimestral';
  const duracaoFidelidade = isTrimestral ? 3 : 0;
  const dataFimFidelidade = isTrimestral ? calculateFidelityEndDate(data_inicio, 3) : null;

  const insertAluno = db.prepare(`
    INSERT INTO alunos (nome, telefone, observacoes, ativo)
    VALUES (?, ?, ?, 1)
  `);

  const alunoRes = insertAluno.run(nome, telefone || '', observacoes || '');
  const alunoId = Number(alunoRes.lastInsertRowid);

  const insertContrato = db.prepare(`
    INSERT INTO contratos (
      aluno_id, tipo_plano, periodicidade_cobranca, duracao_fidelidade_meses,
      valor, dia_vencimento, data_inicio, data_fim_fidelidade, ativo
    )
    VALUES (?, ?, 'mensal', ?, ?, ?, ?, ?, 1)
  `);
  const contratoRes = insertContrato.run(
    alunoId, 
    plano.toLowerCase(), 
    duracaoFidelidade, 
    valor, 
    dia_vencimento, 
    data_inicio, 
    dataFimFidelidade
  );
  const contratoId = Number(contratoRes.lastInsertRowid);

  const insertHorario = db.prepare(`
    INSERT INTO aluno_horarios (aluno_id, dia_semana, horario)
    VALUES (?, ?, ?)
  `);
  for (const h of horarios) {
    if (h.dia && h.hora) {
      insertHorario.run(alunoId, Number(h.dia), h.hora);
    }
  }

  // Gerar primeira cobrança mensal (valor de 1 mês)
  const [year, month] = data_inicio.split('-');
  const dueDay = String(dia_vencimento).padStart(2, '0');
  const firstDueDate = `${year}-${month}-${dueDay}`;
  const competencia = `${year}-${month}`;

  db.prepare(`
    INSERT INTO cobrancas (aluno_id, contrato_id, competencia, data_vencimento, valor_esperado, status)
    VALUES (?, ?, ?, ?, ?, 'pendente')
  `).run(alunoId, contratoId, competencia, firstDueDate, valor);

  return getAlunoById(alunoId);
}

export function updateAluno(id, data) {
  const { nome, telefone, observacoes, plano, valor, dia_vencimento } = data;

  if (nome) {
    db.prepare(`UPDATE alunos SET nome = ?, telefone = ?, observacoes = ? WHERE id = ?`)
      .run(nome, telefone || '', observacoes || '', id);
  }

  if (plano && valor && dia_vencimento) {
    const isTrimestral = plano.toLowerCase() === 'trimestral';
    const duracaoFidelidade = isTrimestral ? 3 : 0;
    
    // Obter data de início do contrato atual
    const contratoAtual = db.prepare(`SELECT data_inicio FROM contratos WHERE aluno_id = ? AND ativo = 1`).get(id);
    const dataInicio = contratoAtual ? contratoAtual.data_inicio : new Date().toISOString().split('T')[0];
    const dataFimFidelidade = isTrimestral ? calculateFidelityEndDate(dataInicio, 3) : null;

    db.prepare(`
      UPDATE contratos 
      SET tipo_plano = ?, duracao_fidelidade_meses = ?, data_fim_fidelidade = ?, valor = ?, dia_vencimento = ? 
      WHERE aluno_id = ? AND ativo = 1
    `).run(plano.toLowerCase(), duracaoFidelidade, dataFimFidelidade, valor, dia_vencimento, id);
  }

  return getAlunoById(id);
}
