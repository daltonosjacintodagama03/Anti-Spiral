# Backend

FastAPI service backed by PostgreSQL. Landing-site measurements are stored as supplied; no sample or demo measurements are inserted automatically.

## Requirements

- Python 3.11+
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
- `GET /api/moon-trek/capabilities` — proxy the selected Moon Trek WMTS layer metadata.
- `GET /api/moon-trek/tiles/{matrix}/{row}/{col}` — proxy one WAC image tile. These are WMTS indices, not latitude/longitude; inspect capabilities for valid matrices and coverage.

Example tile request (first WMTS matrix; verify it has coverage for the tile):

```text
GET http://localhost:8000/api/moon-trek/tiles/0/0/0
```

The image returned by this endpoint can be used in the frontend as an image source. A map client must convert the selected lunar coordinates to the WMTS projection and tile indices; this endpoint does not take latitude/longitude and does not assemble arbitrary image crops.

Site responses use the frontend's camelCase fields (`xKm`, `slopeDeg`, etc.). Jobs retain the snake_case response fields already declared by the frontend API client.

## Tests

```sh
pytest
```
