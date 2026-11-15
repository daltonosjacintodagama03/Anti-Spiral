# Backend

FastAPI service backed by PostgreSQL. Landing-site measurements are stored as supplied; no sample or demo measurements are inserted automatically.

## Requirements

- Python 3.10+
- PostgreSQL 14+

## Local setup

From this directory, create a virtual environment and install dependencies:

```sh
python -m venv .venv
cp .env.example .env
```

Activate the environment using the command for your shell:

```sh
# Bash or Zsh
source .venv/bin/activate

# Fish
source .venv/bin/activate.fish
```

Or run tools directly as `.venv/bin/python -m ...` without activating it. Install the dependencies with:

```sh
python -m pip install -r requirements.txt
```

## PostgreSQL setup

Install and start PostgreSQL 14 or newer. Create a login role for the API and a database owned by that role. If PostgreSQL is running locally, open its administrative prompt:

```sh
sudo -u postgres psql
```

At the `psql` prompt, create the role and database (replace the example password with your own):

```sql
CREATE ROLE anti_spiral_group WITH LOGIN PASSWORD 'your_password';
CREATE DATABASE anti_spiral OWNER anti_spiral_group;
\q
```

Edit `.env` so its connection variables match the role and database. The application and Alembic migrations both read these values:

```env
DATABASE_USER=anti_spiral_group
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=anti_spiral
CORS_ORIGINS=["http://localhost:5173"]
```

`database_user`, `database_password`, and `database_name` are required settings; the matching `DATABASE_*` entries must exist in `.env` or in the process environment. Keep `.env` local and do not commit passwords. If you already created the role and database, do not run the `CREATE` statements again; just check that `.env` matches them.

Apply the database migrations to create the required tables, then start the API:

```sh
alembic upgrade head
uvicorn app.main:app --reload
```

With the virtual environment activated, these commands use its installed executables. Without activation, use `.venv/bin/alembic upgrade head` and `.venv/bin/uvicorn app.main:app --reload`.

The API is available at `http://localhost:8000`; interactive documentation is at `http://localhost:8000/docs`. The health endpoint at `http://localhost:8000/api/health` can be used to check that the service can reach the database.

## Endpoints

- `GET /api/health` — service and database health.
- `GET /api/sites` — list persisted landing sites (`offset` and `limit` supported).
- `POST /api/sites` — persist a site; percentage and slope values are range-validated.
- `GET /api/jobs` — list analysis jobs (`offset` and `limit` supported).
- `POST /api/jobs` — persist a pending analysis job.

Site responses use the frontend's camelCase fields (`xKm`, `slopeDeg`, etc.). Jobs retain the snake_case response fields already declared by the frontend API client.

## Tests

```sh
pytest
```

## Live lunar positions (Task 1)

`POST /api/positions` returns real Sun/Earth observer azimuth and elevation.
See [Task 1 instructions](../docs/task-1-positions.md) for request, limits,
frontend setup, validation and scientific assumptions. No database write or migration
is required for this endpoint. Run one API process for its provider concurrency limit.

## Configuração automática do PostgreSQL local (Linux)

Na raiz do projecto, usando o Python com as dependências do backend instaladas:

```sh
python3 scripts/setup_local_database.py
```

O script pede autenticação sudo no terminal, preserva `.env` existente, cria role/base
apenas se não existirem, aplica `alembic upgrade head` e verifica health/sites. Jobs exige uma sessão autenticada.
Não altera passwords existentes nem apaga tabelas ou insere dados de exemplo.
Se a role já existir, configurar em `.env` a sua password actual antes de repetir.
Suporta o cluster local na porta 5432. Nunca partilhar a password sudo no chat.

O endpoint de posições também devolve `run_id`, `engine_version`, regra e
`visibility` com summary/events/windows e razões para eventos ausentes.
Consultar [Tasks 1–4](../docs/four-tasks.md).


## Fluxo actual de requisitos e contas

Consultar [README principal](../README.md) e [docs/mission-requirements.md](../docs/mission-requirements.md).
A aplicação guarda requisitos e resultados por conta em `mission_analyses`; sessões
em `account_sessions`. Migração `20261115_accounts`. Endpoints `/api/auth/*`,
`GET /api/mission-sites`, `POST/GET /api/mission-analyses`, consulta por UUID e
execução de cada local verificada por proprietário. Os endpoints `/api/jobs`
agora também exigem sessão e filtram por proprietário.

O helper `scripts/start_project_database.py` é a alternativa sem sudo/Docker:
cluster próprio persistente, porta 55432, sem modificar o cluster do sistema.
As instruções administrativas antigas acima continuam válidas apenas para quem
optar por gerir a sua própria instância PostgreSQL.

`SECURE_COOKIES=false` apenas no desenvolvimento local. Em produção usar HTTPS,
`SECURE_COOKIES=true`, CORS restrito e um único processo API para respeitar a
serialização de chamadas ao Horizons. Não há verificação/recuperação de email.
