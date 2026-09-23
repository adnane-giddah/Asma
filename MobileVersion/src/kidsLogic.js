export const PAIRS_BY_TIER = { easy: 4, medium: 6, hard: 8 };
export const RUSH_TIME = { easy: 75, medium: 60, hard: 45 };
export const RUSH_HARDNESS = { easy: 'easy', medium: 'normal', hard: 'hard' };
export const BUILD_TIERS = {
  easy: { rounds: 5, maxLetters: 4, decoys: 0 },
  medium: { rounds: 5, maxLetters: 6, decoys: 1 },
  hard: { rounds: 6, maxLetters: 99, decoys: 2 },
};
export const GATE_RULES = { questions: 8, pass: 6 };

export function shuffle(items, rand = Math.random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const sample = (items, count, rand = Math.random) => shuffle(items, rand).slice(0, count);

export const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export function dealCards(ids, rand = Math.random) {
  return shuffle(ids.flatMap((id) => [{ key: `${id}-name`, id, face: 'name' }, { key: `${id}-meaning`, id, face: 'meaning' }]), rand);
}

export const cardStars = (moves, pairs) => (moves <= Math.ceil(pairs * 1.5) ? 3 : moves <= Math.ceil(pairs * 2.25) ? 2 : 1);

const HARAKAT = /[\u064B-\u065F\u0670\u0640]/g;

export function lettersOf(arabic) {
  const plain = arabic.replace(HARAKAT, '');
  if (plain.includes(' ') || !plain.startsWith('ال')) return null;
  return plain.slice(2);
}

const SPARE_LETTERS = [...'بتجحدرسعفقكلمنهوي'];

export function tilesFor(stem, decoys = 0, rand = Math.random) {
  const letters = [...stem];
  const extra = sample(SPARE_LETTERS.filter((l) => !letters.includes(l)), decoys, rand);
  let tiles = shuffle([...letters, ...extra], rand);

  for (let tries = 0; tiles.slice(0, letters.length).join('') === stem && tries < 10; tries++) tiles = shuffle(tiles, rand);
  return tiles.map((letter, i) => ({ id: i, letter }));
}

export const letterStars = (mistakes, rounds) => (mistakes === 0 ? 3 : mistakes <= rounds ? 2 : 1);

export function letterPool(names, level) {
  const { maxLetters, rounds } = BUILD_TIERS[level];
  const buildable = names.filter((n) => lettersOf(n.arabic));
  const short = buildable.filter((n) => lettersOf(n.arabic).length <= maxLetters);
  return short.length >= Math.min(rounds, 3) ? short : buildable;
}

export const gateStars = (correct) => (correct >= GATE_RULES.questions ? 3 : correct >= GATE_RULES.questions - 1 ? 2 : correct >= GATE_RULES.pass ? 1 : 0);

export const gateOpen = (gate, stars) => gate === 1 || (stars[gate - 1] ?? 0) >= 1;
