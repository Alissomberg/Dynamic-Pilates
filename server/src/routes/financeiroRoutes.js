import { listPendencias, registrarPagamento, getHistoricoFinanceiro, getResumoFinanceiro } from '../services/financeiroService.js';

export async function financeiroRoutes(fastify, options) {
  fastify.get('/pendencias', async (request, reply) => {
    return listPendencias();
  });

  fastify.get('/historico', async (request, reply) => {
    const { limit } = request.query;
    return getHistoricoFinanceiro({ limit: limit ? Number(limit) : 50 });
  });

  fastify.get('/resumo', async (request, reply) => {
    const { mesAno } = request.query;
    return getResumoFinanceiro(mesAno);
  });

  fastify.post('/pagamento', async (request, reply) => {
    const { alunoId, cobrancaId, valorPago, dataPagamento, formaPagamento, observacao } = request.body || {};
    if (!alunoId) {
      reply.status(400).send({ error: 'alunoId é obrigatório' });
      return;
    }
    const resultado = registrarPagamento({
      alunoId,
      cobrancaId,
      valorPago,
      dataPagamento,
      formaPagamento,
      observacao
    });
    reply.status(201).send(resultado);
  });
}
