import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { buildApp } from '../src/app.js';
import { SURAHS, surahAt, versesFor, normalize } from '../src/lib/quran.js';

const ref = (s, a) => (r) => r.s === s && r.a === a;
const all = (id) => {
  const r = versesFor(id);
  return [...r.beside, ...r.other];
};

describe('Quran data', () => {
  test('has 114 surahs and 6236 verses', () => {
    assert.equal(SURAHS.length, 114);
    assert.equal(SURAHS.reduce((sum, s) => sum + s.ayahs.length, 0), 6236);
  });

  test('the Basmala is verse 1 of Al-Fatiha only, and never glued to other surahs', () => {
    assert.equal(normalize(surahAt(1).ayahs[0]), normalize('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'));
    for (const surah of SURAHS.slice(1)) {
      assert.ok(!normalize(surah.ayahs[0]).startsWith('بسم الله الرحمان الرحيم'), `surah ${surah.n}`);
    }
    assert.equal(surahAt(2).ayahs[0], 'الٓمٓ');
  });
});

describe('Names in the Quran', () => {
  test('finds well-known verses', () => {
    assert.ok(all(84).some(ref(3, 26)), 'Maalik-ul-Mulk in Aal-Imran 26');
    assert.deepEqual(all(85).map((r) => `${r.s}:${r.a}`), ['55:27', '55:78']);
    assert.ok(all(78).some(ref(13, 9)), 'Al-Muta‘aali in Ar-Ra‘d 9');
    assert.ok(all(68).some(ref(112, 2)), 'As-Samad in Al-Ikhlas 2');
    assert.ok(versesFor(63).beside.some(ref(2, 255)), 'Al-Qayyoom in Ayat al-Kursi');
    assert.ok(versesFor(4).beside.some(ref(59, 23)) && versesFor(4).beside.some(ref(62, 1)), 'Al-Quddoos');
  });

  test('does not confuse Al-‘Aliyy with the preposition عَلَى', () => {
    const verses = all(36);
    assert.ok(verses.length < 20, `found ${verses.length}`);
    assert.ok(verses.some(ref(2, 255)));
  });

  test('names absent from the Quran in this form return nothing', () => {
    for (const id of [20, 22, 25, 57, 91, 92, 99]) assert.equal(versesFor(id).total, 0, `name ${id}`);
  });

  test('every reference really contains the matched word', () => {
    for (const id of [1, 8, 19, 33, 93]) {
      for (const r of all(id).slice(0, 25)) {
        const words = surahAt(r.s).ayahs[r.a - 1].split(' ');
        r.hits.forEach((i) => assert.ok(words[i], `${id} → ${r.s}:${r.a}`));
      }
    }
  });
});

describe('Quran API', () => {
  let server;
  let base;
  before(async () => {
    server = buildApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
  });
  after(() => server.close());

  test('lists surahs and serves one', async () => {
    const list = await (await fetch(`${base}/quran/surahs`)).json();
    assert.equal(list.surahs.length, 114);
    assert.equal(list.surahs[1].count, 286);
    const fatiha = await (await fetch(`${base}/quran/surahs/1`)).json();
    assert.equal(fatiha.basmala, false);
    assert.equal(fatiha.ayahs.length, 7);
    assert.equal((await (await fetch(`${base}/quran/surahs/9`)).json()).basmala, false);
    assert.equal((await (await fetch(`${base}/quran/surahs/2`)).json()).basmala, true);
    assert.equal((await fetch(`${base}/quran/surahs/115`)).status, 404);
  });

  test('returns references with verse text', async () => {
    const data = await (await fetch(`${base}/names/85/quran`)).json();
    assert.equal(data.total, 2);
    assert.equal(data.beside[0].surah.n, 55);
    assert.ok(data.beside[0].text.length > 10);
    assert.equal((await fetch(`${base}/names/0/quran`)).status, 404);
  });
});
