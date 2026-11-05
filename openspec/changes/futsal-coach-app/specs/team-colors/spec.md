# Spec Delta

## Purpose

Permite escolher as cores das bolinhas das jogadoras de linha e da goleira, para combinar com o uniforme do time e distinguir a goleira de relance.

## ADDED Requirements

### Requirement: Cor das jogadoras de linha
O sistema SHALL aplicar uma única cor configurável a todas as bolinhas de jogadoras de linha, na quadra e no banco, com um valor padrão definido pelo aplicativo.

#### Scenario: Alterar cor do time
- **WHEN** a usuária escolhe uma nova cor de time no menu
- **THEN** todas as bolinhas de linha, na quadra e no banco, passam imediatamente para a nova cor

### Requirement: Cor da goleira
O sistema SHALL aplicar uma cor configurável, distinta por padrão da cor de linha, à bolinha que ocupa a vaga de goleira.

#### Scenario: Goleira destacada
- **WHEN** uma jogadora ocupa a vaga de goleira
- **THEN** sua bolinha usa a cor de goleira, e ao sair para o banco passa a usar a cor de linha

#### Scenario: Alterar cor da goleira
- **WHEN** a usuária escolhe uma nova cor de goleira no menu
- **THEN** a bolinha na vaga de goleira passa imediatamente para a nova cor

### Requirement: Legibilidade do texto na bolinha
O sistema SHALL escolher automaticamente texto claro ou escuro dentro da bolinha conforme a cor configurada, para manter contraste legível.

#### Scenario: Cor clara
- **WHEN** a usuária escolhe branco ou amarelo claro para o time
- **THEN** a sigla e a inicial dentro das bolinhas aparecem em texto escuro

### Requirement: Cores persistem
O sistema SHALL guardar as cores escolhidas no aparelho e reaplicá-las na próxima abertura e em partidas novas.

#### Scenario: Reabrir
- **WHEN** a usuária fecha e reabre o aplicativo
- **THEN** as cores escolhidas anteriormente continuam aplicadas
