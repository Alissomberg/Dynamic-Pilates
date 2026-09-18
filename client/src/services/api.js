import {
  exportDatabase,
  importDatabase,
  inTransaction,
  loadMockData as loadMockDatabase,
  query,
  resetOperationalData as resetOperationalDatabase,
  run
} from '../db/localDatabase.js';

const DAY_MS = 24 * 60 * 60 * 1000;
let currentAccount = null;

function setCurrentAccount(account) {
  currentAccount = account || null;
}

function requireAccount() {
  if (!currentAccount?.userId) throw new Error('Faça login novamente para acessar os dados.');
  return currentAccount;
}

function scopeOwnerId() {
  const account = requireAccount();
  if (account.role === 'admin') return null;
  return account.role === 'manager' ? Number(account.userId) : Number(account.createdBy || account.userId);
}

function studentScope(column = 'owner_user_id') {
  const ownerId = scopeOwnerId();
  return ownerId ? { clause: ` AND ${column} = ?`, params: [ownerId] } : { clause: '', params: [] };
}

async function assertStudentAccess(studentId) {
  const scope = studentScope('owner_user_id');
  const rows = await query(`SELECT id FROM alunos WHERE id = ?${scope.clause}`, [Number(studentId), ...scope.params]);
  if (!rows[0]) throw new Error('Aluno não encontrado ou sem permissão para este usuário.');
}

function requireAdmin() {
  if (requireAccount().role !== 'admin') throw new Error('Apenas o Admin pode executar esta ação.');
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function clampDate(year, monthIndex, day) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(Number(day), lastDay), 12, 0, 0, 0);
}

function addMonths(dateString, months, fixedDay) {
  const base = parseDate(dateString);
  const target = new Date(base.getFullYear(), base.getMonth() + Number(months), 1, 12);
  return localDateString(clampDate(target.getFullYear(), target.getMonth(), fixedDay));
}

function firstDueDate(startDate, fixedDay, intervalMonths) {
  const start = parseDate(startDate);
  let due = clampDate(start.getFullYear(), start.getMonth(), fixedDay);
  if (due < start) due = parseDate(addMonths(localDateString(due), intervalMonths, fixedDay));
  return localDateString(due);
}

function reaisToCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error('Informe um valor maior que zero.');
  return Math.round(number * 100);
}

function centsToReais(value) {
  return Number(value || 0) / 100;
}

function financialStatus(dueDate, referenceDate = localDateString()) {
  const diffDays = Math.round((parseDate(dueDate) - parseDate(referenceDate)) / DAY_MS);
  if (diffDays < 0) {
    return { code: 'EM_ATRASO', label: `${Math.abs(diffDays)}d em atraso`, color: 'red', daysDiff: diffDays };
  }
  if (diffDays === 0) return { code: 'HOJE', label: 'Vence hoje', color: 'amber', daysDiff: 0 };
  if (diffDays <= 5) return { code: 'PENDENTE', label: `Vence em ${diffDays}d`, color: 'blue', daysDiff: diffDays };
  return { code: 'EM_DIA', label: 'Em dia', color: 'green', daysDiff: diffDays };
}

function normalizePlan(data) {
  const duration = Number(data.duracao_meses || (data.plano === 'trimestral' ? 3 : 1));
  if (!Number.isInteger(duration) || duration < 1 || duration > 60) {
    throw new Error('A duração do plano deve ficar entre 1 e 60 meses.');
  }
  const type = duration === 1 ? 'mensal' : duration === 3 ? 'trimestral' : 'personalizado';
  const defaultName = duration === 1 ? 'Mensal' : duration === 3 ? 'Trimestral' : `Plano de ${duration} meses`;
  return {
    type,
    name: String(data.nome_plano || defaultName).trim() || defaultName,
    duration
  };
}

function validateSchedules(schedules) {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    throw new Error('Escolha pelo menos um dia e horário de aula.');
  }
  const days = new Set();
  return schedules.map((schedule) => {
    const day = Number(schedule.dia);
    const time = String(schedule.hora || '');
    if (!Number.isInteger(day) || day < 1 || day > 6) throw new Error('Há um dia de aula inválido.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Há um horário de aula inválido.');
    if (days.has(day)) throw new Error('Escolha somente um horário para cada dia da semana.');
    days.add(day);
    return { dia: day, hora: time };
  });
}

function planResponse(contract) {
  return {
    contrato_id: contract.contrato_id,
    preset_id: contract.preset_id,
    nome_plano: contract.nome_plano,
    tipo_plano: contract.tipo_plano,
    duracao_plano_meses: Number(contract.duracao_plano_meses),
    periodicidade_cobranca_meses: Number(contract.periodicidade_cobranca_meses),
    valor: centsToReais(contract.valor_centavos),
    dia_vencimento: Number(contract.dia_vencimento),
    data_inicio: contract.data_inicio
  };
}

async function getActiveContract(studentId) {
  const rows = await query(
    `SELECT id AS contrato_id, preset_id, nome_plano, tipo_plano,
            duracao_plano_meses, periodicidade_cobranca_meses,
            valor_centavos, dia_vencimento, data_inicio
       FROM contratos WHERE aluno_id = ? AND ativo = 1
      ORDER BY id DESC LIMIT 1`,
    [studentId]
  );
  return rows[0] || null;
}

async function getStudentView(student) {
  const [contract, schedules, payments, charges] = await Promise.all([
    getActiveContract(student.id),
    query('SELECT id, dia_semana, horario FROM aluno_horarios WHERE aluno_id = ? ORDER BY dia_semana, horario', [student.id]),
    query('SELECT data_pagamento, valor_centavos, forma_pagamento FROM pagamentos WHERE aluno_id = ? ORDER BY data_pagamento DESC, id DESC LIMIT 1', [student.id]),
    query("SELECT id, competencia, data_vencimento, valor_centavos, status FROM cobrancas WHERE aluno_id = ? AND status = 'pendente' ORDER BY data_vencimento, id LIMIT 1", [student.id])
  ]);
  const charge = charges[0] || null;
  const payment = payments[0] || null;
  return {
    ...student,
    ...(contract ? planResponse(contract) : {}),
    horarios: schedules,
    ultimoPagamento: payment ? {
      data_pagamento: payment.data_pagamento,
      valor_pago: centsToReais(payment.valor_centavos),
      forma_pagamento: payment.forma_pagamento
    } : null,
    proximaCobranca: charge ? {
      id: charge.id,
      competencia: charge.competencia,
      data_vencimento: charge.data_vencimento,
      valor_esperado: centsToReais(charge.valor_centavos),
      status: charge.status
    } : null,
    situacaoFinanceira: charge
      ? financialStatus(charge.data_vencimento)
      : { code: 'EM_DIA', label: 'Em dia', color: 'green', daysDiff: 30 }
  };
}

async function getAlunos({ search = '', status = 'todos' } = {}) {
  const params = [];
  const scope = studentScope('owner_user_id');
  let sql = `SELECT id, owner_user_id, nome, telefone, observacoes, ativo, criado_em FROM alunos WHERE ativo = 1${scope.clause}`;
  params.push(...scope.params);
  if (search.trim()) {
    sql += ' AND LOWER(nome) LIKE ?';
    params.push(`%${search.trim().toLowerCase()}%`);
  }
  sql += ' ORDER BY nome COLLATE NOCASE';
  const students = await query(sql, params);
  const result = await Promise.all(students.map(getStudentView));
  if (!status || status === 'todos') return result;
  return result.filter((student) => student.situacaoFinanceira.code.toLowerCase() === status.toLowerCase());
}

async function getAlunoById(id) {
  const scope = studentScope('owner_user_id');
  const rows = await query(`SELECT id, owner_user_id, nome, telefone, observacoes, ativo, criado_em FROM alunos WHERE id = ?${scope.clause}`, [Number(id), ...scope.params]);
  if (!rows[0]) throw new Error('Aluno não encontrado.');
  return getStudentView(rows[0]);
}

async function createAluno(data) {
  const name = String(data.nome || '').trim();
  if (!name) throw new Error('Informe o nome do aluno.');
  const plan = normalizePlan(data);
  const schedules = validateSchedules(data.horarios);
  const valueCents = reaisToCents(data.valor);
  const dueDay = Number(data.dia_vencimento || 10);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error('Escolha um dia de vencimento válido.');
  const startDate = data.data_inicio || localDateString();
  const createdAt = new Date().toISOString();
  const ownerUserId = scopeOwnerId() || Number(requireAccount().userId);

  const studentId = await inTransaction(async (db) => {
    const studentChange = await db.run(
      'INSERT INTO alunos (owner_user_id, nome, telefone, observacoes, ativo, criado_em) VALUES (?, ?, ?, ?, 1, ?)',
      [ownerUserId, name, String(data.telefone || '').trim(), String(data.observacoes || '').trim(), createdAt], false
    );
    const newStudentId = Number(studentChange.changes.lastId);
    const contractChange = await db.run(
      `INSERT INTO contratos (aluno_id, preset_id, nome_plano, tipo_plano,
        duracao_plano_meses, periodicidade_cobranca_meses, valor_centavos,
        dia_vencimento, data_inicio, ativo, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [newStudentId, data.preset_id || null, plan.name, plan.type, plan.duration,
        plan.duration, valueCents, dueDay, startDate, createdAt], false
    );
    const contractId = Number(contractChange.changes.lastId);
    for (const schedule of schedules) {
      await db.run('INSERT INTO aluno_horarios (aluno_id, dia_semana, horario) VALUES (?, ?, ?)',
        [newStudentId, schedule.dia, schedule.hora], false);
    }
    const dueDate = firstDueDate(startDate, dueDay, plan.duration);
    await db.run(
      `INSERT INTO cobrancas (aluno_id, contrato_id, competencia, data_vencimento,
        valor_centavos, status, criado_em) VALUES (?, ?, ?, ?, ?, 'pendente', ?)`,
      [newStudentId, contractId, dueDate.slice(0, 7), dueDate, valueCents, createdAt], false
    );
    return newStudentId;
  });
  return getAlunoById(studentId);
}

async function updateAluno(id, data) {
  const studentId = Number(id);
  const current = await getAlunoById(studentId);
  const name = String(data.nome ?? current.nome).trim();
  if (!name) throw new Error('Informe o nome do aluno.');
  await run('UPDATE alunos SET nome = ?, telefone = ?, observacoes = ? WHERE id = ?',
    [name, data.telefone ?? current.telefone, data.observacoes ?? current.observacoes, studentId]);
  return getAlunoById(studentId);
}

async function updateAlunoHorarios(id, schedules) {
  const studentId = Number(id);
  const normalized = validateSchedules(schedules);
  await getAlunoById(studentId);
  await inTransaction(async (db) => {
    await db.run('DELETE FROM aluno_horarios WHERE aluno_id = ?', [studentId], false);
    for (const schedule of normalized) {
      await db.run('INSERT INTO aluno_horarios (aluno_id, dia_semana, horario) VALUES (?, ?, ?)',
        [studentId, schedule.dia, schedule.hora], false);
    }
  });
  return getAlunoById(studentId);
}

async function getAlunoHistoricoMensal(id, month = localDateString().slice(0, 7)) {
  const studentId = Number(id);
  await assertStudentAccess(studentId);
  const [charges, payments, attendances] = await Promise.all([
    query('SELECT id, competencia, data_vencimento, valor_centavos, status FROM cobrancas WHERE aluno_id = ? AND competencia = ? ORDER BY data_vencimento', [studentId, month]),
    query(`SELECT p.id, p.data_pagamento, p.valor_centavos, p.forma_pagamento,
      p.observacao, c.competencia, c.data_vencimento FROM pagamentos p
      LEFT JOIN cobrancas c ON c.id = p.cobranca_id
      WHERE p.aluno_id = ? AND substr(p.data_pagamento, 1, 7) = ? ORDER BY p.data_pagamento`, [studentId, month]),
    query('SELECT id, data, horario, status, criado_em FROM presencas WHERE aluno_id = ? AND substr(data, 1, 7) = ? ORDER BY data, horario', [studentId, month])
  ]);
  const mappedCharges = charges.map((item) => ({ ...item, valor_esperado: centsToReais(item.valor_centavos) }));
  const mappedPayments = payments.map((item) => ({ ...item, valor_pago: centsToReais(item.valor_centavos) }));
  const totalPaid = mappedPayments.reduce((sum, item) => sum + item.valor_pago, 0);
  const pendingCharges = mappedCharges.filter((item) => item.status === 'pendente');
  const totalPending = pendingCharges.reduce((sum, item) => sum + item.valor_esperado, 0);
  const today = localDateString();
  const overdue = pendingCharges.some((item) => item.data_vencimento < today);
  const dueToday = pendingCharges.some((item) => item.data_vencimento === today);
  const present = attendances.filter((item) => item.status === 'presente').length;
  const absent = attendances.filter((item) => item.status === 'falta').length;
  return {
    alunoId: studentId,
    mesAno: month,
    financeiro: {
      totalCobrancas: mappedCharges.length,
      totalPago: totalPaid,
      totalPendente: totalPending,
      status: overdue ? 'EM_ATRASO' : dueToday ? 'HOJE' : totalPending > 0 ? 'PENDENTE' : 'EM_DIA',
      cobrancas: mappedCharges,
      pagamentos: mappedPayments
    },
    frequencia: {
      totalAulas: attendances.length,
      totalPresentes: present,
      totalFaltas: absent,
      frequenciaPercentual: attendances.length ? Number(((present / attendances.length) * 100).toFixed(1)) : 100,
      presencas: attendances
    }
  };
}

function weekDay(dateString) {
  const day = parseDate(dateString).getDay();
  return day === 0 ? 7 : day;
}

function periodForTime(time) {
  return Number(time.slice(0, 2)) < 12 ? { id: 'manha', label: 'Manhã' } : { id: 'tarde', label: 'Tarde' };
}

async function getPresencasDia(date = localDateString()) {
  const day = weekDay(date);
  const scope = studentScope('a.owner_user_id');
  const rows = await query(
    `SELECT h.horario, h.dia_semana, a.id AS aluno_id, a.nome AS aluno_nome,
      a.telefone, c.nome_plano, p.id AS presenca_id, p.status AS presenca_status
      FROM aluno_horarios h JOIN alunos a ON a.id = h.aluno_id AND a.ativo = 1
      LEFT JOIN contratos c ON c.aluno_id = a.id AND c.ativo = 1
      LEFT JOIN presencas p ON p.aluno_id = a.id AND p.data = ? AND p.horario = h.horario
      WHERE h.dia_semana = ?${scope.clause} ORDER BY h.horario, a.nome COLLATE NOCASE`,
    [date, day, ...scope.params]
  );
  const blocks = new Map();
  for (const row of rows) {
    if (!blocks.has(row.horario)) {
      const period = periodForTime(row.horario);
      blocks.set(row.horario, { horario: row.horario, periodo: period.id, periodoLabel: period.label,
        totalAlunos: 0, presentes: 0, faltas: 0, pendentes: 0, alunos: [] });
    }
    const block = blocks.get(row.horario);
    block.totalAlunos += 1;
    if (row.presenca_status === 'presente') block.presentes += 1;
    else if (row.presenca_status === 'falta') block.faltas += 1;
    else block.pendentes += 1;
    block.alunos.push({ id: row.aluno_id, nome: row.aluno_nome, telefone: row.telefone,
      plano: row.nome_plano, presencaId: row.presenca_id || null, status: row.presenca_status || 'pendente' });
  }
  const schedules = [...blocks.values()];
  const present = rows.filter((row) => row.presenca_status === 'presente').length;
  const absent = rows.filter((row) => row.presenca_status === 'falta').length;
  return {
    data: date, diaSemana: day, totalAlunos: rows.length, totalPresentes: present, totalFaltas: absent,
    totalNaoRegistrados: rows.length - present - absent, horarios: schedules,
    periodos: { manha: schedules.filter((item) => item.periodo === 'manha'), tarde: schedules.filter((item) => item.periodo === 'tarde') }
  };
}

async function checkinPresenca({ alunoId, data, horario, status }) {
  if (!['presente', 'falta'].includes(status)) throw new Error('Escolha Presente ou Falta.');
  await assertStudentAccess(alunoId);
  await run(`INSERT INTO presencas (aluno_id, data, horario, status, criado_em)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT (aluno_id, data, horario) DO UPDATE SET
    status = excluded.status, criado_em = excluded.criado_em`,
  [Number(alunoId), data, horario, status, new Date().toISOString()]);
  return { success: true, alunoId: Number(alunoId), data, horario, status };
}

async function getPendencias() {
  const scope = studentScope('a.owner_user_id');
  const rows = await query(
    `SELECT ch.id AS cobranca_id, ch.competencia, ch.data_vencimento, ch.valor_centavos,
      a.id AS aluno_id, a.nome AS aluno_nome, a.telefone, c.nome_plano, c.tipo_plano,
      c.duracao_plano_meses, c.dia_vencimento FROM cobrancas ch
      JOIN alunos a ON a.id = ch.aluno_id AND a.ativo = 1
      JOIN contratos c ON c.id = ch.contrato_id AND c.ativo = 1
      WHERE ch.status = 'pendente'${scope.clause} ORDER BY ch.data_vencimento, a.nome COLLATE NOCASE`,
    scope.params
  );
  return Promise.all(rows.map(async (row) => {
    const payments = await query('SELECT data_pagamento, valor_centavos FROM pagamentos WHERE aluno_id = ? ORDER BY data_pagamento DESC, id DESC LIMIT 1', [row.aluno_id]);
    return {
      cobrancaId: row.cobranca_id, alunoId: row.aluno_id, alunoNome: row.aluno_nome,
      telefone: row.telefone, nomePlano: row.nome_plano, tipoPlano: row.tipo_plano,
      duracaoPlano: Number(row.duracao_plano_meses), valorEsperado: centsToReais(row.valor_centavos),
      diaVencimento: Number(row.dia_vencimento), dataVencimento: row.data_vencimento,
      competencia: row.competencia,
      ultimoPagamento: payments[0] ? { data_pagamento: payments[0].data_pagamento, valor_pago: centsToReais(payments[0].valor_centavos) } : null,
      situacao: financialStatus(row.data_vencimento)
    };
  }));
}

async function registrarPagamento({ alunoId, cobrancaId, valorPago, dataPagamento = localDateString(), formaPagamento = 'pix', observacao = '' }) {
  const studentId = Number(alunoId);
  await assertStudentAccess(studentId);
  if (!['pix', 'dinheiro', 'cartao'].includes(formaPagamento)) throw new Error('Escolha Pix, dinheiro ou cartão.');
  const charges = cobrancaId
    ? await query("SELECT * FROM cobrancas WHERE id = ? AND aluno_id = ? AND status = 'pendente'", [Number(cobrancaId), studentId])
    : await query("SELECT * FROM cobrancas WHERE aluno_id = ? AND status = 'pendente' ORDER BY data_vencimento, id LIMIT 1", [studentId]);
  const charge = charges[0];
  if (!charge) throw new Error('Nenhuma cobrança pendente foi encontrada para este aluno.');
  const contract = await getActiveContract(studentId);
  if (!contract) throw new Error('O aluno não possui um plano ativo.');
  const valueCents = reaisToCents(valorPago ?? centsToReais(charge.valor_centavos));
  const nextDueDate = addMonths(charge.data_vencimento, contract.periodicidade_cobranca_meses, contract.dia_vencimento);
  const createdAt = new Date().toISOString();
  const paymentId = await inTransaction(async (db) => {
    const paymentChange = await db.run(
      `INSERT INTO pagamentos (cobranca_id, aluno_id, data_pagamento, valor_centavos,
       forma_pagamento, observacao, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [charge.id, studentId, dataPagamento, valueCents, formaPagamento, observacao, createdAt], false
    );
    await db.run("UPDATE cobrancas SET status = 'pago' WHERE id = ?", [charge.id], false);
    await db.run(
      `INSERT OR IGNORE INTO cobrancas (aluno_id, contrato_id, competencia, data_vencimento,
       valor_centavos, status, criado_em) VALUES (?, ?, ?, ?, ?, 'pendente', ?)`,
      [studentId, contract.contrato_id, nextDueDate.slice(0, 7), nextDueDate, contract.valor_centavos, createdAt], false
    );
    return Number(paymentChange.changes.lastId);
  });
  return { success: true, pagamentoId: paymentId, alunoId: studentId, valorPago: centsToReais(valueCents),
    dataPagamento, proximaDataVencimento: nextDueDate, formaPagamento };
}

async function getHistoricoFinanceiro(limit = 50) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 50));
  const scope = studentScope('a.owner_user_id');
  const rows = await query(
    `SELECT p.id, p.data_pagamento, p.valor_centavos, p.forma_pagamento, p.observacao,
      p.criado_em, a.id AS aluno_id, a.nome AS aluno_nome, ch.competencia,
      ch.data_vencimento, c.nome_plano, c.duracao_plano_meses FROM pagamentos p
      JOIN alunos a ON a.id = p.aluno_id LEFT JOIN cobrancas ch ON ch.id = p.cobranca_id
      LEFT JOIN contratos c ON c.id = ch.contrato_id
      WHERE 1 = 1${scope.clause}
      ORDER BY p.data_pagamento DESC, p.id DESC LIMIT ?`, [...scope.params, safeLimit]
  );
  return rows.map((row) => ({ ...row, valor_pago: centsToReais(row.valor_centavos) }));
}

async function getResumoFinanceiro(month = localDateString().slice(0, 7)) {
  const scope = studentScope('a.owner_user_id');
  const [received, pending, overdue, students] = await Promise.all([
    query(`SELECT COALESCE(SUM(p.valor_centavos), 0) AS total, COUNT(*) AS quantidade FROM pagamentos p JOIN alunos a ON a.id = p.aluno_id WHERE substr(p.data_pagamento, 1, 7) = ?${scope.clause}`, [month, ...scope.params]),
    query(`SELECT COALESCE(SUM(ch.valor_centavos), 0) AS total, COUNT(*) AS quantidade FROM cobrancas ch JOIN alunos a ON a.id = ch.aluno_id WHERE ch.status = 'pendente'${scope.clause}`, scope.params),
    query(`SELECT COALESCE(SUM(ch.valor_centavos), 0) AS total, COUNT(*) AS quantidade FROM cobrancas ch JOIN alunos a ON a.id = ch.aluno_id WHERE ch.status = 'pendente' AND ch.data_vencimento < ?${scope.clause}`, [localDateString(), ...scope.params]),
    query(`SELECT COUNT(*) AS quantidade FROM alunos a WHERE a.ativo = 1${scope.clause}`, scope.params)
  ]);
  return { competencia: month, totalRecebido: centsToReais(received[0]?.total), qtdPagamentos: Number(received[0]?.quantidade || 0),
    totalPendente: centsToReais(pending[0]?.total), qtdPendencias: Number(pending[0]?.quantidade || 0),
    totalAtrasado: centsToReais(overdue[0]?.total), qtdAtrasados: Number(overdue[0]?.quantidade || 0),
    totalAlunosAtivos: Number(students[0]?.quantidade || 0) };
}

async function getDashboard(date = localDateString()) {
  const [attendances, pending, financial] = await Promise.all([getPresencasDia(date), getPendencias(), getResumoFinanceiro(date.slice(0, 7))]);
  const overdue = pending.filter((item) => item.situacao.code === 'EM_ATRASO');
  const today = pending.filter((item) => item.situacao.code === 'HOJE');
  const soon = pending.filter((item) => item.situacao.code === 'PENDENTE');
  return { dataHoje: date, armazenamento: 'local', presencas: attendances,
    alertas: { totalAlertas: overdue.length + today.length, emAtraso: overdue.slice(0, 5), qtdEmAtraso: overdue.length,
      vencemHoje: today, qtdVencemHoje: today.length, vencemEmBreve: soon }, financeiroMes: financial };
}

async function getPlanPresets() {
  const rows = await query('SELECT id, nome, duracao_meses, valor_centavos, ativo, criado_em FROM plan_presets WHERE ativo = 1 ORDER BY duracao_meses, nome COLLATE NOCASE');
  return rows.map((row) => ({ ...row, duracao_meses: Number(row.duracao_meses), valor: centsToReais(row.valor_centavos) }));
}

async function createPlanPreset({ nome, duracao_meses, valor }) {
  const normalizedName = String(nome || '').trim();
  const duration = Number(duracao_meses);
  if (!normalizedName) throw new Error('Informe um nome para o plano.');
  if (!Number.isInteger(duration) || duration < 1 || duration > 60) throw new Error('A duração deve ficar entre 1 e 60 meses.');
  const change = await run('INSERT INTO plan_presets (nome, duracao_meses, valor_centavos, ativo, criado_em) VALUES (?, ?, ?, 1, ?)',
    [normalizedName, duration, reaisToCents(valor), new Date().toISOString()]);
  return { id: Number(change.lastId), nome: normalizedName, duracao_meses: duration, valor: Number(valor) };
}

async function exportBackup() {
  const data = await exportDatabase();
  return { app: 'Zello', backupFormat: 2, exportedAt: new Date().toISOString(), database: data.export };
}

async function importBackup(backup) {
  if (!backup || !['Zello', 'Dynamic Pilates'].includes(backup.app) || !backup.database) {
    throw new Error('Este arquivo não é um backup válido do Zello.');
  }
  return importDatabase(backup.database);
}

async function resetOperationalData() {
  requireAdmin();
  return resetOperationalDatabase();
}

async function loadMockData() {
  requireAdmin();
  return loadMockDatabase();
}

export const api = {
  setCurrentAccount,
  getDashboard, getAlunos, getAlunoById, getAlunoHistoricoMensal, updateAlunoHorarios,
  createAluno, updateAluno, getPresencasDia, checkinPresenca, getPendencias,
  getHistoricoFinanceiro, getResumoFinanceiro, registrarPagamento, getPlanPresets,
  createPlanPreset, exportBackup, importBackup, resetOperationalData, loadMockData
};

export const dateUtils = { localDateString, addMonths, financialStatus };
