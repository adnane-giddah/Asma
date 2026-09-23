import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { NAMES, TOTAL } from '../src/data/names.js';
import { LESSONS } from '../src/data/lessons.js';
import { HARDNESS, MODE_WEIGHTS, todaysQuiz, cookQuiz, pickDayName, sameFamily } from '../src/engine/quiz.js';

describe('names data', () => {
  test('has 99 names numbered 1..99 in order', () => {
    assert.equal(TOTAL, 99);
    NAMES.forEach((name, index) => assert.equal(name.id, index + 1));
  });

  test('every field is present and every text is unique', () => {
    for (const field of ['arabic', 'translit', 'en', 'enDesc', 'ar']) {
      const values = NAMES.map((name) => name[field]);
      values.forEach((value) => assert.ok(typeof value === 'string' && value.trim().length > 0, `${field} missing`));
      assert.equal(new Set(values).size, TOTAL, `${field} values must be unique`);
    }
    NAMES.forEach((name) => assert.ok(name.groups.length > 0, `name ${name.id} needs a group`));
  });

  test('lessons cover all names exactly once', () => {
    assert.equal(LESSONS.length, 11);
    const covered = LESSONS.flatMap((lesson) => Array.from({ length: lesson.to - lesson.from + 1 }, (_, i) => lesson.from + i));
    assert.deepEqual(covered, NAMES.map((name) => name.id));
  });
});

function checkQuestion(q, inScope) {
  if (q.type === 'arrange') {
    q.answer.forEach((id, i) => i > 0 && assert.equal(id, q.answer[i - 1] + 1, 'arrange answer must be consecutive'));
    assert.deepEqual([...q.items].sort((a, b) => a - b), q.answer);
    assert.notDeepEqual(q.items, q.answer, 'arrange items must start shuffled');
    assert.ok(q.answer.some(inScope));
    return;
  }
  assert.equal(q.options.length, 4);
  assert.equal(new Set(q.options).size, 4, 'options must be unique');
  assert.ok(q.options.includes(q.answer), 'answer must be an option');
  assert.ok(inScope(q.answer), 'answer must be inside the scope');
  q.options.forEach((id) => assert.ok(id >= 1 && id <= TOTAL));

  if (q.type === 'gap') {
    assert.equal(q.before, q.answer - 1);
    assert.equal(q.after, q.answer + 1);
    assert.ok(!q.options.includes(q.before) && !q.options.includes(q.after));
  }
  if (q.type === 'next') assert.equal(q.answer, q.prompt + 1);
  if (q.type === 'prev') assert.equal(q.answer, q.prompt - 1);
  if (q.type === 'next' || q.type === 'prev') assert.ok(!q.options.includes(q.prompt));
  if (q.skill === 'meaning') {
    q.options.filter((id) => id !== q.answer).forEach((id) => assert.ok(!sameFamily(id, q.answer), `near-synonym ${id} offered for ${q.answer}`));
  }
}

describe('quiz generator', () => {
  test('respects count, scope and invariants for every mode and difficulty', () => {
    for (const mode of Object.keys(MODE_WEIGHTS)) {
      for (const difficulty of HARDNESS) {
        for (let seed = 1; seed <= 40; seed++) {
          const lesson = LESSONS[seed % LESSONS.length];
          const quiz = cookQuiz({ mode, difficulty, count: 12, from: lesson.from, to: lesson.to, seed });
          assert.equal(quiz.questions.length, 12);
          quiz.questions.forEach((q) => checkQuestion(q, (id) => id >= lesson.from && id <= lesson.to));
        }
      }
    }
  });

  test('explicit ids keep targets on those names, even at the edges', () => {
    const ids = [1, 2, 50, 99];
    for (let seed = 1; seed <= 60; seed++) {
      const quiz = cookQuiz({ mode: 'mixed', count: 10, ids, seed });
      quiz.questions.forEach((q) => checkQuestion(q, (id) => ids.includes(id)));
    }
  });

  test('a single edge name still produces valid questions', () => {
    for (const mode of Object.keys(MODE_WEIGHTS)) {
      const quiz = cookQuiz({ mode, count: 5, ids: [1], seed: 7 });
      quiz.questions.forEach((q) => checkQuestion(q, (id) => id === 1));
    }
  });

  test('does not repeat a target within a skill until the scope is exhausted', () => {
    const quiz = cookQuiz({ mode: 'gap', count: 30, seed: 3 });
    assert.equal(new Set(quiz.questions.map((q) => q.answer)).size, 30);
  });

  test('is deterministic for a given seed', () => {
    assert.deepEqual(cookQuiz({ mode: 'mixed', seed: 42 }), cookQuiz({ mode: 'mixed', seed: 42 }));
    assert.deepEqual(todaysQuiz('2026-09-23'), todaysQuiz('2026-09-23'));
    assert.notDeepEqual(todaysQuiz('2026-09-23').questions, todaysQuiz('2026-09-24').questions);
  });

  test('name of the day walks through the names in order', () => {
    const first = pickDayName('2026-01-01');
    assert.equal(pickDayName('2026-01-02'), (first % TOTAL) + 1);
  });
});
