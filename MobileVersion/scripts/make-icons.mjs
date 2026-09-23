import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const assets = path.join(root, 'assets');
fs.mkdirSync(assets, { recursive: true });

const PARCHMENT = '#f6efdf';
const NIGHT = '#07130f';
const logo = (file, size) => sharp(fs.readFileSync(path.join(root, 'public', file)), { density: 600 }).resize(size, size).png().toBuffer();

async function canvas(file, size, background, logoFile, logoSize) {
  const base = background
    ? sharp({ create: { width: size, height: size, channels: 4, background } })
    : sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  await base.composite([{ input: await logo(logoFile, logoSize), gravity: 'center' }]).png().toFile(path.join(assets, file));
}

await canvas('icon-only.png', 1024, PARCHMENT, 'logo.svg', 760);
await canvas('icon-foreground.png', 1024, null, 'logo.svg', 600);
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: PARCHMENT } }).png().toFile(path.join(assets, 'icon-background.png'));

await canvas('splash.png', 2732, PARCHMENT, 'logo.svg', 700);
await canvas('splash-dark.png', 2732, NIGHT, 'logo-on-dark.svg', 700);

console.log('Wrote assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png');
