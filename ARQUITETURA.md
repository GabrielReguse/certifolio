# Arquitetura do Certifólio 1.0

```text
Navegador React
    │
    ├── páginas públicas
    └── /api/*
          │
          ▼
Cloudflare Worker + Hono
    ├── Better Auth
    ├── autorização e rate limiting
    ├── validação Zod
    ├── regras de negócio
    ├── D1: dados relacionais e filas
    ├── Cloudinary: arquivos autenticados
    ├── Resend: e-mails transacionais
    └── Turnstile: proteção de cadastro
```

## Camadas

- `src/`: interface, navegação, estados, chamadas HTTP e estilos separados por responsabilidade;
- `worker/routes/`: endpoints e autorização contextual;
- `worker/utils/`: serviços de arquivos, auditoria, limites e validação;
- `worker/db/`: schema Drizzle e acesso ao D1;
- `migrations/`: evolução versionada do banco;
- `scripts/`: instalação, diagnóstico e validação.

## Arquivos

PDFs são armazenados como `raw/authenticated`; JPG, PNG e WebP como `image/authenticated`.

```text
React
  → Worker recebe multipart
  → verifica sessão e propriedade do curso
  → valida tamanho, MIME e assinatura mágica
  → reserva a cota de forma atômica
  → calcula SHA-256 e bloqueia duplicatas
  → envia ao Cloudinary
  → grava somente metadados no D1
```

O API Secret nunca é enviado ao navegador. Downloads privados usam uma URL assinada e temporária gerada pelo Worker.

## Exclusões externas

A remoção do registro e a remoção no Cloudinary não dependem de uma única requisição.

```text
solicitação de exclusão
  → D1 registra asset_deletion_queue
  → dado deixa de aparecer para o usuário
  → Worker tenta remover o ativo
  → falha recebe backoff exponencial
  → cron repete até 10 tentativas
```

Isso evita contas ou cursos presos porque um serviço externo ficou indisponível.

A exclusão de conta possui uma segunda fila, `account_deletion_queue`. O pedido é registrado antes da remoção no Better Auth, mas os dados do produto só são eliminados depois que o usuário realmente desaparece da tabela de autenticação. Falhas recebem novas tentativas, evitando a situação em que a autenticação é apagada e os dados ficam inacessíveis sem serem removidos.

## Cota

A tabela `user_storage_usage` reserva espaço antes do upload por meio de `UPSERT ... RETURNING`. Dessa forma, uploads simultâneos não ultrapassam silenciosamente os limites.

```text
Arquivo individual de curso  20 MB
Avatar ou banner              5 MB
Arquivos ativos por conta     50
Espaço ativo por conta        100 MB
```

## Instituições

Instituições continuam deduplicadas pelo nome normalizado, mas o website informado pelo usuário fica salvo no próprio curso. Ele não altera o cadastro global nem aparece nas contas de outras pessoas. Um endereço global só pode vir de uma instituição marcada como oficial. Isso reduz risco de phishing por apropriação de nomes conhecidos.

## Auditoria e retenção

Os IPs não são armazenados diretamente. O Worker calcula HMAC-SHA-256 usando `AUDIT_HASH_SECRET`. Um cron remove logs de auditoria com mais de 365 dias e entradas expiradas de rate limiting.

## Segurança HTTP

A API aplica:

- Content Security Policy;
- `frame-ancestors 'none'`;
- `object-src 'none'`;
- política restritiva de permissões;
- validação de `Origin` em métodos mutáveis;
- `Cache-Control: no-store` por padrão na API;
- cookies seguros quando o endereço base usa HTTPS.

## Banco e instalação

As migrações em `migrations/` criam as tabelas do produto. As tabelas internas do Better Auth são aplicadas por uma rota de setup que:

- fica desativada por padrão;
- exige uma chave temporária;
- possui rate limiting;
- deve ser desativada e ter a chave removida logo após o uso.
