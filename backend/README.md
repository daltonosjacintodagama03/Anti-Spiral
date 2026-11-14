# Backend

FastAPI service backed by PostgreSQL. Landing-site measurements are stored as supplied; no sample or demo measurements are inserted automatically.

## Requirements

- Python 3.11+
- PostgreSQL 14+

## Local setup

From this directory, create and activate a virtual environment, install dependencies, and configure the database:

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Create the `anti_spiral` PostgreSQL database, then apply migrations and run the API:

```sh
createdb anti_spiral
alembic upgrade head
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`; interactive documentation is at `/docs`. Set `DATABASE_URL` and `CORS_ORIGINS` in `.env` to match the local environment.

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
