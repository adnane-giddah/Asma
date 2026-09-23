import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../src/data/quran.json');

const strip = (text) => text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\uFEFF]/g, '').replace(/[ٱأإآ]/g, 'ا');
const BASMALA = strip('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');

async function load() {
  const file = process.argv[2];
  if (file) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.json();
}

const raw = await load();
const surahs = raw.data.surahs.map((surah) => {
  const ayahs = surah.ayahs.map((a) => a.text.replace(/\uFEFF/g, '').trim());
  if (surah.number !== 1 && surah.number !== 9) {
    const words = ayahs[0].split(' ');
    if (strip(words.slice(0, 4).join(' ')) === BASMALA) ayahs[0] = words.slice(4).join(' ');
    else throw new Error(`Surah ${surah.number}: expected a leading Basmala`);
  }
  return {
    n: surah.number,
    ar: surah.name.replace(/^س\u064Fور\u064Eة\u064F\s*/, ''),
    en: surah.englishName,
    tr: surah.englishNameTranslation,
    type: surah.revelationType === 'Meccan' ? 'meccan' : 'medinan',
    ayahs,
  };
});

const total = surahs.reduce((sum, s) => sum + s.ayahs.length, 0);
if (surahs.length !== 114 || total !== 6236) throw new Error(`Unexpected size: ${surahs.length} surahs, ${total} ayahs`);

const data = {
  source: 'Tanzil Quran Text (Uthmani) — https://tanzil.net — used unchanged under its terms of use',
  surahs,
};
fs.writeFileSync(target, JSON.stringify(data));
console.log(`Wrote ${path.relative(process.cwd(), target)} — ${surahs.length} surahs, ${total} ayahs`);
