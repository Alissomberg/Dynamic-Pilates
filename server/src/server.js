import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config/env.js';
import { initDatabase, db } from './db/db.js';
import { runSeed } from './db/seed.js';

import { dashboardRoutes } from './routes/dashboardRoutes.js';
import { alunosRoutes } from './routes/alunosRoutes.js';
import { presencasRoutes } from './routes/presencasRoutes.js';
import { financeiroRoutes } from './routes/financeiroRoutes.js';
import { scenariosRoutes } from './routes/scenariosRoutes.js';

const fastify = Fastify({
  logger: true
});

// Middlewares
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

await fastify.register(helmet, {
  contentSecurityPolicy: false // Permite carregar recursos na demo local
});

// Inicialização do Banco de Dados
initDatabase();

// Se o banco estiver vazio, roda o seed automaticamente com os 23 alunos reais
const countAlunos = db.prepare('SELECT COUNT(id) AS count FROM alunos').get();
if (!countAlunos || countAlunos.count === 0) {
  console.log('[Server] Banco vazio. Executando seed inicial com dados reais da planilha...');
  runSeed('SCENARIO_A');
}

// Registrar Rotas da API
fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
fastify.register(alunosRoutes, { prefix: '/api/alunos' });
fastify.register(presencasRoutes, { prefix: '/api/presencas' });
fastify.register(financeiroRoutes, { prefix: '/api/financeiro' });
fastify.register(scenariosRoutes, { prefix: '/api/scenarios' });

fastify.get('/api/health', async () => {
  return { status: 'ok', service: 'Dynamic Pilates API', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`\n======================================================`);
    console.log(`🟢 Dynamic Pilates Server executando em http://localhost:${config.port}`);
    console.log(`======================================================\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
