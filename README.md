# Certifólio

Aplicação full stack para organizar cursos, certificados, instituições, habilidades, metas de estudo e um portfólio público personalizável.

## Stack

- React 19, Vite e TypeScript;
- Cloudflare Workers e Hono;
- Cloudflare D1 e Drizzle ORM;
- Better Auth;
- Cloudinary para arquivos privados;
- Zod;
- Resend, Google OAuth e Cloudflare Turnstile opcionais.

## Estado da versão 1.0

O repositório foi preparado para publicação sem credenciais, banco local, dependências instaladas ou artefatos de build. Antes do primeiro deploy, siga [`CONFIGURACAO.md`](./CONFIGURACAO.md).

> As credenciais que já tenham aparecido em ZIPs, mensagens ou commits anteriores devem ser revogadas e recriadas. Não reutilize segredos expostos.

## Desenvolvimento local

Requisitos: Node.js 22.12 ou superior e uma conta Cloudflare.

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars
npm run secrets:generate
```

Copie os três valores gerados para `.dev.vars`, preencha o Cloudinary e execute:

```powershell
npm run config:check
npm run cloudinary:check
npm run db:migrate:local
npm run dev
```

Para criar as tabelas internas do Better Auth, altere temporariamente `ENABLE_SETUP=true` no `.dev.vars`, abra o servidor e execute em outro terminal:

```powershell
npm run auth:migrate
```

Depois volte `ENABLE_SETUP=false` e remova o valor local de `SETUP_KEY`.

## Validação

```powershell
npm run typecheck
npm run build
npm run security:check
```

O comando abaixo limpa artefatos locais e confirma TypeScript + build:

```powershell
npm run prepare:repo
```

## Scripts principais

| Comando | Finalidade |
|---|---|
| `npm run dev` | Desenvolvimento local |
| `npm run build` | TypeScript e build de produção |
| `npm run check` | Verificação completa de compilação |
| `npm run config:check` | Validação do `.dev.vars` local |
| `npm run config:check:production` | Validação do `wrangler.jsonc` |
| `npm run cloudinary:check` | Teste das credenciais sem upload |
| `npm run db:migrate:local` | Migrações do produto no D1 local |
| `npm run db:migrate:remote` | Migrações do produto no D1 remoto |
| `npm run auth:migrate` | Migrações internas do Better Auth |
| `npm run deploy` | Validação, build e deploy |

## Segurança implementada

- autorização por proprietário no servidor;
- arquivos `authenticated` no Cloudinary;
- URLs temporárias para downloads privados;
- validação de MIME, assinatura mágica e tamanho;
- limite atômico de 50 arquivos e 100 MB por conta;
- bloqueio de uploads duplicados por checksum;
- filas duráveis para exclusões externas e de conta, com novas tentativas;
- rate limiting persistente no D1;
- validação de origem em requisições mutáveis;
- Content Security Policy e headers defensivos;
- cookies seguros em HTTPS;
- validação estrita com Zod;
- hash HMAC de IP nos registros de auditoria;
- retenção automática de auditoria por 365 dias;
- verificação de e-mail obrigatória na configuração de produção;
- rota de instalação desativada por padrão.

## Estrutura

```text
src/            interface React
worker/         API e regras de negócio
migrations/     schema e evoluções do D1
scripts/        validação e instalação
public/         assets estáticos
```

Mais detalhes em [`ARQUITETURA.md`](./ARQUITETURA.md) e [`SECURITY.md`](./SECURITY.md).
