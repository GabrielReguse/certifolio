<p align="center">
  <img src="./.github/readme-cover.svg" width="100%" alt="Certifólio — every course counts" />
</p>

<p align="center">
  <a href="./ARQUITETURA.md"><b>Architecture</b></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="./CONFIGURACAO.md"><b>Setup</b></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="./SECURITY.md"><b>Security</b></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="./CHANGELOG.md"><b>Changelog</b></a>
</p>

<br>

> [!IMPORTANT]
> This repository is public for **portfolio presentation and technical evaluation**. It does not grant an open-source license or permission to copy, modify, redistribute or commercially reuse the code. See [`LICENSE`](./LICENSE).

## What it is

**Certifólio** is a full-stack product for turning scattered courses, certificates and learning goals into a structured learning history and a professional public profile.

The product is built around a simple rule: **private by default, presentable when the user decides to share it**.

<table>
<tr>
<td width="25%" valign="top">

### Courses

Create, edit, search, restore and organize completed learning in one place.

</td>
<td width="25%" valign="top">

### Certificates

Store proof files behind authenticated, owner-aware access instead of exposing raw URLs.

</td>
<td width="25%" valign="top">

### Public profile

Turn selected courses, institutions and technologies into a shareable professional page.

</td>
<td width="25%" valign="top">

### Learning goals

Keep track of what should come next instead of treating completed courses as the end of the path.

</td>
</tr>
</table>

<br>

## Product principles

| Principle | What it means in practice |
|---|---|
| **Privacy first** | Visibility is explicit and controlled by the owner of each resource. |
| **Less manual organization** | Institutions and learning data stay structured without relying on user-made folder systems. |
| **Portfolio quality** | Public presentation is treated as a product surface, not as a database dump. |
| **Responsive by design** | The interface is designed to work from mobile to desktop. |
| **Server-side trust boundary** | Sensitive rules are validated again in the API instead of trusting the browser. |

## Stack

<table>
<tr>
<td width="25%" valign="top">

### Interface

React 19  
TypeScript 5  
Vite

</td>
<td width="25%" valign="top">

### API

Hono  
Cloudflare Workers  
Zod

</td>
<td width="25%" valign="top">

### Data & auth

Cloudflare D1  
Drizzle ORM  
Better Auth

</td>
<td width="25%" valign="top">

### Files & integrations

Cloudinary  
Resend  
Google OAuth  
Cloudflare Turnstile

</td>
</tr>
</table>

## Architecture

```text
Browser
  │
  ▼
React + TypeScript
  │
  ▼
Cloudflare Worker + Hono
  ├─ authentication / authorization
  ├─ business rules / validation
  ├─ Cloudflare D1 + Drizzle ORM
  └─ protected media access
```

The interface is never treated as a security boundary. Sensitive operations are checked on the server before data or files are returned.

For the longer architecture notes, see [`ARQUITETURA.md`](./ARQUITETURA.md).

## Security & privacy

The repository includes defensive measures across several layers:

- owner-based authorization for protected resources;
- restricted access to private certificate files;
- server-side validation for inputs and uploads;
- secure production session/cookie settings;
- request limiting and abuse protection;
- defensive HTTP headers;
- lower exposure of sensitive data in logs;
- environment-based secret handling;
- automated type, build and dependency checks.

Security reports should use a **private GitHub Security Advisory**, not a public issue. See [`SECURITY.md`](./SECURITY.md).

## Repository map

```text
certifolio/
├── public/          static assets and brand files
├── src/             React interface
├── worker/          API, auth and business rules
├── migrations/      versioned database changes
├── scripts/         maintenance and validation utilities
├── package.json     dependencies and scripts
└── wrangler.jsonc   non-secret Worker configuration
```

## Running locally

The complete environment and local setup guide lives in [`CONFIGURACAO.md`](./CONFIGURACAO.md). The repository includes example environment files; real credentials should never be committed.

## Status

**Active development.** Product structure, visual design and features can change as the project is tested and refined.

---

<p align="center">
  <b>Organize what you learned. Present what you know.</b><br>
  <sub>© 2026 Gabriel Reguse da Silva · All rights reserved.</sub>
</p>
