import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import { SACRED } from './i18n/strings.js';
import { api, numText, isRealWord, readStore, plainAr, writeStore } from './lib.js';
import { useNamesData, useSave, usePrefs } from './state.jsx';
import { Rule, Glyph, LvlTag, Spinner, OctaNum, OCTA_PATH, PageTop, PillPick, useFocusMode } from './ui.jsx';
import { LostPage } from './pages.jsx';

const arNum = (n) => numText(n, 'ar');

function useLoad(load, deps) {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    load()
      .then((data) => active && setState({ status: 'ready', data }))
      .catch(() => active && setState({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [...deps, attempt]);
  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

function Oops({ message, onRetry }) {
  const { t } = usePrefs();
  return (
    <div className="empty-state card">
      <p>{message}</p>
      <button className="btn btn-primary" onClick={onRetry}>
        <Glyph name="refresh" /> {t('common.retry')}
      </button>
    </div>
  );
}

function AyahStar({ n }) {
  return (
    <span className="ayah-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={OCTA_PATH} />
      </svg>
      <span>{arNum(n)}</span>
    </span>
  );
}

export function SurahList() {
  const { t, fmt, lang } = usePrefs();
  const surahs = useLoad(() => api.surahs(), []);
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    if (surahs.status !== 'ready') return [];
    const q = query.trim().toLowerCase();
    if (!q) return surahs.data.surahs;
    const qa = plainAr(q);
    return surahs.data.surahs.filter(
      (s) => String(s.n) === q || s.en.toLowerCase().includes(q) || s.tr.toLowerCase().includes(q) || plainAr(s.ar).includes(qa),
    );
  }, [surahs, query]);

  return (
    <div className="container">
      <PageTop title={t('quran.title')} subtitle={t('quran.subtitle')} />
      <label className="search search-wide">
        <Glyph name="search" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('quran.search')} aria-label={t('quran.search')} />
      </label>
      {surahs.status === 'loading' && <Spinner label={t('common.loading')} />}
      {surahs.status === 'error' && <Oops message={t('errors.title')} onRetry={surahs.retry} />}
      {surahs.status === 'ready' &&
        (list.length ? (
          <ol className="surah-list">
            {list.map((s) => (
              <li key={s.n}>
                <Link to={`/quran/${s.n}`} className="surah-row">
                  <OctaNum n={s.n} size="sm" />
                  <span className="surah-row-names">
                    <strong>{lang === 'ar' ? s.ar : s.en}</strong>
                    <span className="muted small">{lang === 'ar' ? s.en : s.tr}</span>
                  </span>
                  <span className="surah-row-ar" lang="ar" dir="rtl">{s.ar}</span>
                  <span className="surah-row-meta muted small">
                    {t(`quran.${s.type}`)} · {t('quran.verses', { n: fmt(s.count) })}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-state muted">{t('quran.noResults')}</p>
        ))}
    </div>
  );
}

const SIZE_KEY = 'asma:quran-scale';
const TEXT_SIZES = [0.85, 1, 1.15, 1.3, 1.5];

export function SurahView() {
  const { surah: param } = useParams();
  const n = Number(param);
  const valid = Number.isInteger(n) && n >= 1 && n <= 114;
  const { t, fmt, lang } = usePrefs();
  const { hash } = useLocation();
  const surah = useLoad(() => (valid ? api.surah(n) : Promise.reject(new Error('invalid'))), [n]);
  const [scaleIndex, setScaleIndex] = useState(() => readStore(SIZE_KEY, 1));

  const changeScale = (delta) => {
    const next = Math.min(TEXT_SIZES.length - 1, Math.max(0, scaleIndex + delta));
    setScaleIndex(next);
    writeStore(SIZE_KEY, next);
  };

  useEffect(() => {
    if (surah.status !== 'ready' || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' });
  }, [surah.status, hash]);

  if (!valid) return <LostPage />;
  const target = hash.startsWith('#a') ? Number(hash.slice(2)) : null;

  return (
    <div className="container reading">
      <div className="reader-top">
        <Link to="/quran" className="back-link">
          <Glyph name="chevron" size={16} className="flip-back" /> {t('quran.allSurahs')}
        </Link>
        <div className="text-size" role="group">
          <button className="icon-btn" onClick={() => changeScale(-1)} disabled={scaleIndex === 0} aria-label={t('quran.smaller')} title={t('quran.smaller')}>
            <Glyph name="minus" size={18} />
          </button>
          <span aria-hidden="true" lang="ar">أ</span>
          <button className="icon-btn" onClick={() => changeScale(1)} disabled={scaleIndex === TEXT_SIZES.length - 1} aria-label={t('quran.larger')} title={t('quran.larger')}>
            <Glyph name="plus" size={18} />
          </button>
        </div>
      </div>

      {surah.status === 'loading' && <Spinner label={t('common.loading')} />}
      {surah.status === 'error' && <Oops message={t('errors.title')} onRetry={surah.retry} />}
      {surah.status === 'ready' && (
        <>
          <header className="surah-head">
            <h1 className="surah-title" lang="ar" dir="rtl">
              سُورَةُ {surah.data.ar}
            </h1>
            <p className="surah-meta">
              {lang === 'en' && <span>{surah.data.en} · {surah.data.tr} · </span>}
              {t(`quran.${surah.data.type}`)} · {t('quran.verses', { n: fmt(surah.data.count) })}
            </p>
          </header>
          {surah.data.basmala && (
            <p className="basmala" lang="ar" dir="rtl">
              {SACRED.bismillah}
            </p>
          )}
          <div className="mushaf" lang="ar" dir="rtl" style={{ '--q-scale': TEXT_SIZES[scaleIndex] }}>
            {surah.data.ayahs.map((text, i) => (
              <span key={i} id={`a${i + 1}`} className={`ayah ${target === i + 1 ? 'is-target' : ''}`}>
                {text} <AyahStar n={i + 1} />{' '}
              </span>
            ))}
          </div>
          <Rule />
          <div className="reader-actions">
            <Link className="btn btn-primary" to={`/memorize?surah=${n}`}>
              <Glyph name="memorize" /> {t('quran.memorize')}
            </Link>
          </div>
          <nav className="surah-pager">
            {n > 1 ? (
              <Link className="btn btn-ghost" to={`/quran/${n - 1}`}>
                <Glyph name="chevron" className="flip-back" /> {t('quran.prev')}
              </Link>
            ) : <span />}
            {n < 114 ? (
              <Link className="btn btn-ghost" to={`/quran/${n + 1}`}>
                {t('quran.next')} <Glyph name="chevron" className="flip-rtl" />
              </Link>
            ) : <span />}
          </nav>
          <p className="source-note">{t('quran.source')}</p>
        </>
      )}
    </div>
  );
}

function AyahRow({ r }) {
  const { lang } = usePrefs();
  const words = r.text.split(' ');
  return (
    <li className="ref-item">
      <Link className="ref-cite" to={`/quran/${r.s}#a${r.a}`}>
        <span lang="ar">{r.surah.ar}</span>
        <span className="ref-num">{lang === 'ar' ? `${arNum(r.s)}:${arNum(r.a)}` : `${r.surah.en} ${r.s}:${r.a}`}</span>
      </Link>
      <p className="ref-text" lang="ar" dir="rtl">
        {words.map((word, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            {r.hits.includes(i) ? <mark>{word}</mark> : word}
          </Fragment>
        ))}
      </p>
    </li>
  );
}

const FIRST_FEW = 8;

function WhereInQuran({ id }) {
  const { t, fmt } = usePrefs();
  const refs = useLoad(() => api.nameQuran(id), [id]);
  const [allBeside, setAllBeside] = useState(false);
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    setAllBeside(false);
    setShowOther(false);
  }, [id]);

  if (refs.status === 'loading') return <Spinner label={t('namePage.loading')} />;
  if (refs.status === 'error') return <Oops message={t('namePage.error')} onRetry={refs.retry} />;
  const { beside, other, total } = refs.data;
  if (!total) return <p className="notice">{t('namePage.none')}</p>;

  const visibleBeside = allBeside ? beside : beside.slice(0, FIRST_FEW);
  return (
    <div className="refs">
      <p className="refs-summary">{t('namePage.found', { n: fmt(total) })}</p>
      {beside.length > 0 && (
        <section>
          <h3 className="refs-group">
            {t('namePage.beside')} <span className="count">{fmt(beside.length)}</span>
          </h3>
          <ul className="ref-list">{visibleBeside.map((r) => <AyahRow key={`${r.s}:${r.a}`} r={r} />)}</ul>
          {beside.length > FIRST_FEW && !allBeside && (
            <button className="btn btn-ghost" onClick={() => setAllBeside(true)}>
              {t('namePage.showAll', { n: fmt(beside.length) })}
            </button>
          )}
        </section>
      )}
      {other.length > 0 && (
        <section>
          <h3 className="refs-group">
            {t('namePage.other')} <span className="count">{fmt(other.length)}</span>
          </h3>
          {showOther && <ul className="ref-list">{other.map((r) => <AyahRow key={`${r.s}:${r.a}`} r={r} />)}</ul>}
          <button className="btn btn-ghost" onClick={() => setShowOther((v) => !v)} aria-expanded={showOther}>
            {showOther ? t('namePage.hideOther') : t('namePage.showOther', { n: fmt(other.length) })}
          </button>
        </section>
      )}
      <p className="source-note">{t('namePage.method')}</p>
    </div>
  );
}

export function NameView() {
  const { id: param } = useParams();
  const id = Number(param);
  const { byId } = useNamesData();
  const { t, lang } = usePrefs();
  const { level } = useSave();
  const name = byId.get(id);
  if (!name) return <LostPage />;

  return (
    <div className="container reading">
      <div className="reader-top">
        <Link to="/names" className="back-link">
          <Glyph name="chevron" size={16} className="flip-back" /> {t('namePage.back')}
        </Link>
        <div className="name-pager">
          {id > 1 && (
            <Link className="icon-btn" to={`/names/${id - 1}`} aria-label={t('common.previous')} title={byId.get(id - 1).translit}>
              <Glyph name="chevron" className="flip-back" />
            </Link>
          )}
          {id < 99 && (
            <Link className="icon-btn" to={`/names/${id + 1}`} aria-label={t('common.next')} title={byId.get(id + 1).translit}>
              <Glyph name="chevron" className="flip-rtl" />
            </Link>
          )}
        </div>
      </div>

      <header className="name-hero">
        <OctaNum n={name.id} size="lg" />
        <h1 className="name-hero-ar" lang="ar" dir="rtl">{name.arabic}</h1>
        <p className="name-hero-translit" dir="ltr">{name.translit}</p>
      </header>

      <section className="name-section">
        <h2 className="section-label">{t('detail.meaning')}</h2>
        {lang === 'en' ? (
          <>
            <p className="name-meaning"><strong>{name.en}</strong> — {name.enDesc}</p>
            <p className="name-meaning-ar" lang="ar" dir="rtl">{name.ar}</p>
          </>
        ) : (
          <>
            <p className="name-meaning-ar primary" lang="ar" dir="rtl">{name.ar}</p>
            <p className="name-meaning" dir="ltr" lang="en"><strong>{name.en}</strong> — {name.enDesc}</p>
          </>
        )}
        <div className="detail-levels start">
          <LvlTag level={level(name.id, 'order')} label={t('detail.order')} />
          <LvlTag level={level(name.id, 'meaning')} label={t('detail.meaningSkill')} />
        </div>
      </section>

      <section className="name-section">
        <h2 className="section-label">{t('namePage.mentioned')}</h2>
        <WhereInQuran id={name.id} />
      </section>
    </div>
  );
}

const HIFZ_KEY = 'asma:memorize:v1';
const SHOW_LEVELS = [1, 0.75, 0.5, 0.25, 0];

function mixWith(items, seedText) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 0x01000193);
  let state = h >>> 0;
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function wordsToHide(tokens, level, mode, seed) {
  const words = tokens.map((token, i) => (isRealWord(token) ? i : -1)).filter((i) => i >= 0);
  const count = Math.round(words.length * (1 - SHOW_LEVELS[level]));
  if (count <= 0) return new Set();
  const order = mode === 'ending' ? [...words].reverse() : mixWith(words, seed);
  return new Set(order.slice(0, count));
}

function HifzPrep({ surahs, initial, onStart }) {
  const { t, fmt } = usePrefs();
  const [config, setConfig] = useState(initial);
  const surah = surahs.find((s) => s.n === config.surah) ?? surahs[0];
  const clamp = (v) => Math.min(surah.count, Math.max(1, Number(v) || 1));
  const update = (patch) => setConfig((c) => ({ ...c, ...patch }));

  const setSurah = (n) => {
    const s = surahs.find((x) => x.n === n);
    update({ surah: n, from: 1, to: Math.min(s.count, 7) });
  };

  return (
    <div className="card setup">
      <div className="field">
        <label className="field-label" htmlFor="mz-surah">{t('memorize.surah')}</label>
        <select id="mz-surah" className="select" value={config.surah} onChange={(e) => setSurah(Number(e.target.value))}>
          {surahs.map((s) => (
            <option key={s.n} value={s.n}>
              {fmt(s.n)}. {s.ar} — {s.en} ({fmt(s.count)})
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="mz-from">{t('memorize.from')}</label>
          <input id="mz-from" className="input" type="number" inputMode="numeric" min={1} max={surah.count} value={config.from}
            onChange={(e) => update({ from: e.target.value })}
            onBlur={() => update({ from: clamp(config.from), to: Math.max(clamp(config.from), clamp(config.to)) })} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="mz-to">{t('memorize.to')}</label>
          <input id="mz-to" className="input" type="number" inputMode="numeric" min={1} max={surah.count} value={config.to}
            onChange={(e) => update({ to: e.target.value })}
            onBlur={() => update({ to: Math.max(clamp(config.from), clamp(config.to)) })} />
        </div>
      </div>
      <div className="field">
        <span className="field-label">{t('memorize.mode')}</span>
        <PillPick label={t('memorize.mode')} value={config.mode} onChange={(mode) => update({ mode })}
          options={[{ value: 'scattered', label: t('memorize.scattered') }, { value: 'ending', label: t('memorize.ending') }]} />
        <span className="hint start">{config.mode === 'ending' ? t('memorize.endingHint') : t('memorize.scatteredHint')}</span>
      </div>
      <div className="field">
        <span className="field-label">{t('memorize.start')}</span>
        <PillPick label={t('memorize.start')} value={config.level} onChange={(level) => update({ level })}
          options={t('memorize.levels').map((label, i) => ({ value: i, label }))} />
      </div>
      <div className="field">
        <span className="field-label">{t('memorize.reps')}</span>
        <PillPick label={t('memorize.reps')} value={config.reps} onChange={(reps) => update({ reps })}
          options={[1, 2, 3, 4, 5].map((r) => ({ value: r, label: fmt(r) }))} />
        <span className="hint start">{t('memorize.repsHint')}</span>
      </div>
      <button className="btn btn-primary btn-lg btn-block" onClick={() => {
        const from = clamp(config.from);
        onStart({ ...config, from, to: Math.max(from, clamp(config.to)) });
      }}>
        {t('memorize.begin')}
      </button>
    </div>
  );
}

function VisDots({ level }) {
  const { t } = usePrefs();
  const labels = t('memorize.levels');
  return (
    <div className="vis-meter" role="img" aria-label={`${t('memorize.visible')}: ${labels[level]}`}>
      {SHOW_LEVELS.map((_, i) => <span key={i} className={i <= level ? 'on' : ''} />)}
      <strong>{labels[level]}</strong>
    </div>
  );
}

function HifzRun({ surah, config, onExit, onChange }) {
  const { t, fmt, isRTL } = usePrefs();
  const verses = useMemo(
    () => surah.ayahs.slice(config.from - 1, config.to).map((text, i) => ({ a: config.from + i, tokens: text.split(' ') })),
    [surah, config.from, config.to],
  );
  const [index, setIndex] = useState(0);
  const [rep, setRep] = useState(0);
  const [level, setLevel] = useState(config.level);
  const [attempt, setAttempt] = useState(0);
  const [peeked, setPeeked] = useState(() => new Set());
  const [revealed, setRevealed] = useState(false);
  const [full, setFull] = useState(false);
  const done = index >= verses.length;
  useFocusMode(!done);

  const reset = (nextLevel) => {
    setLevel(nextLevel);
    setPeeked(new Set());
    setRevealed(false);
    setFull(false);
  };

  const goVerse = useCallback((next) => {
    setIndex(next);
    setRep(0);
    setAttempt(0);
    reset(config.level);
  }, [config.level]);

  const next = useCallback(() => {
    if (rep < config.reps - 1) {
      setRep(rep + 1);
      reset(Math.min(SHOW_LEVELS.length - 1, config.level + rep + 1));
    } else {
      goVerse(index + 1);
    }
  }, [rep, config.reps, config.level, index, goVerse]);

  const previous = useCallback(() => index > 0 && goVerse(index - 1), [index, goVerse]);
  const retry = useCallback(() => {
    setAttempt((a) => a + 1);
    setPeeked(new Set());
    setRevealed(false);
    setFull(false);
  }, []);
  const restart = () => goVerse(0);

  useEffect(() => {
    if (done) return;
    const onKey = (e) => {
      if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const forward = isRTL ? 'ArrowLeft' : 'ArrowRight';
      const backward = isRTL ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === forward) next();
      else if (e.key === backward) previous();
      else if (e.key === ' ' && !e.target.closest('button')) {
        e.preventDefault();
        setRevealed((r) => !r);
      } else if (e.key.toLowerCase() === 'r') retry();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [done, isRTL, next, previous, retry]);

  if (done) {
    return (
      <div className="card results-card">
        <h1>{t('memorize.done')}</h1>
        <p className="results-message">{t('memorize.doneBody', { from: fmt(config.from), to: fmt(config.to), surah: surah.ar })}</p>
        <div className="results-actions">
          <button className="btn btn-ghost" onClick={onChange}>{t('memorize.change')}</button>
          <button className="btn btn-primary" onClick={restart}><Glyph name="refresh" /> {t('memorize.again')}</button>
        </div>
      </div>
    );
  }

  const verse = verses[index];
  const hidden = full ? new Set() : wordsToHide(verse.tokens, level, config.mode, `${surah.n}:${verse.a}:${attempt}`);
  const previousVerse = verse.a > 1 ? surah.ayahs[verse.a - 2] : null;
  const isLastStep = index === verses.length - 1 && rep === config.reps - 1;

  return (
    <div className="memorize">
      <div className="quiz-top">
        <button className="icon-btn" onClick={onExit} aria-label={t('common.exit')}><Glyph name="x" /></button>
        <div className="quiz-bar" role="progressbar" aria-valuemin={0} aria-valuemax={verses.length} aria-valuenow={index + 1}>
          <span style={{ width: `${((index + (rep + 1) / config.reps) / verses.length) * 100}%` }} />
        </div>
        <span className="score-pill">{fmt(verse.a)}</span>
      </div>

      <div className="mz-meta">
        <span lang="ar" className="mz-surah">سُورَةُ {surah.ar}</span>
        <span className="muted small">
          {t('memorize.verseOf', { a: fmt(index + 1), b: fmt(verses.length) })} · {t('memorize.repOf', { a: fmt(rep + 1), b: fmt(config.reps) })}
        </span>
      </div>

      {previousVerse && (
        <p className="mz-context" lang="ar" dir="rtl">
          {previousVerse} <AyahStar n={verse.a - 1} />
        </p>
      )}

      <div className="mz-level">
        <button className="btn btn-ghost btn-sm" onClick={() => reset(Math.max(0, level - 1))} disabled={level === 0}>
          <Glyph name="eye" size={18} /> {t('memorize.easier')}
        </button>
        <VisDots level={full ? 0 : level} />
        <button className="btn btn-ghost btn-sm" onClick={() => reset(Math.min(SHOW_LEVELS.length - 1, level + 1))} disabled={level === SHOW_LEVELS.length - 1}>
          <Glyph name="memorize" size={18} /> {t('memorize.harder')}
        </button>
      </div>

      <div key={`${verse.a}-${rep}-${attempt}`} className="mz-verse card-enter" lang="ar" dir="rtl">
        {verse.tokens.map((token, i) => {
          if (!hidden.has(i)) return <Fragment key={i}>{token} </Fragment>;
          const shown = revealed || peeked.has(i);
          return (
            <Fragment key={i}>
              <button
                type="button"
                className={`mz-word ${shown ? (revealed && !peeked.has(i) ? 'is-revealed' : 'is-peeked') : 'is-hidden'}`}
                onClick={() => setPeeked((p) => new Set(p).add(i))}
                disabled={shown}
                aria-label={shown ? token : '…'}
              >
                {token}
              </button>{' '}
            </Fragment>
          );
        })}
        <AyahStar n={verse.a} />
      </div>
      {hidden.size > 0 && !revealed && <p className="hint">{t('memorize.tapWord')}</p>}

      <div className="mz-actions">
        <button className="btn btn-primary" onClick={() => setRevealed((r) => !r)} disabled={hidden.size === 0}>
          <Glyph name="eye" /> {revealed ? t('memorize.hideAgain') : t('memorize.reveal')}
        </button>
        <button className="btn btn-outline" onClick={retry}><Glyph name="refresh" /> {t('memorize.retry')}</button>
        <button className="btn btn-outline" onClick={() => setFull((f) => !f)} aria-pressed={full}><Glyph name="quran" /> {t('memorize.full')}</button>
      </div>

      <div className="mz-nav">
        <button className="btn btn-ghost" onClick={previous} disabled={index === 0}>
          <Glyph name="chevron" className="flip-back" /> {t('memorize.prev')}
        </button>
        <button className="btn btn-ghost" onClick={restart}><Glyph name="undo" /> {t('memorize.restart')}</button>
        <button className="btn btn-primary" onClick={next}>
          {isLastStep ? t('common.seeResults') : rep < config.reps - 1 ? t('memorize.nextRep') : t('memorize.next')} <Glyph name="chevron" className="flip-rtl" />
        </button>
      </div>
      <p className="hint hide-mobile">{t('memorize.keys')}</p>
    </div>
  );
}

export function HifzPage() {
  const { t } = usePrefs();
  const [params] = useSearchParams();
  const surahs = useLoad(() => api.surahs(), []);
  const [config, setConfig] = useState(null);
  const requested = Number(params.get('surah'));
  const saved = readStore(HIFZ_KEY, null);
  const surah = useLoad(() => (config ? api.surah(config.surah) : Promise.resolve(null)), [config?.surah]);

  const initial = useMemo(() => {
    if (surahs.status !== 'ready') return null;
    const list = surahs.data.surahs;
    const base = { surah: 1, from: 1, to: 7, mode: 'scattered', level: 0, reps: 3, ...(saved ?? {}) };
    if (requested >= 1 && requested <= 114 && requested !== base.surah) {
      return { ...base, surah: requested, from: 1, to: Math.min(list[requested - 1].count, 7) };
    }
    return base;
  }, [surahs.status, requested]);

  const start = (next) => {
    writeStore(HIFZ_KEY, next);
    setConfig(next);
  };

  if (config && surah.status === 'ready' && surah.data) {
    return (
      <div className="container reading">
        <HifzRun key={JSON.stringify(config)} surah={surah.data} config={config} onExit={() => setConfig(null)} onChange={() => setConfig(null)} />
      </div>
    );
  }

  return (
    <div className="container narrow">
      <PageTop title={t('memorize.title')} subtitle={t('memorize.subtitle')} />
      {(surahs.status === 'loading' || (config && surah.status === 'loading')) && <Spinner label={t('common.loading')} />}
      {(surahs.status === 'error' || (config && surah.status === 'error')) && (
        <Oops message={t('errors.title')} onRetry={config ? surah.retry : surahs.retry} />
      )}
      {surahs.status === 'ready' && !config && initial && <HifzPrep surahs={surahs.data.surahs} initial={initial} onStart={start} />}
    </div>
  );
}
