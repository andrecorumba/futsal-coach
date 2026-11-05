# Proposal

## Why

Hoje todas as jogadoras de linha têm a mesma cor, então em jogo não dá para ver de relance quem começou jogando e quem entrou do banco. A técnica pediu que as reservas tenham cor própria (roxo claro por padrão) e que essa cor acompanhe a jogadora quando ela entra em quadra, com três cores ajustáveis no menu para combinar com o uniforme do time.

## What Changes

- A cor da bolinha passa a seguir a **jogadora**, com papel de titular ou reserva, em vez de seguir a vaga. O papel é congelado no primeiro "iniciar" do relógio da partida: quem está em quadra vira titular, quem está no banco vira reserva. Antes do apito a cor segue o lugar (quadra = titular, banco = reserva), para a técnica montar a escalação à vontade.
- Reserva que entra fica com a cor de reserva na quadra. Titular que sai fica com a cor de titular no banco.
- A vaga de goleira continua com a cor de goleira, independentemente do papel de quem a ocupa.
- O menu de cores passa de dois para três seletores: Goleira, Titulares e Reservas. Padrão da reserva: roxo claro.
- "Nova partida" e carregar escalação zeram os papéis até o próximo apito. Partidas salvas em formato anterior recebem o papel pelo lugar atual ao carregar.
- Trocas feitas antes do apito inicial deixam de entrar no histórico de substituições, porque são montagem de escalação e não substituição.

Fora do escopo: cor individual por jogadora, mudança de papel manual, anel ou borda indicando origem na goleira.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `court-lineup`: novo requisito de papel de titular ou reserva congelado no apito inicial, com reinício em nova partida e compatibilidade com partidas salvas.
- `team-colors`: a cor de linha única dá lugar a cor de titulares e cor de reservas, com a goleira prevalecendo; persistência passa a cobrir as três cores.
- `substitutions`: o histórico deixa de registrar trocas feitas antes do apito inicial.

## Impact

- Código: `src/state/model.ts` (papel na jogadora, `reserveColor` nas cores, marcador de apito na partida), `src/state/time.ts` (congelar papéis no primeiro início), `src/state/reducer.ts` (registro condicional, reinício de papéis), `src/state/storage.ts` (normalização e compatibilidade), `src/view/tokens.ts` (resolução da cor), `src/view/menu.ts` e `src/view/i18n.ts` (terceiro seletor e rótulos), `src/main.ts` (cores do aparelho), testes correspondentes.
- Dados: campos novos opcionais no formato JSON, sem subir a versão; arquivos antigos continuam importáveis.
- Sem dependências novas.
