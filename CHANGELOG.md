# Changelog

## 1.0.0 — 2026-08-05

### Segurança

- removidos segredos, banco local, sessões e dependências da distribuição;
- adicionados CSP, validação de origem e rate limiting persistente;
- tokens de e-mail deixaram de aparecer nos logs;
- IPs de auditoria passaram a usar HMAC;
- rota de setup passou a ser temporária, protegida e desativada por padrão;
- URLs de instituições passaram a pertencer ao curso e à conta que as cadastrou;
- verificação de e-mail habilitada na configuração de produção.

### Dados e arquivos

- PATCH de cursos e metas deixou de redefinir campos omitidos;
- datas passaram a ser semanticamente validadas;
- cota de armazenamento tornou-se atômica;
- uploads duplicados passaram a ser bloqueados por checksum;
- exclusões externas passaram a usar uma fila com novas tentativas;
- exclusão de conta ganhou uma fila durável e só limpa dados após a remoção no Better Auth;
- exclusão de cursos e arquivos foi consolidada;
- agregação de habilidades passou a usar JSON em vez de separador textual;
- índices adicionais foram criados para consultas críticas.

### Confiabilidade

- corrigido erro de TypeScript em `src/lib/color.ts`;
- chamadas externas receberam timeout e tratamento de falha de rede;
- uploads incertos ou interrompidos passaram a registrar compensação para evitar ativos órfãos;
- telas de autenticação e perfil deixaram de ficar presas em loading;
- configuração, migração e diagnóstico ganharam scripts próprios;
- o CSS monolítico foi dividido por responsabilidade sem alterar a ordem da cascata;
- adicionadas CI, atualização automática de dependências e documentação única.
