import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildSteps, wordDiff, takeVerses, newPlan, planDay, cleanPlan, cursorOf, setLabel } from '../src/hifzLogic.js';

describe('memorization order', () => {
  test('build-up grows chunk by chunk and links sections', () => {
    assert.deepEqual(buildSteps(3, 'build'), [[0], [1], [0, 1], [2], [0, 1, 2]]);
    const steps = buildSteps(6, 'build');
    assert.deepEqual(steps.slice(7), [[4], [5], [4, 5], [0, 1, 2, 3, 4, 5]]);
  });

  test('shuffle visits every verse once and is repeatable per seed', () => {
    const a = buildSteps(10, 'shuffle', 42);
    assert.deepEqual(a.flat().sort((x, y) => x - y), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(a, buildSteps(10, 'shuffle', 42));
    assert.deepEqual(buildSteps(3), [[0], [1], [2]]);
  });
});

describe('similar verses', () => {
  test('only the differing words are marked, ignoring harakat', () => {
    const a = 'وَكُلَا مِنْهَا رَغَدًا حَيْثُ شِئْتُمَا'.split(' ');
    const b = 'فَكُلَا مِنْ حَيْثُ شِئْتُمَا'.split(' ');
    const [onlyA, onlyB] = wordDiff(a, b);
    assert.deepEqual([...onlyA].sort(), [0, 1, 2]);
    assert.deepEqual([...onlyB].sort(), [0, 1]);
    const [same] = wordDiff(['ٱلْحَمْدُ', 'ۚ'], ['الحمد']);
    assert.equal(same.size, 0);
  });
});

describe('daily plan', () => {
  const counts = [7, 5, 3];

  test('verse ranges continue into the next surah', () => {
    const { segments, next } = takeVerses(counts, { s: 1, a: 6 }, 4);
    assert.deepEqual(segments, [{ s: 1, from: 6, to: 7 }, { s: 2, from: 1, to: 2 }]);
    assert.deepEqual(next, { s: 2, a: 3 });
    assert.equal(takeVerses(counts, { s: 3, a: 2 }, 5).next, null);
  });

  test('the rolling cycle: dhuha is the last set, qiyam the last three', () => {
    const plan = newPlan({ surah: 1, ayah: 1, perDay: 2, window: 3 }, '2026-10-03');
    const memorize = (day) => {
      const { proposal } = planDay(plan, day, counts);
      plan.sets.push({ d: day, seg: proposal.segments });
    };
    let day = planDay(plan, '2026-10-03', counts);
    assert.equal(day.proposal.label, 'A');
    assert.equal(day.dhuha, null);
    memorize('2026-10-03');
    memorize('2026-10-04');
    memorize('2026-10-05');
    memorize('2026-10-06');
    day = planDay(plan, '2026-10-06', counts);
    assert.equal(day.todaySet.label, 'D');
    assert.equal(day.dhuha.label, 'C');
    assert.deepEqual(day.qiyam.map((s) => s.label), ['B', 'C', 'D']);

    day = planDay(plan, '2026-10-07', counts);
    assert.equal(day.qiyamPending, true);
    assert.deepEqual(day.qiyam.map((s) => s.label), ['C', 'D']);
    assert.deepEqual(day.proposal.segments, [{ s: 2, from: 2, to: 3 }]);
  });

  test('Friday is the weekly review day and a missed day does not double up', () => {
    const plan = newPlan({ surah: 1, ayah: 1, perDay: 3, window: 3 }, '2026-10-01');
    plan.sets.push({ d: '2026-10-01', seg: [{ s: 1, from: 1, to: 3 }] });
    const day = planDay(plan, '2026-10-09', counts);
    assert.equal(day.isJumuah, true);
    assert.deepEqual(day.proposal.segments, [{ s: 1, from: 4, to: 6 }]);
    assert.equal(day.week.length, 0);
    assert.equal(planDay(plan, '2026-10-02', counts).week.length, 1);
  });

  test('saved plans are checked before use', () => {
    assert.equal(cleanPlan(null, counts), null);
    assert.equal(cleanPlan({ version: 1, start: { s: 9, a: 1 }, sets: [] }, counts), null);
    const clean = cleanPlan({ version: 1, start: { s: 1, a: 1 }, perDay: 99, sets: [{ d: '2026-10-01', seg: [{ s: 1, from: 1, to: 50 }] }], log: { x: {} } }, counts);
    assert.equal(clean.perDay, 3);
    assert.equal(clean.sets.length, 0);
    assert.deepEqual(clean.log, {});
    assert.deepEqual(cursorOf({ ...clean, sets: [{ d: '2026-10-01', seg: [{ s: 3, from: 1, to: 3 }] }] }, counts), null);
    assert.equal(setLabel(27), 'B2');
  });
});
