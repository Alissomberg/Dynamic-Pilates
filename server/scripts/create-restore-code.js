import { initDatabase } from '../src/db/db.js';
import { createRestoreCode } from '../src/services/cloudService.js';

const args = process.argv.slice(2);
const index = args.indexOf('--account');
const accountId = index >= 0 ? args[index + 1] : '';
if (!accountId) {
  console.error('Uso: npm run restore-code:create -- --account ID_DA_CONTA');
  process.exit(1);
}

initDatabase();
console.log(JSON.stringify(createRestoreCode(accountId), null, 2));
