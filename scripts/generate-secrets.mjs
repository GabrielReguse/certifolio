import { randomBytes } from 'node:crypto';

function secret() {
  return randomBytes(36).toString('base64url');
}

console.log('\nCole estes valores no arquivo .dev.vars:\n');
console.log(`BETTER_AUTH_SECRET=${secret()}`);
console.log(`AUDIT_HASH_SECRET=${secret()}`);
console.log(`SETUP_KEY=${secret()}`);
console.log('\nNa produção, cadastre cada segredo com `npx wrangler secret put NOME`.\n');
