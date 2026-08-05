# Configuração do Certifólio

Este é o único trabalho manual obrigatório antes de criar o repositório e publicar.

## 1. Segurança primeiro

Revogue e recrie qualquer chave que tenha aparecido em um ZIP, mensagem, captura de tela ou commit anterior:

- Better Auth secret;
- setup key;
- Cloudinary API Key e API Secret;
- chaves do Resend, Google ou Turnstile, caso já tenham sido compartilhadas.

O projeto entregue não contém `.dev.vars`, banco local, sessões, usuários ou arquivos enviados.

## 2. Instalar dependências

```powershell
npm ci
```

## 3. Configuração local

```powershell
Copy-Item .dev.vars.example .dev.vars
npm run secrets:generate
```

Cole os valores permanentes em:

```env
BETTER_AUTH_SECRET=
AUDIT_HASH_SECRET=
```

Guarde o `SETUP_KEY` gerado apenas para as migrações temporárias.

Preencha também:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Confirme:

```powershell
npm run config:check
npm run cloudinary:check
```

### Serviços opcionais em desenvolvimento

```env
RESEND_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TURNSTILE_SECRET_KEY=
TURNSTILE_SITE_KEY=
```

Sem Resend, mantenha `REQUIRE_EMAIL_VERIFICATION=false` localmente.

## 4. Criar o D1

Entre na Cloudflare:

```powershell
npm run cf:login
npm run db:create
```

Copie o `database_id` retornado e substitua `COLE_AQUI_O_DATABASE_ID` em `wrangler.jsonc`.

Aplique as migrações do produto:

```powershell
npm run db:migrate:local
npm run db:migrate:remote
```

## 5. Migrar o Better Auth localmente

No `.dev.vars`, altere temporariamente:

```env
ENABLE_SETUP=true
SETUP_KEY=cole-a-chave-gerada
```

Terminal 1:

```powershell
npm run dev
```

Terminal 2:

```powershell
npm run auth:migrate
```

Depois altere no seu `.dev.vars`:

```env
ENABLE_SETUP=false
SETUP_KEY=
```

## 6. Preparar o `wrangler.jsonc`

Troque:

```json
"APP_URL": "https://SEU-DOMINIO.com",
"BETTER_AUTH_URL": "https://SEU-DOMINIO.com",
"EMAIL_FROM": "Certifólio <contato@SEU-DOMINIO.com>"
```

Use o domínio final HTTPS. O remetente precisa estar verificado no Resend.

Confirme:

```powershell
npm run config:check:production
```

## 7. Cadastrar segredos na Cloudflare

Execute um comando por variável e cole o valor quando o Wrangler pedir:

```powershell
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put AUDIT_HASH_SECRET
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
npx wrangler secret put RESEND_API_KEY
```

Opcionais:

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put TURNSTILE_SITE_KEY
```

`TURNSTILE_SITE_KEY` e os identificadores públicos não são confidenciais, mas podem ser mantidos como secrets para simplificar a configuração.

## 8. Migração inicial do Better Auth em produção

Cadastre uma chave temporária:

```powershell
npx wrangler secret put SETUP_KEY
```

Altere temporariamente em `wrangler.jsonc`:

```json
"ENABLE_SETUP": "true"
```

Faça o primeiro deploy:

```powershell
npm run build
npx wrangler deploy
```

No PowerShell, informe o endereço publicado e execute a migração:

```powershell
$env:TARGET_URL="https://seu-dominio.com"
$env:SETUP_KEY="a-mesma-chave-cadastrada-na-cloudflare"
npm run auth:migrate
```

Imediatamente depois:

1. volte `ENABLE_SETUP` para `false`;
2. faça outro deploy;
3. remova a chave temporária:

```powershell
npx wrangler secret delete SETUP_KEY
```

## 9. Validar e publicar

```powershell
npm run prepare:repo
npm run security:check
npm run config:check:production
npm run deploy
```

Verifique após o deploy:

- `/api/health` retorna `status: ok`;
- cadastro e login funcionam;
- e-mail de verificação chega;
- upload e download funcionam;
- exclusão de arquivo e conta entram na fila de limpeza;
- o perfil privado não abre sem autenticação;
- cursos públicos e não listados respeitam a visibilidade escolhida.
