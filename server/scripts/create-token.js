import { initDatabase } from '../src/db/db.js';
import { createAccountToken } from '../src/services/cloudService.js';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

initDatabase();
const complimentary = value('--complimentary', 'true').toLowerCase() !== 'false';
const result = createAccountToken(value('--name', 'Cliente Zello'), value('--support', 'premium'), complimentary);
console.log(JSON.stringify(result, null, 2));
console.log('\nGuarde o token com segurança: ele não poderá ser consultado novamente.');
