# Supabase da COLACE

A instalação COLACE deve usar um projeto Supabase independente do ConsultaMed original.

## Não reutilizar as credenciais do projeto original

O frontend usa:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Essas variáveis identificam o backend usado pelo navegador. Reutilizá-las faria a nova interface consultar o mesmo banco e a mesma autenticação do ConsultaMed.

## Estrutura esperada pelo frontend

A versão atual do código referencia estas tabelas:

- `profiles`
- `patients`
- `specialties`
- `locations`
- `rooms`
- `doctor_shifts`
- `appointments`

### `profiles`

Campos usados pelo frontend:

- `id` (UUID correspondente ao usuário do Supabase Auth)
- `full_name`
- `role`: `secretaria`, `medico` ou `secretaria_pacientes`
- `max_primeira_vez`
- `max_retorno`

### `patients`

Campos usados:

- `id`
- `full_name`
- `mother_name`
- `rg`
- `cpf`
- `cartao_sus`
- `birth_date`
- `phone`
- `notes`

### `specialties`

- `id`
- `name`

### `locations`

- `id`
- `name`

### `rooms`

- `id`
- `name`
- `location_id` → `locations.id`

### `doctor_shifts`

- `id`
- `shift_date`
- `turn`: `MANHÃ`, `TARDE` ou `NOITE`
- `doctor_id` → `profiles.id`
- `room_id` → `rooms.id`
- `specialty_id` → `specialties.id`

### `appointments`

- `id`
- `patient_id` → `patients.id` (pode ser nulo em bloqueios)
- `specialty_id` → `specialties.id` (pode ser nulo em bloqueios)
- `doctor_id` → `profiles.id`
- `location_id` → `locations.id`
- `doctor_shift_id` → `doctor_shifts.id`
- `appointment_date`
- `appointment_time`
- `turn`
- `appointment_type`: `primeira_vez`, `retorno`, `internato` ou nulo
- `status`: `agendado`, `atendido`, `nao_compareceu`, `cancelado` ou `bloqueado`
- `has_referral`
- `secretary_notes`
- `medical_notes`

## Recomendação para replicação

Prefira exportar o **schema real** do Supabase usado pelo ConsultaMed e aplicá-lo no projeto novo. Isso preserva tipos, chaves estrangeiras, índices, triggers, políticas RLS e configurações de Realtime que não podem ser reconstruídas com segurança apenas olhando o frontend.

Para a COLACE, copie inicialmente apenas:

- estrutura das tabelas;
- relacionamentos;
- índices;
- funções/triggers necessários;
- políticas RLS;
- configuração de Realtime;
- cadastros institucionais que façam sentido recriar manualmente (por exemplo, locais e especialidades).

Não copie automaticamente pacientes, prontuários, agendas, credenciais ou usuários do sistema original.

## Autenticação

Depois de criar o projeto novo, crie pelo menos um usuário administrativo/secretaria no Supabase Auth e um registro correspondente em `profiles` com o mesmo UUID e o papel `secretaria`.

A aplicação busca o perfil pelo `auth.uid()` após o login, portanto um usuário existente no Auth sem linha correspondente em `profiles` não terá um papel válido na interface.

## Realtime

O painel médico acompanha alterações de `appointments` em tempo real. No projeto novo, confirme que `appointments` está habilitada para Realtime e que as políticas RLS permitem ao médico autenticado visualizar os registros que lhe pertencem.

## Antes do primeiro build de produção

Preencha `~/consultamed-colace/.env.local` com as credenciais do novo projeto e somente depois execute:

```bash
npm run build
```
