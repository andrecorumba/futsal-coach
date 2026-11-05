# Spec Delta

## Purpose

Garante que a partida em andamento nunca se perca, permite guardar escalações para reutilizar e troca dados entre aparelhos por arquivos JSON, tudo sem servidor nem login.

## ADDED Requirements

### Requirement: Autosave da partida em andamento
O sistema SHALL salvar automaticamente no armazenamento local do aparelho, após cada mudança de estado, a partida em andamento: elenco, nomes, vagas, posições na quadra, tempos em quadra, histórico de substituições, período, duração e estado do cronômetro.

#### Scenario: Mudança salva
- **WHEN** a usuária faz uma substituição ou edita um nome
- **THEN** o estado salvo reflete a mudança em até 1 segundo

#### Scenario: Cronômetro rodando salvo
- **WHEN** o cronômetro está rodando
- **THEN** o estado salvo contém o instante de início, de modo que o tempo restante possa ser recalculado ao reabrir

### Requirement: Retomada ao reabrir
O sistema SHALL, ao abrir com uma partida salva, oferecer continuar essa partida ou começar uma nova. Continuar restaura todo o estado; começar nova descarta a anterior após confirmação.

#### Scenario: Continuar partida
- **WHEN** o aplicativo abre com partida salva e a usuária escolhe continuar
- **THEN** quadra, banco, nomes, tempos, histórico e cronômetro voltam exatamente como estavam, com o cronômetro pausado

#### Scenario: Começar nova
- **WHEN** a usuária escolhe partida nova e confirma
- **THEN** a partida anterior é descartada e uma nova partida começa com a escalação inicial padrão ou escolhida

#### Scenario: Sem partida salva
- **WHEN** o aplicativo abre sem partida salva
- **THEN** uma partida nova começa diretamente, sem pergunta

### Requirement: Partida nova pelo menu
O sistema SHALL oferecer no menu a ação de iniciar uma partida nova, com confirmação, zerando cronômetro, tempos e histórico e mantendo a escalação atual como ponto de partida.

#### Scenario: Nova partida com mesmo elenco
- **WHEN** a usuária escolhe "Nova partida" no menu e confirma
- **THEN** nomes e vagas são mantidos, os tempos voltam a 00:00, o histórico fica vazio e o cronômetro volta ao 1º tempo com a duração configurada

### Requirement: Salvar e carregar escalações
O sistema SHALL permitir salvar a escalação atual (elenco, nomes e vagas) com um nome dado pela usuária, listar as escalações salvas e carregar ou excluir qualquer uma delas.

#### Scenario: Salvar escalação
- **WHEN** a usuária escolhe salvar escalação e informa "Sub-9 titular"
- **THEN** "Sub-9 titular" aparece na lista de escalações salvas

#### Scenario: Carregar escalação
- **WHEN** a usuária carrega "Sub-9 titular" e confirma
- **THEN** elenco, nomes e vagas passam a ser os salvos, e os tempos em quadra e o histórico da partida atual são zerados

#### Scenario: Excluir escalação
- **WHEN** a usuária exclui "Sub-9 titular" e confirma
- **THEN** a escalação some da lista e a partida atual não é afetada

### Requirement: Exportar JSON
O sistema SHALL exportar a partida atual, incluindo escalação, tempos e histórico, como um arquivo JSON versionado baixado pelo navegador, e SHALL permitir exportar também uma escalação salva isoladamente.

#### Scenario: Exportar partida
- **WHEN** a usuária escolhe exportar partida no menu
- **THEN** o navegador baixa um arquivo .json com um campo de versão do formato e todos os dados da partida

#### Scenario: Exportar escalação
- **WHEN** a usuária escolhe exportar uma escalação salva
- **THEN** o navegador baixa um arquivo .json com a versão do formato, o nome da escalação, o elenco e as vagas

### Requirement: Importar JSON
O sistema SHALL importar um arquivo JSON exportado pelo próprio aplicativo. Um arquivo de partida substitui a partida atual após confirmação; um arquivo de escalação é adicionado à lista de escalações salvas.

#### Scenario: Importar partida
- **WHEN** a usuária importa um arquivo de partida válido e confirma
- **THEN** a partida atual é substituída pelo conteúdo do arquivo

#### Scenario: Importar escalação
- **WHEN** a usuária importa um arquivo de escalação válido
- **THEN** a escalação aparece na lista de escalações salvas sem alterar a partida atual

#### Scenario: Arquivo inválido
- **WHEN** a usuária importa um arquivo que não é JSON válido ou não tem o formato do aplicativo
- **THEN** o sistema mostra uma mensagem de erro em português e não altera nenhum dado

#### Scenario: Versão futura
- **WHEN** o arquivo informa uma versão de formato maior do que a suportada
- **THEN** o sistema recusa a importação com mensagem clara e não altera nenhum dado

### Requirement: Menu não cobre a quadra em repouso
O sistema SHALL manter o menu recolhido atrás de um botão hambúrguer no canto superior; aberto, ele desliza sobre a tela e fecha ao tocar fora dele ou em fechar.

#### Scenario: Menu fechado
- **WHEN** a usuária não está interagindo com o menu
- **THEN** apenas o botão hambúrguer aparece e a quadra ocupa a tela

#### Scenario: Fechar tocando fora
- **WHEN** o menu está aberto e a usuária toca na quadra
- **THEN** o menu fecha sem executar nenhuma ação na quadra
