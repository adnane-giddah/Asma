import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { gateStars, letterPool, letterStars, lettersOf, gateOpen, tilesFor, dealCards, cardStars } from '../src/kidsLogic.js';

describe('Build the Name', () => {
  test('stems drop harakat and the article, and skip two-word names', () => {
    assert.equal(lettersOf('الرَّحْمَٰنُ'), 'رحمن');
    assert.equal(lettersOf('الْمُؤْمِنُ'), 'مؤمن');
    assert.equal(lettersOf('الْحَقُّ'), 'حق');
    assert.equal(lettersOf('مَالِكُ الْمُلْكِ'), null);
    assert.equal(lettersOf('ذُو الْجَلَالِ وَالْإِكْرَامِ'), null);
  });

  test('tiles contain every letter of the stem plus the requested decoys', () => {
    for (let i = 0; i < 50; i++) {
      const tiles = tilesFor('مهيمن', 2);
      assert.equal(tiles.length, 7);
      const letters = tiles.map((t) => t.letter);
      for (const l of 'مهيمن') assert.ok(letters.includes(l));
      assert.equal(letters.filter((l) => l === 'م').length, 2, 'repeated letters get their own tiles');
      assert.equal(new Set(tiles.map((t) => t.id)).size, 7);
    }
  });

  test('the pool respects the level and never offers two-word names', () => {
    const names = [
      { arabic: 'الرَّحْمَٰنُ' }, { arabic: 'الْمُتَكَبِّرُ' }, { arabic: 'الْمَلِكُ' }, { arabic: 'مَالِكُ الْمُلْكِ' }, { arabic: 'الْحَقُّ' },
    ];
    const easy = letterPool(names, 'easy').map((n) => lettersOf(n.arabic));
    assert.deepEqual(easy, ['رحمن', 'ملك', 'حق']);
    assert.equal(letterPool(names, 'hard').length, 4);
  });

  test('stars reward few mistakes', () => {
    assert.equal(letterStars(0, 5), 3);
    assert.equal(letterStars(4, 5), 2);
    assert.equal(letterStars(9, 5), 1);
  });
});

describe('Memory Cards', () => {
  test('each Name appears once as a name card and once as a meaning card', () => {
    const deck = dealCards([3, 7, 9]);
    assert.equal(deck.length, 6);
    for (const id of [3, 7, 9]) {
      assert.deepEqual(deck.filter((c) => c.id === id).map((c) => c.face).sort(), ['meaning', 'name']);
    }
    assert.equal(new Set(deck.map((c) => c.key)).size, 6);
  });

  test('stars reward fewer moves', () => {
    assert.equal(cardStars(4, 4), 3);
    assert.equal(cardStars(6, 4), 3);
    assert.equal(cardStars(9, 4), 2);
    assert.equal(cardStars(20, 4), 1);
  });
});

describe('99 Names Adventure', () => {
  test('stars and gate unlocking', () => {
    assert.deepEqual([8, 7, 6, 5].map(gateStars), [3, 2, 1, 0]);
    assert.equal(gateOpen(1, {}), true);
    assert.equal(gateOpen(2, {}), false);
    assert.equal(gateOpen(2, { 1: 1 }), true);
    assert.equal(gateOpen(3, { 1: 3, 2: 0 }), false);
  });
});
