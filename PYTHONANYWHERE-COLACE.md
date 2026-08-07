# Implantação COLACE no PythonAnywhere

Este repositório é uma cópia independente do `rodrigoniskier/consultamed`, preparada para a rede COLACE.

## 1. Isolamento obrigatório do banco

Use um projeto Supabase próprio da COLACE. Não reutilize `VITE_SUPABASE_URL` nem `VITE_SUPABASE_ANON_KEY` do ConsultaMed original, pois isso faria as duas instalações compartilharem autenticação, pacientes, médicos e agendas.

As variáveis `VITE_*` são incorporadas pelo Vite **no momento do build**. Portanto, crie/preencha `.env.local` antes de executar `npm run build`.

## 2. Clonar no Bash do PythonAnywhere

```bash
cd ~
git clone https://github.com/rodrigoniskier/consultamed-colace.git
cd ~/consultamed-colace
```

Se a pasta já tiver sido clonada anteriormente:

```bash
cd ~/consultamed-colace
git pull origin main
```

## 3. Configurar o ambiente COLACE

```bash
cp .env.example .env.local
nano .env.local
```

Preencha pelo menos:

```env
VITE_SUPABASE_URL="https://SEU-PROJETO-COLACE.supabase.co"
VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_COLACE"
```

Não faça commit de `.env.local`; o `.gitignore` já protege arquivos `.env*`, exceto `.env.example`.

## 4. Instalar e gerar o frontend

```bash
cd ~/consultamed-colace
npm ci
npm run build
```

O frontend de produção será gerado em `~/consultamed-colace/dist`.

Sempre que mudar qualquer variável `VITE_*` ou atualizar o frontend, execute novamente `npm run build`.

## 5. Adaptador Flask para o PythonAnywhere

O arquivo `flask_app.py` deste repositório serve o conteúdo de `dist/` e possui fallback para `index.html`. Isso é necessário para que rotas do React Router, como `/login`, `/secretaria`, `/secretaria_pacientes` e `/medico`, também funcionem quando acessadas diretamente.

Instale a dependência Python no ambiente usado pelo Web App:

```bash
pip install --user -r ~/consultamed-colace/requirements-pythonanywhere.txt
```

Se o Web App estiver usando um virtualenv, ative-o antes e execute o mesmo comando sem `--user`.

## 6. WSGI do Web App

Abra o arquivo WSGI pelo menu **Web** do PythonAnywhere e deixe-o apontando para este repositório. Substitua `SEU_USUARIO` pelo usuário real da conta:

```python
import sys

project_path = '/home/SEU_USUARIO/consultamed-colace'
if project_path not in sys.path:
    sys.path.insert(0, project_path)

from flask_app import app as application
```

Salve e use **Web > Reload**.

## 7. Static files opcional

O Flask já consegue servir todos os arquivos do `dist`. Para reduzir trabalho do worker, é possível criar no menu **Web > Static files** o mapeamento:

- URL: `/assets/`
- Directory: `/home/SEU_USUARIO/consultamed-colace/dist/assets`

Depois, use **Reload** novamente.

## 8. Banco Supabase

A aplicação espera as tabelas e relacionamentos usados no ConsultaMed original (`profiles`, `patients`, `specialties`, `locations`, `rooms`, `doctor_shifts` e `appointments`). O novo projeto Supabase da COLACE precisa receber o mesmo esquema antes do primeiro uso.

Não copie os dados clínicos do sistema original para a COLACE salvo se houver finalidade, autorização e base jurídica apropriadas. Para uma nova rede, o normal é replicar apenas **estrutura/configuração**, começando com banco vazio.

## 9. Checklist antes de liberar

- `.env.local` aponta para o Supabase da COLACE.
- `npm run build` foi executado depois de configurar as variáveis.
- O Web App importa `application` de `flask_app.py`.
- `/login` abre normalmente.
- Acesso direto a `/secretaria` e `/medico` não retorna 404.
- Usuários e perfis de teste pertencem ao projeto Supabase da COLACE.
- Pacientes/agendas do ConsultaMed original não aparecem na COLACE.
