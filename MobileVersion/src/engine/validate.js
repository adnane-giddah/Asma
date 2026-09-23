import { TOTAL, okId } from '../data/names.js';
import { HARDNESS, QUESTION_CAP, MODE_WEIGHTS } from './quiz.js';
import { freshSeed } from './random.js';

export function readQuizAsk(body) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = [];

  const mode = input.mode ?? 'mixed';
  if (!Object.hasOwn(MODE_WEIGHTS, mode)) errors.push(`mode must be one of: ${Object.keys(MODE_WEIGHTS).join(', ')}`);

  const difficulty = input.difficulty ?? 'normal';
  if (!HARDNESS.includes(difficulty)) errors.push(`difficulty must be one of: ${HARDNESS.join(', ')}`);

  const count = input.count ?? 10;
  if (!Number.isInteger(count) || count < 1 || count > QUESTION_CAP) {
    errors.push(`count must be an integer between 1 and ${QUESTION_CAP}`);
  }

  let from = input.from ?? 1;
  let to = input.to ?? TOTAL;
  if (!okId(from) || !okId(to)) errors.push(`from and to must be integers between 1 and ${TOTAL}`);
  else if (from > to) [from, to] = [to, from];

  let ids = null;
  if (input.ids != null) {
    if (!Array.isArray(input.ids) || input.ids.length === 0 || input.ids.length > TOTAL || !input.ids.every(okId)) {
      errors.push(`ids must be a non-empty array of name ids between 1 and ${TOTAL}`);
    } else {
      ids = [...new Set(input.ids)];
    }
  }

  let seed = input.seed;
  if (seed == null) seed = freshSeed();
  else if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) errors.push('seed must be a 32-bit unsigned integer');

  return errors.length ? { errors } : { value: { mode, difficulty, count, from, to, ids, seed } };
}

export function readDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isReal = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isReal ? value : null;
}

export const utcToday = () => new Date().toISOString().slice(0, 10);
