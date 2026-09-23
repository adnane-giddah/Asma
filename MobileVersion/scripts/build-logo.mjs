import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(here, '../public');

const INK = '#111416';
const GOLD = '#F9DB08';
const GOLD_DEEP = '#E2C500';

const f = (n) => Math.round(n * 100) / 100;
const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [f(r * Math.cos(a)), f(r * Math.sin(a))];
};
const pt = ([x, y]) => `${x} ${y}`;

const R_TIP = 86;
const R_IN = R_TIP * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8);
const frame = [];
for (let k = 0; k < 8; k++) {
  frame.push(polar(R_TIP, -90 + 45 * k), polar(R_IN, -90 + 45 * k + 22.5));
}
const framePath = `M${frame.map(pt).join('L')}Z`;

const H = R_TIP * Math.cos(Math.PI / 4);
const rotate = (deg, d) => `<path d="${d}" transform="rotate(${deg})"/>`;
const bladeUnit = `M${f(H - 12)} ${f(-H + 13)}L14 ${f(-H + 13)}A27 27 0 0 0 -9 ${f(-H + 26)}`;
const armUnit = `M${f(H)} ${f(-H + 27)}L16 ${f(-H + 27)}A13 13 0 0 0 3 ${f(-H + 40)}L3 -22`;
const units = (d) => Array.from({ length: 8 }, (_, k) => rotate(45 * k, d)).join('');
const arms = units(armUnit);
const blades = units(bladeUnit);

const crescent = 'M-24 -9A26 26 0 1 0 24 -9A21 21 0 0 1 -24 -9Z';
const drop = 'M0 -30C5 -20 17 -12 17 3A17 17 0 0 1 -17 3C-17 -12 -5 -20 0 -30Z';
const dropHalf = 'M0 -30C5 -20 17 -12 17 3A17 17 0 0 1 0 20Z';

function svg({ ink = INK, favicon = false } = {}) {
  const style = favicon
    ? `<style>.i{stroke:${INK}}.d{fill:${INK}}@media (prefers-color-scheme:dark){.i{stroke:#F4F2EC}.d{fill:#F4F2EC}}</style>`
    : '';
  const inkStroke = favicon ? 'class="i"' : `stroke="${ink}"`;
  const inkFill = favicon ? 'class="d"' : `fill="${ink}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200">${style}<g fill="none" stroke-linejoin="round"><path d="${framePath}" ${inkStroke} stroke-width="13"/><mask id="gap"><rect x="-100" y="-100" width="200" height="200" fill="#fff"/><g stroke="#000" stroke-width="21">${arms}</g><circle r="37" fill="#000"/></mask><g stroke="${GOLD}" stroke-width="10" mask="url(#gap)">${blades}</g><g ${inkStroke} stroke-width="12">${arms}</g></g><circle r="31" ${inkFill}/><mask id="drop"><rect x="-100" y="-100" width="200" height="200" fill="#fff"/><path d="${drop}" stroke="#000" stroke-width="8"/></mask><path d="${crescent}" fill="${GOLD}" mask="url(#drop)"/><path d="${drop}" fill="${GOLD}"/><path d="${dropHalf}" fill="${GOLD_DEEP}"/></svg>\n`;
}

fs.writeFileSync(path.join(pub, 'logo.svg'), svg());
fs.writeFileSync(path.join(pub, 'logo-on-dark.svg'), svg({ ink: '#F4F2EC' }));
fs.writeFileSync(path.join(pub, 'favicon.svg'), svg({ favicon: true }));
console.log('Wrote public/logo.svg, public/logo-on-dark.svg and public/favicon.svg');

