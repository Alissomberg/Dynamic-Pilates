import { listPresencasDoDia } from './presencasService.js';
import { listPendencias, getResumoFinanceiro } from './financeiroService.js';
import { getActiveScenario } from './alunosService.js';
import { SCENARIOS } from '../rules/billingEngine.js';

export function getDashboardToday(dateStr = new Date().toISOString().split('T')[0]) {
  const activeScenarioId = getActiveScenario();
  const scenarioInfo = SCENARIOS[activeScenarioId] || SCENARIOS.SCENARIO_A;

  const presencasHoje = listPresencasDoDia(dateStr);
  const todasPendencias = listPendencias();
  
  // Alertas imediatos
  const emAtraso = todasPendencias.filter(p => p.situacao.code === 'EM_ATRASO');
  const vencemHoje = todasPendencias.filter(p => p.situacao.code === 'HOJE');
  const vencemEmBreve = todasPendencias.filter(p => p.situacao.code === 'PENDENTE' && p.situacao.daysDiff <= 5);

  const mesAno = dateStr.substring(0, 7);
  const resumoFinanceiro = getResumoFinanceiro(mesAno);

  return {
    dataHoje: dateStr,
    cenarioAtivo: {
      id: activeScenarioId,
      nome: scenarioInfo.name,
      descricao: scenarioInfo.description
    },
    presencas: presencasHoje,
    alertas: {
      totalAlertas: emAtraso.length + vencemHoje.length,
      emAtraso: emAtraso.slice(0, 5), // top 5 mais urgentes
      qtdEmAtraso: emAtraso.length,
      vencemHoje,
      qtdVencemHoje: vencemHoje.length,
      vencemEmBreve
    },
    financeiroMes: resumoFinanceiro
  };
}
