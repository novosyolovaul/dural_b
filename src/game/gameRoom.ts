import { Server, Socket } from "socket.io";
import { Action, Card, GameState } from "./types";
import { makeDeck } from "./deck";
import { canAttack, canDefend, isTurnOver, maxPairsThisTurn } from "./rules";

export class GameRoom {
  state: GameState;
  deck: Card[];
  discard: Card[] = [];
  io: Server;

  constructor(
    io: Server,
    roomId: string,
    p1: { id: string; name: string },
    p2: { id: string; name: string }
  ) {
    this.io = io;
    this.deck = makeDeck();
    const trump = this.deck[this.deck.length - 1].suit;
    this.state = {
      roomId,
      phase: "dealing",
      players: [
        { id: p1.id, name: p1.name, socketId: "", hand: [] },
        { id: p2.id, name: p2.name, socketId: "", hand: [] },
      ],
      table: {
        pairs: [],
        attackingPlayerId: p1.id,
        defendingPlayerId: p2.id,
        trump,
        deckCount: this.deck.length,
        discardCount: 0,
      },
    };
    this.deal();
  }

  deal() {
    // раздать до 6 карт каждому
    for (const pl of this.state.players) {
      while (pl.hand.length < 6 && this.deck.length)
        pl.hand.push(this.deck.pop()!);
    }
    this.state.table.deckCount = this.deck.length;
    this.broadcast();
    this.state.phase = "playing";
  }

  handleAction(playerId: string, action: Action) {
    if (this.state.phase !== "playing") return;
    const me = this.state.players.find((p) => p.id === playerId)!;
    if (!me) return;

    if (action.type === "attack") {
      const card = me.hand.find((c) => c.id === action.cardId);
      if (
        card &&
        this.state.table.pairs.length < maxPairsThisTurn(this.state) &&
        canAttack(this.state, playerId, card)
      ) {
        // положить карту в атаку
        this.state.table.pairs.push({ attack: card });
        me.hand = me.hand.filter((c) => c.id !== card.id);
      }
    }

    if (action.type === "defend") {
      const atk = this.state.table.pairs.find(
        (p) => p.attack.id === action.attackCardId
      );
      const def = me.hand.find((c) => c.id === action.defendCardId);
      if (
        atk &&
        def &&
        !atk.defend &&
        canDefend(this.state, playerId, atk.attack, def)
      ) {
        atk.defend = def;
        me.hand = me.hand.filter((c) => c.id !== def.id);
      }
    }

    if (action.type === "take") {
      // защищающийся берёт все карты со стола
      if (playerId === this.state.table.defendingPlayerId) {
        const taking = this.state.table.pairs.flatMap(
          (p) => [p.attack, p.defend].filter(Boolean) as Card[]
        );
        me.hand.push(...taking);
        this.state.table.pairs = [];
        this.rotateAfterTake();
        this.deal();
      }
    }

    if (action.type === "pass") {
      // атакующий пасует, если все покрыто
      if (
        playerId === this.state.table.attackingPlayerId &&
        isTurnOver(this.state)
      ) {
        this.discardPairs();
        this.rotateAfterPass();
        this.deal();
      }
    }

    this.checkEnd();
    this.broadcast();
  }

  discardPairs() {
    const cards = this.state.table.pairs.flatMap((p) => [p.attack, p.defend!]);
    this.discard.push(...cards);
    this.state.table.pairs = [];
    this.state.table.discardCount = this.discard.length;
  }

  rotateAfterPass() {
    const a = this.state.table.attackingPlayerId;
    const d = this.state.table.defendingPlayerId;
    this.state.table.attackingPlayerId = d;
    this.state.table.defendingPlayerId = a;
  }

  rotateAfterTake() {
    // после взятия атака сохраняется у того же атакующего
    // защитник остаётся защитником
  }

  checkEnd() {
    const winners = this.state.players.filter(
      (p) => p.hand.length === 0 && this.deck.length === 0
    );
    if (winners.length) {
      this.state.phase = "ending";
      this.io
        .to(this.state.roomId)
        .emit("game:over", { winnerId: winners[0].id, reason: "no-cards" });
    }
  }

  bindSocket(roomId: string, sock: Socket, playerId: string) {
    sock.join(roomId);
    const p = this.state.players.find((p) => p.id === playerId);
    if (p) p.socketId = sock.id;
    sock.emit("game:state", this.state);
  }

  broadcast() {
    this.io.to(this.state.roomId).emit("game:state", this.state);
  }
}
