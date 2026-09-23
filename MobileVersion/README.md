# Asma'ul Husna: mobile

The whole thing as an Android app that works completely offline. There's no server behind it: the names, the quizzes, the Quran text and everything else are packed inside the app.

Progress is saved on the phone. **Export** opens the share menu, so you can save the file to Drive or Files or send it to yourself. **Import** loads it back, even on another phone. The file format is the same as the website's, so backups work between the two.

## Try it in the browser

```bash
npm install
npm run dev
```

Then open http://localhost:5174 (the phone view in DevTools helps).

`npm test` runs the tests.

## Getting the APK

The easy way: push to GitHub and let the workflow build it. It puts the APK on the website (Download button for Android visitors), and you can also grab it from the workflow run.

To build it yourself you need Android Studio:

```bash
npm run android:sync
npm run android:open
```

Then in Android Studio: **Build → Build APK(s)**.

To install it, send the APK to your phone, open it, and allow "install unknown apps" when Android asks.

## Other scripts

- `npm run data`: rebuilds the bundled Quran text and the name → verse lists
- `npm run logo`: regenerates the logo SVGs
- `npm run icons`: regenerates the app icon and splash screens
