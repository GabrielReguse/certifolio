<div align="center">

# Certifólio

**Todo curso conta. Faça ele aparecer.**

Uma plataforma full stack para organizar cursos, certificados e metas de aprendizagem — e transformar tudo isso em um portfólio profissional, apresentável e personalizável.

![React](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-6C63FF)
![Privacidade](https://img.shields.io/badge/privacidade-por%20padrão-198754)

</div>

---

## Sobre o projeto

O **Certifólio** centraliza a trajetória de aprendizagem de uma pessoa em um único lugar. Em vez de certificados espalhados, planilhas desatualizadas e pastas difíceis de apresentar, a plataforma reúne cursos, instituições, tecnologias, carga horária e objetivos em uma experiência organizada.

O usuário mantém o controle sobre o que permanece privado e o que aparece em seu perfil público.

## Principais recursos

| Recurso | O que oferece |
|---|---|
| **Gestão de cursos** | Cadastro, edição, pesquisa, organização e recuperação de cursos excluídos. |
| **Certificados protegidos** | Armazenamento de comprovantes com acesso controlado e privacidade por padrão. |
| **Instituições automáticas** | Agrupamento dos cursos por instituição sem depender de pastas criadas manualmente. |
| **Perfil público** | Página compartilhável para apresentar formação, tecnologias e trajetória profissional. |
| **Personalização** | Foto, banner, identidade visual e preferências de aparência do perfil. |
| **Metas de aprendizagem** | Criação de objetivos e acompanhamento do que deve ser estudado a seguir. |
| **Compartilhamento seletivo** | Controle individual sobre a visibilidade de cursos e informações do perfil. |
| **Conta e autenticação** | Cadastro, login, verificação de e-mail e recuperação segura de acesso. |

## Princípios do produto

- **Privado por padrão:** o usuário decide o que será publicado.
- **Organização sem atrito:** cursos e instituições permanecem estruturados automaticamente.
- **Apresentação profissional:** o perfil público foi pensado para recrutadores, escolas e clientes.
- **Experiência responsiva:** navegação adaptada para diferentes tamanhos de tela.
- **Segurança no servidor:** permissões e regras de negócio não dependem apenas da interface.

## Stack

| Camada | Tecnologias |
|---|---|
| **Interface** | React 19, TypeScript e Vite |
| **API** | Hono executado em Cloudflare Workers |
| **Banco de dados** | Cloudflare D1 e Drizzle ORM |
| **Autenticação** | Better Auth |
| **Validação** | Zod |
| **Arquivos** | Cloudinary com acesso restrito |
| **Integrações opcionais** | Resend, Google OAuth e Cloudflare Turnstile |

## Arquitetura

```text
Navegador
   │
   ▼
React + TypeScript
   │
   ▼
Cloudflare Worker + Hono
   ├── autenticação e autorização
   ├── regras de negócio e validação
   ├── Cloudflare D1 + Drizzle ORM
   └── armazenamento protegido de mídia
```

A interface nunca deve ser tratada como fronteira de segurança. As operações sensíveis são validadas novamente no servidor antes de acessar dados ou arquivos.

## Estrutura do projeto

```text
certifolio/
├── public/          # arquivos estáticos
├── src/             # interface React
├── worker/          # API, autenticação e regras de negócio
├── migrations/      # evolução versionada do banco de dados
├── scripts/         # validações e utilitários de manutenção
├── package.json     # dependências e comandos do projeto
└── wrangler.jsonc   # configuração não secreta do Worker
```

## Executando localmente

### Requisitos

- Node.js **22.12 ou superior**;
- npm;
- uma conta Cloudflare para recursos locais e implantação;
- credenciais próprias para os serviços externos utilizados.

### Instalação

```bash
git clone https://github.com/GabrielReguse/certifolio.git
cd certifolio
npm ci
```

Crie o arquivo local de ambiente a partir do modelo versionado:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

No Linux ou macOS:

```bash
cp .dev.vars.example .dev.vars
```

Preencha o arquivo somente com credenciais próprias. Nunca utilize valores reais em commits, capturas de tela, issues ou exemplos de documentação.

Depois, execute:

```bash
npm run secrets:generate
npm run config:check
npm run db:migrate:local
npm run dev
```

O ambiente de desenvolvimento será iniciado pelo Vite. Procedimentos de provisionamento administrativo e configuração de produção devem ser executados apenas por mantenedores autorizados.

## Scripts disponíveis

| Comando | Finalidade |
|---|---|
| `npm run dev` | Inicia o ambiente de desenvolvimento. |
| `npm run build` | Executa a compilação TypeScript e gera o build de produção. |
| `npm run preview` | Abre localmente o build gerado. |
| `npm run typecheck` | Verifica os tipos sem iniciar a aplicação. |
| `npm run check` | Executa as verificações principais de compilação. |
| `npm run config:check` | Valida a configuração local sem revelar valores. |
| `npm run cloudinary:check` | Confirma a integração de arquivos sem realizar upload. |
| `npm run db:migrate:local` | Aplica as migrações no banco local. |
| `npm run security:check` | Verifica dependências com vulnerabilidades relevantes. |
| `npm run prepare:repo` | Limpa artefatos locais e valida o projeto. |
| `npm run deploy` | Valida, compila e publica a aplicação. |

## Segurança e privacidade

O projeto adota práticas defensivas em diferentes camadas:

- autorização baseada no proprietário do recurso;
- acesso restrito a arquivos privados;
- validação de entradas e uploads no servidor;
- sessões protegidas e cookies seguros em produção;
- limitação de requisições e proteção contra abuso;
- cabeçalhos HTTP defensivos;
- redução de dados sensíveis em registros de auditoria;
- separação entre configuração pública e segredos de ambiente;
- verificações automatizadas de tipos, build e dependências.

Nenhuma credencial deve ser armazenada no código-fonte. Arquivos locais de ambiente, bancos de desenvolvimento, logs e artefatos temporários permanecem fora do controle de versão.

### Relatando vulnerabilidades

Não publique credenciais, dados pessoais ou instruções de exploração em issues abertas. Relatos de segurança devem ser enviados por um **GitHub Security Advisory privado**, acompanhados do impacto e de passos mínimos para reprodução.

## Estado do projeto

O Certifólio está em **desenvolvimento ativo**. A arquitetura, a experiência visual e os recursos podem evoluir conforme novos testes e necessidades do produto.

## Contribuições

Sugestões e correções são bem-vindas. Antes de propor uma alteração estrutural, abra uma discussão ou issue explicando:

1. o problema observado;
2. o comportamento esperado;
3. o impacto da mudança;
4. como a solução foi validada.

Pull requests devem manter a tipagem, o build e as verificações de segurança funcionando.

## Autor

Desenvolvido por **[Gabriel Reguse](https://github.com/GabrielReguse)**.

---

<div align="center">
  <sub>Organize o que você aprendeu. Apresente o que você sabe.</sub>
</div>
