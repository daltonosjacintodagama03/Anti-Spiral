# Anti-Spiral

Frontend React/Vite do Lunar Landing Site Navigator e backend FastAPI/PostgreSQL.

## Frontend

```sh
cd frontend
npm ci
npm run dev
```

Checks disponíveis: `npm run typecheck` e `npm run build`.
O frontend foi recuperado do commit `c64a1fc` (`merge with dalton/branch`),
que contém as alterações posteriores à referência antiga `dalton/frontend`.
A Visão geral inclui o mapa polar e dados pré-calculados de 2026.
Check científico: `npm run test:science`.

## Backend

O backend corresponde à branch `silver/migration_conf`.
Consultar [backend/README.md](backend/README.md) para configuração, migrações,
execução e testes. A presença de ambas as pastas não comprova integração funcional
entre todos os ecrãs e endpoints.

## Estado

Consultar [docs/feature-status.md](docs/feature-status.md).
Fontes e limitações da visão polar: [docs/sources/verification.md](docs/sources/verification.md).
