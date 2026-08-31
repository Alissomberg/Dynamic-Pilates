import { 
  listAlunos, 
  getAlunoById, 
  createAluno, 
  updateAluno, 
  updateAlunoHorarios,
  getAlunoHistoricoMensal 
} from '../services/alunosService.js';

export async function alunosRoutes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    const { search, status } = request.query;
    return listAlunos({ search, status });
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const aluno = getAlunoById(id);
    if (!aluno) {
      reply.status(404).send({ error: 'Aluno não encontrado' });
      return;
    }
    return aluno;
  });

  fastify.get('/:id/historico-mensal', async (request, reply) => {
    const { id } = request.params;
    const { mes } = request.query; // 'YYYY-MM'
    const historico = getAlunoHistoricoMensal(id, mes || '2026-08');
    if (!historico) {
      reply.status(404).send({ error: 'Aluno não encontrado' });
      return;
    }
    return historico;
  });

  fastify.put('/:id/horarios', async (request, reply) => {
    const { id } = request.params;
    const { horarios } = request.body || {};
    try {
      const updated = updateAlunoHorarios(id, horarios);
      return updated;
    } catch (err) {
      reply.status(400).send({ error: err.message });
    }
  });

  fastify.post('/', async (request, reply) => {
    const { nome, telefone, observacoes, plano, valor, dia_vencimento, horarios } = request.body || {};
    if (!nome) {
      reply.status(400).send({ error: 'O nome do aluno é obrigatório' });
      return;
    }
    const novoAluno = createAluno({
      nome,
      telefone,
      observacoes,
      plano,
      valor: valor ? Number(valor) : 185,
      dia_vencimento: dia_vencimento ? Number(dia_vencimento) : 10,
      horarios
    });
    reply.status(201).send(novoAluno);
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const updated = updateAluno(id, request.body || {});
    return updated;
  });
}
