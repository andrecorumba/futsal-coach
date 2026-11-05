# Spec Delta

## ADDED Requirements

### Requirement: Reiniciar partida pelo menu
O sistema SHALL oferecer no menu a ação "Reiniciar partida", com confirmação, que mantém todos os nomes, devolve as titulares às vagas de quadra do apito inicial e as demais jogadoras ao banco, e zera cronômetro, tempos em quadra, histórico e papéis.

#### Scenario: Reiniciar após o jogo
- **WHEN** a partida já teve apito, "Lia" entrou no lugar de "Duda" no pivô, e a usuária escolhe "Reiniciar partida" e confirma
- **THEN** "Duda" volta à vaga de pivô, "Lia" volta ao banco, todos os nomes permanecem, os tempos voltam a 00:00, o histórico fica vazio, nenhuma jogadora tem papel fixo e o cronômetro volta ao 1º tempo com a duração configurada

#### Scenario: Reiniciar antes do apito
- **WHEN** a partida ainda não teve apito e a usuária escolhe "Reiniciar partida" e confirma
- **THEN** as vagas ficam como estão, os nomes permanecem e cronômetro, tempos e histórico são zerados

#### Scenario: Cancelar
- **WHEN** a usuária escolhe "Reiniciar partida" e cancela a confirmação
- **THEN** nada muda

#### Scenario: Reserva excluída após o apito
- **WHEN** uma titular do apito foi excluída do elenco e a usuária reinicia a partida
- **THEN** a vaga dela fica vazia e as demais titulares voltam normalmente

## REMOVED Requirements

### Requirement: Partida nova pelo menu
**Reason**: Substituída por "Reiniciar partida pelo menu", que além de zerar a partida restaura a escalação do apito inicial.
**Migration**: A ação "Nova partida" do menu passa a chamar-se "Reiniciar partida". O diálogo de abertura continua oferecendo "Nova partida" para descartar a partida salva.
