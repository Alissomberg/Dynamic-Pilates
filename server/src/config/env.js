import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  host: process.env.HOST || '0.0.0.0',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/zello.db'),
  storagePath: process.env.STORAGE_PATH || path.resolve(__dirname, '../../data/storage'),
  releasesPath: process.env.RELEASES_PATH || path.resolve(__dirname, '../../releases'),
  publicBaseUrl: String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  tokenPepper: process.env.TOKEN_PEPPER || 'dev-only-change-me',
  backupEncryptionKey: process.env.BACKUP_ENCRYPTION_KEY || 'dev-only-backup-key-change-me',
  maxBackupBytes: Number(process.env.MAX_BACKUP_BYTES || 20 * 1024 * 1024),
  maxBackupsPerAccount: Number(process.env.MAX_BACKUPS_PER_ACCOUNT || 10),
  corsOrigin: process.env.CORS_ORIGIN || true,
  activeScenario: 'SCENARIO_A' // Mantido apenas para as rotas legadas.
};
