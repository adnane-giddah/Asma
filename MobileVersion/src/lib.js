export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

export function dayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shiftDay(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

export function plainAr(text) {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

export function plainLat(text) {
  return text
    .toLowerCase()
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1');
}

const arabicDigits = new Intl.NumberFormat('ar-EG', { useGrouping: false });
export const numText = (n, lang) => (lang === 'ar' ? arabicDigits.format(n) : String(n));

let audio;
export function beep(kind) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'correct' ? [[660, 0], [880, 0.09]] : [[220, 0]];
    for (const [freq, at] of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = kind === 'correct' ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const t = audio.currentTime + at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  } catch {
  }
}

export { api } from './offlineApi.js';

export const isRealWord = (token) => /[ء-يٱ]/.test(token);

export function lvlOf(stat) {
  if (!stat || stat[0] + stat[1] === 0) return 0;
  if (stat[2] >= 3) return 3;
  return stat[2] >= 1 ? 2 : 1;
}

export const starCount = (ratio) => (ratio >= 1 ? 3 : ratio >= 0.8 ? 2 : ratio >= 0.6 ? 1 : 0);
export const PASS_MARK = 0.6;
