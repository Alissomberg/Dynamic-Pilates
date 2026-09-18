import test from 'node:test';
import assert from 'node:assert/strict';
import { dateUtils } from '../src/services/api.js';

test('plano trimestral avança exatamente três meses', () => {
  assert.equal(dateUtils.addMonths('2026-09-10', 3, 10), '2026-12-10');
  assert.equal(dateUtils.firstDueDate('2026-08-19', 18, 3), '2026-11-18');
});

test('vencimento no fim do mês é limitado ao último dia disponível', () => {
  assert.equal(dateUtils.addMonths('2026-01-31', 1, 31), '2026-02-28');
});

test('situação financeira diferencia hoje, atraso e futuro', () => {
  assert.equal(dateUtils.financialStatus('2026-09-10', '2026-09-10').code, 'HOJE');
  assert.equal(dateUtils.financialStatus('2026-09-09', '2026-09-10').code, 'EM_ATRASO');
  assert.equal(dateUtils.financialStatus('2026-09-13', '2026-09-10').code, 'PENDENTE');
  assert.equal(dateUtils.financialStatus('2026-09-20', '2026-09-10').code, 'EM_DIA');
});
