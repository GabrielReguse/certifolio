<div align="center">

# Certifólio

**Todo curso conta. Faça ele aparecer.**

Uma plataforma full stack para organizar cursos, certificados e metas de aprendizagem — e transformar tudo isso em um portfólio profissional, apresentável e personalizável.

![React](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-6C63FF)
![Copyright](https://img.shields.io/badge/copyright-all%20rights%20reserved-111111)

</div>

---

> [!IMPORTANT]
> **Código disponibilizado publicamente somente para visualização, avaliação técnica e apresentação em portfólio.**
> O fato de este repositório ser público não concede permissão para copiar, modificar, redistribuir, republicar, incorporar o código em outros projetos ou utilizá-lo comercialmente. © 2026 Gabriel Reguse da Silva. Todos os direitos reservados.

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

## Direitos autorais e uso do código

**Copyright © 2026 Gabriel Reguse da Silva. Todos os direitos reservados.**

Este repositório é público para permitir a **visualização do projeto, avaliação técnica e apresentação em portfólio**. Nenhuma licença open source é concedida.

Sem autorização prévia e escrita do autor, não é permitido:

- copiar ou reproduzir o código-fonte, integral ou parcialmente;
- modificar, adaptar ou criar trabalhos derivados;
- redistribuir ou republicar o projeto ou partes dele;
- incorporar o código em outros projetos, produtos ou serviços;
- sublicenciar, vender ou explorar comercialmente o código.

Os direitos mínimos necessários ao funcionamento do próprio GitHub, incluindo visualização e fork de repositórios públicos dentro da plataforma, permanecem sujeitos aos Termos de Serviço do GitHub.

Consulte o arquivo [`LICENSE`](./LICENSE) para o aviso completo de direitos autorais.

## Feedback

Sugestões sobre experiência, acessibilidade, segurança e qualidade do produto são bem-vindas por meio dos canais do repositório. A disponibilização pública do código não implica autorização para reutilização.

## Autor

Desenvolvido por **[Gabriel Reguse](https://github.com/GabrielReguse)**.

---

<div align="center">
  <sub>Organize o que você aprendeu. Apresente o que você sabe.</sub><br>
  <sub>© 2026 Gabriel Reguse da Silva — All rights reserved.</sub>
</div>
