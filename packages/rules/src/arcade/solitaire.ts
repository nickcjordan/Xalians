import { shuffleSeeded } from './random.ts';

export type CardSuit = 'ember' | 'tide' | 'stone' | 'signal';
export type SolitaireCard = { id: string; suit: CardSuit; rank: number; faceUp: boolean };
export type SolitaireSource =
  | { zone: 'waste' }
  | { zone: 'foundation'; suit: CardSuit }
  | { zone: 'tableau'; column: number; index: number };
export type SolitaireTarget =
  | { zone: 'foundation'; suit: CardSuit }
  | { zone: 'tableau'; column: number };
export type SolitaireAction =
  | { type: 'draw' }
  | { type: 'move'; source: SolitaireSource; target: SolitaireTarget };

export type SolitaireState = {
  seed: string;
  drawCount: 1 | 3;
  stock: SolitaireCard[];
  waste: SolitaireCard[];
  foundations: Record<CardSuit, SolitaireCard[]>;
  tableau: SolitaireCard[][];
  moves: number;
  phase: 'playing' | 'won';
};

export const CARD_SUITS: CardSuit[] = ['ember', 'tide', 'stone', 'signal'];

const cardColor = (card: SolitaireCard) => card.suit === 'ember' || card.suit === 'signal' ? 'warm' : 'cool';

function makeDeck(): SolitaireCard[] {
  return CARD_SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, index) => ({
    id: `${suit}-${index + 1}`,
    suit,
    rank: index + 1,
    faceUp: false,
  })));
}

export function createSolitaireState(seed: string, drawCount: 1 | 3 = 1): SolitaireState {
  const deck = shuffleSeeded(makeDeck(), `${seed}:patience`);
  const tableau: SolitaireCard[][] = [];
  for (let column = 0; column < 7; column += 1) {
    const cards = deck.splice(0, column + 1).map((card, index) => ({
      ...card,
      faceUp: index === column,
    }));
    tableau.push(cards);
  }
  return {
    seed,
    drawCount,
    stock: deck,
    waste: [],
    foundations: { ember: [], tide: [], stone: [], signal: [] },
    tableau,
    moves: 0,
    phase: 'playing',
  };
}

function cloneState(state: SolitaireState): SolitaireState {
  return {
    ...state,
    stock: state.stock.map((card) => ({ ...card })),
    waste: state.waste.map((card) => ({ ...card })),
    foundations: {
      ember: state.foundations.ember.map((card) => ({ ...card })),
      tide: state.foundations.tide.map((card) => ({ ...card })),
      stone: state.foundations.stone.map((card) => ({ ...card })),
      signal: state.foundations.signal.map((card) => ({ ...card })),
    },
    tableau: state.tableau.map((column) => column.map((card) => ({ ...card }))),
  };
}

function sourceCards(state: SolitaireState, source: SolitaireSource): SolitaireCard[] {
  if (source.zone === 'waste') return state.waste.length ? [state.waste[state.waste.length - 1]] : [];
  if (source.zone === 'foundation') {
    const pile = state.foundations[source.suit];
    return pile.length ? [pile[pile.length - 1]] : [];
  }
  return state.tableau[source.column]?.slice(source.index) ?? [];
}

function validRun(cards: readonly SolitaireCard[]): boolean {
  if (!cards.length || cards.some((card) => !card.faceUp)) return false;
  return cards.every((card, index) => index === cards.length - 1 || (
    card.rank === cards[index + 1].rank + 1 && cardColor(card) !== cardColor(cards[index + 1])
  ));
}

export function canMoveSolitaire(state: SolitaireState, source: SolitaireSource, target: SolitaireTarget): boolean {
  const cards = sourceCards(state, source);
  if (!validRun(cards)) return false;
  const card = cards[0];
  if (target.zone === 'foundation') {
    if (cards.length !== 1 || card.suit !== target.suit) return false;
    const pile = state.foundations[target.suit];
    return card.rank === pile.length + 1;
  }
  if (source.zone === 'tableau' && source.column === target.column) return false;
  const column = state.tableau[target.column];
  if (!column) return false;
  if (!column.length) return card.rank === 13;
  const top = column[column.length - 1];
  return top.faceUp && top.rank === card.rank + 1 && cardColor(top) !== cardColor(card);
}

function removeSource(state: SolitaireState, source: SolitaireSource): SolitaireCard[] {
  if (source.zone === 'waste') return state.waste.splice(-1, 1);
  if (source.zone === 'foundation') return state.foundations[source.suit].splice(-1, 1);
  const moved = state.tableau[source.column].splice(source.index);
  const exposed = state.tableau[source.column].at(-1);
  if (exposed) exposed.faceUp = true;
  return moved;
}

export function applySolitaireAction(state: SolitaireState, action: SolitaireAction): SolitaireState {
  if (state.phase === 'won') return state;
  const next = cloneState(state);
  if (action.type === 'draw') {
    if (!next.stock.length) {
      if (!next.waste.length) return state;
      next.stock = next.waste.reverse().map((card) => ({ ...card, faceUp: false }));
      next.waste = [];
    } else {
      const count = Math.min(next.drawCount, next.stock.length);
      for (let i = 0; i < count; i += 1) {
        const card = next.stock.pop() as SolitaireCard;
        next.waste.push({ ...card, faceUp: true });
      }
    }
  } else {
    if (!canMoveSolitaire(next, action.source, action.target)) return state;
    const cards = removeSource(next, action.source);
    if (action.target.zone === 'foundation') next.foundations[action.target.suit].push(...cards);
    else next.tableau[action.target.column].push(...cards);
  }
  next.moves += 1;
  if (CARD_SUITS.every((suit) => next.foundations[suit].length === 13)) next.phase = 'won';
  return next;
}

export function findSolitaireHint(state: SolitaireState): { source: SolitaireSource; target: SolitaireTarget } | null {
  const sources: SolitaireSource[] = [
    { zone: 'waste' },
    ...CARD_SUITS.map((suit): SolitaireSource => ({ zone: 'foundation', suit })),
    ...state.tableau.flatMap((column, columnIndex) => column.map((_, index): SolitaireSource => ({ zone: 'tableau', column: columnIndex, index }))),
  ];
  for (const source of sources) {
    const card = sourceCards(state, source)[0];
    if (!card?.faceUp) continue;
    const foundation: SolitaireTarget = { zone: 'foundation', suit: card.suit };
    if (canMoveSolitaire(state, source, foundation)) return { source, target: foundation };
    for (let column = 0; column < 7; column += 1) {
      const target: SolitaireTarget = { zone: 'tableau', column };
      if (canMoveSolitaire(state, source, target)) return { source, target };
    }
  }
  return null;
}
