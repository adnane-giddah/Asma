# Asma'ul Husna

A little website for learning the 99 Names of Allah: in order, with their meanings, and where each one shows up in the Quran. There's also a Quran reader, a memorization mode for verses, and some practice exercises (a few of them made for kids).

No accounts. Your progress stays in your browser, and you can export it to a file if you want to move it somewhere else.

## Running it

```bash
npm install
npm run dev
```

The site is on http://localhost:5173 and the API on port 3001.

For a production build:

```bash
npm run build
npm start
```

Everything is then served from http://localhost:3001.

Tests: `npm test`

## What's inside

- all 99 Names, with meanings in English and Arabic, and the verses where each word appears
- 11 short lessons (9 names each) with flashcards and a quick test
- practice: fill the gap, meanings, order, a 3-lives challenge, a daily challenge, and a review of your mistakes
- kids' corner: gentle activities (memory cards, name rush, build the name, and a small journey through 11 gates)
- the full Quran (Uthmani text) with adjustable text size
- memorization: hide a verse step by step (100% → 75% → 50% → 25% → hidden) and try to recall it, verse by verse, building up, or from a random start
- a Hifz plan: new verses after Fajr, review in Dhuha and Qiyam, a weekly Jumu’ah review and a monthly one, with a tracking sheet
- similar verses side by side, with the differing words highlighted
- a short guide to the five-layer memorization method (chunks, patterns, position, rhythm, meaning)
- English / Arabic, light / dark, works on phones

## Folders

- `server/`: Express API, the names data, the quiz generator, and the Quran text
- `client/`: the React site
- `MobileVersion/`: the same thing as an offline Android app (it has its own README)

## Credits

Quran text from the Tanzil Project (https://tanzil.net), used as is.
The order of the Names follows the well-known narration of at-Tirmidhi.
