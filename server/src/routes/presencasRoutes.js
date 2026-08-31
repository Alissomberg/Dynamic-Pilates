import { listPresencasDoDia, registrarPresenca } from '../services/presencasService.js';

export async function presencasRoutes(fastify, options) {
  fastify.get('/dia', async (request, reply) => {
    const { data } = request.query;
    return listPresencasDoDia(data);
  });

  fastify.post('/checkin', async (request, reply) => {
    const { alunoId, data, horario, status } = request.body || {};
    if (!alunoId || !data || !horario || !status) {
      reply.status(400).send({ error: 'Campos obrigatórios: alunoId, data, horario, status.' });
      return;
    }
    return registrarPresenca({ alunoId, data, horario, status });
  });
}
