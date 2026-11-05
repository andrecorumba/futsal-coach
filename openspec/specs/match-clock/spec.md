# match-clock Specification

## Purpose

Fornece o cronômetro regressivo da partida, com duração ajustável e controle de períodos, sempre visível na parte inferior da tela.

## Requirements

### Requirement: Cronômetro regressivo visível
O sistema SHALL exibir na parte inferior da tela um cronômetro regressivo no formato MM:SS, com controles de iniciar, pausar e reiniciar, sem cobrir a quadra.

#### Scenario: Estado inicial
- **WHEN** uma partida nova é iniciada
- **THEN** o cronômetro mostra 20:00, parado, no 1º tempo

#### Scenario: Iniciar e pausar
- **WHEN** a usuária toca em iniciar e, após 3 segundos, em pausar
- **THEN** o cronômetro mostra 19:57 e para de decrementar

#### Scenario: Retomar
- **WHEN** o cronômetro está pausado em 19:57 e a usuária toca em iniciar
- **THEN** o cronômetro volta a decrementar a partir de 19:57

### Requirement: Duração ajustável
O sistema SHALL permitir ajustar a duração do período, em minutos inteiros entre 1 e 60, com valor padrão de 20 minutos. O ajuste vale para o período atual quando ele ainda não começou e para os próximos períodos.

#### Scenario: Ajustar antes de começar
- **WHEN** o cronômetro está parado em 20:00 e a usuária ajusta a duração para 15 minutos
- **THEN** o cronômetro passa a mostrar 15:00

#### Scenario: Ajustar com o período em andamento
- **WHEN** o cronômetro está em 12:30 do 1º tempo e a usuária ajusta a duração para 15 minutos
- **THEN** o cronômetro continua em 12:30 e o 2º tempo começará em 15:00

### Requirement: Fim do período
O sistema SHALL parar o cronômetro ao atingir 00:00, destacar visualmente o fim do tempo e, quando o aparelho permitir, vibrar brevemente.

#### Scenario: Zerar
- **WHEN** o cronômetro em andamento chega a 00:00
- **THEN** ele para, o mostrador fica em destaque e o controle de iniciar fica desabilitado até reiniciar ou trocar de período

### Requirement: Períodos
O sistema SHALL oferecer um botão de período que alterna entre 1º e 2º tempo. Trocar de período reinicia o cronômetro para a duração configurada, parado, e mantém todos os demais dados da partida.

#### Scenario: Passar para o 2º tempo
- **WHEN** a usuária toca no botão de período durante ou após o 1º tempo
- **THEN** o indicador mostra "2T", o cronômetro volta para a duração configurada e fica parado

#### Scenario: Dados preservados
- **WHEN** a usuária troca de período
- **THEN** nomes, vagas, tempos em quadra e histórico de substituições permanecem inalterados

### Requirement: Reiniciar o período atual
O sistema SHALL permitir reiniciar o cronômetro do período atual para a duração configurada após confirmação da usuária.

#### Scenario: Reiniciar com confirmação
- **WHEN** a usuária toca em reiniciar e confirma
- **THEN** o cronômetro volta para a duração configurada, parado, e o período não muda

#### Scenario: Reiniciar cancelado
- **WHEN** a usuária toca em reiniciar e cancela
- **THEN** o cronômetro segue como estava

### Requirement: Precisão independente da aba
O sistema SHALL calcular o tempo restante a partir do relógio do aparelho, de modo que o cronômetro continue correto mesmo se o navegador reduzir a frequência de atualização ou a tela for retomada.

#### Scenario: Tela bloqueada e retomada
- **WHEN** o cronômetro está rodando, a tela bloqueia por 30 segundos e é retomada
- **THEN** o cronômetro mostra 30 segundos a menos do que antes do bloqueio, com tolerância de 1 segundo
