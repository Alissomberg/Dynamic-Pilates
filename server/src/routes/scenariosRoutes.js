import { db } from '../db/db.js';
import { SCENARIOS } from '../rules/billingEngine.js';
import { runSeed } from '../db/seed.js';

export async function scenariosRoutes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    const current = db.prepare("SELECT value FROM system_settings WHERE key = 'active_scenario'").get();
    const activeId = current ? current.value : 'SCENARIO_A';
    
    return {
      activeScenario: activeId,
      availableScenarios: Object.values(SCENARIOS)
    };
  });

  fastify.post('/select', async (request, reply) => {
    const { scenarioId, resetData = false } = request.body || {};
    if (!SCENARIOS[scenarioId]) {
      reply.status(400).send({ error: 'Cenário inválido' });
      return;
    }

    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('active_scenario', ?)").run(scenarioId);

    if (resetData) {
      runSeed(scenarioId);
    }

    return {
      success: true,
      activeScenario: scenarioId,
      scenarioDetails: SCENARIOS[scenarioId]
    };
  });

  fastify.post('/reset', async (request, reply) => {
    const current = db.prepare("SELECT value FROM system_settings WHERE key = 'active_scenario'").get();
    const activeId = current ? current.value : 'SCENARIO_A';
    runSeed(activeId);
    return { success: true, message: 'Dados de demonstração restaurados com sucesso!' };
  });
}
