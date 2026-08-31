import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  host: process.env.HOST || '0.0.0.0',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/dynamic_pilates.db'),
  activeScenario: 'SCENARIO_A' // 'SCENARIO_A' | 'SCENARIO_B'
};
