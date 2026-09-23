import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAMES } from '../src/data/names.js';
import { QURAN_CREDIT, SURAHS, versesFor } from './quranIndex.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = (file) => path.resolve(here, '../src/data', file);
const asModule = (value) => `export default JSON.parse(${JSON.stringify(JSON.stringify(value))});\n`;

fs.writeFileSync(out('quran.js'), asModule({ source: QURAN_CREDIT, surahs: SURAHS }));

const refs = {};
for (const { id } of NAMES) {
  const { beside, other } = versesFor(id);
  refs[id] = { beside, other };
}
fs.writeFileSync(out('nameRefs.js'), asModule(refs));

const size = (file) => `${(fs.statSync(out(file)).size / 1024).toFixed(0)} KB`;
console.log(`Wrote src/data/quran.js (${size('quran.js')}) and src/data/nameRefs.js (${size('nameRefs.js')})`);
