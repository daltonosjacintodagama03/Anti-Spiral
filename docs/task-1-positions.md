# Task 1 — posições reais de Sol e Terra

**Histórico da entrega inicial:** o fluxo actual inclui as Tasks 2–4.
Consultar [mission-requirements.md](mission-requirements.md) para o fluxo actual,
com menu próprio Sol/Terra, contas reais e persistência de requisitos.

Entrega incluída nas alterações cujo commit e push para `dalton/frontend` foram
autorizados em 2026-11-15; ver [feature-status.md](feature-status.md).

## Entrega

`POST /api/positions` consulta o JPL Horizons ao vivo, sequencialmente para
Sol (10) e Terra (399), com observador `coord@301`. A resposta inclui pedido
normalizado, amostras UTC, azimute/elevação em graus, parâmetros de cada consulta,
instante de aquisição, checksums SHA-256 e limitações. OpenAPI em `/docs`.
Os tipos TypeScript são gerados pelo script `scripts/generate_position_types.py`.

O frontend apresenta o formulário **Análise real de Sol e Terra**, abaixo do mapa
na **Visão geral**, e uma tabela com todos os instantes. A visão regional anterior
continua separada: as suas médias de área não são durações no local seleccionado.

Não são calculados eventos, durações de visibilidade, potência ou terreno nesta task.
Não há persistência de consultas, cache, fila ou histórico. É uma consulta síncrona,
com falha explícita em vez de substituição por fixtures. Não altera as tabelas existentes.

## Executar sem Docker

Configurar o ambiente e `.env` conforme `backend/README.md`. Com as dependências
instaladas no ambiente Python:

```sh
cd backend
uvicorn app.main:app --reload
```

Noutro terminal:

```sh
cd frontend
npm ci
npm run dev
```

O Vite encaminha `/api` para `http://127.0.0.1:8000`. Reiniciar o Vite depois de
alterar a configuração. Em produção, configurar o reverse proxy para encaminhar
`/api` à API; o proxy de desenvolvimento não se aplica ao build estático.

A consulta de posições não necessita de tabelas nem de PostgreSQL acessível,
mas o arranque da aplicação existente exige as variáveis de configuração da base.
Os outros endpoints continuam a ter as suas dependências existentes.

## Validar manualmente

1. Entrar num perfil do protótipo e abrir **Visão geral**.
2. No formulário, usar latitude -89.5, longitude 0, início 2026-11-14 12:00 UTC,
   duração 1 hora e passo 30 minutos.
3. Clicar **Analisar Sol e Terra**: devem aparecer três linhas (12:00, 12:30, 13:00).
4. Na primeira linha, comparar com as fixtures reais: Sol azimute 120.534441°,
   elevação 1.302620°; Terra azimute 358.078065°, elevação -3.621837°.
   Uma actualização futura das efemérides pode modificar os últimos dígitos.
5. Alterar a longitude: a interface deve marcar os resultados como anteriores.
6. Experimentar latitude -90 e um intervalo que ultrapasse 2026: devem ser rejeitados.
7. Parar a API e voltar a analisar: deve aparecer erro, sem tabela fictícia.

Pedido equivalente:

```sh
curl -sS http://127.0.0.1:8000/api/positions \
  -H 'Content-Type: application/json' \
  -d '{"latitude_deg":-89.5,"longitude_deg":0,"start_utc":"2026-11-14T12:00:00Z","duration_hours":1,"step_minutes":30}'
```

## Contrato e limites

- Latitude estritamente entre -90 e 90; longitude entre -360 e 360 normalizada
  para [-180,180). Coordenadas não finitas são rejeitadas.
- Datas com timezone, convertidas para UTC; precisão de minuto.
- Intervalo inteiramente em 2026, duração inteira entre 1 e 168 horas,
  passo inteiro entre 1 e 60 minutos, máximo de 200 amostras por corpo.
- Inclui início e fim; último segmento mais curto se necessário.
- Altitude assumida 0 km na esfera de referência lunar de 1737.4 km,
  frame lunar MEAN_ME do Horizons. Não é altitude de terreno medida.
- `QUANTITIES=4`, posições aparentes, `AIRLESS`, sem filtragem abaixo do horizonte.
- Azimute a partir do norte, aumentando para este. Os pólos exactos são rejeitados.
- Timeout HTTP de 20 s e orçamento total de 50 s; sem retries automáticos.
- Uma consulta activa por processo; novas consultas simultâneas recebem 503.
  Esta limitação não coordena múltiplos workers; executar inicialmente um processo.
- Erros de validação: 422; falhas do fornecedor ou capacidade ocupada: 503.
- Séries só são publicadas depois de ambos os corpos terem a grelha completa e alinhada.

## Fontes e evidências

Documentação consultada em 2026-11-15:

- https://ssd-api.jpl.nasa.gov/doc/horizons.html
- https://ssd.jpl.nasa.gov/horizons/manual.html

Consultas reais executadas nesta entrega: `backend/tests/fixtures/sun-request.json`
e `earth-request.json`. Respostas integrais pequenas em `sun.json` e `earth.json`.
O serviço devolveu assinatura API **1.2**, embora a documentação consultada indique
1.3; o parser aceita apenas a versão efectivamente verificada (1.2) e rejeita mudanças
para revisão explícita. Não assume compatibilidade de outra versão.

Uma verificação com URL longo (199 instantes, 6826 bytes) recebeu HTTP 502.
Um lote menor com 50 instantes também recebeu HTTP 502. A integração usa agora
START_TIME/STOP_TIME/STEP_SIZE para o trecho regular e, quando necessário, uma
consulta TLIST de um único instante para incluir o fim irregular. São no máximo
quatro chamadas pequenas por análise, sempre sequenciais. A verificação real após
o ajuste passou com 199 amostras por corpo (23 h, passo 7 min), de 2026-11-14
12:00 UTC até 2026-11-15 11:00 UTC, com quatro respostas rastreáveis.

O instante final adicional usa `TLIST` com data entre aspas, `TLIST_TYPE=CAL`
e `TIME_TYPE=UT`. O trecho regular também usa `TIME_TYPE=UT`. As colunas são identificadas pelos cabeçalhos, e não por posições
numéricas fixas. Cabeçalhos, ângulos e timestamps são verificados antes de aceitar dados.

Fixtures verificam integração e regressões do parser; não constituem validação
astronómica independente. Nenhuma comparação com SPICE foi executada nesta task.

## Checks

```sh
cd backend
pytest
python ../scripts/generate_position_types.py
```

```sh
cd frontend
npm run typecheck
npm run test:science
npm run build
```

A suite backend usa fixtures e transportes de teste, sem chamadas NASA por defeito.
O teste manual automatizado em navegador desta entrega percorreu Vite → FastAPI →
Horizons real, confirmou as três linhas e a elevação negativa da Terra; depois verificou
aviso de parâmetros alterados e erro 503 simulado sem resultados. O teste não comprova
funcionamento científico do relevo nem fez validação com PostgreSQL real.

Resultados nesta entrega: backend **31 testes passaram**; frontend typecheck,
**8 testes científicos** e build passaram. Aviso de depreciação TestClient/httpx
no ambiente temporário, sem falhas. Não foi feita validação de PostgreSQL real.

Para repetir o teste de navegador, com Chrome, API e Vite iniciados, instalar
Playwright apenas num directório temporário e executar explicitamente (usa rede):

```sh
npm install --prefix /tmp/antispiral-browser playwright-core
ANTISPIRAL_PLAYWRIGHT_MODULE=/tmp/antispiral-browser/node_modules/playwright-core/index.mjs \
  node scripts/check_positions_browser.mjs
```

Pode definir `ANTISPIRAL_WEB_URL` (default `http://127.0.0.1:5173`) e
`ANTISPIRAL_CHROME` (default `/usr/bin/google-chrome`). O teste usa uma sessão local
do protótipo para entrar no ecrã; não testa autenticação real. A falha 503 é simulada
apenas no teste, depois da consulta real bem sucedida.
