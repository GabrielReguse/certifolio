import { existsSync, readFileSync } from 'node:fs';

const production = process.argv.includes('--production');
const failures = [];
const warnings = [];

function parseEnv(source) {
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

function validHttpUrl(value, allowLocalhost = false) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return allowLocalhost && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isPlaceholder(value) {
  return !value || /^(troque-|seu-|sua-|cole_aqui|https:\/\/seu-dominio)/i.test(value);
}

if (production) {
  const wranglerPath = new URL('../wrangler.jsonc', import.meta.url);
  const wranglerText = readFileSync(wranglerPath, 'utf8').replace(/^\uFEFF/, '');
  let config;
  try {
    config = JSON.parse(wranglerText);
  } catch (error) {
    console.error('ERRO: wrangler.jsonc não contém JSON válido.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const database = config?.d1_databases?.find((entry) => entry.binding === 'DB');
  if (!database) failures.push('Adicione o binding D1 chamado DB em wrangler.jsonc.');
  if (isPlaceholder(database?.database_id)) failures.push('Preencha o database_id do D1 em wrangler.jsonc.');

  const vars = config?.vars || {};
  const appUrl = String(vars.APP_URL || '');
  const authUrl = String(vars.BETTER_AUTH_URL || '');
  if (!validHttpUrl(appUrl)) failures.push('APP_URL precisa ser uma URL HTTPS de produção.');
  if (!validHttpUrl(authUrl)) failures.push('BETTER_AUTH_URL precisa ser uma URL HTTPS de produção.');
  if (validHttpUrl(appUrl) && validHttpUrl(authUrl) && new URL(appUrl).origin !== new URL(authUrl).origin) {
    warnings.push('APP_URL e BETTER_AUTH_URL usam origens diferentes. Confirme se isso é intencional.');
  }
  if (vars.REQUIRE_EMAIL_VERIFICATION !== 'true') {
    warnings.push('Verificação de e-mail desativada em produção.');
  }
  if (vars.ENABLE_SETUP !== 'false') failures.push('Mantenha ENABLE_SETUP=false no lançamento. Ative somente durante a migração inicial do Better Auth.');
  if (
    vars.REQUIRE_EMAIL_VERIFICATION === 'true'
    && (!vars.EMAIL_FROM || /SEU-DOMINIO/i.test(String(vars.EMAIL_FROM)))
  ) {
    failures.push('Preencha EMAIL_FROM com um remetente verificado no Resend.');
  }

  const forbiddenPublicVars = [
    'BETTER_AUTH_SECRET',
    'AUDIT_HASH_SECRET',
    'SETUP_KEY',
    'CLOUDINARY_API_SECRET',
    'RESEND_API_KEY',
    'GOOGLE_CLIENT_SECRET',
    'TURNSTILE_SECRET_KEY',
  ];
  for (const name of forbiddenPublicVars) {
    if (Object.hasOwn(vars, name)) failures.push(`${name} não deve ficar em vars; cadastre com \`wrangler secret put ${name}\`.`);
  }
} else {
  const varsPath = new URL('../.dev.vars', import.meta.url);
  if (!existsSync(varsPath)) {
    failures.push('.dev.vars não existe. Copie .dev.vars.example para .dev.vars.');
  } else {
    const vars = parseEnv(readFileSync(varsPath, 'utf8'));
    const requiredSecrets = ['BETTER_AUTH_SECRET', 'AUDIT_HASH_SECRET'];
    for (const name of requiredSecrets) {
      const value = String(vars[name] || '');
      if (isPlaceholder(value) || value.length < 32) failures.push(`${name} precisa ter ao menos 32 caracteres aleatórios em .dev.vars.`);
    }
    if (vars.BETTER_AUTH_SECRET && vars.BETTER_AUTH_SECRET === vars.AUDIT_HASH_SECRET) {
      failures.push('BETTER_AUTH_SECRET e AUDIT_HASH_SECRET precisam ser diferentes.');
    }
    if (vars.ENABLE_SETUP === 'true') {
      const setupKey = String(vars.SETUP_KEY || '');
      if (isPlaceholder(setupKey) || setupKey.length < 32) failures.push('SETUP_KEY precisa ter ao menos 32 caracteres quando ENABLE_SETUP=true.');
    }

    for (const name of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      if (isPlaceholder(String(vars[name] || ''))) failures.push(`${name} ainda não foi configurado em .dev.vars.`);
    }

    for (const name of ['APP_URL', 'BETTER_AUTH_URL']) {
      if (!validHttpUrl(String(vars[name] || ''), true)) failures.push(`${name} precisa usar HTTPS ou localhost em desenvolvimento.`);
    }
    if (vars.REQUIRE_EMAIL_VERIFICATION === 'true' && !vars.RESEND_API_KEY) {
      failures.push('RESEND_API_KEY é obrigatório quando REQUIRE_EMAIL_VERIFICATION=true.');
    }
  }
}

for (const warning of warnings) console.warn(`AVISO: ${warning}`);
for (const failure of failures) console.error(`ERRO: ${failure}`);

if (failures.length) process.exitCode = 1;
else console.log(production ? 'Configuração pública de produção conferida.' : 'Configuração local conferida.');
