import { Router } from 'express';
import { OPEN_NAMES, TOTAL, nameById, publicView } from '../data/names.js';
import { LESSONS, PER_LESSON } from '../data/lessons.js';
import { todaysQuiz, cookQuiz, pickDayName } from '../lib/quiz.js';
import { readDay, readQuizAsk, utcToday } from '../lib/validate.js';
import { QURAN_CREDIT, SURAH_MENU, surahAt, versesFor, attachAyah } from '../lib/quran.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.get('/names', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json({ total: TOTAL, names: OPEN_NAMES });
});

router.get('/names/:id', (req, res) => {
  const id = Number(req.params.id);
  const name = Number.isInteger(id) ? nameById(id) : undefined;
  if (!name) {
    res.status(404).json({ error: 'Name not found' });
    return;
  }
  res.json({ name: publicView(name), previous: id > 1 ? id - 1 : null, next: id < TOTAL ? id + 1 : null });
});

router.get('/names/:id/quran', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !nameById(id)) {
    res.status(404).json({ error: 'Name not found' });
    return;
  }
  const { beside, other, total } = versesFor(id);
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ id, total, source: QURAN_CREDIT, beside: beside.map(attachAyah), other: other.map(attachAyah) });
});

router.get('/quran/surahs', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ source: QURAN_CREDIT, surahs: SURAH_MENU });
});

router.get('/quran/surahs/:n', (req, res) => {
  const n = Number(req.params.n);
  const surah = Number.isInteger(n) ? surahAt(n) : undefined;
  if (!surah) {
    res.status(404).json({ error: 'Surah not found' });
    return;
  }
  res.set('Cache-Control', 'public, max-age=86400');

  res.json({ ...surah, count: surah.ayahs.length, basmala: n !== 1 && n !== 9 });
});

router.get('/lessons', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json({ size: PER_LESSON, lessons: LESSONS });
});

router.post('/quiz', (req, res) => {
  const { value, errors } = readQuizAsk(req.body);
  if (errors) {
    res.status(400).json({ error: 'Invalid quiz request', details: errors });
    return;
  }
  res.json(cookQuiz(value));
});

router.get('/daily', (req, res) => {
  const date = readDay(req.query.date) ?? utcToday();
  res.json({ date, nameOfTheDay: pickDayName(date), ...todaysQuiz(date) });
});

export default router;
