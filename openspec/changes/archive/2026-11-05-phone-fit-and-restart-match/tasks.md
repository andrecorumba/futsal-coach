# Tasks

## 1. Escalação do apito e reinício (spec match-persistence e court-lineup)

- [x] 1.1 Adicionar `kickoffCourt` ao `Match`, preencher em `freezeRoles`, zerar em `restartMatch` e `applyLineup`, e normalizar em `storage.ts` descartando entradas inválidas; verificar com testes dos cenários "Guardar no apito" e "Trocas não alteram" e de carga de partida salva sem o campo
- [x] 1.2 Implementar em `restartMatch` a restauração da escalação conforme design D4; verificar com testes dos cenários "Reiniciar após o jogo", "Reiniciar antes do apito" e "Reserva excluída após o apito", incluindo a invariante de uma vaga de banco por jogadora fora da quadra
- [x] 1.3 Trocar o texto e a confirmação da ação no menu para "Reiniciar partida" em `i18n.ts` e `menu.ts`, e atualizar o README; verificar no navegador os cenários "Reiniciar após o jogo" e "Cancelar"

## 2. Quadra preenchendo a tela (spec court-lineup)

- [x] 2.1 Reescrever o retrato em `layout.ts` com banco em coluna ao lado da quadra, viewBox base 29x42, segunda coluna acima de 6 células, e `benchCell` preenchendo colunas; verificar com testes unitários de `computeLayout` e `benchCell` em retrato para 5 e 8 células e com a suíte de `drag-target` ajustada
- [x] 2.2 Remover a faixa superior: grade de duas linhas em `style.css`, botão do menu sobreposto com área segura e 44 px de toque, remoção de `--top-bar` em `main.ts`; verificar no navegador que o botão não cobre nenhuma bolinha nas duas orientações e que o menu continua abrindo e fechando
- [x] 2.3 Verificar em Chrome headless com viewport 393x659 (retrato) que a quadra tem pelo menos 250 px de largura e o SVG usa pelo menos 90 por cento da altura entre o topo e o cronômetro, e em 393x852 e 852x393 que nada se sobrepõe; registrar as medidas no relatório e rodar `npm test`, `npx tsc --noEmit` e `npm run build` verdes
