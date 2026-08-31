import { db } from '../db/db.js';

export function getDayOfWeekFromDate(dateStr) {
  // Converte 'YYYY-MM-DD' para dia da semana (1=Segunda ... 6=Sábado, 0=Domingo)
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  // Se domingo (0), pode mapear para 7 ou manter
  return day === 0 ? 7 : day;
}

export function listPresencasDoDia(dateStr = new Date().toISOString().split('T')[0]) {
  const diaSemana = getDayOfWeekFromDate(dateStr);

  // Buscar todos os alunos que têm aula neste dia da semana
  const alunosEscalados = db.prepare(`
    SELECT 
      ah.horario, ah.dia_semana,
      a.id AS aluno_id, a.nome AS aluno_nome, a.telefone, a.ativo,
      c.tipo_plano,
      p.id AS presenca_id, p.status AS presenca_status, p.criado_em AS presenca_registrada_em
    FROM aluno_horarios ah
    JOIN alunos a ON a.id = ah.aluno_id AND a.ativo = 1
    LEFT JOIN contratos c ON c.aluno_id = a.id AND c.ativo = 1
    LEFT JOIN presencas p ON p.aluno_id = a.id AND p.data = ? AND p.horario = ah.horario
    WHERE ah.dia_semana = ?
    ORDER BY ah.horario ASC, a.nome ASC
  `).all(dateStr, diaSemana);

  // Agrupar por horário (ex: '08:00', '09:00', etc.)
  const horariosMap = {};

  for (const item of alunosEscalados) {
    if (!horariosMap[item.horario]) {
      horariosMap[item.horario] = {
        horario: item.horario,
        totalAlunos: 0,
        presentes: 0,
        faltas: 0,
        pendentes: 0,
        alunos: []
      };
    }

    horariosMap[item.horario].totalAlunos += 1;
    if (item.presenca_status === 'presente') {
      horariosMap[item.horario].presentes += 1;
    } else if (item.presenca_status === 'falta') {
      horariosMap[item.horario].faltas += 1;
    } else {
      horariosMap[item.horario].pendentes += 1;
    }

    horariosMap[item.horario].alunos.push({
      id: item.aluno_id,
      nome: item.aluno_nome,
      telefone: item.telefone,
      plano: item.tipo_plano,
      presencaId: item.presenca_id || null,
      status: item.presenca_status || 'pendente' // 'presente' | 'falta' | 'pendente'
    });
  }

  const gradeHorarios = Object.values(horariosMap).sort((a, b) => a.horario.localeCompare(b.horario));

  const totalGeral = alunosEscalados.length;
  const presentesGeral = alunosEscalados.filter(a => a.presenca_status === 'presente').length;
  const faltasGeral = alunosEscalados.filter(a => a.presenca_status === 'falta').length;

  return {
    data: dateStr,
    diaSemana,
    totalAlunos: totalGeral,
    totalPresentes: presentesGeral,
    totalFaltas: faltasGeral,
    totalNaoRegistrados: totalGeral - presentesGeral - faltasGeral,
    horarios: gradeHorarios
  };
}

export function registrarPresenca({ alunoId, data, horario, status }) {
  if (!['presente', 'falta'].includes(status)) {
    throw new Error("Status inválido. Deve ser 'presente' ou 'falta'.");
  }

  const stmt = db.prepare(`
    INSERT INTO presencas (aluno_id, data, horario, status)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(aluno_id, data, horario) DO UPDATE SET
      status = excluded.status,
      criado_em = datetime('now', 'localtime')
  `);

  stmt.run(alunoId, data, horario, status);

  return {
    success: true,
    alunoId,
    data,
    horario,
    status
  };
}
