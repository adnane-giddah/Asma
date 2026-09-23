import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { api } from '../src/offlineApi.js';

describe('offline API (replaces the server on the phone)', () => {
  test('names and lessons', async () => {
    const { total, names } = await api.names();
    assert.equal(total, 99);
    assert.equal(names.length, 99);
    assert.equal(names[0].groups, undefined, 'internal fields are not exposed');
    const { lessons, size } = await api.lessons();
    assert.equal(size, 9);
    assert.equal(lessons.length, 11);
  });

  test('quizzes are generated on the device and validated like the server did', async () => {
    const quiz = await api.quiz({ mode: 'gap', count: 10, difficulty: 'normal', from: 10, to: 18, seed: undefined });
    assert.equal(quiz.questions.length, 10);
    quiz.questions.forEach((q) => {
      assert.equal(q.type, 'gap');
      assert.ok(q.answer >= 10 && q.answer <= 18);
      assert.ok(q.options.includes(q.answer));
    });
    await assert.rejects(api.quiz({ mode: 'nope' }));
    await assert.rejects(api.quiz({ count: 500 }));
  });

  test('daily challenge: same for everyone on a date, falls back to today', async () => {
    const a = await api.daily('2026-09-23');
    const b = await api.daily('2026-09-23');
    assert.equal(a.date, '2026-09-23');
    assert.deepEqual(a.questions, b.questions);
    assert.equal(a.questions.length, 10);
    assert.match((await api.daily('not-a-date')).date, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('the whole Quran is available offline', async () => {
    const { surahs } = await api.surahs();
    assert.equal(surahs.length, 114);
    assert.equal(surahs.reduce((sum, s) => sum + s.count, 0), 6236);
    const fatiha = await api.surah(1);
    assert.equal(fatiha.basmala, false);
    assert.equal(fatiha.ayahs.length, 7);
    assert.equal((await api.surah(9)).basmala, false);
    assert.equal((await api.surah(2)).basmala, true);
    await assert.rejects(api.surah(115));
  });

  test('"Mentioned in the Quran" works offline with verse text', async () => {
    const data = await api.nameQuran(85);
    assert.equal(data.total, 2);
    assert.deepEqual([...data.beside, ...data.other].map((r) => `${r.s}:${r.a}`), ['55:27', '55:78']);
    assert.ok(data.beside[0].text.length > 10);
    const words = data.beside[0].text.split(' ');
    data.beside[0].hits.forEach((i) => assert.ok(words[i]));
    assert.equal((await api.nameQuran(20)).total, 0, 'a Name whose exact word is not in the Quran');
    await assert.rejects(api.nameQuran(0));
  });
});
