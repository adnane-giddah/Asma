import { randomInt as cryptoRandomInt } from 'node:crypto';

export function strHash(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function seedRand(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const freshSeed = () => cryptoRandomInt(0, 2 ** 32);

export const randomInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

export const pick = (rng, items) => items[Math.floor(rng() * items.length)];

export function shuffle(rng, items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const sample = (rng, items, count) => shuffle(rng, items).slice(0, count);

export const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
