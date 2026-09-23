export const freshSave = () => ({
  version: 1,
  names: {},
  lessons: {},
  daily: { last: null, streak: 0, best: 0, history: {} },
  stats: { answered: 0, correct: 0, quizzes: 0, bestCombo: 0, challengeBest: 0 },
  kids: { memory: {}, rush: {}, build: {}, adventure: {} },
});

export const KID_TIERS = ['easy', 'medium', 'hard'];

export const SAVE_APP = 'asma-ul-husna';
export const SAVE_KIND = 'progress-backup';

export function packSave(progress, now = new Date()) {
  return { app: SAVE_APP, kind: SAVE_KIND, version: 1, exportedAt: now.toISOString(), progress };
}

const isCount = (n) => Number.isInteger(n) && n >= 0 && n <= 1e7;
const isTime = (n) => Number.isFinite(n) && n >= 0;
const isDateKey = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const tidyStat = (s) => (Array.isArray(s) && s.length === 3 && s.every(isCount) ? [...s] : undefined);

export function scrubSave(raw) {
  const data = raw?.app === SAVE_APP && raw?.kind === SAVE_KIND ? raw.progress : raw;
  if (!data || typeof data !== 'object' || data.version !== 1 || typeof data.names !== 'object' || data.names === null) return null;
  const base = freshSave();

  const names = {};
  for (const [key, entry] of Object.entries(data.names)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 1 || id > 99 || !entry || typeof entry !== 'object') continue;
    const o = tidyStat(entry.o);
    const m = tidyStat(entry.m);
    if (!o && !m) continue;
    names[id] = { ...(o && { o }), ...(m && { m }), t: isTime(entry.t) ? entry.t : 0 };
  }

  const lessons = {};
  for (const [key, entry] of Object.entries(data.lessons ?? {})) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 1 || id > 11 || !entry || typeof entry !== 'object') continue;
    const best = Number.isFinite(entry.best) ? Math.min(1, Math.max(0, entry.best)) : 0;
    const stars = Number.isInteger(entry.stars) ? Math.min(3, Math.max(0, entry.stars)) : 0;
    lessons[id] = { best, stars, done: entry.done === true };
  }

  const d = data.daily ?? {};
  const history = {};
  for (const [date, score] of Object.entries(d.history ?? {})) {
    if (isDateKey(date) && Number.isInteger(score) && score >= 0 && score <= 10) history[date] = score;
  }
  const daily = {
    last: isDateKey(d.last) ? d.last : null,
    streak: isCount(d.streak) ? d.streak : 0,
    best: isCount(d.best) ? d.best : 0,
    history,
  };

  const stats = { ...base.stats };
  for (const key of Object.keys(stats)) if (isCount(data.stats?.[key])) stats[key] = data.stats[key];
  stats.correct = Math.min(stats.correct, stats.answered);

  const k = data.kids ?? {};
  const kids = { memory: {}, rush: {}, build: {}, adventure: {} };
  for (const game of ['memory', 'rush', 'build']) {
    for (const level of KID_TIERS) {
      const value = k[game]?.[level];
      if (isCount(value) && (game !== 'build' || value <= 3)) kids[game][level] = value;
    }
  }
  for (const [key, stars] of Object.entries(k.adventure ?? {})) {
    const gate = Number(key);
    if (Number.isInteger(gate) && gate >= 1 && gate <= 11 && Number.isInteger(stars) && stars >= 0 && stars <= 3) kids.adventure[gate] = stars;
  }

  return { ...base, names, lessons, daily, stats, kids };
}
