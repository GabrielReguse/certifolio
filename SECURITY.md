# Política de segurança

## Versões suportadas

| Versão | Suporte |
|---|---|
| 1.x | Sim |
| anteriores | Não |

## Relato de vulnerabilidades

Use um **Security Advisory privado do GitHub** no repositório. Não abra uma issue pública contendo:

- credenciais;
- dados pessoais;
- links de redefinição de senha;
- tokens de sessão;
- passos de exploração contra uma instalação real.

Inclua no relato:

- componente afetado;
- impacto;
- passos mínimos para reprodução;
- versão ou commit testado;
- correção sugerida, caso exista.

## Segredos

Nunca envie ao Git:

- `.dev.vars`;
- `.env` reais;
- `.wrangler`;
- bancos SQLite;
- exports de usuários;
- Cloudinary API Secret;
- Better Auth secret;
- setup key;
- chaves privadas do Resend, Google ou Turnstile.

Caso um segredo seja exposto, removê-lo do commit não basta: ele deve ser revogado e recriado.

## Verificações recomendadas

```powershell
npm ci
npm run typecheck
npm run build
npm run security:check
```

O Dependabot acompanha atualizações de npm e GitHub Actions. A CI rejeita alterações que não compilam.
