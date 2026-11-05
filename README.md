# Futsal Coach

Prancheta digital de futsal para técnicas de times escolares infantis. Mostra a quadra vista de cima com as cinco posições, o banco de reservas, substituições por arrasto, cronômetro regressivo e o tempo que cada jogadora ficou em quadra.

Funciona no navegador do celular, sem login e sem servidor. Depois da primeira visita, abre e funciona sem internet. Todos os dados ficam guardados só no aparelho.

## Como usar durante o jogo

**Nomear jogadoras.** Toque em uma bolinha para abrir a caixa de nome. Confirme com o botão verde ou com Enter. Bolinhas do banco também têm a opção de excluir a reserva. O botão com o sinal de mais, no banco, adiciona uma reserva.

**Substituir.** Arraste uma reserva do banco e solte sobre a jogadora que vai sair. As duas trocam de lugar e a troca fica registrada no histórico.

**Outros movimentos.**

- Arrastar uma titular para o banco tira a jogadora da quadra e deixa a vaga livre.
- Arrastar uma reserva para a quadra a coloca na vaga livre, se houver uma.
- Arrastar uma titular para outro ponto da quadra só muda a posição dela no desenho.
- Arrastar uma titular sobre outra titular troca as duas de vaga.
- Soltar fora da quadra e do banco cancela o movimento.

**Titulares e reservas.** No primeiro toque em iniciar do relógio, quem está em quadra vira titular e quem está no banco vira reserva. A partir daí a cor acompanha a jogadora: a reserva que entra continua com a cor de reserva na quadra, e a titular que sai continua com a cor de titular no banco. A vaga de goleira sempre usa a cor de goleira. Antes desse primeiro início a cor segue o lugar, para você montar a escalação à vontade, e essas trocas não entram no histórico de substituições. Se você tocar em iniciar antes de terminar a escalação, use **Nova partida** no menu para zerar os papéis.

**Cronômetro.** A barra de baixo mostra o tempo restante do período. Os botões são, nesta ordem:

- **1T / 2T** passa para o outro tempo, com o relógio zerado e parado.
- **Iniciar / pausar** liga e desliga o relógio.
- **Reiniciar** volta o período atual para a duração configurada, depois de confirmar.
- **Duração** define a duração do período, de 1 a 60 minutos.

Ao chegar a 00:00 o relógio para sozinho, o mostrador fica em destaque e o celular vibra, se tiver suporte.

**Tempo em quadra.** Cada bolinha mostra, abaixo do nome, quanto tempo a jogadora já jogou. O tempo só conta com o relógio rodando e soma os dois tempos. O cálculo usa o horário do aparelho, então continua certo mesmo com a tela bloqueada ou o app em segundo plano. Enquanto o relógio roda, o app pede para a tela não apagar, nos navegadores que oferecem esse recurso.

**Menu.** O botão no canto superior esquerdo abre o menu. Tocar fora dele fecha o menu sem mexer na quadra. No menu ficam:

- **Nova partida** zera tempos, histórico, cronômetro e os papéis de titular e reserva, mantendo nomes e vagas. Os papéis são definidos de novo no próximo início do relógio. Carregar uma escalação também zera os papéis.
- **Resumo de tempos** lista as jogadoras do maior para o menor tempo, marca quem está em quadra e mostra o histórico de substituições.
- **Escalações** salva a escalação atual com um nome, carrega, exporta ou exclui escalações salvas.
- **Cores** escolhe três cores: Goleira, Titulares e Reservas. Por padrão a goleira é amarela, as titulares azuis e as reservas roxo claro. As cores ficam salvas no aparelho.
- **Exportar partida** e **Importar JSON** fazem cópia de segurança e troca de dados entre aparelhos.

**Fechar e voltar.** A partida é salva automaticamente a cada mudança. Ao abrir o app de novo, ele pergunta se você quer continuar a partida salva ou começar uma nova. Ao continuar, o relógio volta pausado. Se ele estava rodando quando o app fechou, o tempo que passou conta como jogado.

## Instalar no celular

Instalado, o app abre em tela cheia, sem a barra do navegador, e funciona offline.

**Android, no Chrome.** Abra o endereço do app, toque no menu de três pontos e escolha "Instalar app" ou "Adicionar à tela inicial".

**iPhone ou iPad, no Safari.** Abra o endereço do app, toque no botão Compartilhar e escolha "Adicionar à Tela de Início". O pedido de tela acesa precisa do iOS 16.4 ou mais recente e funciona melhor com o app instalado.

Abra o app uma vez com internet antes do jogo. A partir daí ele carrega mesmo em modo avião. Quando sai uma versão nova, ela é baixada em segundo plano e entra na próxima vez que o app for aberto, sem interromper a partida.

## Cópia de segurança em JSON

Os dados ficam só no armazenamento do navegador. Limpar os dados do navegador ou usar navegação privada pode apagar tudo. Por isso vale exportar com frequência.

- **Exportar partida** baixa um arquivo como `futsal-partida-20261105-0930.json` com escalação, tempos, histórico e cronômetro.
- **Exportar** em uma escalação salva baixa um arquivo como `futsal-escalacao-sub-9-titular.json`.
- **Importar JSON** aceita os dois tipos de arquivo. Uma partida substitui a atual, depois de confirmar. Uma escalação entra na lista de escalações salvas, sem mexer na partida.

Arquivos que não são do Futsal Coach, ou que vêm de uma versão mais nova do app, são recusados com uma mensagem, e nada é alterado.

## Desenvolvimento local

Requer Node.js 22.12 ou mais recente.

```bash
npm install
npm run dev       # servidor de desenvolvimento em http://localhost:5173/
npm test          # testes automatizados
npm run build     # verifica os tipos e gera a versão de produção em dist/
npm run preview   # serve dist/ em http://localhost:4173/, com service worker e modo offline
```

O service worker só existe na versão de produção. Para testar o modo offline, use `npm run build` seguido de `npm run preview`.

## Publicação no GitHub Pages

O workflow em `.github/workflows/deploy.yml` roda a cada envio para o ramo `main`. Ele instala as dependências, roda os testes, gera a build com o caminho base `/<nome-do-repositório>/` e publica `dist/` no GitHub Pages.

Para ativar, uma única vez:

1. Crie o repositório no GitHub e envie o código para o ramo `main`.
2. No repositório, abra Settings, depois Pages.
3. Em "Build and deployment", escolha "GitHub Actions" como Source.

O endereço fica `https://<usuário>.github.io/<nome-do-repositório>/`. Para gerar localmente uma build com o mesmo caminho base:

```bash
VITE_BASE=/futsal-coach/ npm run build
```

## Licença

MIT. Veja o arquivo [LICENSE](LICENSE).
