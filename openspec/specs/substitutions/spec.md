# substitutions Specification

## Purpose

Permite trocar, retirar e reposicionar jogadoras por arrasto direto na tela, com animação e registro de cada substituição com o minuto de jogo.

## Requirements

### Requirement: Arrastar bolinhas
O sistema SHALL permitir arrastar qualquer bolinha com o dedo ou com o mouse. Durante o arrasto a bolinha segue o ponteiro e fica destacada acima das demais.

#### Scenario: Arrasto com toque
- **WHEN** a usuária pressiona uma bolinha e move o dedo
- **THEN** a bolinha acompanha o dedo sem rolar a página nem acionar gestos do navegador

#### Scenario: Toque curto não arrasta
- **WHEN** a usuária toca e solta a bolinha sem movê-la além de uma pequena tolerância
- **THEN** o sistema trata como toque e abre a edição do nome, sem mover a bolinha

### Requirement: Reserva sobre titular troca as duas
O sistema SHALL, quando uma bolinha do banco é solta sobre uma bolinha da quadra, colocar a reserva na vaga de posição da titular e mover a titular para a vaga de banco que a reserva ocupava.

#### Scenario: Substituição simples
- **WHEN** "Lia" (banco) é solta sobre "Duda" (pivô)
- **THEN** "Lia" passa a ocupar a vaga de pivô exibindo "PV" e "Duda" passa a ocupar a vaga de banco onde "Lia" estava

#### Scenario: Quadra permanece com cinco
- **WHEN** uma substituição por troca é concluída
- **THEN** o número de bolinhas na quadra é o mesmo de antes da troca

### Requirement: Titular arrastada para o banco sai da quadra
O sistema SHALL, quando uma bolinha da quadra é solta na área do banco, retirá-la da quadra e colocá-la no banco, deixando a vaga de posição vazia.

#### Scenario: Retirar sem substituir
- **WHEN** "Eva" (ala direita) é solta na área do banco
- **THEN** "Eva" aparece no banco, a vaga de ala direita fica vazia e a quadra passa a ter 4 bolinhas

#### Scenario: Vaga vazia continua visível
- **WHEN** uma vaga de posição fica vazia
- **THEN** a quadra mostra um marcador discreto da vaga com a sigla da posição, para que uma reserva possa ser solta ali

### Requirement: Titular reposicionada dentro da quadra
O sistema SHALL, quando uma bolinha da quadra é solta em um espaço vazio dentro da quadra, apenas movê-la para o novo ponto, mantendo sua posição nominal.

#### Scenario: Ajustar posicionamento tático
- **WHEN** "Carla" (fixo) é arrastada e solta em outro ponto vazio da quadra
- **THEN** "Carla" fica no novo ponto, continua exibindo "FX" e nenhuma outra bolinha muda

#### Scenario: Titular solta sobre outra titular
- **WHEN** uma bolinha da quadra é solta sobre outra bolinha da quadra
- **THEN** as duas trocam de vaga de posição entre si

### Requirement: Soltar fora de qualquer alvo
O sistema SHALL devolver a bolinha ao lugar de origem quando ela é solta fora da quadra e fora do banco.

#### Scenario: Soltar sobre o cronômetro
- **WHEN** uma bolinha é solta sobre a área do cronômetro ou do menu
- **THEN** ela retorna à vaga de origem com animação

### Requirement: Animação de troca
O sistema SHALL animar o deslocamento das bolinhas envolvidas em uma troca, retirada ou retorno, com duração entre 200 e 400 milissegundos.

#### Scenario: Troca animada
- **WHEN** uma substituição é concluída
- **THEN** a titular que saiu desliza até a vaga do banco e a reserva que entrou desliza até a vaga de posição, em vez de saltar instantaneamente

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
