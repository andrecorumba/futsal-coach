# Tasks

## 1. Modelo e papéis (spec court-lineup)

- [x] 1.1 Adicionar `role: 'starter' | 'reserve' | null` a `Player`, `kickoff: boolean` a `Match`, `reserveColor` a `Colors` com padrão `#b39ddb`, e atualizar fábricas (`newMatch`, `defaultLineup`, `addReserve`); verificar com `npx tsc --noEmit` limpo e teste de que uma partida nova tem `kickoff` falso, todos os papéis `null` e as três cores padrão
- [x] 1.2 Congelar papéis em `startClock` no primeiro início (`kickoff` falso para verdadeiro, quadra vira titular, banco vira reserva) e fazer `addReserve` após o apito criar jogadora com papel reserva; verificar com testes dos cenários "Congelar no apito inicial", "Reserva que entra mantém o papel" e "Trocar de período não altera"
- [x] 1.3 Zerar `kickoff` e papéis em `restartMatch` e `applyLineup`; verificar com teste do cenário "Nova partida zera os papéis" para as duas ações

## 2. Histórico condicional (spec substitutions)

- [x] 2.1 Fazer `record()` não registrar quando `kickoff` é falso; verificar com testes dos cenários "Troca antes do apito não registra" e "Troca com o relógio pausado após o apito registra", e com a suíte existente de histórico ajustada para iniciar o relógio antes das trocas

## 3. Compatibilidade de dados (specs court-lineup e team-colors)

- [x] 3.1 Normalizar `reserveColor` em `normalizeSettings` e `normalizeColors`, e `kickoff` e `role` em `normalizeMatch` conforme design D5; verificar com testes dos cenários "Partida salva sem papéis" (com e sem relógio iniciado) e "Configuração salva sem cor de reservas", mais um de ida e volta de exportação e importação com papéis preenchidos

## 4. Cor por papel na renderização (spec team-colors)

- [x] 4.1 Criar `colorFor(match, slot, player)` pura conforme design D3 e usar em `tokens.ts` no lugar da decisão por vaga; verificar com testes unitários dos cenários "Partida nova", "Reserva em quadra", "Titular no banco após sair", "Reserva no gol" e "Antes do apito o papel segue o lugar"
- [x] 4.2 Verificar no navegador (dev server, 360x740 e 800x400) que uma partida nova mostra banco roxo claro e quadra azul, que após iniciar e trocar a reserva fica roxa em quadra e a titular azul no banco, e que a reserva colocada no gol fica amarela

## 5. Menu com três cores (spec team-colors)

- [x] 5.1 Adicionar o terceiro seletor na seção Cores na ordem Goleira, Titulares, Reservas, com rótulos novos em `i18n.ts`, despachando `setColors` com `reserveColor`, e aplicar as três cores do aparelho em `main.ts` nas partidas retomadas e importadas; verificar no navegador os cenários "Abrir seção de cores", "Alterar cor das titulares", "Alterar cor das reservas" e "Reabrir" e com grep que nenhuma string de interface ficou fora de `i18n.ts`
- [x] 5.2 Atualizar o README na parte de cores e de "Nova partida" (que zera os papéis), e rodar `npm test`, `npx tsc --noEmit` e `npm run build`; verificar tudo verde e o percurso completo no navegador: montar escalação, iniciar, trocar, abrir resumo sem entradas pré-apito, exportar e reimportar mantendo as cores por papel
