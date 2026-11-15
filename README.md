# AntiSpiral — Lunar Landing Site Navigator

Aplicação React/Vite + FastAPI + PostgreSQL, sem Docker. Compara luz solar e
visibilidade geométrica da Terra em pontos regionais do pólo sul lunar.

## Arrancar localmente

Requisitos: Node/npm, Python 3.10+ e binários PostgreSQL 14 instalados em Linux.

Na raiz do projecto:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
python3 scripts/start_project_database.py
cd backend
. .venv/bin/activate
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

O helper inicia uma BD persistente do projecto na porta **55432**, com dados em
`.local/postgres/`, e configura `backend/.env`. Não usa sudo, não altera a instância
PostgreSQL do sistema e não recria uma BD já existente. `.local/` e `.env` estão
ignorados pelo Git. A role da aplicação não é superutilizador. Pode executar de novo
o helper após reiniciar o computador. Consulte backend/README.md se preferir usar
uma instância PostgreSQL já administrada por si.

Noutro terminal:

```sh
cd frontend
npm ci
npm run dev
```

Abrir a URL do Vite (normalmente http://localhost:5173). Reiniciar a API se o `.env`
foi alterado. Documentação da API: http://127.0.0.1:8000/docs.

Se a porta 5173 estiver ocupada, o Vite pode usar 5174 ou outra porta. O proxy `/api`
preserva o endereço do frontend para que registo/login funcionem nessa porta, sem
alterar `CORS_ORIGINS`. Usar a URL indicada pelo Vite. Acesso directo de um frontend
à porta 8000, sem o proxy, exige a origem exacta em `CORS_ORIGINS`.

## Fluxo actual

1. Criar uma conta real e iniciar sessão. Sessões locais do protótipo antigo não são
   contas e não dão acesso à BD.
2. **Visão geral**: contexto regional com dados NASA SVS horários pré-calculados de 2026.
3. **Análise de Sol e Terra**: menu dedicado ao explorador de dois cenários temporários.
4. **Requisitos da missão**: vários objectivos, data UTC, duração inteira + unidade,
   resolução, limiares de luz/comunicação e selecção de 2–4 pontos regionais.
5. **Análise de locais / Resultados**: progresso por local, resultados Horizons reais,
   comparação, cartografia polar LRO WAC, estados dos marcadores ligados ao cursor,
   eventos, janelas, gráficos e parâmetros da execução guardada.
6. Seleccionar uma análise no histórico para a reabrir, inclusive após logout/relogin.
7. **Relatórios**: JSON completo da execução e CSV resumido, com metadados associados.

Os dados privados são autorizados pela conta no backend, não por um perfil visual ou
por conhecer um UUID. Cada execução guarda requisitos imutáveis; editar o formulário
cria uma nova execução. Progresso e falhas ficam na BD. A retoma só recalcula locais
incompletos, e pode reclamar uma execução interrompida após a lease de 90 segundos.

## Limites científicos e operacionais

- Motor geométrico, centros dos corpos, horizonte 0°, altitude de referência assumida;
  sem DEM, inclinações, sombras topográficas, modelo eléctrico ou link budget.
- Pontos regionais do NASA Lunar Surface Data Book (2023), não aterragens certificadas
  ou caracterização completa de toda a zona.
- Requisitos: intervalos em 2026–2028, duração máxima de 730 dias, até 5000 amostras
  por corpo/local, passo explícito de 1–1440 min; até 4 locais e 20 análises por conta.
  Mês = 30 dias; ano = 365 dias. Não há redução silenciosa da resolução.
- O explorador isolado de Sol/Terra mantém o limite anterior: 2026, 7 dias, 200 amostras.
- Cartografia LRO WAC polar histórica, resolução de tiles mais finos ~268 m/pixel.
  Não representa uma fotografia ou sombra actualizada para a data seleccionada.
- Eventos interpolados conservam o bracket das amostras. Podem existir transições
  perdidas entre amostras; os dígitos calculados não representam precisão física.
- Executar **um processo API**: as consultas Horizons são serializadas por processo.
  Análises são feitas sequencialmente por local, não existe worker automático.
- Recuperação e verificação de email ainda não disponíveis. Em produção: configurar
  HTTPS, `SECURE_COOKIES=true`, origens restritas e reverse proxy `/api`.

## Checks

```sh
cd backend
. .venv/bin/activate
python -m pytest
python -m alembic check
python ../scripts/generate_position_types.py
```

```sh
cd frontend
npm run typecheck
npm run test:science
npm run build
```

Testes normais usam fixtures e SQLite, sem NASA por defeito. O fluxo de navegador foi
verificado também com PostgreSQL e Horizons reais. Comandos opt-in, caso demonstrável,
fontes e evidências em [docs/mission-requirements.md](docs/mission-requirements.md).
Estado em [docs/feature-status.md](docs/feature-status.md).
