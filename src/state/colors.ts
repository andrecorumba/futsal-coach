// Token colour by role (design.md D3). Pure and DOM-free.

import type { Match, Player, PlayerRole, Slot } from './model';

/** Role used for colouring: the frozen role after kickoff, otherwise the slot decides. */
export function effectiveRole(slot: Pick<Slot, 'kind'>, player: Pick<Player, 'role'>): PlayerRole {
  return player.role ?? (slot.kind === 'court' ? 'starter' : 'reserve');
}

/** Fill colour of a player's token. The goalkeeper slot always wins over the role. */
export function colorFor(
  match: Pick<Match, 'settings'>,
  slot: Pick<Slot, 'kind' | 'position'>,
  player: Pick<Player, 'role'>,
): string {
  if (slot.kind === 'court' && slot.position === 'GL') return match.settings.gkColor;
  return effectiveRole(slot, player) === 'reserve' ? match.settings.reserveColor : match.settings.lineColor;
}
