# Design

## Context

Motivação em proposal.md. Hoje `layout.ts` usa dois viewBox fixos (paisagem 54x22, retrato 22x56) com banco abaixo em retrato, e `#app` é uma grade de três linhas: faixa superior de 44 px com o botão do menu, quadra, barra do cronômetro de 64 px. No Safari do iPhone 15 em retrato (393x659), a área da quadra fica com cerca de 560 px de altura; com o viewBox 22x56 a escala é 9,5 px por unidade e a quadra tem 190 a 210 px de largura.

A ação "Nova partida" do menu (`restartMatch` no reducer) mantém nomes e vagas e zera o resto. O apito congela papéis (`freezeRoles` em `time.ts`) mas não guarda em qual vaga cada titular estava.

## Goals / Non-Goals

**Goals:**

- Em retrato no iPhone 15, quadra com 250 px ou mais de largura e desenho usando 90 por cento ou mais da altura disponível.
- Uma única ação de reinício no menu, previsível, que restaura a escalação do apito.
- Sem mudança de formato de dados incompatível.

**Non-Goals:**

- Comprimir a proporção 2:1 da quadra.
- Rolagem do banco.
- Botão de reinício fora do menu.

## Decisions

### D1. Banco em coluna ao lado da quadra também em retrato

Retrato passa a ter a quadra girada (20 de largura por 40 de comprimento) e o banco em coluna à direita, igual à paisagem. Com 4 reservas mais o controle de adicionar são 5 células de 6 unidades, 30 de altura, cabem na altura de 40 da quadra. ViewBox base em retrato: largura 1 + 20 + 2 + 5 + 1 = 29, altura 42. Proporção 0,69, próxima da área do iPhone 15 (393 por 560, 0,70). Escala resultante cerca de 13,3 px por unidade: quadra com 266 por 532 px, contra 210 hoje.

Acima de 6 células o banco ganha uma segunda coluna (largura 34) e a escala cai para 11,5 px, ainda com alvos acima de 40 px. `benchCell` em retrato passa a preencher colunas de cima para baixo, como a paisagem.

Alternativa: viewBox calculado pela proporção exata do contêiner, com margens elásticas. Rejeitada por agora: ganho marginal sobre D1 e mais complexidade; o `preserveAspectRatio: xMidYMid meet` já centraliza a sobra.

### D2. Botão do menu sobreposto

`#app` passa a duas linhas: quadra e barra do cronômetro. O botão hambúrguer vira `position: absolute` no canto superior esquerdo da área da quadra, respeitando `safe-area-inset-top` e `-left`, com fundo semitransparente e 44 px de toque. A margem superior do viewBox (1 unidade, cerca de 13 px) mais a posição da goleira longe desse canto garantem que ele não cubra vagas. `--top-bar` deixa de existir; `main.ts` e `menu.ts` continuam usando `app.menuButton`.

### D3. Escalação do apito

`Match` ganha `kickoffCourt: Record<string, string>` (id da vaga de quadra para id da jogadora), preenchido em `freezeRoles` e zerado junto com `kickoff` em `restartMatch` e `applyLineup`. `normalizeMatch` aceita ausência (objeto vazio) e descarta entradas cuja vaga ou jogadora não existam mais.

### D4. Ação `restartMatch` restaura a escalação

O reducer, em `restartMatch`, além do que já faz (relógio, tempos, histórico, papéis, `kickoff`):

1. Se `kickoffCourt` está vazio, mantém as vagas como hoje.
2. Senão, para cada vaga de quadra: `playerId` = jogadora registrada se ela ainda existe no elenco, caso contrário `null`. Coordenadas das vagas são mantidas.
3. Todas as demais jogadoras vão para vagas de banco, na ordem: quem já estava no banco mantém a ordem relativa; quem estava em quadra e não é titular do apito entra no fim. O número de vagas de banco é ajustado para uma por jogadora (invariante de D11 da primeira mudança).
4. `kickoffCourt` volta a vazio.

A ação continua chamada `newMatch` internamente para não renomear chamadas; só o texto do menu muda para "Reiniciar partida", com mensagem de confirmação explicando o efeito.

## Risks / Trade-offs

- [Banco em coluna em retrato deixa o nome das reservas com menos largura] → Mesmo truncamento de 10 caracteres de hoje; célula de 5 unidades a 13 px dá 65 px, suficiente para a fonte atual.
- [Botão sobreposto cobre parte do canto da quadra] → O canto superior esquerdo não tem vaga na escalação padrão; se a técnica reposicionar uma bolinha para ali, o botão fica por cima e ela ainda pode arrastá-la pela parte visível.
- [Titular do apito excluída] → A vaga fica vazia e a técnica preenche arrastando; coberto por cenário.
