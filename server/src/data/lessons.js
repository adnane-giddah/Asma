import { TOTAL } from './names.js';

export const PER_LESSON = 9;

export const LESSONS = Object.freeze(
  Array.from({ length: Math.ceil(TOTAL / PER_LESSON) }, (_, index) => ({
    id: index + 1,
    from: index * PER_LESSON + 1,
    to: Math.min(TOTAL, (index + 1) * PER_LESSON),
  })),
);
