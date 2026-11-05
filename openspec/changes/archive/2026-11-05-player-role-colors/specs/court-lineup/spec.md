# Spec Delta

## ADDED Requirements

### Requirement: Papel de titular ou reserva
O sistema SHALL atribuir a cada jogadora o papel de titular ou reserva no primeiro início do relógio de uma partida: quem ocupa vaga de quadra nesse instante é titular, quem está no banco é reserva. O papel fica fixo até uma nova partida.

#### Scenario: Congelar no apito inicial
- **WHEN** a usuária toca em iniciar pela primeira vez na partida com "Duda" em quadra e "Lia" no banco
- **THEN** "Duda" passa a ser titular e "Lia" reserva, e trocas posteriores não alteram esses papéis

#### Scenario: Antes do apito o papel segue o lugar
- **WHEN** o relógio ainda não foi iniciado na partida e a usuária arrasta "Lia" do banco para a quadra
- **THEN** "Lia" é tratada como titular enquanto estiver em quadra, e volta a ser tratada como reserva se retornar ao banco

#### Scenario: Reserva que entra mantém o papel
- **WHEN** o apito já aconteceu e a reserva "Lia" entra no lugar da titular "Duda"
- **THEN** "Lia" continua reserva em quadra e "Duda" continua titular no banco

#### Scenario: Trocar de período não altera
- **WHEN** a usuária passa para o 2º tempo ou reinicia o cronômetro
- **THEN** os papéis permanecem como congelados no apito inicial

#### Scenario: Nova partida zera os papéis
- **WHEN** a usuária inicia uma nova partida pelo menu ou carrega uma escalação
- **THEN** nenhuma jogadora tem papel fixo até o próximo primeiro início do relógio

#### Scenario: Partida salva sem papéis
- **WHEN** o aplicativo carrega ou importa uma partida salva em formato anterior, sem papéis
- **THEN** se o relógio dessa partida já foi iniciado alguma vez, cada jogadora recebe o papel pelo lugar atual; caso contrário, fica sem papel fixo
