# Proposal

## Why

Técnicas de futsal escolar infantil não têm uma ferramenta simples, de uso em quadra e pelo celular, para visualizar a escalação, fazer substituições com um gesto e acompanhar o tempo de jogo e o tempo que cada criança ficou em quadra. O projeto começa do zero (repositório vazio), então esta mudança entrega a primeira versão completa e utilizável do aplicativo.

## What Changes

- Novo aplicativo web de página única (SPA), em português do Brasil, com a quadra de futsal vista de cima ocupando a tela, cinco vagas de posição (goleira, fixo, ala esquerda, ala direita, pivô) e um banco de reservas que começa com 4 jogadoras.
- Toque em uma bolinha edita o nome da jogadora, exibido como rótulo abaixo da bolinha, tanto na quadra quanto no banco.
- Inclusão e exclusão de bolinhas no banco. Máximo de 5 bolinhas dentro da quadra, sempre.
- Substituição por arrasto: reserva solta sobre titular troca as duas de vaga; titular arrastada para o banco sai da quadra; titular arrastada dentro da quadra apenas reposiciona. A troca é animada.
- Cronômetro regressivo na parte inferior, duração inicial de 20 minutos e ajustável, com botão de período (1º e 2º tempo).
- Tempo em quadra acumulado por jogadora, contado apenas com o cronômetro rodando, exibido abaixo do nome, com resumo e histórico de substituições no menu.
- Menu hambúrguer que não cobre a quadra em repouso: nova partida, salvar e carregar escalação, cores, resumo de tempos, exportar e importar JSON.
- Cores configuráveis para as jogadoras de linha e para a goleira.
- Autosave da partida em andamento no localStorage e oferta de retomada ao reabrir.
- Layout responsivo: paisagem com banco à direita da quadra, retrato com quadra girada e banco abaixo. Funciona em celular, tablet e desktop.
- Uso em ginásio: PWA instalável e offline, tela não apaga enquanto o cronômetro roda, bloqueio de "puxar para atualizar" sobre a quadra.
- Publicação automática no GitHub Pages, sem login, código aberto.

Fora do escopo desta mudança: cor individual por jogadora, placar, múltiplos times, sincronização entre aparelhos e qualquer backend.

## Capabilities

### New Capabilities

- `court-lineup`: quadra vista de cima com vagas de posição, banco de reservas, edição de nomes, inclusão e exclusão de reservas, limite de 5 em quadra e disposição em paisagem e retrato.
- `substitutions`: gestos de arrasto para trocar, tirar e reposicionar jogadoras, animação da troca e histórico de substituições com minuto de jogo.
- `match-clock`: cronômetro regressivo ajustável com iniciar, pausar, reiniciar e períodos.
- `playing-time`: acúmulo de tempo em quadra por jogadora enquanto o cronômetro roda e sua exibição e resumo.
- `team-colors`: configuração das cores das bolinhas de linha e da goleira.
- `match-persistence`: autosave e retomada da partida, escalações salvas, exportação e importação em JSON.
- `field-usability`: instalação como PWA, funcionamento offline, tela sempre ligada durante o jogo e proteção contra gestos do navegador sobre a quadra.

### Modified Capabilities

Nenhuma. O projeto não possui specs anteriores.

## Impact

- Código: criação de todo o projeto. Vite, TypeScript, SVG, Vitest, manifest PWA e service worker, workflow do GitHub Actions para o Pages.
- Dependências: Vite e Vitest em desenvolvimento. Sem dependências de runtime além do navegador. Sem three.js (decisão tomada na exploração: quadra plana vista de cima não justifica WebGL).
- Dados: tudo fica no localStorage do aparelho. Formato JSON versionado para exportação, importação e autosave.
- Infra: repositório público no GitHub com Pages habilitado a partir do workflow.
