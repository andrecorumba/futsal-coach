# team-colors Specification

## Purpose

Permite escolher as cores das bolinhas das jogadoras de linha e da goleira, para combinar com o uniforme do time e distinguir a goleira de relance.

## Requirements

### Requirement: Cor das titulares
O sistema SHALL aplicar uma cor configurável, com padrão azul, à bolinha de toda jogadora com papel de titular, ou que esteja em vaga de quadra antes do apito inicial, na quadra ou no banco.

#### Scenario: Alterar cor das titulares
- **WHEN** a usuária escolhe uma nova cor de titulares no menu
- **THEN** todas as bolinhas de titulares, na quadra e no banco, passam imediatamente para a nova cor

#### Scenario: Titular no banco após sair
- **WHEN** a titular "Duda" é substituída e vai para o banco após o apito inicial
- **THEN** sua bolinha no banco continua com a cor de titulares

### Requirement: Cor das reservas
O sistema SHALL aplicar uma cor configurável, com padrão roxo claro, à bolinha de toda jogadora com papel de reserva, ou que esteja no banco antes do apito inicial, na quadra ou no banco.

#### Scenario: Partida nova
- **WHEN** uma partida nova é exibida com as cores padrão
- **THEN** as bolinhas do banco aparecem em roxo claro e as da quadra em azul

#### Scenario: Reserva em quadra
- **WHEN** a reserva "Lia" entra em quadra após o apito inicial em uma vaga que não é de goleira
- **THEN** sua bolinha em quadra usa a cor de reservas

#### Scenario: Alterar cor das reservas
- **WHEN** a usuária escolhe uma nova cor de reservas no menu
- **THEN** todas as bolinhas de reservas, na quadra e no banco, passam imediatamente para a nova cor

### Requirement: Três seletores de cor no menu
O sistema SHALL oferecer no menu exatamente três seletores de cor, rotulados Goleira, Titulares e Reservas.

#### Scenario: Abrir seção de cores
- **WHEN** a usuária abre a seção de cores do menu
- **THEN** vê três seletores, Goleira, Titulares e Reservas, cada um mostrando a cor atual

### Requirement: Cor da goleira
O sistema SHALL aplicar uma cor configurável, distinta por padrão das demais, à bolinha que ocupa a vaga de goleira, prevalecendo sobre a cor de titular ou reserva.

#### Scenario: Goleira destacada
- **WHEN** uma jogadora ocupa a vaga de goleira
- **THEN** sua bolinha usa a cor de goleira, e ao sair para o banco passa a usar a cor do seu papel

#### Scenario: Alterar cor da goleira
- **WHEN** a usuária escolhe uma nova cor de goleira no menu
- **THEN** a bolinha na vaga de goleira passa imediatamente para a nova cor

#### Scenario: Reserva no gol
- **WHEN** a reserva "Lia" entra na vaga de goleira
- **THEN** sua bolinha usa a cor de goleira, não a de reservas

### Requirement: Legibilidade do texto na bolinha
O sistema SHALL escolher automaticamente texto claro ou escuro dentro da bolinha conforme a cor configurada, para manter contraste legível.

#### Scenario: Cor clara
- **WHEN** a usuária escolhe branco ou amarelo claro para o time
- **THEN** a sigla e a inicial dentro das bolinhas aparecem em texto escuro

### Requirement: Cores persistem
O sistema SHALL guardar as três cores escolhidas no aparelho e reaplicá-las na próxima abertura, em partidas novas e em partidas retomadas ou importadas.

#### Scenario: Reabrir
- **WHEN** a usuária fecha e reabre o aplicativo
- **THEN** as cores de goleira, titulares e reservas escolhidas anteriormente continuam aplicadas

#### Scenario: Configuração salva sem cor de reservas
- **WHEN** o aplicativo carrega uma configuração salva em formato anterior, sem cor de reservas
- **THEN** usa o roxo claro padrão para as reservas e mantém as outras duas cores salvas
