import { existsSync, readFileSync } from 'node:fs';

const varsPath = new URL('../.dev.vars', import.meta.url);
if (!existsSync(varsPath)) {
  console.error('ERRO: .dev.vars não existe. Copie .dev.vars.example para .dev.vars primeiro.');
  process.exit(1);
}

function parseVars(source) {
  const result = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const vars = parseVars(readFileSync(varsPath, 'utf8'));
const cloudName = vars.CLOUDINARY_CLOUD_NAME;
const apiKey = vars.CLOUDINARY_API_KEY;
const apiSecret = vars.CLOUDINARY_API_SECRET;

const missing = [
  ['CLOUDINARY_CLOUD_NAME', cloudName],
  ['CLOUDINARY_API_KEY', apiKey],
  ['CLOUDINARY_API_SECRET', apiSecret],
].filter(([, value]) => !value || /^(seu|sua)-/i.test(value));

if (missing.length) {
  for (const [name] of missing) console.error(`ERRO: ${name} ainda não foi preenchido em .dev.vars.`);
  process.exit(1);
}

const authorization = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64');
const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/ping`;

try {
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${authorization}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`ERRO: o Cloudinary recusou as credenciais (${response.status}).`);
    if (payload?.error?.message) console.error(`Motivo: ${payload.error.message}`);
    process.exit(1);
  }
  console.log('Cloudinary conectado com sucesso.');
  console.log(`Cloud name: ${cloudName}`);
  console.log(`Status: ${payload.status || 'ok'}`);
  console.log('Nenhum arquivo foi enviado e o API Secret não foi exibido.');
} catch (error) {
  console.error('ERRO: não foi possível alcançar a API do Cloudinary.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
