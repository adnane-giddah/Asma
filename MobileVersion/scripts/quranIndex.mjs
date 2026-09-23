import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAMES } from '../src/data/names.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const QURAN_FILE = process.env.QURAN_JSON ?? path.resolve(here, 'quran.json');
const QURAN = JSON.parse(fs.readFileSync(QURAN_FILE, 'utf8'));

export const QURAN_CREDIT = QURAN.source;
export const SURAHS = QURAN.surahs;
export const SURAH_MENU = Object.freeze(SURAHS.map(({ ayahs, ...meta }) => ({ ...meta, count: ayahs.length })));

export const surahAt = (n) => SURAHS[n - 1];

export function normalize(word) {
  return word
    .replace(/[\u064B-\u065F\u06D6-\u06ED\u0640\uFEFF]/g, '')
    .replace(/\u0670/g, 'ا')
    .replace(/ٱ/g, 'ا')
    .replace(/آ/g, 'ءا')
    .replace(/[أإؤئ]/g, 'ء')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

const PREFIXES = ['وب', 'ول', 'وك', 'فب', 'فل', 'و', 'ف', 'ب', 'ل', 'ك'];

function rootsOf(word) {
  const base = normalize(word);
  const out = new Set();
  for (const candidate of [base, ...PREFIXES.filter((p) => base.startsWith(p) && base.length - p.length >= 2).map((p) => base.slice(p.length))]) {
    for (const form of [candidate, candidate.replace(/^ال/, ''), candidate.replace(/^لل/, '')]) {
      if (form.length < 2) continue;
      out.add(form);
      if (form.length > 3 && form.endsWith('ا')) out.add(form.slice(0, -1));
    }
  }
  return out;
}

const bareName = (arabic) => normalize(arabic).replace(/^ال/, '');

const ALT_SPELLINGS = {
  60: ['محي'],
  77: ['وال'],
  78: ['متعال'],
  94: ['هاد'],
};

const KASRA_CHECK = {
  36: /ع\u064Eل\u0650/,
};

const MULTI_WORD = {
  84: [['مالك'], ['ملك']],
  85: [['ذو', 'ذي'], ['جلال'], ['ءكرام']],
};

const NAME_FORMS = new Map(NAMES.map((n) => [n.id, MULTI_WORD[n.id] ? null : new Set([bareName(n.arabic), ...(ALT_SPELLINGS[n.id] ?? [])])]));
const EVERY_FORM = new Set([...NAME_FORMS.values()].filter(Boolean).flatMap((set) => [...set]));

const ALLAH_WORDS = new Set(['الله', 'لله', 'اللهم', 'رب', 'ربك', 'ربكم', 'ربنا', 'ربي', 'ربه', 'ربهم', 'هو', 'ءنه', 'ءنك', 'ءنت']);
const pointsToAllah = (stemSet) => [...stemSet].some((s) => ALLAH_WORDS.has(s));

let INDEX;

function index() {
  if (!INDEX) {
    INDEX = [];
    for (const surah of SURAHS) {
      surah.ayahs.forEach((text, i) => {
        const raw = text.split(' ');
        INDEX.push({ s: surah.n, a: i + 1, raw, words: raw.map(rootsOf) });
      });
    }
  }
  return INDEX;
}

const cache = new Map();

export function versesFor(id) {
  if (cache.has(id)) return cache.get(id);
  const forms = NAME_FORMS.get(id);
  const phrase = MULTI_WORD[id];
  const vowelCheck = KASRA_CHECK[id];
  const beside = [];
  const other = [];

  for (const verse of index()) {
    const { words, raw } = verse;
    const hits = [];
    for (let i = 0; i < words.length; i++) {
      if (phrase) {
        if (phrase.every((options, k) => words[i + k] && options.some((o) => words[i + k].has(o)))) {
          hits.push(...phrase.map((_, k) => i + k));
        }
      } else if ([...words[i]].some((s) => forms.has(s)) && (!vowelCheck || vowelCheck.test(raw[i]))) {
        hits.push(i);
      }
    }
    if (!hits.length) continue;

    const near = phrase
      ? true
      : hits.some((i) => {
          for (let j = Math.max(0, i - 3); j <= Math.min(words.length - 1, i + 3); j++) {
            if (j === i) continue;
            if (pointsToAllah(words[j])) return true;
            if (Math.abs(j - i) === 1 && [...words[j]].some((s) => EVERY_FORM.has(s))) return true;
          }
          return false;
        });
    (near ? beside : other).push({ s: verse.s, a: verse.a, hits });
  }

  const result = { beside, other, total: beside.length + other.length };
  cache.set(id, result);
  return result;
}

export function attachAyah(ref) {
  const surah = surahAt(ref.s);
  return { ...ref, surah: { n: surah.n, ar: surah.ar, en: surah.en }, text: surah.ayahs[ref.a - 1] };
}
