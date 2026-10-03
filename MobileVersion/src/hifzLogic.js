import { plainAr, shiftDay } from './lib.js';

// Memorization order. 'build' follows incremental expansion: learn a verse, add the next,
// rehearse them together, and every 4 verses (a section) link back to the start.
export const SECTION = 4;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const span = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export function buildSteps(count, order = 'linear', seed = 1) {
  if (count <= 0) return [];
  if (order === 'shuffle') {
    const rand = seededRandom(seed);
    const out = span(0, count - 1);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out.map((i) => [i]);
  }
  if (order !== 'build') return span(0, count - 1).map((i) => [i]);
  const steps = [];
  for (let start = 0; start < count; start += SECTION) {
    const end = Math.min(count, start + SECTION) - 1;
    for (let k = start; k <= end; k++) {
      steps.push([k]);
      if (k > start) steps.push(span(start, k));
    }
    if (start > 0) steps.push(span(0, end));
  }
  return steps;
}

// Words that differ between two verses (for similar-verse confusion).
const wordKey = (token) => plainAr(token).replace(/[^ء-ي]/g, '');

export function wordDiff(a, b) {
  const ka = a.map(wordKey);
  const kb = b.map(wordKey);
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = ka[i] && ka[i] === kb[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const onlyA = new Set();
  const onlyB = new Set();
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (ka[i] && ka[i] === kb[j]) {
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      if (ka[i]) onlyA.add(i);
      i++;
    } else {
      if (kb[j]) onlyB.add(j);
      j++;
    }
  }
  for (; i < a.length; i++) if (ka[i]) onlyA.add(i);
  for (; j < b.length; j++) if (kb[j]) onlyB.add(j);
  return [onlyA, onlyB];
}

// ---- Daily plan: morning memorization, Dhuha review of the previous set,
// Qiyam review of the last few sets, Jumu'ah weekly review, monthly review.

export const JUMUAH = 5;
export const WINDOWS = [3, 5];

export function takeVerses(counts, from, n) {
  const segments = [];
  let { s, a } = from;
  let left = n;
  while (left > 0 && s <= counts.length) {
    const last = counts[s - 1];
    const to = Math.min(last, a + left - 1);
    segments.push({ s, from: a, to });
    left -= to - a + 1;
    if (to === last) {
      s += 1;
      a = 1;
    } else {
      a = to + 1;
    }
  }
  return { segments, next: s <= counts.length ? { s, a } : null };
}

export function newPlan({ surah, ayah, perDay, window }, today) {
  return { version: 1, start: { s: surah, a: ayah }, perDay, window, began: today, sets: [], log: {} };
}

export function cleanPlan(raw, counts) {
  if (!raw || raw.version !== 1 || !raw.start || !Array.isArray(raw.sets)) return null;
  const okRef = (s, a) => Number.isInteger(s) && s >= 1 && s <= counts.length && Number.isInteger(a) && a >= 1 && a <= counts[s - 1];
  if (!okRef(raw.start.s, raw.start.a)) return null;
  const isDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  const sets = raw.sets.filter(
    (set) => isDay(set?.d) && Array.isArray(set.seg) && set.seg.length > 0 && set.seg.every((g) => okRef(g.s, g.from) && okRef(g.s, g.to) && g.from <= g.to),
  );
  const log = {};
  for (const [day, entry] of Object.entries(raw.log ?? {})) {
    if (!isDay(day) || !entry || typeof entry !== 'object') continue;
    log[day] = { d: entry.d === true, q: entry.q === true, w: entry.w === true, note: typeof entry.note === 'string' ? entry.note.slice(0, 500) : '' };
  }
  return {
    version: 1,
    start: { s: raw.start.s, a: raw.start.a },
    perDay: Number.isInteger(raw.perDay) && raw.perDay >= 1 && raw.perDay <= 20 ? raw.perDay : 3,
    window: WINDOWS.includes(raw.window) ? raw.window : 3,
    began: isDay(raw.began) ? raw.began : sets[0]?.d ?? null,
    sets,
    log,
  };
}

export function cursorOf(plan, counts) {
  const last = plan.sets.at(-1);
  if (!last) return plan.start;
  const seg = last.seg.at(-1);
  if (seg.to < counts[seg.s - 1]) return { s: seg.s, a: seg.to + 1 };
  return seg.s < counts.length ? { s: seg.s + 1, a: 1 } : null;
}

export function weekday(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function daysBetween(from, to) {
  const toUtc = (k) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

export function setLabel(index) {
  const letter = String.fromCharCode(65 + (index % 26));
  return index < 26 ? letter : `${letter}${Math.floor(index / 26) + 1}`;
}

export function planDay(plan, today, counts) {
  const sets = plan.sets.map((set, i) => ({ ...set, label: setLabel(i), index: i }));
  const todaySet = sets.find((set) => set.d === today) ?? null;
  const before = sets.filter((set) => set.d < today);
  const isJumuah = weekday(today) === JUMUAH;
  const cursor = cursorOf(plan, counts);
  const proposal = todaySet || !cursor ? null : { ...takeVerses(counts, cursor, plan.perDay), label: setLabel(sets.length) };

  const dhuha = before.at(-1) ?? null;
  const recent = sets.filter((set) => set.d <= today);
  const qiyam = recent.slice(-(todaySet ? plan.window : plan.window - 1));
  const week = sets.filter((set) => set.d > shiftDay(today, -7) && set.d <= today);
  const month = sets.filter((set) => set.d > shiftDay(today, -28) && set.d <= today);
  const weekNo = plan.began ? Math.floor(Math.max(0, daysBetween(plan.began, today)) / 7) : 0;

  return {
    isJumuah,
    todaySet,
    proposal,
    finished: !todaySet && !cursor,
    dhuha,
    qiyam,
    qiyamPending: !todaySet && !!proposal,
    week,
    month,
    monthlyDue: isJumuah && weekNo % 4 === 3,
    log: plan.log[today] ?? { d: false, q: false, w: false, note: '' },
  };
}

export function verseTotal(sets) {
  return sets.reduce((sum, set) => sum + set.seg.reduce((n, g) => n + g.to - g.from + 1, 0), 0);
}
