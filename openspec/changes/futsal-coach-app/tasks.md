# Tasks

## 1. Estrutura do projeto

- [x] 1.1 Inicializar projeto Vite com template vanilla-ts, adicionar Vitest, `vite-plugin-pwa`, `.gitignore`, `README.md` inicial em pt-BR e licença MIT; verificar que `npm run dev`, `npm run build` e `npm test` executam sem erro
- [x] 1.2 Criar a estrutura de pastas de design.md D10 com arquivos vazios ou stubs tipados e `tsconfig` estrito; verificar que `npx tsc --noEmit` passa
- [x] 1.3 Configurar `vite.config.ts` com `base` lido de `VITE_BASE` (padrão `/`) e plugin PWA em `registerType: 'prompt'` com manifesto pt-BR, `display: standalone`, ícones placeholder 192 e 512 em `public/`; verificar que o build gera `manifest.webmanifest` e `sw.js` em `dist/`

## 2. Modelo e reducer de estado (specs court-lineup e substitutions)

- [x] 2.1 Implementar `state/model.ts` com os tipos de design.md D2, `defaultLineup()` (5 vagas de quadra GL, FX, AE, AD, PV com coordenadas normalizadas padrão e 4 vagas de banco) e `newMatch(lineup, settings)`; verificar com teste que uma partida nova tem 5 vagas de quadra, 4 de banco, 9 jogadoras sem nome e cronômetro em 20 minutos parado
- [x] 2.2 Implementar no reducer `setName`, `addReserve` e `removeReserve` (recusa remover jogadora que está em vaga de quadra); verificar com testes de cada cenário de edição, inclusão e exclusão da spec court-lineup
- [x] 2.3 Implementar `dropOn(fromSlotId, target)` cobrindo: banco sobre titular troca `playerId`; quadra para banco esvazia a vaga; quadra para ponto livre atualiza `x, y`; quadra sobre quadra troca vagas; banco para quadra livre entra na primeira vaga vazia ou é recusado se já houver 5; alvo inválido não altera; verificar com um teste por cenário das specs substitutions e court-lineup "Limite de cinco em quadra"
- [x] 2.4 Registrar em `substitutions[]` toda entrada ou saída de quadra com período e tempo decorrido, sem registrar reposicionamento; verificar com testes dos quatro cenários de "Histórico de substituições"

## 3. Cronômetro e tempo em quadra (specs match-clock e playing-time)

- [x] 3.1 Implementar `state/time.ts` com `remainingAt(match, now)`, `startClock`, `pauseClock`, `setDuration` (afeta período não iniciado e próximos), `setPeriod` e `resetClock`, baseados em timestamps conforme D4; verificar com testes de relógio simulado para cada cenário da spec match-clock, incluindo o de 30 segundos com tela bloqueada
- [x] 3.2 Implementar acúmulo de tempo em quadra com `playingTimeMs` e `playingSince`, consolidação em pausa, troca de período, reinício e substituição, e `playingTimeAt(match, playerId, now)`; verificar com testes dos cenários "Cinco em quadra por um minuto", "Cronômetro pausado", "Goleira conta", "Troca no meio do período" e "Tempo persiste entre períodos"
- [x] 3.3 Implementar fim de período: ao chegar a zero o estado passa a `finished`, iniciar fica bloqueado até reiniciar ou trocar de período; verificar com teste que o tempo restante nunca fica negativo e que `startClock` é ignorado em `finished`

## 4. Persistência (spec match-persistence)

- [x] 4.1 Implementar `state/storage.ts` com load/save das chaves `futsal:match`, `futsal:lineups` e `futsal:settings`, serialização com `version: 1` e normalização de campos ausentes; verificar com testes usando um `localStorage` em memória que salvar e carregar devolve estado equivalente, incluindo `runningSince`
- [x] 4.2 Implementar `exportMatch`, `exportLineup`, `parseImport` com validação de `app`, `kind` e `version`, retornando erro em pt-BR para JSON inválido, formato desconhecido ou versão futura; verificar com testes dos cenários "Arquivo inválido" e "Versão futura" e um de ida e volta
- [x] 4.3 Implementar `saveLineup(name)`, `loadLineup(name)` (zera tempos e histórico), `deleteLineup(name)` e `newMatch` pelo menu (mantém nomes e vagas, zera o resto); verificar com testes dos cenários de "Salvar e carregar escalações" e "Partida nova pelo menu"

## 5. Renderização da quadra (spec court-lineup)

- [x] 5.1 Implementar `view/layout.ts` com os dois `viewBox` de D6, a projeção `toView(slot, layout)` e a escolha por `matchMedia('(orientation: portrait)')`; verificar com teste unitário que uma vaga em (0.5, 0.5) projeta no centro da quadra nas duas orientações
- [x] 5.2 Implementar `view/court.ts` desenhando limites, linha central, círculo central e áreas de meta em SVG; verificar visualmente no navegador em paisagem e retrato
- [x] 5.3 Implementar `view/tokens.ts` com render idempotente de um `<g>` por vaga: círculo, texto interno (sigla na quadra, inicial no banco), rótulo do nome com truncamento em 10 caracteres, texto do tempo em quadra abaixo do nome, marcador discreto para vaga de quadra vazia e botão de adicionar no banco; verificar no navegador que uma partida nova mostra 5 bolinhas com siglas, 4 reservas e o botão de adicionar, e que a tela de 360 px em retrato mantém 44 px de toque sem sobreposição
- [x] 5.4 Implementar `view/i18n.ts` com todas as strings em pt-BR e usar nos componentes; verificar com grep que nenhum texto de interface está literal fora de `i18n.ts`
- [x] 5.5 Implementar edição de nome: toque curto abre caixa HTML posicionada sobre a bolinha com confirmar e cancelar; opções de excluir só para vaga de banco; verificar no navegador os cenários "Nomear jogadora", "Cancelar edição", "Excluir reserva" e "Tentar excluir titular"

## 6. Arrasto e animação (spec substitutions)

- [x] 6.1 Implementar `view/drag.ts` com Pointer Events, captura de ponteiro, tolerância de 8 px para distinguir toque de arrasto, elevação do `<g>` arrastado e função pura `resolveTarget(point, slots, layout)` com as quatro regras de D5; verificar `resolveTarget` com testes unitários para cada regra e o arrasto no navegador com mouse e toque
- [ ] 6.2 Aplicar `touch-action: none`, `user-select: none` na área do SVG e `overscroll-behavior: none` no body; verificar em celular Android ou emulação do DevTools que arrastar para baixo não recarrega e toque duplo não dá zoom
- [x] 6.3 Implementar animação FLIP com Web Animations API (300 ms) para troca, retirada, entrada e retorno ao cancelar; verificar no navegador que a troca desliza as duas bolinhas e que soltar sobre o cronômetro devolve a bolinha animada à origem
- [ ] 6.4 Validar o arrasto em iPhone Safari real ou simulador; se `setPointerCapture` falhar em SVG, aplicar a alternativa de ouvir `pointermove` e `pointerup` no `window` conforme risco de design.md; verificar que os cenários "Substituição simples" e "Retirar sem substituir" funcionam no iOS

## 7. Barra do cronômetro (specs match-clock e playing-time)

- [x] 7.1 Implementar `view/clock.ts` na base da tela com mostrador MM:SS, botões iniciar/pausar, reiniciar com confirmação, botão de período "1T"/"2T" e controle de duração entre 1 e 60 minutos; verificar no navegador os cenários "Estado inicial", "Iniciar e pausar", "Ajustar antes de começar", "Ajustar com o período em andamento", "Passar para o 2º tempo" e "Reiniciar cancelado"
- [x] 7.2 Implementar tick de 250 ms que atualiza apenas o mostrador e os textos de tempo das bolinhas, e destaque visual mais vibração ao chegar a zero; verificar no navegador que ao zerar o mostrador fica em destaque e o botão iniciar desabilita, e no DevTools com CPU 4x mais lenta que não há travamento perceptível
- [ ] 7.3 Consolidar tempos em `visibilitychange` e pausar o render quando a aba está oculta; verificar que bloquear a tela por 30 segundos com o relógio rodando resulta em 30 segundos a menos ao voltar

## 8. Menu, cores e integração (specs team-colors, match-persistence, field-usability)

- [x] 8.1 Implementar `view/menu.ts`: botão hambúrguer no canto superior, painel deslizante que fecha ao tocar fora, com seções Nova partida, Escalações (salvar, carregar, excluir, exportar), Cores, Resumo (tempos ordenados e histórico de substituições), Exportar partida, Importar JSON; verificar no navegador os cenários "Menu fechado", "Fechar tocando fora" e "Abrir resumo"
- [x] 8.2 Implementar cores de linha e de goleira com `<input type="color">`, contraste automático do texto interno e persistência em `futsal:settings`; verificar no navegador os quatro cenários da spec team-colors
- [x] 8.3 Ligar tudo em `main.ts`: reducer central, autosave com debounce de 300 ms, diálogo de retomada ao abrir com partida salva, importação e exportação por `Blob` e `<input type="file">`; verificar no navegador os cenários "Continuar partida", "Começar nova", "Sem partida salva", "Importar partida" e "Importar escalação"
- [ ] 8.4 Implementar Wake Lock ao iniciar o cronômetro, liberação ao pausar e re-aquisição em `visibilitychange`, com detecção de recurso; verificar em Android Chrome que a tela não apaga com o relógio rodando e que em navegador sem suporte não há erro no console
- [x] 8.5 Registrar o service worker com atualização em segundo plano sem recarregar durante a partida; verificar que após `npm run preview` o app abre em modo offline no DevTools e que uma nova build é aplicada só na abertura seguinte

## 9. Publicação e verificação final

- [x] 9.1 Criar `.github/workflows/deploy.yml` que instala, roda testes, faz build com `VITE_BASE=/<nome-do-repo>/` derivado de `github.event.repository.name` e publica `dist/` com `actions/deploy-pages`; verificar que o workflow passa e a URL do Pages carrega o app
- [x] 9.2 Escrever `README.md` em pt-BR com descrição, uso em quadra, instalação como PWA, exportação e importação, desenvolvimento local e licença; verificar que os comandos documentados executam como escritos
- [ ] 9.3 Verificação de integração: percorrer no celular um jogo completo (nomear 9 jogadoras, iniciar, duas substituições, retirada, 2º tempo, zerar, exportar JSON, fechar e retomar) em retrato e paisagem; verificar que tempos em quadra somam 5 vezes o tempo jogado e que o histórico lista todas as trocas
