import assert from 'node:assert';
import { 
  listAlunos, 
  getAlunoById, 
  createAluno, 
  updateAlunoHorarios, 
  getAlunoHistoricoMensal 
} from '../src/services/alunosService.js';
import { listPresencasDoDia, registrarPresenca } from '../src/services/presencasService.js';
import { listPendencias, registrarPagamento, getResumoFinanceiro } from '../src/services/financeiroService.js';
import { runSeed } from '../src/db/seed.js';

console.log('🧪 Iniciando bateria de testes complementares do Dynamic Pilates...');

// 1. Resetar banco com seed limpo do dataset rebalanceado
runSeed('SCENARIO_A');

// 2. Testar listagem e distribuição financeira
const alunos = listAlunos();
assert.strictEqual(alunos.length, 22, 'Deve conter exatamente 22 alunos');

const emDia = alunos.filter(a => a.situacaoFinanceira.code === 'EM_DIA');
const emAtraso = alunos.filter(a => a.situacaoFinanceira.code === 'EM_ATRASO');
const venceHoje = alunos.filter(a => a.situacaoFinanceira.code === 'HOJE');
const venceEmBreve = alunos.filter(a => a.situacaoFinanceira.code === 'PENDENTE');

assert.ok(emDia.length >= 14, `A maioria dos alunos (${emDia.length}/22) deve estar Em Dia`);
assert.ok(emAtraso.length <= 4, `Poucos alunos (${emAtraso.length}/22) devem estar Em Atraso`);
console.log(`✓ Teste 1: Distribuição financeira rebalanceada validada: ${emDia.length} Em Dia (${Math.round(emDia.length/22*100)}%), ${venceEmBreve.length} Vencendo em Breve, ${venceHoje.length} Vence Hoje, ${emAtraso.length} Em Atraso`);

// 3. Testar Histórico Mensal Paginado (Presença e Financeiro)
const camila = alunos.find(a => a.nome === 'Camila Silveira');
const histJulho = getAlunoHistoricoMensal(camila.id, '2026-07');
assert.ok(histJulho, 'Deve retornar histórico de julho');
assert.ok(histJulho.financeiro.totalPago > 0, 'Julho deve ter pagamento registrado');
assert.strictEqual(histJulho.financeiro.status, 'EM_DIA');
assert.ok(histJulho.frequencia.totalAulas > 0, 'Julho deve ter registros de presença');
console.log(`✓ Teste 2: Histórico mensal paginado validado para Julho 2026: Frequência ${histJulho.frequencia.frequenciaPercentual}% (${histJulho.frequencia.totalPresentes}/${histJulho.frequencia.totalAulas} aulas) | Pago: R$ ${histJulho.financeiro.totalPago}`);

// 4. Testar Remarcação de Horário e Preservação de Histórico Passado
const beatriz = alunos.find(a => a.nome === 'Beatriz Fontes');
// Horário original: Seg e Qua 08:00
const histPresencaAntes = getAlunoHistoricoMensal(beatriz.id, '2026-07');
const countPresencasAntes = histPresencaAntes.frequencia.totalAulas;
assert.ok(countPresencasAntes > 0, 'Beatriz deve ter presenças em Julho');

// Remarcar Beatriz para Terça e Quinta às 16:00
const beatrizRemarcada = updateAlunoHorarios(beatriz.id, [
  { dia: 2, hora: '16:00' },
  { dia: 4, hora: '16:00' }
]);
assert.strictEqual(beatrizRemarcada.horarios[0].dia_semana, 2);
assert.strictEqual(beatrizRemarcada.horarios[0].horario, '16:00');

// Verificar se as presenças de Julho foram 100% preservadas
const histPresencaDepois = getAlunoHistoricoMensal(beatriz.id, '2026-07');
assert.strictEqual(histPresencaDepois.frequencia.totalAulas, countPresencasAntes, 'Histórico de presença de Julho deve permanecer inalterado após remarcação');
console.log(`✓ Teste 3: Remarcação efetuada com sucesso e histórico de ${countPresencasAntes} presenças passadas preservado integralmente!`);

// 5. Testar reflexo da remarcação na tela de presença da Terça-feira (01/09)
const presencaTerca = listPresencasDoDia('2026-09-01');
const beatrizNaTerca = presencaTerca.horarios
  .find(h => h.horario === '16:00')
  ?.alunos.find(a => a.id === beatriz.id);

assert.ok(beatrizNaTerca, 'Beatriz deve agora aparecer na lista de Terça-feira às 16:00');
console.log('✓ Teste 4: Aluno remarcado passou a constar imediatamente na grade de presença do novo dia/horário');

console.log('\n🎉 TODOS OS TESTES COMPLEMENTARES PASSARAM COM SUCESSO (100%)!');
