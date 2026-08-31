import { getDashboardToday } from '../services/dashboardService.js';

export async function dashboardRoutes(fastify, options) {
  fastify.get('/today', async (request, reply) => {
    const { data } = request.query;
    return getDashboardToday(data);
  });
}
