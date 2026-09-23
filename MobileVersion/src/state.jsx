import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STRINGS } from './i18n/strings.js';
import { shiftDay, api, numText, readStore, writeStore, lvlOf } from './lib.js';
import { freshSave, scrubSave } from './progressData.js';

const SETTINGS_KEY = 'asma:settings:v1';
const PrefsCtx = createContext(null);

function startPrefs() {
  const saved = readStore(SETTINGS_KEY, {});
  const root = document.documentElement;
  return {
    lang: saved.lang ?? root.getAttribute('lang') ?? 'en',
    theme: saved.theme ?? null,
    translit: saved.translit ?? null,
    sound: saved.sound ?? false,
  };
}

function dig(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

export function PrefsProvider({ children }) {
  const [settings, setSettings] = useState(startPrefs);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const theme = settings.theme ?? (systemDark ? 'dark' : 'light');
  const { lang } = settings;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#07130f' : '#0e5a43');
    document.title = lang === 'ar' ? 'أسماء الله الحسنى' : 'Asma’ul Husna · The 99 Names of Allah';
    writeStore(SETTINGS_KEY, settings);
  }, [lang, theme, settings]);

  const value = useMemo(() => {
    const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
    const t = (key, vars) => {
      let text = dig(STRINGS[lang], key) ?? dig(STRINGS.en, key) ?? key;
      if (vars && typeof text === 'string') text = text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
      return text;
    };
    return {
      lang,
      theme,
      isRTL: lang === 'ar',
      showTranslit: settings.translit ?? lang === 'en',
      sound: settings.sound,
      t,
      fmt: (n) => numText(n, lang),
      toggleLang: () => update({ lang: lang === 'ar' ? 'en' : 'ar' }),
      toggleTheme: () => update({ theme: theme === 'dark' ? 'light' : 'dark' }),
      setTranslit: (translit) => update({ translit }),
      setSound: (sound) => update({ sound }),
    };
  }, [lang, theme, settings]);

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export const usePrefs = () => useContext(PrefsCtx);

const NamesCtx = createContext(null);

export function NamesProvider({ children }) {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    Promise.all([api.names(), api.lessons()])
      .then(([namesRes, lessonsRes]) => {
        if (!active) return;
        const names = namesRes.names;
        setState({
          status: 'ready',
          names,
          byId: new Map(names.map((n) => [n.id, n])),
          lessons: lessonsRes.lessons,
          lessonSize: lessonsRes.size,
        });
      })
      .catch(() => active && setState({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [attempt]);

  const value = useMemo(() => ({ ...state, reload: () => setAttempt((a) => a + 1) }), [state]);
  return <NamesCtx.Provider value={value}>{children}</NamesCtx.Provider>;
}

export const useNamesData = () => useContext(NamesCtx);

const PROGRESS_KEY = 'asma:progress:v1';
const SaveCtx = createContext(null);

function readSave() {
  return scrubSave(readStore(PROGRESS_KEY, null)) ?? freshSave();
}

function tally(entry = {}, key, ok) {
  const [c = 0, w = 0, s = 0] = entry[key] ?? [];
  return { ...entry, [key]: ok ? [c + 1, w, s + 1] : [c, w + 1, 0], t: Date.now() };
}

export function SaveProvider({ children }) {
  const [progress, setProgress] = useState(readSave);

  useEffect(() => {
    writeStore(PROGRESS_KEY, progress);
  }, [progress]);

  useEffect(() => {
    const onStorage = (e) => e.key === PROGRESS_KEY && setProgress(readSave());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const recordAnswer = useCallback((question, given, correct) => {
    setProgress((p) => {
      const names = { ...p.names };
      if (question.type === 'arrange') {
        question.answer.forEach((id, i) => (names[id] = tally(names[id], 'o', given[i] === id)));
      } else {
        const key = question.skill === 'meaning' ? 'm' : 'o';
        question.focus.forEach((id) => (names[id] = tally(names[id], key, correct)));
      }
      return { ...p, names, stats: { ...p.stats, answered: p.stats.answered + 1, correct: p.stats.correct + (correct ? 1 : 0) } };
    });
  }, []);

  const recordRecall = useCallback((id, remembered) => {
    setProgress((p) => ({ ...p, names: { ...p.names, [id]: tally(p.names[id], 'o', remembered) } }));
  }, []);

  const completeQuiz = useCallback(({ bestCombo = 0, challengeScore } = {}) => {
    setProgress((p) => ({
      ...p,
      stats: {
        ...p.stats,
        quizzes: p.stats.quizzes + 1,
        bestCombo: Math.max(p.stats.bestCombo, bestCombo),
        challengeBest: challengeScore == null ? p.stats.challengeBest : Math.max(p.stats.challengeBest, challengeScore),
      },
    }));
  }, []);

  const completeLesson = useCallback((lessonId, ratio, stars, done) => {
    setProgress((p) => {
      const prev = p.lessons[lessonId] ?? { best: 0, stars: 0, done: false };
      return {
        ...p,
        lessons: { ...p.lessons, [lessonId]: { best: Math.max(prev.best, ratio), stars: Math.max(prev.stars, stars), done: prev.done || done } },
      };
    });
  }, []);

  const completeDaily = useCallback((date, score) => {
    setProgress((p) => {
      const d = p.daily;
      if (d.history[date] != null) return p;
      const streak = d.last === shiftDay(date, -1) ? d.streak + 1 : 1;
      return { ...p, daily: { last: date, streak, best: Math.max(d.best, streak), history: { ...d.history, [date]: score } } };
    });
  }, []);

  const resetProgress = useCallback(() => setProgress(freshSave()), []);

  const saveKidsRecord = useCallback((game, key, value, better = 'max') => {
    setProgress((p) => {
      const kids = p.kids ?? { memory: {}, rush: {}, build: {}, adventure: {} };
      const previous = kids[game]?.[key];
      const improved = previous == null || (better === 'max' ? value > previous : value < previous);
      if (!improved) return p;
      return { ...p, kids: { ...kids, [game]: { ...kids[game], [key]: value } } };
    });
  }, []);

  const importProgress = useCallback((clean) => setProgress(clean), []);

  const value = useMemo(() => {
    const level = (id, skill) => lvlOf(progress.names[id]?.[skill === 'meaning' ? 'm' : 'o']);
    const ids = Object.keys(progress.names).map(Number);
    const weakIds = ids
      .filter((id) => level(id, 'order') === 1 || level(id, 'meaning') === 1)
      .sort((a, b) => (progress.names[b].t ?? 0) - (progress.names[a].t ?? 0));
    const count = (skill) => ids.filter((id) => level(id, skill) === 3).length;
    return {
      progress,
      level,
      weakIds,
      orderMastered: count('order'),
      meaningMastered: count('meaning'),
      lessonsDone: Object.values(progress.lessons).filter((l) => l.done).length,
      dailyStreak: (today) => (progress.daily.last === today || progress.daily.last === shiftDay(today, -1) ? progress.daily.streak : 0),
      recordAnswer,
      recordRecall,
      completeQuiz,
      completeLesson,
      completeDaily,
      resetProgress,
      importProgress,
      saveKidsRecord,
    };
  }, [progress, recordAnswer, recordRecall, completeQuiz, completeLesson, completeDaily, resetProgress, importProgress, saveKidsRecord]);

  return <SaveCtx.Provider value={value}>{children}</SaveCtx.Provider>;
}

export const useSave = () => useContext(SaveCtx);
