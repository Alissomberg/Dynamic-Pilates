/**
 * Motor de Regras Financeiras e Contratuais do Dynamic Pilates
 *
 * REGRA CENTRAL DE NEGÓCIO:
 * - Todos os planos (Mensal e Trimestral) possuem cobrança e ciclo MENSAL (+1 mês).
 * - A diferença entre eles é a fidelidade contratual mínima:
 *   - Mensal: 0 meses de fidelidade.
 *   - Trimestral: 3 meses de compromisso contratual mínimo inicial.
 */

export const PLANS = {
  mensal: {
    id: 'mensal',
    name: 'Mensal',
    label: 'Mensal (sem fidelidade)',
    billingIntervalMonths: 1,
    commitmentMonths: 0,
    descricao: 'Cobrança mensal, sem compromisso de fidelidade.'
  },
  trimestral: {
    id: 'trimestral',
    name: 'Trimestral',
    label: 'Trimestral (fidelidade 3 meses)',
    billingIntervalMonths: 1,
    commitmentMonths: 3,
    descricao: 'Cobrança mensal, com compromisso mínimo de 3 meses de fidelidade.'
  }
};

/**
 * Calcula a data de término do período de fidelidade contratual.
 *
 * @param {string} startDate - Data de início do contrato ('YYYY-MM-DD')
 * @param {number} commitmentMonths - 0 ou 3
 * @returns {string|null} Data de término da fidelidade ('YYYY-MM-DD') ou null
 */
export function calculateFidelityEndDate(startDate, commitmentMonths = 0) {
  if (!commitmentMonths || commitmentMonths <= 0) return null;
  const d = new Date(startDate + 'T12:00:00');
  d.setMonth(d.getMonth() + commitmentMonths);
  return d.toISOString().split('T')[0];
}

/**
 * Avalia o status da fidelidade contratual do aluno em relação à data de hoje.
 *
 * @param {string} startDate - Data de início
 * @param {string|null} fidelityEndDate - Data fim da fidelidade
 * @param {Date} [referenceDate] - Data de hoje (padrão: new Date())
 * @returns {{ isFidelityActive: boolean, label: string, badgeType: 'active'|'completed'|'none' }}
 */
export function getFidelityStatus(startDate, fidelityEndDate, referenceDate = new Date()) {
  if (!fidelityEndDate) {
    return {
      isFidelityActive: false,
      label: 'Sem fidelidade',
      badgeType: 'none'
    };
  }

  const todayStr = referenceDate.toISOString().split('T')[0];
  if (todayStr <= fidelityEndDate) {
    const endFormatted = new Date(fidelityEndDate + 'T12:00:00').toLocaleDateString('pt-BR');
    return {
      isFidelityActive: true,
      label: `Fidelidade até ${endFormatted}`,
      badgeType: 'active'
    };
  }

  return {
    isFidelityActive: false,
    label: 'Fidelidade cumprida (Contrato ativo)',
    badgeType: 'completed'
  };
}

/**
 * Calcula a próxima data de vencimento (sempre +1 mês para mensal e trimestral),
 * preservando SEMPRE o dia fixo do contrato (5, 10, 15, 20 ou dia configurado).
 *
 * @param {string|Date} baseDate - Data de vencimento base (ex: '2026-08-10')
 * @param {string} planType - 'mensal' | 'trimestral'
 * @param {number} fixedDay - Dia fixo de vencimento (ex: 10)
 * @returns {string} Próxima data no formato 'YYYY-MM-DD'
 */
export function calculateNextDueDate(baseDate, planType, fixedDay) {
  // Tanto Mensal quanto Trimestral possuem billingIntervalMonths = 1
  const planConfig = PLANS[planType?.toLowerCase()] || PLANS.mensal;
  const intervalMonths = planConfig.billingIntervalMonths || 1;
  
  const d = new Date(baseDate + (typeof baseDate === 'string' && !baseDate.includes('T') ? 'T12:00:00' : ''));
  d.setMonth(d.getMonth() + intervalMonths);
  
  const year = d.getFullYear();
  const month = d.getMonth();
  
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const targetDay = Math.min(fixedDay, lastDayOfMonth);
  
  const targetDate = new Date(year, month, targetDay);
  return targetDate.toISOString().split('T')[0];
}

/**
 * Avalia o status financeiro de uma obrigação ou aluno em uma data de referência.
 *
 * @param {string} dueDate - Data de vencimento ('YYYY-MM-DD')
 * @param {string|null} lastPaymentDate - Data do último pagamento ('YYYY-MM-DD' ou null)
 * @param {Date} [referenceDate] - Data de hoje (padrão: new Date())
 * @returns {{ code: 'EM_DIA'|'HOJE'|'EM_ATRASO'|'PENDENTE', label: string, color: 'green'|'amber'|'red'|'blue', daysDiff: number }}
 */
export function evaluateFinancialStatus(dueDate, lastPaymentDate, referenceDate = new Date()) {
  const todayStr = referenceDate.toISOString().split('T')[0];
  const ref = new Date(todayStr + 'T00:00:00');
  const due = new Date(dueDate + 'T00:00:00');
  
  const diffTime = due.getTime() - ref.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  // Se a data de vencimento é anterior a hoje -> Em atraso
  if (diffDays < 0) {
    const atraso = Math.abs(diffDays);
    return {
      code: 'EM_ATRASO',
      label: `${atraso}d em atraso`,
      color: 'red',
      daysDiff: diffDays
    };
  }
  
  // Se vence hoje
  if (diffDays === 0) {
    return {
      code: 'HOJE',
      label: 'Vence hoje',
      color: 'amber',
      daysDiff: 0
    };
  }
  
  // Se vence nos próximos 5 dias -> Vence em breve
  if (diffDays <= 5) {
    return {
      code: 'PENDENTE',
      label: `Vence em ${diffDays}d`,
      color: 'blue',
      daysDiff: diffDays
    };
  }
  
  // Se a data de vencimento está no futuro (> 5 dias) -> Em dia
  return {
    code: 'EM_DIA',
    label: 'Em dia',
    color: 'green',
    daysDiff: diffDays
  };
}
