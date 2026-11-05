# Design

## Context

Repositório vazio, sem código. Motivação e escopo estão em proposal.md. Requisitos de comportamento estão em `specs/*/spec.md`. Decisões tomadas na exploração e confirmadas pela usuária: quadra plana vista de cima, sem three.js; interface em pt-BR; uso em jogo escolar infantil, pelo celular, muitas vezes sem sinal.

Restrições que moldam o desenho:

- Toda a lógica roda no navegador. Não há backend, login nem sincronização.
- O aplicativo é usado com uma mão, durante o jogo, com pressa. A quadra precisa ocupar a tela e os gestos precisam ser previsíveis.
- O deploy é estático no GitHub Pages, servido em subcaminho (`/<repo>/`).

## Goals / Non-Goals

**Goals:**

- Lógica de estado totalmente separada do DOM, testável sem navegador.
- Um único modelo de coordenadas para a quadra que funcione em paisagem e retrato.
- Arrasto com toque confiável em iOS Safari e Android Chrome.
- Cronômetro e tempos em quadra corretos mesmo com aba em segundo plano ou tela bloqueada.
- Formato de dados versionado desde o primeiro dia para autosave, exportação e importação.

**Non-Goals:**

- Framework de UI (React, Svelte, Vue). O app é pequeno e a quadra é um SVG.
- Renderização 3D ou WebGL.
- Sincronização em nuvem, contas, multi-time, placar.
- Suporte a navegadores sem Pointer Events (IE, Safari anterior ao 13).

## Decisions

### D1. Vite + TypeScript puro + SVG, sem framework

A quadra, as bolinhas e os rótulos são elementos SVG dentro de um único `<svg>` com `viewBox` fixo. Menu, caixa de edição de nome e cronômetro são HTML comum por cima.

Por quê: SVG dá texto nativo, escala por `viewBox` sem cálculo, e eventos de ponteiro por elemento. Um framework adicionaria peso e um passo mental a mais para um app de uma tela. Vite resolve dev server, build, PWA (via plugin) e base path do Pages.

Alternativas: Canvas 2D (texto e hit-test manuais, sem ganho aqui); Svelte (leve, mas desnecessário para quatro componentes); three.js (descartado na exploração).

### D2. Modelo de domínio: jogadoras e vagas separadas

```
Player   { id, name }
Slot     { id, kind: 'court' | 'bench', position?: 'GL'|'FX'|'AE'|'AD'|'PV',
           playerId: string | null, x, y }       // x,y normalizados 0..1 na quadra
Match    { version, roster: Player[], slots: Slot[],
           clock: { periodMinutes, period: 1|2, remainingMs, runningSince: number|null },
           playingTimeMs: Record<playerId, number>,
           playingSince: Record<playerId, number>,   // instante em que começou a contar, se em quadra e relógio rodando
           substitutions: Sub[] , settings: { lineColor, gkColor } }
Sub      { period, elapsedMs, outPlayerId: string|null, inPlayerId: string|null }
Lineup   { version, name, roster: Player[], slots: Slot[] }
```

Por quê: a posição pertence à vaga, não à pessoa. Substituição vira trocar `playerId` entre duas vagas. Retirada vira mover `playerId` de uma vaga de quadra para uma vaga de banco. O limite de 5 é uma invariante simples: no máximo 5 vagas de quadra com `playerId` preenchido, e há exatamente 5 vagas de quadra. Reposicionamento altera só `x, y` da vaga.

Vagas de quadra são sempre 5 e nunca são apagadas; ficam vazias. Vagas de banco são criadas e removidas junto com reservas (incluir reserva cria jogadora e vaga; excluir remove as duas).

Alternativa: posição como atributo da jogadora. Rejeitada porque a troca exigiria copiar posição e a "vaga vazia" não teria representação.

### D3. Estado puro com reducer e eventos

Um módulo `state/` exporta `reduce(match, action): match` e as funções derivadas (`playingTimeAt(match, now)`, `remainingAt(match, now)`). Ações: `setName`, `addReserve`, `removeReserve`, `dropOn(slotFrom, target)`, `startClock(now)`, `pauseClock(now)`, `resetClock`, `setPeriod`, `setDuration`, `setColors`, `newMatch`, `loadLineup`, `importMatch`.

Por quê: todas as regras (max 5, semântica do drop, acúmulo de tempo) ficam cobertas por testes unitários em Vitest sem DOM. A UI só despacha ações e re-renderiza.

Padrão de renderização: re-render idempotente do SVG a partir do estado (criar ou atualizar `<g>` por vaga, chaveado por `slot.id`). Sem virtual DOM; o número de elementos é pequeno (menos de 20 grupos).

### D4. Tempo baseado em timestamps, não em contadores

O cronômetro guarda `remainingMs` no último evento e `runningSince` (epoch ms) quando rodando. O tempo restante em qualquer instante é `remainingMs - (now - runningSince)`. O tempo em quadra de cada jogadora usa o mesmo princípio: `playingTimeMs[id]` consolidado mais `(now - playingSince[id])` quando aplicável.

Eventos que consolidam: pausar, trocar de período, reiniciar, qualquer substituição (consolida só as jogadoras envolvidas), e `visibilitychange`. Um `setInterval` de 250 ms apenas re-renderiza; não acumula nada.

Por quê: `setInterval` é estrangulado em segundo plano e para com a tela bloqueada. Com timestamps o resultado é correto ao retomar (spec match-clock "Precisão independente da aba"). Também simplifica o autosave: salvar `runningSince` basta para retomar.

Alternativa: Web Worker com tick. Mais complexo e ainda não roda com tela bloqueada.

### D5. Arrasto com Pointer Events e hit-test geométrico

- `pointerdown` na bolinha: `setPointerCapture`, guarda origem. Movimento abaixo de 8 px até `pointerup` é toque, abre edição de nome.
- `pointermove`: atualiza `transform` do `<g>` arrastado, que é movido para o fim do `<svg>` para ficar por cima.
- `pointerup`: converte o ponto para coordenadas do `viewBox` e resolve o alvo:
  1. Dentro do raio de outra bolinha ou de um marcador de vaga vazia: alvo = aquela vaga.
  2. Dentro do retângulo da quadra: alvo = "quadra livre" (reposicionar se origem é quadra; entrar na primeira vaga vazia se origem é banco e houver vaga).
  3. Dentro do retângulo do banco: alvo = "banco" (sair da quadra se origem é quadra; nada se origem é banco).
  4. Fora de tudo: cancelar.
- O reducer recebe `dropOn(fromSlotId, target)` e decide. Em seguida a UI anima: antes do re-render, lê as posições atuais; após o re-render, aplica a transição do ponto antigo para o novo com Web Animations API (300 ms, ease-out). Técnica FLIP.

CSS na área do SVG: `touch-action: none`, `user-select: none`, `overscroll-behavior: none` no `body`. Meta viewport com `user-scalable=no` apenas como reforço; o `touch-action` é o que realmente impede o zoom por toque duplo.

Por quê Pointer Events: unifica mouse e toque, e `setPointerCapture` garante receber `pointerup` mesmo fora do elemento.

### D6. Layout e orientação

O `<svg>` tem um `viewBox` lógico único: quadra 40x20 unidades mais margem de banco. Duas disposições:

- Paisagem: `viewBox="0 0 52 22"`. Quadra em (1,1) a (41,21). Banco em coluna x de 43 a 51.
- Retrato: `viewBox="0 0 22 56"`. Quadra girada por `transform="rotate(90)"` ocupando (1,1) a (21,41). Banco em linha(s) de y 43 a 55.

As coordenadas normalizadas `x, y` das vagas de quadra (0..1 ao longo do comprimento e da largura da quadra) são convertidas por uma função `toView(slot, layout)`. Trocar de layout é só re-renderizar com outra função de projeção; o estado não muda.

Decisão de layout por `matchMedia('(orientation: portrait)')`, não por tipo de aparelho. Tablets e desktops em janela larga caem na paisagem.

Se o banco em retrato exceder 6 reservas, quebra em segunda linha. Em paisagem, rola verticalmente dentro da coluna se exceder a altura.

### D7. Persistência e formato

- Chaves do localStorage: `futsal:match` (partida atual), `futsal:lineups` (array), `futsal:settings` (cores, duração padrão).
- Autosave: debounce de 300 ms após cada ação do reducer. Escrita síncrona é barata para este tamanho.
- Todo JSON exportado tem `{ "app": "futsal-coach", "kind": "match" | "lineup", "version": 1, ... }`. A importação valida `app`, `kind` e `version <= suportada` com um validador manual simples (sem biblioteca de schema), e normaliza campos ausentes com padrões.
- Exportação usa `Blob` + link `download`. Importação usa `<input type="file" accept="application/json">`.

### D8. PWA

`vite-plugin-pwa` com estratégia `generateSW`, `registerType: 'prompt'`. Pré-cache de todos os assets do build. Nova versão é baixada em segundo plano e aplicada na próxima abertura; nenhum recarregamento forçado durante a partida. Manifesto com `display: standalone`, `orientation: any`, ícones 192 e 512 e tema escuro.

Wake Lock: `navigator.wakeLock.request('screen')` ao iniciar o cronômetro, `release()` ao pausar, re-aquisição em `visibilitychange` se o relógio estiver rodando. Chamadas protegidas por detecção de recurso; sem suporte, silencia.

### D9. Deploy

Workflow do GitHub Actions: instalar, testar, `vite build` com `base: '/<repo>/'` lido do nome do repositório via variável de ambiente, publicar `dist/` com `actions/deploy-pages`. Arquivo `404.html` igual ao `index.html` não é necessário, pois não há rotas; o app é uma URL só.

### D10. Estrutura de pastas

```
src/
  main.ts            bootstrap, wiring de eventos, autosave, wake lock
  state/
    model.ts         tipos e fábricas (newMatch, defaultLineup)
    reducer.ts       reduce(match, action)
    time.ts          remainingAt, playingTimeAt, consolidate
    storage.ts       load/save localStorage, export/import JSON, validação
  view/
    layout.ts        viewBox e projeção por orientação
    court.ts         desenho das linhas da quadra
    tokens.ts        render idempotente das bolinhas e rótulos, animação FLIP
    drag.ts          pointer events e resolução de alvo
    clock.ts         barra inferior
    menu.ts          hambúrguer e painéis (escalações, cores, resumo, JSON)
    i18n.ts          strings pt-BR
  style.css
tests/
  reducer.test.ts, time.test.ts, storage.test.ts, drag-target.test.ts
public/ icons, manifest gerado pelo plugin
.github/workflows/deploy.yml
```

### D11. Ajustes decididos durante a implementação

- `Sub` guarda também `outName` e `inName` como cópia do nome no momento da troca. Assim o histórico continua legível se a reserva for excluída depois. Os ids permanecem para o resumo.
- `Clock` tem `periodLengthMs` (para o tempo decorrido sobreviver a uma mudança de duração no meio do período) e `finished` (fim do período).
- Vagas de banco sempre têm jogadora. Titular arrastada para o banco ganha uma vaga de banco nova no fim; reserva que entra em vaga vazia leva sua vaga de banco consigo. Titular solta sobre reserva troca as duas e registra substituição.
- Retomada ("Continuar partida") com o relógio rodando: o tempo real decorrido enquanto o app esteve fechado conta, conforme D4 e a spec de autosave, e o relógio é então pausado no instante da retomada.
- Carregar escalação também volta o relógio para o 1º tempo, igual a "Nova partida".
- Banco: em vez de rolar, o `viewBox` cresce com o número de reservas. Paisagem usa duas colunas (viewBox 54x22); retrato quebra em linhas de 4. Acima de 7 reservas no retrato os alvos encolhem um pouco (cerca de 41 px com 9 reservas), aceito como limite prático de um time escolar.
- Service worker: registro via `virtual:pwa-register` com `injectRegister: false`; `onNeedRefresh` não recarrega, a nova versão entra na abertura seguinte.

## Risks / Trade-offs

- [iOS Safari e `setPointerCapture` dentro de SVG têm comportamentos antigos inconsistentes] → Testar cedo em iPhone real; se necessário, ouvir `pointermove` e `pointerup` no `window` em vez de depender da captura.
- [Rótulo com nome longo invade bolinha vizinha] → Limitar exibição a 10 caracteres com reticências; nome completo aparece na edição e no resumo.
- [localStorage apagado pelo sistema em "modo de navegação privada" ou por falta de espaço] → Exportar JSON é a cópia de segurança. Mensagem no menu explicando isso.
- [Wake Lock não existe no iOS Safari anterior ao 16.4] → Funcionalidade degrada em silêncio; documentar no README que instalar como PWA melhora o comportamento.
- [Tempo em quadra "injusto" se a técnica esquecer o cronômetro rodando no intervalo] → Fim do período para o relógio automaticamente, e a troca de período exige toque consciente.
- [Re-render completo a cada 250 ms pode gerar jank em aparelhos fracos] → Atualizar apenas os `<text>` de tempo no tick; re-render de vagas só em ações. Medir no Chrome DevTools com CPU 4x mais lenta.
- [Base path errado no Pages quebra assets] → Workflow define `VITE_BASE` a partir de `github.event.repository.name`; teste de smoke no CI que verifica `dist/index.html` referencia o prefixo.

## Open Questions

- Ícone do app e cor de tema: usar um placeholder simples gerado em SVG até a usuária fornecer arte. Não altera specs nem tarefas.
- Nome final do repositório no GitHub, que define a URL do Pages. O workflow lê o nome em tempo de build, então pode ser decidido na hora de criar o repositório.
