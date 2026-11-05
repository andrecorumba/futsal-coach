// pt-BR user-facing strings (spec field-usability "Interface em português do Brasil").
// Every text shown to the user, including aria-labels and confirmations, lives here.

import type { Period, Position } from '../state/model';

const POSITION_NAMES: Record<Position, string> = {
  GL: 'Goleira',
  FX: 'Fixo',
  AE: 'Ala esquerda',
  AD: 'Ala direita',
  PV: 'Pivô',
};

export const t = {
  appName: 'Futsal Coach',
  menuButton: 'Abrir menu',
  courtArea: 'Quadra e banco de reservas',

  positionName: (p: Position): string => POSITION_NAMES[p],
  reserve: 'Reserva',
  unnamed: 'sem nome',
  /** aria-label of a token: role, name and playing time. */
  tokenLabel: (role: string, name: string, time: string): string =>
    `${role}: ${name === '' ? 'sem nome' : name}, ${time} em quadra. Toque para editar o nome, arraste para mover.`,
  emptySlotLabel: (p: Position): string => `Vaga livre de ${POSITION_NAMES[p].toLowerCase()}`,
  addReserve: 'Adicionar reserva',

  editor: {
    label: 'Nome da jogadora',
    placeholder: 'Nome',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    remove: 'Excluir reserva',
  },
  confirmRemove: (name: string): string =>
    name === '' ? 'Excluir esta reserva do banco?' : `Excluir ${name} do banco?`,
  removeAction: 'Excluir',

  dialog: {
    confirm: 'Confirmar',
    cancel: 'Cancelar',
  },

  clock: {
    region: 'Cronômetro',
    start: 'Iniciar cronômetro',
    pause: 'Pausar cronômetro',
    reset: 'Reiniciar período',
    confirmReset: (p: Period): string =>
      `Reiniciar o ${p}º tempo? O cronômetro volta para a duração configurada, parado.`,
    resetAction: 'Reiniciar',
    periodShort: (p: Period): string => `${p}T`,
    periodLabel: (p: Period): string => `${p}º tempo. Toque para passar para o ${p === 1 ? 2 : 1}º tempo.`,
    duration: 'Duração do período em minutos',
    minutesSuffix: 'min',
    remaining: 'Tempo restante',
    finished: 'Fim do tempo',
  },

  /** Import errors returned by state/storage.ts parseImport (spec match-persistence). */
  importErrors: {
    invalidJson: 'O arquivo não é um JSON válido. Escolha um arquivo exportado pelo Futsal Coach.',
    unknownFormat: 'O arquivo não tem o formato de partida ou escalação do Futsal Coach.',
    futureVersion:
      'Este arquivo foi criado por uma versão mais nova do Futsal Coach e não pode ser importado. Atualize o aplicativo e tente novamente.',
    readFailed: 'Não foi possível ler o arquivo.',
  },

  resume: {
    message: 'Há uma partida salva neste aparelho. O que você quer fazer?',
    continue: 'Continuar partida',
    newMatch: 'Nova partida',
    confirmNew: 'Descartar a partida salva e começar uma nova? Esta ação não pode ser desfeita.',
    discard: 'Descartar',
  },

  dialogOk: 'OK',

  menu: {
    title: 'Menu',
    close: 'Fechar menu',
    sectionMatch: 'Partida',
    restartMatch: 'Reiniciar partida',
    confirmRestartMatch:
      'Reiniciar a partida? As titulares voltam às vagas do apito inicial e as demais ao banco. Os nomes ficam; tempos, histórico e cronômetro voltam ao início do 1º tempo.',
    restartMatchAction: 'Reiniciar',
    exportMatch: 'Exportar partida',
    importJson: 'Importar JSON',
    backupNote:
      'Os dados ficam só neste aparelho. Exporte a partida ou as escalações em JSON como cópia de segurança.',
    confirmImportMatch: 'Substituir a partida atual pela partida do arquivo?',
    importMatchAction: 'Substituir',
    importedLineup: (name: string): string => `Escalação "${name}" adicionada às escalações salvas.`,
    importedLineupFallback: 'Escalação importada',

    sectionSummary: 'Resumo de tempos',
    onCourt: 'em quadra',
    onCourtLabel: 'Em quadra agora',
    historyTitle: 'Substituições',
    historyEmpty: 'Nenhuma substituição ainda.',
    historyLine: (period: Period, time: string, outName: string | null, inName: string | null): string => {
      const parts: string[] = [];
      if (outName !== null) parts.push(`saiu ${outName}`);
      if (inName !== null) parts.push(`entrou ${inName}`);
      return `${period}T ${time} - ${parts.join(', ')}`;
    },

    sectionLineups: 'Escalações',
    saveLineup: 'Salvar escalação atual',
    lineupNamePrompt: 'Nome da escalação',
    lineupNamePlaceholder: 'Ex.: Sub-9 titular',
    save: 'Salvar',
    confirmOverwriteLineup: (name: string): string => `Já existe a escalação "${name}". Substituir?`,
    overwriteAction: 'Substituir',
    noLineups: 'Nenhuma escalação salva.',
    loadLineup: 'Carregar',
    loadLineupLabel: (name: string): string => `Carregar a escalação ${name}`,
    confirmLoadLineup: (name: string): string =>
      `Carregar "${name}"? Elenco, nomes e vagas passam a ser os da escalação; tempos, histórico e cronômetro da partida atual são zerados.`,
    loadAction: 'Carregar',
    exportLineup: 'Exportar',
    exportLineupLabel: (name: string): string => `Exportar a escalação ${name}`,
    deleteLineup: 'Excluir',
    deleteLineupLabel: (name: string): string => `Excluir a escalação ${name}`,
    confirmDeleteLineup: (name: string): string => `Excluir a escalação "${name}"? A partida atual não muda.`,
    deleteAction: 'Excluir',
    playersCount: (n: number): string => (n === 1 ? '1 jogadora' : `${n} jogadoras`),

    storageFailed: 'Não foi possível salvar neste aparelho. Exporte a partida em JSON para não perder os dados.',

    sectionColors: 'Cores',
    gkColor: 'Goleira',
    lineColor: 'Titulares',
    reserveColor: 'Reservas',
  },

  files: {
    matchPrefix: 'futsal-partida',
    lineupPrefix: 'futsal-escalacao',
    unnamedLineup: 'sem-nome',
  },
} as const;
