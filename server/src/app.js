import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { config } from './config/env.js';
import { initDatabase, db } from './db/db.js';
import { cloudRoutes } from './routes/cloudRoutes.js';

export async function buildServer({ logger = true } = {}) {
  const fastify = Fastify({
    logger,
    bodyLimit: config.maxBackupBytes + 1024 * 1024
  });

  await fastify.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });
  await fastify.register(helmet, { contentSecurityPolicy: false });

  initDatabase();
  fastify.decorate('db', db);

  fs.mkdirSync(config.releasesPath, { recursive: true });
  await fastify.register(fastifyStatic, {
    root: config.releasesPath,
    prefix: '/downloads/',
    decorateReply: false
  });

  fastify.register(cloudRoutes, { prefix: '/api/v1' });

  fastify.get('/api/health', async () => ({
    status: 'ok',
    service: 'Zello Cloud API',
    timestamp: new Date().toISOString()
  }));

  return fastify;
}
