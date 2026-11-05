# Spec Delta

## ADDED Requirements

### Requirement: Escalação do apito guardada
O sistema SHALL guardar, no primeiro início do relógio da partida, qual jogadora ocupava cada vaga de quadra, para permitir restaurar essa escalação ao reiniciar a partida.

#### Scenario: Guardar no apito
- **WHEN** a usuária toca em iniciar pela primeira vez na partida
- **THEN** a partida registra a jogadora de cada uma das vagas de quadra naquele instante

#### Scenario: Trocas não alteram
- **WHEN** substituições acontecem após o apito
- **THEN** a escalação do apito guardada permanece a mesma

### Requirement: Botão do menu sobreposto à quadra
O sistema SHALL exibir o botão do menu sobreposto ao canto superior da área da quadra, sem reservar uma faixa própria de altura, e sem cobrir nenhuma vaga de quadra ou do banco na disposição inicial.

#### Scenario: Sem faixa superior
- **WHEN** o aplicativo é exibido em qualquer orientação
- **THEN** a área da quadra começa no topo da área segura da tela e o botão do menu fica por cima dela, no canto

## MODIFIED Requirements

### Requirement: Disposição em paisagem e retrato
O sistema SHALL adaptar a disposição à orientação do aparelho: em paisagem a quadra fica na horizontal com o banco em coluna à direita; em retrato a quadra é girada para a vertical com o banco em coluna ao lado dela. O cronômetro fica na parte inferior em ambas.

#### Scenario: Celular em pé
- **WHEN** a janela é mais alta do que larga
- **THEN** a quadra ocupa a altura disponível na vertical, o banco aparece em coluna ao lado da quadra e o cronômetro na base da tela

#### Scenario: Celular deitado ou tablet
- **WHEN** a janela é mais larga do que alta
- **THEN** a quadra ocupa a área principal na horizontal, o banco aparece em coluna à direita e o cronômetro na base da tela

#### Scenario: Rotação durante o jogo
- **WHEN** a usuária gira o aparelho com a partida em andamento
- **THEN** a disposição muda sem perder nomes, vagas, tempos ou o estado do cronômetro

#### Scenario: Preencher a tela do iPhone 15
- **WHEN** o aplicativo roda em retrato em uma janela de 393 por 659 pixels CSS, como o Safari do iPhone 15 com barra de endereço
- **THEN** a quadra tem pelo menos 250 pixels de largura e a área de desenho usa pelo menos 90 por cento da altura disponível entre o topo seguro e o cronômetro

#### Scenario: Banco com muitas reservas em retrato
- **WHEN** há mais reservas do que cabem em uma coluna ao lado da quadra
- **THEN** o banco ganha uma segunda coluna e a quadra encolhe o necessário, mantendo as bolinhas com pelo menos 40 pixels de toque
