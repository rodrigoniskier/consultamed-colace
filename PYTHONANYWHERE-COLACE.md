# Implantação COLACE no PythonAnywhere

Este repositório é uma cópia independente do `rodrigoniskier/consultamed`, preparada para a rede COLACE.

## Isolamento obrigatório

Use um projeto/banco Supabase próprio da COLACE. Não reutilize `VITE_SUPABASE_URL` nem `VITE_SUPABASE_ANON_KEY` do ConsultaMed original, pois isso faria as duas redes compartilharem usuários, agendas e dados.

## Após clonar/puxar no PythonAnywhere

1. Crie `.env.local` a partir de `.env.example`.
2. Informe as credenciais do Supabase exclusivo da COLACE.
3. Execute `npm ci`.
4. Execute `npm run build`.
5. Configure o Web App/arquivos estáticos para servir a pasta `dist` conforme a instalação PythonAnywhere usada pelo ConsultaMed original.

## Banco

A aplicação espera o mesmo esquema de tabelas/perfis utilizado pelo ConsultaMed. O esquema e os dados devem ser replicados para um projeto Supabase novo antes de colocar a COLACE em produção.
