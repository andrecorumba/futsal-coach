# Proposal

## Why

No teste em iPhone 15 o aplicativo funcionou, mas a quadra ficou pequena e não ocupou a tela: em retrato o banco fica abaixo da quadra, o que força uma área de desenho muito alta e estreita (22x56 unidades) e limita a quadra a cerca de 210 px de largura. Além disso a técnica precisa de um jeito rápido de reiniciar a partida com o mesmo time, titulares de volta à quadra e reservas ao banco, sem reescrever nomes.

## What Changes

- **Quadra preenche a tela em retrato.** O banco passa para uma coluna ao lado da quadra também em retrato, e a área de desenho é dimensionada pela proporção real do espaço disponível. O botão do menu fica sobreposto ao canto da quadra em vez de ocupar uma faixa própria, liberando altura nas duas orientações.
- **Reiniciar partida pelo menu.** Substitui a ação "Nova partida" do menu. Com confirmação, devolve as titulares às vagas de quadra que tinham no apito inicial e as reservas ao banco, zera cronômetro, tempos em quadra, histórico e papéis, e mantém todos os nomes. Se a partida ainda não teve apito, mantém as vagas como estão e zera o resto.
- O diálogo de abertura "Continuar partida / Nova partida" não muda.

Fora do escopo: alterar a proporção da quadra, rolagem do banco, reiniciar pela barra do cronômetro.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `court-lineup`: a disposição em retrato passa a ter o banco em coluna ao lado da quadra, a área de desenho segue a proporção da tela e o botão do menu fica sobreposto à quadra; novo requisito de escalação do apito guardada para reinício.
- `match-persistence`: "Partida nova pelo menu" dá lugar a "Reiniciar partida pelo menu", que restaura a escalação do apito.

## Impact

- Código: `src/view/layout.ts` (retrato com banco lateral, viewBox pela proporção do contêiner), `src/style.css` e `src/main.ts` (grade sem faixa superior, menu sobreposto, observação de redimensionamento), `src/state/model.ts`, `src/state/time.ts` e `src/state/reducer.ts` (escalação do apito e ação de reinício), `src/state/storage.ts` (normalização do campo novo), `src/view/menu.ts` e `src/view/i18n.ts` (ação e confirmação), testes, README.
- Dados: campo novo opcional no formato JSON, sem subir a versão.
