import { config } from '../config/env.js';
import {
  findAccountByToken,
  getBackupStatus,
  publicAccount,
  readReleaseManifest,
  restoreLatestBackup,
  saveBackup
} from '../services/cloudService.js';

function bearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function cloudRoutes(fastify) {
  fastify.decorateRequest('cloudAccount', null);

  const authenticate = async (request, reply) => {
    const account = findAccountByToken(bearerToken(request));
    if (!account) return reply.code(401).send({ error: 'Token inválido ou desativado.' });
    request.cloudAccount = account;
  };

  fastify.post('/auth/validate', { preHandler: authenticate }, async (request) => {
    fastify.db.prepare('UPDATE cloud_accounts SET last_login_at = ? WHERE id = ?')
      .run(new Date().toISOString(), request.cloudAccount.id);
    return { account: publicAccount(request.cloudAccount) };
  });

  fastify.get('/account', { preHandler: authenticate }, async (request) => ({
    account: publicAccount(request.cloudAccount)
  }));

  fastify.get('/backups/status', { preHandler: authenticate }, async (request) => ({
    latest: getBackupStatus(request.cloudAccount.id)
  }));

  fastify.post('/backups', { preHandler: authenticate }, async (request, reply) => {
    const result = await saveBackup(request.cloudAccount, request.body);
    return reply.code(201).send({ backup: result });
  });

  fastify.post('/backups/restore', { preHandler: authenticate }, async (request, reply) => {
    const code = String(request.body?.code || '').trim().toUpperCase();
    if (!code) return reply.code(400).send({ error: 'Informe o código fornecido pelo suporte.' });
    return restoreLatestBackup(request.cloudAccount.id, code);
  });

  fastify.get('/updates/latest', { preHandler: authenticate }, async (request) => {
    const release = await readReleaseManifest();
    if (!release) return { available: false, release: null };
    const baseUrl = config.publicBaseUrl || `${request.protocol}://${request.headers.host}`;
    return {
      available: true,
      release: {
        ...release,
        downloadUrl: `${baseUrl}/downloads/${encodeURIComponent(release.fileName)}`
      }
    };
  });
}
