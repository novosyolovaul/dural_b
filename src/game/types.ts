export type Suit = "♣" | "♦" | "♥" | "♠";
export type Rank = "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}
export interface Player {
  id: string;
  name: string;
  socketId: string;
  hand: Card[];
}
export interface Pair {
  attack: Card;
  defend?: Card;
}
export interface TableState {
  pairs: Pair[];
  attackingPlayerId: string;
  defendingPlayerId: string;
  trump: Suit;
  deckCount: number;
  discardCount: number;
  turnEndsAt?: number;
}
export interface GameState {
  roomId: string;
  players: Player[];
  table: TableState;
  phase: "dealing" | "playing" | "ending";
}
export type Action =
  | { type: "attack"; cardId: string }
  | { type: "defend"; attackCardId: string; defendCardId: string }
  | { type: "take" }
  | { type: "pass" };
