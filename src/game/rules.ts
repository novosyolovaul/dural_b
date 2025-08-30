import { Action, Card, GameState } from "./types";
import { rankValue } from "./deck";

export function canAttack(
  state: GameState,
  playerId: string,
  card: Card
): boolean {
  if (state.table.attackingPlayerId !== playerId) return false;
  const { pairs } = state.table;
  if (pairs.length === 0) return true;
  // Можно подкидывать ранги, которые уже на столе
  const ranks = new Set(
    pairs.flatMap((p) => [p.attack.rank, p.defend?.rank].filter(Boolean))
  );
  return ranks.has(card.rank);
}

export function canDefend(
  state: GameState,
  playerId: string,
  attackCard: Card,
  defendCard: Card
): boolean {
  if (state.table.defendingPlayerId !== playerId) return false;
  if (!attackCard || !defendCard) return false;
  const trump = state.table.trump;
  const sameSuit = attackCard.suit === defendCard.suit;
  if (sameSuit) return rankValue(defendCard.rank) > rankValue(attackCard.rank);
  // бить можно козырем любую не-козырную
  return defendCard.suit === trump && attackCard.suit !== trump;
}

export function maxPairsThisTurn(state: GameState): number {
  // ограничение по количеству карт у защищающегося
  const defender = state.players.find(
    (p) => p.id === state.table.defendingPlayerId
  )!;
  return defender.hand.length;
}

export function isTurnOver(state: GameState): boolean {
  const { pairs } = state.table;
  if (pairs.length === 0) return false;
  // Ход окончен, если все атаки покрыты или защищающийся взял
  const allCovered = pairs.every((p) => p.defend);
  return allCovered;
}
