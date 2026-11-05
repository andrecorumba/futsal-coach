# Spec Delta

## Purpose

Torna o aplicativo confiável para uso em ginásio: instala como app, abre sem internet, mantém a tela acesa durante o jogo e impede que gestos do navegador atrapalhem a quadra.

## ADDED Requirements

### Requirement: Instalável como PWA
O sistema SHALL fornecer manifesto de aplicativo web com nome, ícones e modo de exibição standalone, de modo que possa ser adicionado à tela inicial de celulares e tablets.

#### Scenario: Adicionar à tela inicial
- **WHEN** a usuária adiciona o aplicativo à tela inicial e o abre por lá
- **THEN** ele abre em tela cheia, sem a barra de endereço do navegador

### Requirement: Funciona offline
O sistema SHALL carregar e funcionar integralmente sem conexão após a primeira visita, incluindo partidas novas, substituições, cronômetro e persistência.

#### Scenario: Abrir sem internet
- **WHEN** a usuária já visitou o aplicativo uma vez e o abre em modo avião
- **THEN** o aplicativo carrega e todas as funções ficam disponíveis

#### Scenario: Nova versão publicada
- **WHEN** uma nova versão foi publicada e a usuária abre o aplicativo com internet
- **THEN** a nova versão é baixada em segundo plano e aplicada na próxima abertura, sem interromper a partida em andamento

### Requirement: Tela acesa durante o jogo
O sistema SHALL solicitar que a tela permaneça acesa enquanto o cronômetro estiver rodando, nos navegadores que oferecem esse recurso, e liberar a solicitação ao pausar.

#### Scenario: Cronômetro rodando
- **WHEN** o cronômetro está rodando em um navegador com suporte
- **THEN** a tela não apaga por inatividade

#### Scenario: Sem suporte
- **WHEN** o navegador não oferece o recurso
- **THEN** o aplicativo funciona normalmente sem exibir erro

### Requirement: Gestos do navegador bloqueados sobre a quadra
O sistema SHALL impedir, na área da quadra e do banco, a rolagem da página, o zoom por pinça, o "puxar para atualizar" e a seleção de texto, para que arrastar bolinhas nunca acione ações do navegador.

#### Scenario: Arrastar para baixo
- **WHEN** a usuária arrasta uma bolinha para baixo a partir do topo da quadra
- **THEN** a página não recarrega nem rola

#### Scenario: Toque duplo
- **WHEN** a usuária toca duas vezes rapidamente em uma bolinha
- **THEN** a página não dá zoom

### Requirement: Interface em português do Brasil
O sistema SHALL apresentar todos os textos da interface, mensagens e confirmações em português do Brasil.

#### Scenario: Mensagens
- **WHEN** qualquer confirmação ou erro é exibido
- **THEN** o texto está em português do Brasil

### Requirement: Publicação no GitHub Pages
O sistema SHALL ser publicado automaticamente no GitHub Pages a cada envio para o ramo principal, acessível sem login.

#### Scenario: Envio para main
- **WHEN** um commit chega ao ramo principal
- **THEN** uma nova versão é construída e publicada na URL do GitHub Pages do repositório
