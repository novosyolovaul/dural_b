import { Card, Rank, Suit } from "./types";
const SUITS: Suit[] = ["♣", "♦", "♥", "♠"];
const RANKS: Rank[] = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS)
    for (const r of RANKS) {
      deck.push({
        id: `${r}${s}-${Math.random().toString(36).slice(2, 6)}`,
        suit: s,
        rank: r,
      });
    }
  // тасуем Фишер–Йетс
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function rankValue(rank: Rank) {
  return ["6", "7", "8", "9", "10", "J", "Q", "K", "A"].indexOf(rank);
}
