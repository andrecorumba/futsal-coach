# Spec Delta

## Purpose

Acumula e exibe quanto tempo cada jogadora ficou dentro da quadra, para apoiar o rodízio justo entre as crianças durante o jogo.

## ADDED Requirements

### Requirement: Acúmulo enquanto o cronômetro roda
O sistema SHALL acumular tempo em quadra para cada jogadora que ocupa uma vaga de posição somente enquanto o cronômetro da partida está rodando. Jogadoras no banco não acumulam.

#### Scenario: Cinco em quadra por um minuto
- **WHEN** o cronômetro roda por 60 segundos com 5 jogadoras na quadra e 4 no banco
- **THEN** cada uma das 5 titulares acumula 60 segundos e cada reserva permanece com o tempo que tinha

#### Scenario: Cronômetro pausado
- **WHEN** o cronômetro está pausado por qualquer intervalo
- **THEN** nenhuma jogadora acumula tempo nesse intervalo

#### Scenario: Goleira conta
- **WHEN** o cronômetro roda com a vaga de goleira ocupada
- **THEN** a goleira acumula tempo como as demais titulares

### Requirement: Substituição transfere o acúmulo
O sistema SHALL, a partir do momento da substituição, parar de acumular para quem saiu e começar a acumular para quem entrou, sem perder o tempo já acumulado por nenhuma das duas.

#### Scenario: Troca no meio do período
- **WHEN** "Duda" tem 05:00 em quadra, "Lia" tem 00:00, "Lia" entra no lugar de "Duda" e o cronômetro roda mais 120 segundos
- **THEN** "Duda" mostra 05:00 e "Lia" mostra 02:00

### Requirement: Exibição abaixo do nome
O sistema SHALL exibir o tempo acumulado de cada jogadora no formato MM:SS, em texto menor, imediatamente abaixo do nome, em todas as bolinhas da quadra e do banco, atualizando pelo menos uma vez por segundo enquanto o cronômetro roda.

#### Scenario: Bolinha com tempo
- **WHEN** "Duda" acumulou 12 minutos e 40 segundos
- **THEN** sua bolinha mostra "Duda" e logo abaixo "12:40"

#### Scenario: Jogadora sem nome
- **WHEN** uma bolinha ainda não tem nome
- **THEN** o tempo aparece do mesmo modo, abaixo do espaço do rótulo

### Requirement: Tempo persiste entre períodos
O sistema SHALL manter o tempo acumulado ao trocar de período ou reiniciar o cronômetro, e zerá-lo somente ao iniciar uma partida nova.

#### Scenario: Trocar de período
- **WHEN** a usuária passa para o 2º tempo
- **THEN** os tempos acumulados de todas as jogadoras permanecem

#### Scenario: Partida nova
- **WHEN** a usuária inicia uma partida nova
- **THEN** todas as jogadoras começam com 00:00

### Requirement: Resumo de tempos
O sistema SHALL oferecer no menu um resumo com todas as jogadoras do elenco ordenadas do maior para o menor tempo em quadra, indicando quem está em quadra no momento.

#### Scenario: Abrir resumo
- **WHEN** a usuária abre o resumo de tempos
- **THEN** vê a lista ordenada por tempo decrescente, com nome, tempo MM:SS e marcação de quem está em quadra
