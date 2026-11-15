# Validação do fluxo de requisitos — 2026-11-15

Commit e push da implementação para `dalton/frontend` autorizados pelo utilizador
em 2026-11-15; referência em [../feature-status.md](../feature-status.md).

Checks repetidos antes do commit: 71 testes backend, nove testes frontend,
TypeScript e build Vite passaram. Mantém-se um aviso de depreciação TestClient/httpx.

## Resultado observado

Navegador Chrome → Vite → FastAPI → PostgreSQL 14 real → Horizons real.
Duas contas foram criadas para testar reabertura e isolamento; nenhum dado fictício
foi usado nos cálculos normais da aplicação.

Caso: Ciência + Teste de tecnologia, uma semana (168 h), início
2026-11-14T12:00:00Z, passo 60 min, 169 instantes por corpo/local.

| Ponto regional | Latitude | Longitude E | Luz | Terra visível |
|---|---:|---:|---:|---:|
| Nobile Rim 1 | -85.4381° | 37.36667° | 168 h | 154.802641 h |
| Malapert Massif | -85.9948° | -0.23578° | 152.383394 h | 165.421313 h |

Os quatro limiares iniciais foram verificados contra as métricas guardadas. Os
resultados não são um ranking de segurança. As diferenças correspondem aos pontos
indicados, modelo geométrico e intervalo, não a toda a região ou ao relevo real.

Pedido, métricas, eventos, fontes e checksums (sem dados pessoais de contas) estão em
`docs/sources/mission-flow-verification.json`. O teste de navegador confirmou:

- Sol/Terra fora da Visão geral, num menu dedicado;
- vários objectivos e rejeição da duração fraccionária no navegador;
- gravação de requisitos antes das chamadas científicas;
- progresso de dois locais, comparação, mapa, timeline sem novas chamadas científicas;
- marcador seleccionado no centro projectado, com cor correspondente à elevação
  terrestre da amostra no cursor;
- reload, logout/login e reabertura dos mesmos resultados, sem recálculo;
- exportação JSON com o mesmo ID da execução;
- conta B sem acesso de leitura ou execução da análise de A (404).

## Cobertura e cartografia

Consultas mínimas reais em 2026-01-01 e 2028-12-31 passaram para ambos os corpos.
Uma série de um ano, 8760 h, passo 120 min, 4381 amostras por corpo, também passou,
com cobertura conhecida de 100%. Isso verifica funcionamento da integração nesses
casos; não certifica exactidão independente das efemérides.

WMTS polar WAC v2: catálogo, capacidades e tile PNG verificados. O serviço tem CRS
EPSG:0 e bbox WGS84 incoerentes; foi usado o CRS IAU2000:30120 do catálogo oficial,
com projecção explícita e grelha verificada. Resolução efectiva do último nível:
267.561035 m/pixel. Manifest e capabilities estão em docs/sources/.

A inspecção visual detectou uma regra CSS genérica que anulava a largura do SVG
Leaflet. Foi corrigida para aplicar-se apenas aos gráficos. A regressão de navegador
agora verifica dimensão e centro do marcador, além da sincronização do estado.

## Checks

- Backend: **65 testes passaram**, no ambiente backend/.venv, incluindo autenticação,
  hashing/token opaco, expiração/revogação, não exposição de inputs em erros,
  rate limit, CSRF, propriedade, quota por conta, unidades, falhas e retoma por lease.
- Frontend: **typecheck, 9 testes científicos/cartográficos e build passaram**.
- PostgreSQL: migrações inicial + `20261115_accounts` aplicadas numa BD vazia;
  `alembic check`: nenhuma operação pendente.
- Aviso de depreciação TestClient/httpx na suite; sem falhas finais.
- Projecção: casos cardeais, unidade lunar, origem de tiles e ida/volta; tolerância
  numérica 1e-9 graus, sem alegar exactidão geográfica equivalente.

## Limitações

Sem DEM/horizonte topográfico, inclinação, gelo, energia eléctrica, térmica ou link
budget. A imagem orbital é histórica; sombras na textura não são previsão da missão.
Não foi executado SPICE nem comparação astronómica independente nesta entrega.
O limite de 5000 amostras pode exigir um passo mais grosso para missões longas,
com resolução e risco de eventos perdidos sempre explícitos.

Não há worker automático. A execução é sequencial por local, com snapshots e lease
persistidos; retoma após interrupção exige uma acção do utilizador. Contas não têm
verificação/recuperação por email e existe quota de 20 análises guardadas. O ambiente
local preparado não é uma publicação de produção.

Verificações finais adicionais: API reiniciada no ambiente backend/.venv, análise
guardada reaberta sem recálculo; resposta privada no-store; CSV com run_id, coordenadas,
UTC, passo e unidades verificado. O helper PostgreSQL foi reexecutado sem reinicializar
a BD. A role da aplicação foi confirmada sem superuser/createdb/createrole. Apenas
as contas identificadas como criadas pelos testes desta entrega foram removidas.
