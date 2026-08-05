import { existsSync, readFileSync } from 'node:fs';

function parseVars(source) {
  const result = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}

const varsPath = new URL('../.dev.vars', import.meta.url);
const localVars = existsSync(varsPath) ? parseVars(readFileSync(varsPath, 'utf8')) : {};
const target = String(process.env.TARGET_URL || localVars.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const setupKey = process.env.SETUP_KEY || localVars.SETUP_KEY;

if (!setupKey || /^troque-/i.test(setupKey)) {
  console.error('ERRO: informe SETUP_KEY em .dev.vars ou na variável de ambiente SETUP_KEY.');
  process.exit(1);
}
if (!/^https:\/\//i.test(target) && !/^http:\/\/localhost(?::\d+)?$/i.test(target)) {
  console.error('ERRO: TARGET_URL deve usar HTTPS, exceto no localhost.');
  process.exit(1);
}

const response = await fetch(`${target}/api/setup/auth-migrate`, {
  method: 'POST',
  headers: { 'x-setup-key': setupKey },
  signal: AbortSignal.timeout(30_000),
});
const payload = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`ERRO: migração recusada (${response.status}).`);
  console.error(payload.message || 'Verifique ENABLE_SETUP e SETUP_KEY.');
  process.exit(1);
}
console.log(payload.message || 'Migrações do Better Auth aplicadas.');
