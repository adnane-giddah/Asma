import { OPEN_NAMES, TOTAL } from './data/names.js';
import { LESSONS, PER_LESSON } from './data/lessons.js';
import nameRefs from './data/nameRefs.js';
import { todaysQuiz, cookQuiz, pickDayName } from './engine/quiz.js';
import { readDay, readQuizAsk } from './engine/validate.js';

let quranPromise;
const quranLater = () => (quranPromise ??= import('./data/quran.js').then((module) => module.default));

const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function surahAt(n) {
  const quran = await quranLater();
  const surah = Number.isInteger(n) ? quran.surahs[n - 1] : undefined;
  if (!surah) throw new Error('Surah not found');
  return surah;
}

export const api = {
  names: async () => ({ total: TOTAL, names: OPEN_NAMES }),

  lessons: async () => ({ size: PER_LESSON, lessons: LESSONS }),

  quiz: async (body) => {

    const { value, errors } = readQuizAsk(JSON.parse(JSON.stringify(body ?? {})));
    if (errors) throw new Error(errors.join('; '));
    return cookQuiz(value);
  },

  daily: async (date) => {
    const key = readDay(date) ?? localDay();
    return { date: key, nameOfTheDay: pickDayName(key), ...todaysQuiz(key) };
  },

  surahs: async () => {
    const quran = await quranLater();
    return { source: quran.source, surahs: quran.surahs.map(({ ayahs, ...meta }) => ({ ...meta, count: ayahs.length })) };
  },

  surah: async (n) => {
    const surah = await surahAt(Number(n));

    return { ...surah, count: surah.ayahs.length, basmala: surah.n !== 1 && surah.n !== 9 };
  },

  nameQuran: async (id) => {
    const refs = nameRefs[id];
    if (!refs) throw new Error('Name not found');
    const quran = await quranLater();
    const attachAyah = (ref) => {
      const surah = quran.surahs[ref.s - 1];
      return { ...ref, surah: { n: surah.n, ar: surah.ar, en: surah.en }, text: surah.ayahs[ref.a - 1] };
    };
    return { id, total: refs.beside.length + refs.other.length, source: quran.source, beside: refs.beside.map(attachAyah), other: refs.other.map(attachAyah) };
  },
};
