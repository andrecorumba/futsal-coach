# Spec Delta

## Purpose

Apresenta a quadra de futsal vista de cima com as cinco vagas de posição e o banco de reservas, permitindo nomear jogadoras e gerenciar quem compõe o elenco da partida.

## ADDED Requirements

### Requirement: Quadra com cinco vagas de posição
O sistema SHALL exibir uma quadra de futsal vista de cima, na proporção 2:1, com cinco vagas de posição iniciais: goleira (GL), fixo (FX), ala esquerda (AE), ala direita (AD) e pivô (PV). Cada vaga é representada por uma bolinha com a sigla da posição dentro.

#### Scenario: Primeira abertura
- **WHEN** o aplicativo é aberto sem partida salva
- **THEN** a quadra aparece com as cinco bolinhas nas posições padrão de goleira, fixo, ala esquerda, ala direita e pivô, cada uma com sua sigla e sem nome

#### Scenario: Linhas da quadra
- **WHEN** a quadra é exibida
- **THEN** mostra as marcações básicas de futsal: limites, linha central, círculo central e as duas áreas de meta

### Requirement: Banco de reservas inicial
O sistema SHALL exibir um banco de reservas fora da área da quadra que começa com 4 bolinhas sem nome em uma partida nova.

#### Scenario: Partida nova
- **WHEN** uma partida nova é iniciada
- **THEN** o banco mostra exatamente 4 bolinhas de reserva, posicionadas fora dos limites da quadra

### Requirement: Edição do nome por toque
O sistema SHALL permitir editar o nome da jogadora ao tocar em sua bolinha, na quadra ou no banco, e exibir o nome como rótulo imediatamente abaixo da bolinha.

#### Scenario: Nomear jogadora
- **WHEN** a usuária toca em uma bolinha e digita "Duda" e confirma
- **THEN** o rótulo "Duda" aparece abaixo da bolinha

#### Scenario: Cancelar edição
- **WHEN** a usuária abre a edição e cancela sem confirmar
- **THEN** o nome anterior permanece inalterado

#### Scenario: Bolinha no banco mostra inicial
- **WHEN** uma bolinha do banco tem nome "Lia"
- **THEN** a bolinha exibe a inicial "L" dentro e o rótulo "Lia" abaixo

#### Scenario: Bolinha na quadra mostra posição
- **WHEN** uma bolinha com nome "Duda" ocupa a vaga de pivô
- **THEN** a bolinha exibe "PV" dentro e o rótulo "Duda" abaixo

### Requirement: Incluir reservas
O sistema SHALL permitir incluir novas bolinhas no banco por meio de um controle de adicionar junto ao banco.

#### Scenario: Adicionar reserva
- **WHEN** a usuária aciona o controle de adicionar reserva
- **THEN** uma nova bolinha sem nome aparece no banco e o total de reservas aumenta em um

### Requirement: Excluir reservas
O sistema SHALL permitir excluir uma bolinha que esteja no banco. Bolinhas dentro da quadra MUST NOT ser excluídas diretamente; precisam sair para o banco antes.

#### Scenario: Excluir reserva
- **WHEN** a usuária aciona excluir em uma bolinha do banco e confirma
- **THEN** a bolinha é removida do banco e seus dados deixam de aparecer no elenco atual

#### Scenario: Tentar excluir titular
- **WHEN** a usuária abre as opções de uma bolinha que está na quadra
- **THEN** a opção de excluir não está disponível

### Requirement: Limite de cinco em quadra
O sistema SHALL garantir que no máximo 5 bolinhas estejam dentro da área da quadra em qualquer momento.

#### Scenario: Quadra cheia
- **WHEN** há 5 bolinhas na quadra e a usuária arrasta uma reserva para um espaço vazio da quadra
- **THEN** a reserva volta para o banco e nenhuma bolinha entra

#### Scenario: Quadra com vaga livre
- **WHEN** há menos de 5 bolinhas na quadra e a usuária arrasta uma reserva para um espaço vazio da quadra
- **THEN** a reserva passa a ocupar uma vaga livre da quadra

### Requirement: Disposição em paisagem e retrato
O sistema SHALL adaptar a disposição à orientação do aparelho: em paisagem a quadra fica na horizontal com o banco à direita; em retrato a quadra é girada para a vertical com o banco abaixo. O cronômetro fica na parte inferior em ambas.

#### Scenario: Celular em pé
- **WHEN** a janela é mais alta do que larga
- **THEN** a quadra ocupa a largura disponível na vertical, o banco aparece em linha abaixo da quadra e o cronômetro na base da tela

#### Scenario: Celular deitado ou tablet
- **WHEN** a janela é mais larga do que alta
- **THEN** a quadra ocupa a área principal na horizontal, o banco aparece em coluna à direita e o cronômetro na base da tela

#### Scenario: Rotação durante o jogo
- **WHEN** a usuária gira o aparelho com a partida em andamento
- **THEN** a disposição muda sem perder nomes, vagas, tempos ou o estado do cronômetro

### Requirement: Alvos de toque adequados
O sistema SHALL renderizar cada bolinha com tamanho mínimo de toque de 44 pixels CSS em qualquer tela suportada.

#### Scenario: Tela pequena
- **WHEN** o aplicativo roda em uma tela de 360 pixels de largura em retrato
- **THEN** todas as bolinhas da quadra e do banco mantêm pelo menos 44 pixels de área tocável e não se sobrepõem na disposição inicial
