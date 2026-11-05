// Pure data for the menu summary (spec playing-time "Resumo de tempos", substitutions "Consultar histórico").

import { onCourtPlayerIds, type Match, type Substitution } from '../state/model';
import { playingTimeAt } from '../state/time';
import { formatElapsed } from './format';
import { t } from './i18n';

export interface SummaryRow {
  playerId: string;
  name: string;
  playingMs: number;
  onCourt: boolean;
}

/** Every roster player, sorted by playing time descending; ties keep roster order. */
export function summaryRows(match: Match, now: number): SummaryRow[] {
  const onCourt = new Set(onCourtPlayerIds(match));
  return match.roster
    .map((p) => ({ playerId: p.id, name: p.name, playingMs: playingTimeAt(match, p.id, now), onCourt: onCourt.has(p.id) }))
    .sort((a, b) => b.playingMs - a.playingMs);
}

/** Display name for a possibly empty name. */
export function displayName(name: string): string {
  return name === '' ? t.unnamed : name;
}

/** "1T 07:20 - saiu Duda, entrou Lia", using the name snapshots taken at the moment of the change. */
export function historyLine(sub: Substitution): string {
  return t.menu.historyLine(
    sub.period,
    formatElapsed(sub.elapsedMs),
    sub.outPlayerId === null ? null : displayName(sub.outName),
    sub.inPlayerId === null ? null : displayName(sub.inName),
  );
}

/** Substitution history in chronological order (period, then elapsed time; stable for equal times). */
export function historyLines(match: Match): string[] {
  return match.substitutions
    .map((sub, i) => ({ sub, i }))
    .sort((a, b) => a.sub.period - b.sub.period || a.sub.elapsedMs - b.sub.elapsedMs || a.i - b.i)
    .map(({ sub }) => historyLine(sub));
}
