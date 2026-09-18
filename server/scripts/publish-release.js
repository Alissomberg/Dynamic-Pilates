import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../src/config/env.js';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const apk = value('--apk');
const version = value('--version');
const versionCode = Number(value('--version-code'));
const notes = value('--notes', 'Correções e melhorias.');
if (!apk || !version || !Number.isInteger(versionCode)) {
  console.error('Uso: npm run release:publish -- --apk caminho.apk --version 1.1.0 --version-code 2 --notes "Novidades"');
  process.exit(1);
}

const bytes = await fs.readFile(path.resolve(apk));
const fileName = `zello-${version}.apk`;
await fs.mkdir(config.releasesPath, { recursive: true });
await fs.writeFile(path.join(config.releasesPath, fileName), bytes);
const manifest = {
  version,
  versionCode,
  notes,
  fileName,
  sizeBytes: bytes.byteLength,
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  publishedAt: new Date().toISOString()
};
await fs.writeFile(path.join(config.releasesPath, 'release.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
