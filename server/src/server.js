import { buildServer } from './app.js';
import { config } from './config/env.js';

const start = async () => {
  const server = await buildServer();
  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`\n======================================================`);
    console.log(`🟢 Zello Cloud Server executando em http://localhost:${config.port}`);
    console.log(`======================================================\n`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start();
