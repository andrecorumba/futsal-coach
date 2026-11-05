# Design

## Context

Motivação em proposal.md. Requisitos nas specs delta de `court-lineup`, `team-colors` e `substitutions`. Estado atual do código:

- `Colors` tem `lineColor` e `gkColor`; `tokens.ts` decide a cor só pela vaga (goleira ou não).
- `Player` tem apenas `id` e `name`.
- `record()` no reducer registra toda entrada ou saída de quadra, mesmo com o relógio nunca iniciado.
- `startClock()` em `time.ts` é o único ponto onde o relógio começa; `restartMatch()` e `applyLineup()` são os pontos de reinício de partida.
- `normalizeMatch()` e `normalizeSettings()` em `storage.ts` preenchem campos ausentes com padrões, sem bump de versão.

## Goals / Non-Goals

**Goals:**

- Papel da jogadora definido em um único lugar, no primeiro início do relógio, e consultado por uma função pura de resolução de cor.
- Compatibilidade total com partidas, escalações e configurações já salvas no formato 1.
- Nenhuma mudança na semântica do arrasto ou do tempo em quadra.

**Non-Goals:**

- Editar papel manualmente.
- Indicação visual de origem na goleira (anel, borda).
- Subir a versão do formato JSON.

## Decisions

### D1. Papel na jogadora e marcador de apito na partida

`Player` ganha `role: 'starter' | 'reserve' | null`. `Match` ganha `kickoff: boolean`, verdadeiro a partir do primeiro `startClock` da partida.

Por quê: o papel é um fato da jogadora que precisa sobreviver a trocas; o apito é um fato da partida que decide se os papéis já estão congelados e se as trocas entram no histórico. Guardar `kickoff` explicitamente é mais robusto do que inferir de `substitutions.length` ou `playingTimeMs`, que podem ser vazios mesmo após um início seguido de pausa imediata.

Alternativa: inferir apito de "algum tempo acumulado > 0". Rejeitada porque um início e pausa no mesmo segundo deixaria o estado ambíguo.

### D2. Congelamento em `startClock`

Em `time.startClock`, se `!match.kickoff`, antes de retornar: para cada jogadora, `role = 'starter'` se estiver em vaga de quadra, senão `'reserve'`; e `kickoff = true`. Jogadoras adicionadas ao banco depois do apito nascem com `role: 'reserve'` quando `kickoff` é verdadeiro, e `null` caso contrário.

`restartMatch()` e `applyLineup()` zeram `kickoff` e todos os `role` para `null`. `resetClock` e `setPeriod` não mexem em papel nem em `kickoff`.

### D3. Resolução da cor como função pura

```
colorFor(match, slot, player):
  se slot.kind == 'court' e slot.position == 'GL'  -> gkColor
  papelEfetivo = player.role
       ?? (slot.kind == 'court' ? 'starter' : 'reserve')   // antes do apito segue o lugar
  papelEfetivo == 'reserve' ? reserveColor : lineColor
```

Fica em `src/view/format.ts` ou em um `src/state/colors.ts` novo, testável sem DOM. `tokens.ts` só chama essa função. `lineColor` mantém o nome interno para não renomear chaves salvas; o rótulo no menu passa a ser "Titulares".

### D4. Histórico condicional

`record()` recebe o match e retorna sem alterar quando `!match.kickoff`. Os três pontos de chamada no `dropOn` não mudam. Após o apito, trocas com o relógio pausado continuam registrando com o tempo decorrido na pausa, como hoje.

### D5. Compatibilidade de dados

- `normalizeSettings`: `reserveColor` ausente ou inválido recebe `#b39ddb`.
- `normalizeMatch`: `kickoff` ausente é inferido como `substitutions.length > 0 || algum playingTimeMs > 0 || clock.runningSince != null || clock.remainingMs < periodLengthMs`. Se `kickoff` inferido for verdadeiro e `role` ausente, cada jogadora recebe o papel pelo lugar atual; senão `null`.
- `normalizeLineup`: escalações não guardam papel; ao carregar, papéis ficam `null`.
- Versão do formato continua 1, porque leitores antigos ignoram campos extras e leitores novos preenchem os ausentes.

### D6. Menu

A seção Cores passa a ter três linhas na ordem Goleira, Titulares, Reservas. Mesma mecânica de `input type=color` e `setColors` já existente. Strings novas em `i18n.ts`. `main.ts` aplica as três cores do aparelho sobre a partida retomada ou importada, como já faz com as duas.

## Risks / Trade-offs

- [Técnica toca em iniciar sem querer antes de montar a escalação e os papéis congelam errado] → "Nova partida" pelo menu mantém nomes e vagas e zera os papéis; documentar no README. Sem botão específico de "descongelar" nesta mudança.
- [Partidas antigas com apito inferido errado] → A inferência em D5 só erra se a partida foi iniciada e pausada no mesmo segundo sem trocas; nesse caso os papéis ficam `null` e seguem o lugar, que é o comportamento pré-apito. Aceitável.
- [Roxo claro padrão com texto escuro pode ter contraste baixo em sol forte] → `contrastText` já escolhe texto escuro; a técnica pode escolher roxo mais forte no menu.
