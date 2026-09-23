import { NAMES, TOTAL, nameById } from '../data/names.js';
import { seedRand, strHash, pick, randomInt, range, sample, shuffle } from './random.js';

export const SKILL_OF = Object.freeze({
  gap: 'order',
  next: 'order',
  prev: 'order',
  arrange: 'order',
  nameToMeaning: 'meaning',
  meaningToName: 'meaning',
});

export const MODE_WEIGHTS = Object.freeze({
  gap: { gap: 1 },
  meaning: { nameToMeaning: 1, meaningToName: 1 },
  order: { arrange: 4, next: 3, prev: 3 },
  mixed: { gap: 6, nameToMeaning: 4, meaningToName: 4, next: 2, prev: 1, arrange: 3 },
});

export const HARDNESS = Object.freeze(['easy', 'normal', 'hard']);

export const QUESTION_CAP = 50;

const DECOY_COUNT = 3;
const RUN_LENGTH = { easy: 3, normal: 4, hard: 5 };
const EVERY_ID = NAMES.map((name) => name.id);

function stem(arabic) {
  return arabic
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/^ال/, '');
}

function editGap(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

const BARE_STEMS = new Map(NAMES.map((name) => [name.id, stem(name.arabic)]));

const LOOK_ALIKE = new Map(
  NAMES.map(({ id }) => [
    id,
    EVERY_ID.filter((other) => other !== id)
      .map((other) => [other, editGap(BARE_STEMS.get(id), BARE_STEMS.get(other))])
      .sort((x, y) => x[1] - y[1] || x[0] - y[0])
      .map(([other]) => other),
  ]),
);

export function sameFamily(a, b) {
  const groupsB = nameById(b).groups;
  return nameById(a).groups.some((group) => groupsB.includes(group));
}

function fitsType(type, id) {
  if (type === 'gap') return id > 1 && id < TOTAL;
  if (type === 'next') return id > 1;
  if (type === 'prev') return id < TOTAL;
  return true;
}

function splitTypes(rng, weights, count) {
  const entries = shuffle(rng, Object.entries(weights));
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const slots = entries.map(([type, weight]) => {
    const exact = (weight / totalWeight) * count;
    return { type, n: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let missing = count - slots.reduce((sum, slot) => sum + slot.n, 0);
  for (const slot of [...slots].sort((a, b) => b.remainder - a.remainder)) {
    if (missing-- <= 0) break;
    slot.n++;
  }
  return unclump(shuffle(rng, slots.flatMap((slot) => Array(slot.n).fill(slot.type))));
}

function unclump(types) {
  for (let i = 1; i < types.length; i++) {
    if (types[i] !== types[i - 1]) continue;
    const j = types.findIndex((type, k) => k > i && type !== types[i - 1]);
    if (j !== -1) [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

export function cookQuiz({ mode = 'mixed', count = 10, difficulty = 'normal', from = 1, to = TOTAL, ids = null, seed = 1 }) {
  const rng = seedRand(seed);
  const explicit = Array.isArray(ids) && ids.length > 0;
  const pool = explicit ? [...new Set(ids)].sort((a, b) => a - b) : range(from, to);
  const poolSet = new Set(pool);
  const used = { order: new Set(), meaning: new Set() };

  const questions = splitTypes(rng, MODE_WEIGHTS[mode], count).map((wantedType, index) => {
    let type = wantedType;
    let target = grabTarget(type);
    if (target == null) {

      type = ['arrange', 'nameToMeaning'].find((fallback) => SKILL_OF[fallback] === SKILL_OF[wantedType]);
      target = grabTarget(type);
    }
    return shapeQuestion(type, target, index + 1);
  });

  return { mode, difficulty, seed, count: questions.length, questions };

  function grabTarget(type) {
    const valid = pool.filter((id) => fitsType(type, id));
    if (valid.length === 0) return null;
    const seen = used[SKILL_OF[type]];
    let fresh = valid.filter((id) => !seen.has(id));
    if (fresh.length === 0) {

      valid.forEach((id) => seen.delete(id));
      fresh = valid;
    }
    const id = pick(rng, fresh);
    seen.add(id);
    return id;
  }

  function shapeQuestion(type, target, id) {
    const base = { id, type, skill: SKILL_OF[type] };
    switch (type) {
      case 'gap': {
        const before = target - 1;
        const after = target + 1;
        return { ...base, before, after, answer: target, options: mixInAnswer(target, nearbyDecoys(target, [before, after])), focus: [target] };
      }
      case 'next': {
        const prompt = target - 1;
        return { ...base, prompt, answer: target, options: mixInAnswer(target, nearbyDecoys(target, [prompt])), focus: [target] };
      }
      case 'prev': {
        const prompt = target + 1;
        return { ...base, prompt, answer: target, options: mixInAnswer(target, nearbyDecoys(target, [prompt])), focus: [target] };
      }
      case 'arrange': {
        const answer = runOfNames(target);
        let items = shuffle(rng, answer);
        while (items.every((item, i) => item === answer[i])) items = shuffle(rng, answer);
        answer.forEach((name) => used.order.add(name));
        return { ...base, items, answer, focus: answer };
      }
      default: {

        return { ...base, prompt: target, answer: target, options: mixInAnswer(target, meaningDecoys(target)), focus: [target] };
      }
    }
  }

  function mixInAnswer(answer, distractors) {
    return shuffle(rng, [answer, ...distractors]);
  }

  function nearbyDecoys(answer, shown) {
    const excluded = new Set([answer, ...shown]);
    const candidates = EVERY_ID.filter((id) => !excluded.has(id));
    const within = (radius, needed) => {
      let r = radius;
      let list = candidates.filter((id) => Math.abs(id - answer) <= r);
      while (list.length < needed) list = candidates.filter((id) => Math.abs(id - answer) <= ++r);
      return list;
    };

    if (difficulty === 'hard') return sample(rng, within(4, DECOY_COUNT), DECOY_COUNT);
    if (difficulty === 'easy') {
      const far = candidates.filter((id) => Math.abs(id - answer) > 4);
      return sample(rng, far, DECOY_COUNT);
    }
    const near = sample(rng, within(6, 2), 2);
    const rest = candidates.filter((id) => !near.includes(id));
    return [...near, pick(rng, rest)];
  }

  function meaningDecoys(answer) {
    const eligible = EVERY_ID.filter((id) => id !== answer && !sameFamily(id, answer));
    const inScope = eligible.filter((id) => poolSet.has(id));
    const preferred = inScope.length >= DECOY_COUNT ? inScope : eligible;
    const lookalikes = LOOK_ALIKE.get(answer).filter((id) => eligible.includes(id));

    if (difficulty === 'easy') return sample(rng, preferred, DECOY_COUNT);
    if (difficulty === 'hard') return sample(rng, lookalikes.slice(0, 6), DECOY_COUNT);
    const lookalike = pick(rng, lookalikes.slice(0, 4));
    const others = preferred.filter((id) => id !== lookalike);
    const fill = others.length >= DECOY_COUNT - 1 ? others : eligible.filter((id) => id !== lookalike);
    return [lookalike, ...sample(rng, fill, DECOY_COUNT - 1)];
  }

  function runOfNames(target) {
    let low = 1;
    let high = TOTAL;
    if (!explicit && to - from + 1 >= 3) {
      low = from;
      high = to;
    }
    const size = Math.min(RUN_LENGTH[difficulty], high - low + 1);
    const start = randomInt(rng, Math.max(low, target - size + 1), Math.min(target, high - size + 1));
    return range(start, start + size - 1);
  }
}

export const DAILY_COUNT = 10;

export function todaysQuiz(dateKey) {
  return cookQuiz({ mode: 'mixed', count: DAILY_COUNT, difficulty: 'normal', seed: strHash(`asma-daily:${dateKey}`) });
}

export function pickDayName(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  return (((dayNumber % TOTAL) + TOTAL) % TOTAL) + 1;
}
