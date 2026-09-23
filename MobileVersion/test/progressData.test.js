import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { freshSave, packSave, scrubSave } from '../src/progressData.js';

const sample = () => ({
  version: 1,
  names: { 1: { o: [3, 0, 3], m: [2, 1, 1], t: 1758000000000 }, 24: { o: [1, 1, 0], t: 1758000000500 } },
  lessons: { 1: { best: 0.9, stars: 2, done: true } },
  daily: { last: '2026-09-20', streak: 3, best: 5, history: { '2026-09-20': 8 } },
  stats: { answered: 40, correct: 31, quizzes: 4, bestCombo: 9, challengeBest: 12 },
  kids: { memory: { easy: 6 }, rush: { medium: 14 }, build: { hard: 2 }, adventure: { 1: 3, 2: 1 } },
});

describe('progress backups', () => {
  test('export → JSON file → import gives back exactly the same progress', () => {
    const progress = sample();
    const file = JSON.stringify(packSave(progress, new Date('2026-09-23T10:00:00Z')));
    const parsed = JSON.parse(file);
    assert.equal(parsed.app, 'asma-ul-husna');
    assert.equal(parsed.kind, 'progress-backup');
    assert.equal(parsed.exportedAt, '2026-09-23T10:00:00.000Z');
    assert.deepEqual(scrubSave(parsed), progress);
  });

  test('also accepts the bare progress object stored in the browser', () => {
    assert.deepEqual(scrubSave(sample()), sample());
    assert.deepEqual(scrubSave(freshSave()), freshSave());
  });

  test('rejects anything that is not progress', () => {
    for (const bad of [null, undefined, 42, 'text', [], { hello: 'world' }, { version: 2, names: {} }, { version: 1 }, { version: 1, names: null }]) {
      assert.equal(scrubSave(bad), null, JSON.stringify(bad));
    }
  });

  test('drops malformed or out-of-range entries instead of failing', () => {
    const messy = {
      version: 1,
      names: { 1: { o: [3, 0, 3] }, 150: { o: [1, 1, 1] }, 0: { o: [1, 0, 1] }, 5: { o: 'bad' }, 6: { o: [1, -1, 0] }, 7: { m: [1, 0, 1], t: 'yesterday' } },
      lessons: { 1: { best: 7, stars: 9, done: true }, 40: { done: true }, 2: { best: 0.5, stars: 1, done: 'yes' } },
      daily: { last: 'soon', streak: -3, best: 2.5, history: { '2026-09-20': 8, oops: 5, '2026-09-21': 99 } },
      stats: { answered: 10, correct: 999, quizzes: 'many', bestCombo: 4, extra: 1 },
    };
    const clean = scrubSave(messy);
    assert.deepEqual(Object.keys(clean.names), ['1', '7']);
    assert.equal(clean.names[1].t, 0);
    assert.deepEqual(clean.names[7], { m: [1, 0, 1], t: 0 });
    assert.deepEqual(clean.lessons, { 1: { best: 1, stars: 3, done: true }, 2: { best: 0.5, stars: 1, done: false } });
    assert.deepEqual(clean.daily, { last: null, streak: 0, best: 0, history: { '2026-09-20': 8 } });
    assert.deepEqual(clean.stats, { answered: 10, correct: 10, quizzes: 0, bestCombo: 4, challengeBest: 0 });
    assert.equal(clean.stats.extra, undefined);
  });

  test('backups made before the kids games existed still import', () => {
    const { kids, ...old } = sample();
    const clean = scrubSave(old);
    assert.deepEqual(clean.kids, freshSave().kids);
    assert.deepEqual(clean.names, sample().names);
  });

  test('keeps only valid kids records', () => {
    const clean = scrubSave({ ...sample(), kids: { memory: { easy: 5, insane: 3, hard: -1 }, rush: { easy: 'x' }, build: { easy: 9, medium: 3 }, adventure: { 1: 2, 12: 3, 3: 4 } } });
    assert.deepEqual(clean.kids, { memory: { easy: 5 }, rush: {}, build: { medium: 3 }, adventure: { 1: 2 } });
  });

  test('does not share references with the imported data', () => {
    const raw = sample();
    const clean = scrubSave(raw);
    raw.names[1].o[0] = 99;
    assert.equal(clean.names[1].o[0], 3);
  });
});
