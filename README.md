# COLACE - Sistema de Agendamento

Sistema web/PWA de agendamento para a rede COLACE, derivado do projeto ConsultaMed e mantido em repositório independente.

## Stack

- React 19 + TypeScript
- Vite
- Supabase (autenticação e banco)
- Tailwind CSS

## Configuração

Copie `.env.example` para `.env.local` e informe **exclusivamente** as credenciais do projeto Supabase da COLACE:

```bash
cp .env.example .env.local
```

Variáveis essenciais:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Não reutilize as credenciais do ConsultaMed original se as duas redes precisarem manter usuários, pacientes e agendas isolados.

## Desenvolvimento

```bash
npm ci
npm run dev
```

## Build de produção

```bash
npm run build
```

O resultado é gerado em `dist/`.

## PythonAnywhere

Consulte `PYTHONANYWHERE-COLACE.md` para o checklist específico de implantação.
