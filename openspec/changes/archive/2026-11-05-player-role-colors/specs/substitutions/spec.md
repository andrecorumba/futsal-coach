# Spec Delta

## MODIFIED Requirements

### Requirement: Histórico de substituições
O sistema SHALL registrar cada substituição em que uma jogadora entra ou sai da quadra após o primeiro início do relógio da partida, com o período, o tempo de jogo decorrido no momento e os nomes de quem saiu e de quem entrou.

#### Scenario: Registro de troca
- **WHEN** "Lia" entra no lugar de "Duda" aos 7 minutos e 20 segundos do 1º tempo
- **THEN** o histórico ganha a entrada "1T 07:20 - saiu Duda, entrou Lia"

#### Scenario: Registro de retirada
- **WHEN** "Eva" é retirada para o banco sem substituta
- **THEN** o histórico ganha uma entrada com o momento, "saiu Eva" e nenhuma jogadora como entrada

#### Scenario: Reposicionamento não registra
- **WHEN** uma titular é apenas reposicionada dentro da quadra
- **THEN** o histórico não recebe nova entrada

#### Scenario: Troca antes do apito não registra
- **WHEN** o relógio ainda não foi iniciado na partida e a usuária troca, retira ou coloca jogadoras em quadra
- **THEN** o histórico não recebe nova entrada

#### Scenario: Troca com o relógio pausado após o apito registra
- **WHEN** o relógio já foi iniciado na partida, está pausado, e a usuária faz uma troca
- **THEN** o histórico recebe a entrada com o tempo decorrido no momento da pausa

#### Scenario: Consultar histórico
- **WHEN** a usuária abre o resumo no menu
- **THEN** vê a lista de substituições em ordem cronológica
