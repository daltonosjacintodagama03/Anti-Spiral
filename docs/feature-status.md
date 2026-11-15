# Estado do trabalho

Apenas a tarefa frontend solicitada foi implementada; as features do plano não foram iniciadas.

| ID | Estado | Critérios/evidências | Checks | Validação humana | Commit | Pendências |
|---|---|---|---|---|---|---|
| UI-01 | awaiting_human_validation | Visão geral com textura NASA, pólos e navegação diária/horária; tabela real NASA 2026; menu completo | Ver registo abaixo | pending | — | Relevo, eclipses e análise temporal de um local não incluídos; módulos antigos ainda usam exemplos |

## Validar

1. `cd frontend && npm run dev`. Abrir o perfil habitual e a aba Visão geral.
2. Confirmar apenas os cinco itens do menu, nesta ordem: Visão geral, Requisitos da missão,
   Análise de locais, Resultados e Relatórios, em qualquer perfil.
3. Seleccionar um dia de 2026; usar anterior/seguinte, Hoje e o slider anual. A Lua representa as 12:00 UTC desse dia.
4. Alternar Iluminação/Terra (região fixa no Polo Sul). Abrir “Fontes, valores e método de cálculo”.
5. A percentagem é de área da calota inteira entre 80° e 90° no instante escolhido.
   Não é a fase da Lua vista da Terra nem a duração de visibilidade durante o dia.
6. Testar ecrã estreito e navegação por teclado. Os módulos antigos continuam identificados
   como demonstração; os seus candidatos fictícios foram retirados da Visão geral.

## Dados e limites

- Efemérides: NASA SVS 2026, 8 760 instantes horários reais. Cópia local compacta;
  sem interpolação e sem rede externa por mudança de dia/hora.
- Textura 2048×1024, cerca de 447 KB; canvas 560×560, sem biblioteca 3D adicional.
- Geometria: esfera de raio 1737,4 km, horizonte local 0°, centro do corpo acima do limiar;
  direcção do Sol com raios paralelos, Terra com distância e libração reais.
- A região polar de cada métrica é delimitada pelo tracejado de 80° na vista oblíqua.
  A integração considera a calota completa, incluindo a parte fora da vista da câmara.
- Não calcula sombras de relevo, eclipses, disco finito, energia eléctrica ou link budget.
  A textura da noite mantém brilho residual para leitura visual.
- Não há efemérides fora de 2026 nesta entrega; o calendário respeita a cobertura carregada.
- Aquisição, URLs e evidências: [sources/verification.md](sources/verification.md).
- Reproduzir a compactação: descarregar o JSON original com TLS válido e executar
  `python3 frontend/tools/prepare_lunar_ephemeris.py /caminho/mooninfo_2026.json`.

## Checks

- `npm run typecheck`: passou.
- `npm run test:science`: oito testes passaram (direcções conhecidas, paralaxe terrestre,
  integração por área e convergência, 8 760 amostras e limites UTC, selecção de datas,
  comparação de elevações com respostas reais do Horizons, médias diárias conhecidas e limites do dia UTC).
- `npm run build`: passou, 1 646 módulos transformados.
- `git diff --check`: passou.
- Verificação anterior à redução do menu: Chrome headless 156.0.8078.79, nove links e oito páginas secundárias acessíveis;
  dia seguinte, limite de 31/12, Hoje, pólos e camadas verificados; desktop 1440×1000
  e móvel 390×844 sem transbordamento horizontal ou excepções JavaScript.
- Foi observado um único pedido à tabela durante o fluxo de datas/camadas.
- Falha de acesso à tabela simulada no navegador: métricas indisponíveis, alerta e retry
  recuperam dados reais; nenhum fallback fictício.
- Mediana de resposta em 24 mudanças horárias, incluindo espera por dois frames:
  133,2 ms antes da cache de projecção; 33,3 ms depois, no mesmo Chrome headless.
  É uma medição de QA neste ambiente, não um benchmark de dispositivo móvel real.
- Inspecção visual realizada; calendário colocado acima da Lua para acesso rápido.

O ficheiro local contém 314 951 bytes; a textura, 457 942 bytes. Não há novas
bibliotecas em runtime. A tabela original tem 2 094 339 bytes e permanece fora do Git.

Na verificação anterior do painel instantâneo (agora removido), em 14-11-2026 às 12:00 UTC, no Pólo Sul (80–90°S), a UI mostrava 59,8% da área
com centro solar acima do horizonte e 24,6% com centro terrestre acima do horizonte.
São métricas instantâneas do modelo geométrico descrito, não médias diárias.

Commit sugerido após aprovação: `feat: use NASA ephemerides in lunar overview and restore navigation`.

## Correcção do menu solicitada

Menu reduzido aos cinco itens indicados pelo utilizador, com a mesma ordem e rótulos
em todos os perfis. Estado mantido em `awaiting_human_validation`, sem commit.
Verificação desta correcção: `npm run typecheck` e `git diff --check`.

## Cartões de resumo acima da Lua

Três cartões no estilo anterior, pela ordem pedida: Região (inicialmente “Polo Sul”,
com a nota “Área de interesse”), Iluminação média e Comunicação com a Terra. Os dois
indicadores diários usam os mesmos dados NASA, dia e pólo da visualização; não usam
os candidatos de exemplo. A região apresentada é agora fixa no Polo Sul. Aguardam validação humana.
Verificação desta alteração: `npm run typecheck` e `git diff --check`.

## Resumo diário e ordem dos cartões

Ordem actual: Região, Iluminação média, Comunicação com a Terra. Os dois valores
percentuais representam a média da área visível nas 24 amostras horárias NASA do dia
UTC escolhido, sobre toda a calota de 80° a 90° do pólo seleccionado. O cálculo diário
não depende da hora do cursor. A Lua continua a representar a hora seleccionada.
“Comunicação” indica apenas visibilidade geométrica do centro terrestre: não inclui
relevo/antenas nem garante ligação de rádio. A definição e um exemplo estão no painel
Fontes, valores e método de cálculo. São médias amostrais, não integrações de duração
nem percentagem de pontos que conseguiram comunicar em algum momento do dia.
Validação humana pendente; sem commit.

Checks desta alteração: `npm run typecheck`, oito testes em `npm run test:science`,
`npm run build` e `git diff --check` passaram.

## Remoção do painel lateral da Lua

Removido o painel de texto, data e indicadores instantâneos ao lado da Lua.
A visualização fica centrada e ocupa toda a largura disponível. Fontes e créditos
ficam no painel recolhido de método, abaixo da visualização. Mantêm-se os três
cartões diários e os controlos de data/hora. Validação humana pendente; sem commit.
Checks desta alteração: `npm run typecheck` e `git diff --check`.

## Lua e filtros — simplificação visual

Removidos o cabeçalho do observatório e o selector de pólo. A vista fica no Polo Sul.
Lua ampliada de 410 para 480 px de largura máxima, com margens externas e espaço
interno maiores. Filtros de data/hora agrupados num painel próprio, com ícones,
botões de anterior/seguinte/Hoje, campo de calendário destacado e sliders estilizados.
Mantidos os três cartões diários, os dados NASA e as fontes recolhidas.
Estado: `awaiting_human_validation`, sem commit.

Checks desta alteração: `npm run typecheck`, `npm run build` e `git diff --check`
passaram. Chrome headless: desktop 1440×1300 e móvel 390×844, sem transbordamento
horizontal ou erros JavaScript; cabeçalho/selector ausentes, Lua com 480 px no desktop,
data e hora funcionais e cartões diários estáveis ao alterar apenas a hora.
Capturas revistas visualmente. Não foram alterados os cálculos científicos.

## Remoção do filtro Hora UTC

Removido o filtro de hora e redistribuída a largura entre calendário e slider anual.
A Lua usa a amostra real das 12:00 UTC do dia seleccionado, identificada no painel
de método. Os cartões continuam a usar as 24 amostras para as médias diárias.
Verificação desta alteração: `npm run typecheck` e `git diff --check`.
Validação humana pendente; sem commit.

## Remoção da saudação e do rótulo lateral

Retirado o bloco de saudação e descrição da Visão geral, que passa a começar pelos
três cartões. Removido “ESPAÇO DE TRABALHO” acima dos links do menu lateral.
Os cabeçalhos das outras páginas mantêm-se. Checks: `npm run typecheck` e
`git diff --check`. Validação humana pendente; sem commit.

## Rodapé do menu lateral

Removido o bloco “PLANEJAMENTO HOJE. NOVAS DESCOBERTAS AMANHÃ.” do menu lateral.
Verificação: `git diff --check`. Validação humana pendente; sem commit.

## Integração das branches — 2026-11-15

- Estado: `awaiting_human_validation`; merge preparado, sem commit nem push.
- Destino: `dev`, com acompanhamento de `origin/dev` configurado.
- Integração de `origin/silver/migration_conf`, que já contém `origin/dev`.
- `frontend/` igual a `origin/dalton/frontend`; `backend/` igual a `origin/silver/migration_conf`.
- A prioridade Dalton remove da árvore actual as alterações de frontend do commit
  `c64a1fc`; esse commit continua no histórico.
- Check: `npm run build` passou (TypeScript e Vite).
- Testes backend não executados: `python3 -m pytest` falhou porque pytest não está instalado; `python` também não está disponível.
- Validar: executar frontend conforme README e backend conforme backend/README.md.
- Commit sugerido: `merge: integrate Dalton frontend and Silver backend into dev`.

## Correcção do frontend após merge — 2026-11-15

- Estado: `awaiting_human_validation`; sem novo commit ou push.
- Recuperado `frontend/` de `c64a1fc`: a referência `dalton/frontend` estava antiga.
- Backend mantido sem alterações. Esta correcção substitui a escolha de frontend do registo de integração acima.
- Validar: iniciar Vite e abrir Visão geral; confirmar mapa polar e selector de dia.
- Checks da correcção: `npm run test:science` passou (8/8); `npm run build` passou; backend sem diff.
