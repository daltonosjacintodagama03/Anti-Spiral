# Requisitos reais, menus e persistência por conta

Commit e push para `dalton/frontend` autorizados pelo utilizador em 2026-11-15.
Estado e referência da entrega em [feature-status.md](feature-status.md).

## Entrega

A análise Sol/Terra tem rota própria `/{perfil}/sol-terra`, separada da Visão geral.
Requisitos, locais, resultados e relatórios partilham o ID da análise no URL
(`?analysis=UUID`) e consultam a mesma execução privada da BD.

O formulário permite vários objectivos simultâneos e duração **inteira** com unidade
separada, por defeito semana. Meses têm 30 dias e anos 365 dias, explicitamente no
select. Esses valores representam durações fixas, não aritmética de meses de calendário.
Data/hora é UTC; a UI não converte silenciosamente a hora do navegador.

Os requisitos incluem resolução temporal, 2–4 pontos regionais e quatro limiares:
fracção mínima de luz, fracção mínima de Terra visível, escuridão contínua máxima e
interrupção terrestre máxima. Objectivos são contexto da missão, não um multiplicador
inventado de geometria. Não existe score geral de segurança ou energia garantida.

Criar grava primeiro o snapshot. Cada local é reclamado e persistido antes da chamada
Horizons; resultados/falhas são gravados individualmente. A UI avança sequencialmente,
actualiza a comparação e permite reabrir/retomar. Uma lease de 90 s protege duplicações;
um commit antigo não pode substituir um claimant mais recente. Locais concluídos são
imutáveis e não voltam a chamar o fornecedor durante a retoma. Não existe worker de
background: sair do ecrã interrompe a admissão dos próximos locais; a chamada já aceite
pode terminar e guardar o seu resultado. Retomar é uma acção explícita.

## Autenticação e propriedade

- Registo/login/me/logout com cookie HttpOnly, SameSite=Lax, expiração de sete dias.
- Tokens opacos aleatórios; só SHA-256 é persistido. Passwords com Argon2id.
- Preferência planeje/estude/explore é apresentação; todas as contas têm as mesmas
  capacidades. O cliente não autentica uma conta através de localStorage.
- Histórico, consulta e execução verificam owner_id no backend. Recurso de outra
  conta devolve 404. Os jobs antigos passaram também a verificar propriedade.
- Protecção de Origin nas mutações, CORS restrito e rate limit de login/cadastro por
  IP/processo. Erros de validação não ecoam inputs/passwords.
- O protótipo não verifica email nem recupera passwords por email. Não reutilizar
  passwords de outros serviços para a validação local.
- Até 20 análises por conta nesta entrega; edição e remoção de histórico não incluídas.

Migração: `20261115_accounts`, a partir da migração existente `821b1b9d8827`.
Cria account_sessions e mission_analyses, sem eliminar as tabelas anteriores.

## BD local sem sudo/Docker

`python3 scripts/start_project_database.py` inicia um cluster PostgreSQL 14 privado
em `.local/postgres`, na porta 55432, e actualiza apenas o `.env` local. A role
administrativa tem segredo próprio em `.local/db-admin-secret`, permissões 600;
a role da aplicação não é superutilizador. Nada é instalado no serviço do sistema.
A BD persiste ao terminar a API; após reinício da máquina, executar de novo o helper.

Parar apenas esta instância, se necessário:

```sh
/usr/lib/postgresql/14/bin/pg_ctl -D .local/postgres -m fast -w stop
```

Não apagar `.local/` como se fosse apenas cache: contém dados persistentes da aplicação.
Não publicar `.local/`, `.env` ou segredos. Estão excluídos pelo Git.

## Validação humana

1. Seguir o README para iniciar BD, migrações, API e Vite; criar uma conta real.
2. Confirmar que **Análise de Sol e Terra** tem menu próprio e saiu da Visão geral.
3. Abrir **Requisitos da missão**. Seleccionar Ciência e Teste de tecnologia.
4. Confirmar unidade inicial Semana e tentar duração `1.5`: não deve submeter.
5. Usar duração `1` semana, início `2026-11-14 12:00 UTC`, passo `60 min` e os pontos
   Nobile Rim 1 e Malapert Massif. Deixar os quatro limiares iniciais.
6. Guardar/analisar: observar progresso e resultados reais de cada local.
7. Abrir **Resultados**, ordenar por diferentes métricas e seleccionar um local.
   Percorrer a timeline e trocar marcadores Sol/Terra: a cor deve corresponder à
   elevação da mesma amostra e instante, sem novas consultas científicas por frame.
8. Recarregar a página, terminar sessão e voltar a entrar. Reabrir no histórico:
   os run_id e números devem permanecer os da execução guardada.
9. Em **Relatórios**, exportar JSON e CSV. O JSON preserva os requisitos e fontes.
10. Noutra conta, tentar abrir o URL anterior: não deve apresentar os seus dados.
11. Para um ano, escolher passo de pelo menos 120 min; a UI mostra a contagem de
    amostras e bloqueia excesso. A análise de um ano foi executada realmente nesta entrega.

## Cartografia e fontes

Pontos: NASA *Lunar Surface Data Book*, Rev A, 2023, tabela A2-2, páginas 57–58:
https://ntrs.nasa.gov/citations/20230007818

São pontos de referência regional de Shackleton Rim, Nobile Rim 1, de Gerlache Rim 1,
Malapert Massif, Amundsen Rim e Haworth. Não são uma afirmação sobre a lista actual de
alvos de uma missão NASA, nem posições exactas de aterragens históricas.

Tiles: NASA Moon Trek, `LRO_WAC_Mosaic_SPole60_100m_v02`, mosaico LRO WAC polar.
Catálogo e capacidades foram consultados realmente; um tile PNG foi descarregado e
verificado. Metadados em docs/sources/mission-map-manifest.json e moon-polar-wmts.xml.

O serviço declara EPSG:0 nas capacidades e põe coordenadas métricas no campo WGS84.
Esses tags não são interpretados como um datum terrestre. O catálogo oficial associa
a camada a IAU2000:30120 e publica o WKT Moon2000_sp para a camada WAC polar anterior:
esfera de raio 1737400 m, origem -90°, meridiano 0°, escala 1, falsos x/y zero.
Essa projecção e a grelha WMTS verificada são usadas explicitamente no código.
Testes de orientação cardinal, unidades e ida/volta verificam a transformação.
Isto não prova alinhamento submétrico entre catálogo, mosaico e frame Horizons.

A camada original tem designação 100 m; os tiles efectivamente servidos chegam a
~267.56 m/pixel no nível 5. A UI apresenta o limite efectivo. Zoom adicional amplia
pixels, não cria detalhe. Sombras na fotografia são históricas; os marcadores mostram
apenas visibilidade geométrica calculada no cursor, sem obstrução por terreno.
Sem tiles, a tabela, coordenadas e vista SVG do horizonte continuam utilizáveis.

Efemérides: JPL Horizons, conforme docs/task-1-positions.md. Foram verificadas
consultas reais nos extremos de 2026 e 2028 e uma série anual (4381 amostras/corpo).
Pedidos, resumo e checksums em docs/sources/mission-coverage-*.json e
mission-year-verification.json. Não é validação astronómica independente.

## Testes de navegador opt-in

Com API/Vite iniciados, Chrome e Playwright disponíveis:

```sh
npm install --prefix /tmp/antispiral-browser playwright-core
ANTISPIRAL_PLAYWRIGHT_MODULE=/tmp/antispiral-browser/node_modules/playwright-core/index.mjs \
  node scripts/check_mission_flow_browser.mjs
```

O teste usa PostgreSQL e Horizons reais, cria duas contas de teste `@example.invalid`,
confere menu, multiselect, inteiros, progresso, reabertura, JSON, isolamento e marcador
no centro da projecção. Pode configurar ANTISPIRAL_WEB_URL e ANTISPIRAL_CHROME.
O proxy Vite preserva Host e Origin, incluindo a porta efectiva; mudar de 5173 para
5174 não exige alterar CORS_ORIGINS quando os pedidos passam por `/api` no frontend.
Uma ligação directa à API, sem proxy, exige a origem exacta em CORS_ORIGINS.
As contas criadas pelo script são dados reais de teste na BD, não uma demo pública.

Os scripts antigos das quatro tasks agora autenticam no backend e abrem /sol-terra;
sem conta fornecida criam uma conta temporária de teste. São igualmente opt-in.
