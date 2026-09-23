import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { SACRED } from './i18n/strings.js';
import { api, plainAr, plainLat, PASS_MARK, starCount, dayKey } from './lib.js';
import { useNamesData, useSave, usePrefs } from './state.jsx';
import { packSave, scrubSave } from './progressData.js';
import { shareSave } from './platform.js';
import { ScoreBoard, QuizFlow, QuizPrep, missedIds, useQuizFetch } from './quiz.jsx';
import { AreYouSure, Rule, Glyph, Spinner, MeaningLine, NamePeek, ArName, OctaNum, PageTop, Donut, Rose, PillPick, Star8, StarRow, Toggle, useFocusMode } from './ui.jsx';

const lessonIds = (lesson) => Array.from({ length: lesson.to - lesson.from + 1 }, (_, i) => lesson.from + i);

function useToday() {
  const [daily, setDaily] = useState(null);
  const date = dayKey();
  useEffect(() => {
    let active = true;
    api.daily(date).then((d) => active && setDaily(d)).catch(() => {});
    return () => {
      active = false;
    };
  }, [date]);
  return { daily, date };
}

function ModeTile({ to, icon, title, body, badge, disabled, accent }) {
  const content = (
    <>
      <span className={`mode-icon ${accent ? 'accent' : ''}`}><Glyph name={icon} size={24} /></span>
      <span className="mode-text">
        <strong>{title}</strong>
        <span>{body}</span>
      </span>
      {badge && <span className="mode-badge">{badge}</span>}
    </>
  );
  return disabled ? <div className="mode-card disabled">{content}</div> : <Link className="mode-card" to={to}>{content}</Link>;
}

function GameTiles() {
  const { t, fmt } = usePrefs();
  const { weakIds, progress } = useSave();
  return (
    <div className="mode-grid">
      <ModeTile to="/practice/gap" icon="puzzle" title={t('modes.gap')} body={t('modes.gapBody')} accent />
      <ModeTile to="/practice/meaning" icon="meaning" title={t('modes.meaning')} body={t('modes.meaningBody')} />
      <ModeTile to="/practice/order" icon="order" title={t('modes.order')} body={t('modes.orderBody')} />
      <ModeTile to="/practice/challenge" icon="target" title={t('modes.challenge')} body={t('modes.challengeBody')} badge={progress.stats.challengeBest ? t('modes.best', { n: fmt(progress.stats.challengeBest) }) : null} />
      <ModeTile to="/daily" icon="calendar" title={t('modes.daily')} body={t('modes.dailyBody')} />
      <ModeTile to="/practice/review" icon="refresh" title={t('modes.review')} body={weakIds.length ? t('modes.reviewBody') : t('modes.reviewEmpty')} badge={weakIds.length ? t('modes.reviewCount', { n: fmt(weakIds.length) }) : null} disabled={!weakIds.length} />
    </div>
  );
}

export function FrontPage() {
  const { t, fmt, lang } = usePrefs();
  const { byId, lessons } = useNamesData();
  const { orderMastered, meaningMastered, lessonsDone, progress, dailyStreak } = useSave();
  const { daily, date } = useToday();
  const [detail, setDetail] = useState(null);
  const nextLesson = lessons.find((l) => !progress.lessons[l.id]?.done) ?? lessons[0];
  const started = Object.keys(progress.names).length > 0;
  const nameOfDay = daily && byId.get(daily.nameOfTheDay);
  const doneToday = progress.daily.history[date];

  return (
    <div className="container home">
      <section className="hero">
        <Rose className="hero-rosette" />
        <p className="bismillah" lang="ar" dir="rtl">{SACRED.bismillah}</p>
        <h1 className="hero-title" lang="ar">{SACRED.title}</h1>
        {lang === 'en' && <p className="hero-kicker">Asma’ul Husna · The 99 Beautiful Names</p>}
        <p className="hero-subtitle">{t('home.subtitle')}</p>
        <div className="hero-actions">
          <Link className="btn btn-primary btn-lg" to={`/learn/${nextLesson.id}`}>
            <Glyph name="book" /> {started ? t('home.continueLearning', { n: fmt(nextLesson.id) }) : t('home.startLearning')}
          </Link>
          <Link className="btn btn-outline btn-lg" to="/practice/gap">
            <Glyph name="puzzle" /> {t('home.takeQuiz')}
          </Link>
        </div>
      </section>

      <section className="ayah card">
        <p className="ayah-text" lang="ar" dir="rtl">﴿ {SACRED.ayah} ﴾</p>
        {t('home.ayahTranslation') && <p className="ayah-translation">{t('home.ayahTranslation')}</p>}
        <p className="ref">{t('home.ayahRef')}</p>
      </section>

      <div className="home-grid">
        <section className="card journey">
          <h2>{t('home.journey')}</h2>
          <div className="journey-rings">
            <div>
              <Donut value={orderMastered / 99}><strong>{fmt(orderMastered)}</strong><small>/{fmt(99)}</small></Donut>
              <span>{t('home.orderLabel')}</span>
            </div>
            <div>
              <Donut value={meaningMastered / 99}><strong>{fmt(meaningMastered)}</strong><small>/{fmt(99)}</small></Donut>
              <span>{t('home.meaningLabel')}</span>
            </div>
          </div>
          <p className="muted small center">{t('home.lessonsDone')}: <strong>{fmt(lessonsDone)} / {fmt(lessons.length)}</strong></p>
          <Link to="/progress" className="link-more">{t('nav.progress')} <Glyph name="chevron" size={16} className="flip-rtl" /></Link>
        </section>

        <section className="card daily-card">
          <div className="daily-top">
            <Glyph name="calendar" />
            <h2>{t('home.dailyTitle')}</h2>
            <span className="streak-pill"><Star8 size={14} /> {fmt(dailyStreak(date))}</span>
          </div>
          <p className="muted">{t('home.dailyBody')}</p>
          {doneToday != null ? <p className="done-today"><Glyph name="check" size={18} /> {t('home.dailyDone', { score: fmt(doneToday) })}</p> : null}
          <Link to="/daily" className="btn btn-primary btn-block">{t('home.dailyStart')}</Link>
        </section>

        <section className="card nod">
          <h2>{t('home.nameOfDay')}</h2>
          {nameOfDay ? (
            <button className="nod-body" onClick={() => setDetail(nameOfDay.id)}>
              <OctaNum n={nameOfDay.id} />
              <ArName name={nameOfDay} size="lg" />
              <MeaningLine name={nameOfDay} withDesc />
              <span className="link-more">{t('home.learnMore')} <Glyph name="chevron" size={16} className="flip-rtl" /></span>
            </button>
          ) : (
            <Spinner label={t('common.loading')} />
          )}
        </section>
      </div>

      <section className="section">
        <h2 className="section-title">{t('home.ways')}</h2>
        <Rule />
        <div className="mode-grid">
          <ModeTile to="/learn" icon="book" title={t('modes.lessons')} body={t('modes.lessonsBody')} accent />
          <ModeTile to="/learn/recite" icon="mic" title={t('modes.recite')} body={t('modes.reciteBody')} />
          <ModeTile to="/names" icon="grid" title={t('modes.browse')} body={t('modes.browseBody')} />
          <ModeTile to="/quran" icon="quran" title={t('modes.quran')} body={t('modes.quranBody')} />
          <ModeTile to="/memorize" icon="memorize" title={t('modes.memorize')} body={t('modes.memorizeBody')} />
          <ModeTile to="/kids" icon="kids" title={t('modes.kids')} body={t('modes.kidsBody')} />
        </div>
        <GameTiles />
      </section>

      <section className="hadith card">
        <p className="hadith-text" lang="ar" dir="rtl">{SACRED.hadith}</p>
        {t('home.hadithTranslation') && <p className="ayah-translation">{t('home.hadithTranslation')}</p>}
        <p className="ref">{t('home.hadithRef')}</p>
        <Rule />
        <p className="ihsa">{t('home.ihsa')}</p>
      </section>

      <section className="section how">
        <h2 className="section-title">{t('home.howTitle')}</h2>
        <Rule />
        <div className="how-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="how-step card">
              <OctaNum n={n} />
              <h3>{t(`home.how${n}`)}</h3>
              <p className="muted">{t(`home.how${n}Body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <NamePeek id={detail} onClose={() => setDetail(null)} onNavigate={setDetail} />
    </div>
  );
}

export function LessonList() {
  const { t, fmt } = usePrefs();
  const { lessons, byId } = useNamesData();
  const { progress, level } = useSave();
  const nextId = lessons.find((l) => !progress.lessons[l.id]?.done)?.id;
  return (
    <div className="container">
      <PageTop title={t('learn.title')} subtitle={t('learn.subtitle')} />
      {!nextId && <p className="notice">{t('learn.allDone')}</p>}
      <div className="lesson-grid">
        {lessons.map((lesson) => {
          const info = progress.lessons[lesson.id];
          const ids = lessonIds(lesson);
          const mastered = ids.filter((id) => level(id, 'order') === 3).length;
          return (
            <Link key={lesson.id} to={`/learn/${lesson.id}`} className={`lesson-card ${info?.done ? 'done' : ''} ${nextId === lesson.id ? 'next' : ''}`}>
              <div className="lesson-card-top">
                <OctaNum n={lesson.id} />
                <div>
                  <strong>{t('common.lesson', { n: fmt(lesson.id) })}</strong>
                  <span className="muted small">{t('common.namesRange', { from: fmt(lesson.from), to: fmt(lesson.to) })}</span>
                </div>
                {info?.done ? <span className="tag tag-done"><Glyph name="check" size={14} /> {t('learn.completed')}</span> : nextId === lesson.id ? <span className="tag tag-next">{t('learn.upNext')}</span> : null}
              </div>
              <p className="lesson-names" lang="ar" dir="rtl">
                {ids.map((id) => byId.get(id).arabic).join(' · ')}
              </p>
              <div className="lesson-card-bottom">
                <StarRow count={info?.stars ?? 0} size={16} />
                <span className="mini-bar" title={t('learn.mastery')}><span style={{ width: `${(mastered / ids.length) * 100}%` }} /></span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mode-grid section">
        <ModeTile to="/names" icon="grid" title={t('modes.browse')} body={t('modes.browseBody')} accent />
      </div>
    </div>
  );
}

function CardDeck({ lesson, onDone }) {
  const { t, fmt, isRTL } = usePrefs();
  const { byId } = useNamesData();
  const ids = lessonIds(lesson);
  const [index, setIndex] = useState(0);
  const [hide, setHide] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const touch = useRef(null);
  const name = byId.get(ids[index]);

  const go = useCallback(
    (delta) => {
      setRevealed(false);
      setIndex((i) => {
        const nextIndex = i + delta;
        if (nextIndex >= ids.length) {
          onDone();
          return i;
        }
        return Math.max(0, nextIndex);
      });
    },
    [ids.length, onDone],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight') go(isRTL ? -1 : 1);
      if (e.key === 'ArrowLeft') go(isRTL ? 1 : -1);
      if (e.key === ' ' && hide) {
        e.preventDefault();
        setRevealed((r) => !r);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, isRTL, hide]);

  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) < 50) return;
    const forward = isRTL ? dx > 0 : dx < 0;
    go(forward ? 1 : -1);
  };

  const neighbors = [name.id - 1, name.id, name.id + 1].filter((id) => id >= 1 && id <= 99);

  return (
    <div className="flash">
      <div className="chain" role="tablist">
        {ids.map((id, i) => (
          <button key={id} role="tab" aria-selected={i === index} className={`chain-dot ${i === index ? 'active' : ''} ${i < index ? 'seen' : ''}`} onClick={() => { setIndex(i); setRevealed(false); }}>
            {fmt(id)}
          </button>
        ))}
      </div>

      <div key={name.id} className="flashcard arch card-enter" onTouchStart={(e) => (touch.current = e.touches[0].clientX)} onTouchEnd={onTouchEnd}>
        <OctaNum n={name.id} size="lg" />
        <span className="flash-ar" lang="ar" dir="rtl">{name.arabic}</span>
        <span className="flash-translit" dir="ltr">{name.translit}</span>
        <Rule />
        {hide && !revealed ? (
          <button className="reveal-btn" onClick={() => setRevealed(true)}><Glyph name="eye" /> {t('learn.tapReveal')}</button>
        ) : (
          <div className="flash-meaning"><MeaningLine name={name} withDesc /></div>
        )}
        <div className="flash-neighbors" dir="rtl" lang="ar">
          {neighbors.map((id) => (
            <span key={id} className={id === name.id ? 'current' : ''}>{byId.get(id).arabic}</span>
          ))}
        </div>
      </div>

      <div className="flash-controls">
        <button className="btn btn-ghost" onClick={() => go(-1)} disabled={index === 0}>
          <Glyph name="chevron" className="flip-back" /> {t('common.previous')}
        </button>
        <span className="muted small">{t('common.of', { a: fmt(index + 1), b: fmt(ids.length) })}</span>
        <button className="btn btn-primary" onClick={() => go(1)}>
          {index === ids.length - 1 ? t('learn.summary') : t('common.next')} <Glyph name="chevron" className="flip-rtl" />
        </button>
      </div>
      <div className="flash-options">
        <Toggle checked={hide} onChange={(v) => { setHide(v); setRevealed(false); }} label={t('learn.hide')} icon="eye" />
        <span className="muted small hide-mobile">{t('learn.cardHint')}</span>
      </div>
    </div>
  );
}

export function LessonView() {
  const { lessonId } = useParams();
  const { t, fmt } = usePrefs();
  const { lessons, byId } = useNamesData();
  const { completeLesson, completeQuiz } = useSave();
  const navigate = useNavigate();
  const lesson = lessons[Number(lessonId) - 1];
  const [step, setStep] = useState('cards');
  const quiz = useQuizFetch();
  const [summary, setSummary] = useState(null);
  useFocusMode(step === 'quiz');

  if (!lesson) return <LostPage />;
  const ids = lessonIds(lesson);
  const nextLesson = lessons[lesson.id];

  const startTest = () => {
    setStep('quiz');
    quiz.load({ mode: 'mixed', count: 10, from: lesson.from, to: lesson.to }, api.quiz);
  };

  const finish = (result) => {
    const ratio = result.correct / result.total;
    completeLesson(lesson.id, ratio, starCount(ratio), ratio >= PASS_MARK);
    completeQuiz({ bestCombo: result.bestCombo });
    setSummary(result);
    setStep('results');
  };

  return (
    <div className="container narrow">
      {step !== 'quiz' && (
        <div className="lesson-head">
          <Link to="/learn" className="back-link"><Glyph name="chevron" size={16} className="flip-back" /> {t('learn.backToLessons')}</Link>
          <h1>{t('common.lesson', { n: fmt(lesson.id) })} <span className="muted">· {t('common.namesRange', { from: fmt(lesson.from), to: fmt(lesson.to) })}</span></h1>
        </div>
      )}

      {step === 'cards' && <CardDeck lesson={lesson} onDone={() => setStep('summary')} />}

      {step === 'summary' && (
        <div className="card summary">
          <h2>{t('learn.summary')}</h2>
          <p className="muted">{t('learn.summaryBody')}</p>
          <Rule />
          <ol className="summary-list">
            {ids.map((id) => (
              <li key={id}>
                <OctaNum n={id} size="sm" />
                <ArName name={byId.get(id)} size="md" />
                <MeaningLine name={byId.get(id)} />
              </li>
            ))}
          </ol>
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={() => setStep('cards')}><Glyph name="refresh" /> {t('learn.reviewCards')}</button>
            <button className="btn btn-primary" onClick={startTest}><Glyph name="target" /> {t('learn.startTest')}</button>
          </div>
        </div>
      )}

      {step === 'quiz' && quiz.state.status === 'loading' && <Spinner label={t('common.loading')} />}
      {step === 'quiz' && quiz.state.status === 'error' && (
        <div className="empty-state card"><p>{t('errors.quiz')}</p><button className="btn btn-primary" onClick={startTest}>{t('common.retry')}</button></div>
      )}
      {step === 'quiz' && quiz.state.status === 'running' && (
        <QuizFlow key={quiz.state.runId} questions={quiz.state.questions} onFinish={finish} onExit={() => setStep('summary')} />
      )}

      {step === 'results' && summary && (
        <ScoreBoard
          summary={summary}
          title={summary.correct / summary.total >= PASS_MARK ? t('learn.passed') : t('learn.notPassed')}
          actions={
            <>
              <button className="btn btn-ghost" onClick={startTest}><Glyph name="refresh" /> {t('learn.retryTest')}</button>
              <button className="btn btn-outline" onClick={() => setStep('cards')}><Glyph name="book" /> {t('learn.reviewCards')}</button>
              {nextLesson ? (
                <button className="btn btn-primary" onClick={() => { setStep('cards'); navigate(`/learn/${nextLesson.id}`); }}>{t('learn.nextLesson')} <Glyph name="arrow" className="flip-rtl" /></button>
              ) : (
                <Link className="btn btn-primary" to="/practice/challenge">{t('modes.challenge')}</Link>
              )}
            </>
          }
        >
          {summary.correct / summary.total < PASS_MARK && <p className="notice">{t('learn.needScore', { n: fmt(PASS_MARK * 100) })}</p>}
        </ScoreBoard>
      )}
    </div>
  );
}

export function ReciteView() {
  const { t, fmt } = usePrefs();
  const { lessons, byId } = useNamesData();
  const { recordRecall } = useSave();
  const [params] = useSearchParams();
  const initialLesson = Number(params.get('lesson')) || 1;
  const [choice, setChoice] = useState(initialLesson >= 1 && initialLesson <= lessons.length ? initialLesson : 1);
  const [session, setSession] = useState(null);

  const start = () => {
    const ids = choice === 'all' ? Array.from({ length: 99 }, (_, i) => i + 1) : lessonIds(lessons[choice - 1]);
    setSession({ ids, index: 0, revealed: false, hint: false, results: [] });
  };

  const mark = (remembered) => {
    const id = session.ids[session.index];
    recordRecall(id, remembered);
    setSession((s) => ({ ...s, index: s.index + 1, revealed: false, hint: false, results: [...s.results, { id, remembered }] }));
  };

  useEffect(() => {
    if (!session || session.index >= session.ids.length) return;
    const onKey = (e) => {
      if (e.target.closest('button, input')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!session.revealed) setSession((s) => ({ ...s, revealed: true }));
      } else if (session.revealed && e.key === '1') mark(true);
      else if (session.revealed && e.key === '2') mark(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  useFocusMode(Boolean(session) && session.index < session.ids.length);

  if (!session) {
    return (
      <div className="container narrow">
        <PageTop title={t('recite.title')} subtitle={t('recite.intro')} />
        <div className="card setup">
          <span className="field-label">{t('recite.choose')}</span>
          <div className="lesson-picker">
            {lessons.map((l) => (
              <button key={l.id} className={`lesson-pick ${choice === l.id ? 'active' : ''}`} onClick={() => setChoice(l.id)} aria-pressed={choice === l.id}>
                <span>{fmt(l.id)}</span>
                <small>{fmt(l.from)}–{fmt(l.to)}</small>
              </button>
            ))}
            <button className={`lesson-pick wide ${choice === 'all' ? 'active' : ''}`} onClick={() => setChoice('all')} aria-pressed={choice === 'all'}>
              <span>{t('common.allNames')}</span>
            </button>
          </div>
          <button className="btn btn-primary btn-lg btn-block" onClick={start}>{t('common.bismillah')}</button>
        </div>
      </div>
    );
  }

  if (session.index >= session.ids.length) {
    const forgotten = session.results.filter((r) => !r.remembered).map((r) => r.id);
    const remembered = session.results.length - forgotten.length;
    return (
      <div className="container narrow">
        <div className="card results-card">
          <h1>{t('recite.resultTitle', { a: fmt(remembered), b: fmt(session.results.length) })}</h1>
          <Donut value={remembered / session.results.length} size={130} stroke={10}><Star8 size={34} /></Donut>
          {forgotten.length ? (
            <>
              <h3>{t('recite.toReview')}</h3>
              <div className="chip-list">
                {forgotten.map((id) => (
                  <span key={id} className="chip"><OctaNum n={id} size="xs" /><span lang="ar">{byId.get(id).arabic}</span></span>
                ))}
              </div>
            </>
          ) : (
            <p className="results-message">{t('recite.allGood')}</p>
          )}
          <div className="results-actions">
            <button className="btn btn-ghost" onClick={() => setSession(null)}>{t('common.back')}</button>
            <button className="btn btn-outline" onClick={start}><Glyph name="refresh" /> {t('recite.again')}</button>
            {forgotten.length > 0 && <Link className="btn btn-primary" to="/practice/review">{t('recite.practice')}</Link>}
          </div>
        </div>
      </div>
    );
  }

  const id = session.ids[session.index];
  const name = byId.get(id);
  const recalled = session.results.slice(-4);
  return (
    <div className="container narrow">
      <div className="quiz-top">
        <button className="icon-btn" onClick={() => setSession(null)} aria-label={t('common.exit')}><Glyph name="x" /></button>
        <div className="quiz-bar"><span style={{ width: `${(session.index / session.ids.length) * 100}%` }} /></div>
        <span className="score-pill">{fmt(session.index + 1)} / {fmt(session.ids.length)}</span>
      </div>
      <div className="recite-trail" dir="rtl" lang="ar">
        {session.index === 0 && id > 1 && <span className="muted">{t('recite.startsAfter')}: {byId.get(id - 1).arabic}</span>}
        {recalled.map((r) => (
          <span key={r.id} className={`chip ${r.remembered ? '' : 'chip-bad'}`}>{byId.get(r.id).arabic}</span>
        ))}
      </div>
      <div key={id} className="flashcard arch card-enter recite-card">
        <OctaNum n={id} size="lg" />
        {session.revealed ? (
          <>
            <span className="flash-ar" lang="ar" dir="rtl">{name.arabic}</span>
            <span className="flash-translit" dir="ltr">{name.translit}</span>
            <Rule />
            <div className="flash-meaning"><MeaningLine name={name} withDesc /></div>
          </>
        ) : (
          <>
            <span className="recite-q">{t('recite.whatIs', { n: fmt(id) })}</span>
            <span className="flash-ar placeholder">؟</span>
            {session.hint ? (
              <div className="flash-meaning"><MeaningLine name={name} /></div>
            ) : (
              <button className="btn btn-ghost" onClick={() => setSession((s) => ({ ...s, hint: true }))}><Glyph name="lightbulb" /> {t('recite.hint')}</button>
            )}
          </>
        )}
      </div>
      <div className="recite-actions">
        {session.revealed ? (
          <>
            <button className="btn btn-danger-soft btn-lg" onClick={() => mark(false)}><Glyph name="x" /> {t('recite.forgot')}</button>
            <button className="btn btn-primary btn-lg" onClick={() => mark(true)} autoFocus><Glyph name="check" /> {t('recite.remembered')}</button>
          </>
        ) : (
          <button className="btn btn-primary btn-lg btn-block" onClick={() => setSession((s) => ({ ...s, revealed: true }))} autoFocus><Glyph name="eye" /> {t('recite.reveal')}</button>
        )}
      </div>
    </div>
  );
}

export function NameGrid() {
  const { t } = usePrefs();
  const { names } = useNamesData();
  const { level } = useSave();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('cards');
  const [detail, setDetail] = useState(null);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return names;
    const qa = plainAr(q);
    const ql = plainLat(q);
    const qe = q.toLowerCase();
    return names.filter(
      (n) =>
        String(n.id) === q ||
        plainAr(n.arabic).includes(qa) ||
        plainAr(n.ar).includes(qa) ||
        (ql && plainLat(n.translit).includes(ql)) ||
        n.en.toLowerCase().includes(qe) ||
        n.enDesc.toLowerCase().includes(qe),
    );
  }, [names, query]);

  return (
    <div className="container">
      <PageTop title={t('names.title')} subtitle={t('names.subtitle')} />
      <div className="names-toolbar">
        <label className="search">
          <Glyph name="search" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('names.search')} aria-label={t('names.search')} />
          {query && <button className="icon-btn sm" onClick={() => setQuery('')} aria-label={t('names.clear')}><Glyph name="x" size={16} /></button>}
        </label>
        <PillPick label={t('names.title')} value={view} onChange={setView} options={[{ value: 'cards', label: t('names.cards') }, { value: 'read', label: t('names.read') }]} />
      </div>

      {view === 'read' ? (
        <div className="card read-view" lang="ar" dir="rtl">
          <p className="read-intro">{SACRED.intro}</p>
          <p className="read-names">
            {results.map((n) => (
              <button key={n.id} className="read-name" onClick={() => setDetail(n.id)}>
                {n.arabic}
                <sup>{n.id}</sup>
              </button>
            ))}
          </p>
        </div>
      ) : results.length ? (
        <div className="names-grid">
          {results.map((n) => {
            const lvl = Math.min(level(n.id, 'order'), level(n.id, 'meaning'));
            return (
              <button key={n.id} className="name-card" onClick={() => setDetail(n.id)}>
                <span className={`lvl-dot lvl-${lvl}`} title={t('progress.levels')[lvl]} />
                <OctaNum n={n.id} size="sm" />
                <ArName name={n} size="lg" />
                <MeaningLine name={n} />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="empty-state muted">{t('names.noResults')}</p>
      )}
      <NamePeek id={detail} onClose={() => setDetail(null)} onNavigate={setDetail} />
    </div>
  );
}

export function PlayHub() {
  const { t } = usePrefs();
  return (
    <div className="container">
      <PageTop title={t('practice.title')} subtitle={t('practice.subtitle')} />
      <GameTiles />
    </div>
  );
}

const QUIZ_KINDS = {
  gap: { api: 'gap', icon: 'puzzle', counts: [10, 20, 30] },
  meaning: { api: 'meaning', icon: 'meaning', counts: [10, 20, 30] },
  order: { api: 'order', icon: 'order', counts: [10, 20] },
  challenge: { api: 'mixed', icon: 'target', counts: null, difficulty: false, endless: true, lives: 3 },
  review: { api: 'mixed', icon: 'refresh', counts: [10, 20], scope: false },
};

export function QuizView() {
  const { mode } = useParams();
  const config = QUIZ_KINDS[mode];
  const { t } = usePrefs();
  const { weakIds, completeQuiz, progress } = useSave();
  const quiz = useQuizFetch();
  const [summary, setSummary] = useState(null);
  const [newBest, setNewBest] = useState(false);
  const loadingMore = useRef(false);
  const navigate = useNavigate();
  useFocusMode(quiz.state.status === 'running' || quiz.state.status === 'loading');

  if (!config) return <LostPage />;
  const title = t(`modes.${mode}`);

  const start = (options) => {
    setSummary(null);
    const request = { mode: config.api, difficulty: 'normal', ...options };
    if (config.endless) Object.assign(request, { count: 20, difficulty: 'normal' });
    if (mode === 'review' && !request.ids) request.ids = weakIds.slice(0, 30);
    quiz.load(request, api.quiz);
  };

  const needMore = async () => {
    if (loadingMore.current || quiz.state.status !== 'running') return;
    loadingMore.current = true;
    try {
      const more = await api.quiz({ ...quiz.state.request, difficulty: 'hard', count: 20 });
      quiz.setState((s) => ({ ...s, questions: [...s.questions, ...more.questions.map((q) => ({ ...q, id: `${s.questions.length}-${q.id}` }))] }));
    } finally {
      loadingMore.current = false;
    }
  };

  const finish = (result) => {
    setNewBest(Boolean(config.endless) && result.correct > progress.stats.challengeBest);
    completeQuiz({ bestCombo: result.bestCombo, challengeScore: config.endless ? result.correct : undefined });
    setSummary(result);
    quiz.setState((s) => ({ ...s, status: 'done' }));
  };

  if (mode === 'review' && !weakIds.length && quiz.state.status === 'idle') {
    return (
      <div className="container narrow">
        <PageTop title={title} />
        <div className="empty-state card"><p>{t('modes.reviewEmpty')}</p><Link className="btn btn-primary" to="/practice">{t('nav.practice')}</Link></div>
      </div>
    );
  }

  return (
    <div className="container narrow">
      {quiz.state.status === 'idle' && (
        <>
          <PageTop title={title} subtitle={t(`modes.${mode}Body`)} />
          <QuizPrep config={config} onStart={start}>
            {config.endless && <p className="notice">{t('setup.challengeInfo')}</p>}
            {mode === 'review' && <p className="notice">{t('setup.reviewInfo')}</p>}
          </QuizPrep>
        </>
      )}
      {quiz.state.status === 'loading' && <Spinner label={t('common.loading')} />}
      {quiz.state.status === 'error' && (
        <div className="empty-state card">
          <p>{t('errors.quiz')}</p>
          <button className="btn btn-primary" onClick={() => quiz.load(quiz.state.request, api.quiz)}>{t('common.retry')}</button>
        </div>
      )}
      {quiz.state.status === 'running' && (
        <QuizFlow
          key={quiz.state.runId}
          questions={quiz.state.questions}
          title={title}
          lives={config.lives}
          endless={config.endless}
          onNeedMore={config.endless ? needMore : undefined}
          onFinish={finish}
          onExit={() => quiz.setState({ status: 'idle' })}
        />
      )}
      {quiz.state.status === 'done' && summary && (
        <ScoreBoard
          summary={summary}
          challenge={config.endless}
          newBest={newBest}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => navigate('/practice')}>{t('nav.practice')}</button>
              {summary.log.some((e) => !e.correct) && (
                <button className="btn btn-outline" onClick={() => quiz.load({ mode: 'mixed', count: Math.min(20, Math.max(5, missedIds(summary).length * 2)), ids: missedIds(summary), difficulty: 'normal' }, api.quiz)}>
                  <Glyph name="refresh" /> {t('common.reviewMistakes')}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => quiz.load(quiz.state.request, (r) => api.quiz({ ...r, seed: undefined }))}>
                <Glyph name="refresh" /> {t('common.practiceAgain')}
              </button>
            </>
          }
        />
      )}
    </div>
  );
}

export function DailyView() {
  const { t, fmt } = usePrefs();
  const { progress, completeDaily, completeQuiz, dailyStreak } = useSave();
  const { daily, date } = useToday();
  const [phase, setPhase] = useState('intro');
  const [summary, setSummary] = useState(null);
  const [run, setRun] = useState(0);
  useFocusMode(phase === 'quiz');
  const doneToday = progress.daily.history[date];

  const finish = (result) => {
    completeDaily(date, result.correct);
    completeQuiz({ bestCombo: result.bestCombo });
    setSummary(result);
    setPhase('results');
  };

  if (!daily) return <Spinner label={t('common.loading')} />;

  return (
    <div className="container narrow">
      {phase === 'intro' && (
        <>
          <PageTop title={t('daily.title')} subtitle={t('daily.subtitle')} />
          <div className="card daily-intro">
            <div className="daily-stats">
              <div><span className="big-number">{fmt(dailyStreak(date))}</span><span className="muted">{t('daily.streak')}</span></div>
              <div><span className="big-number">{fmt(progress.daily.best)}</span><span className="muted">{t('daily.best')}</span></div>
            </div>
            {doneToday != null && (
              <>
                <p className="done-today"><Glyph name="check" /> {t('daily.doneToday', { score: fmt(doneToday) })}</p>
                <p className="muted center">{t('daily.comeBack')}</p>
              </>
            )}
            <button className={`btn btn-lg btn-block ${doneToday != null ? 'btn-outline' : 'btn-primary'}`} onClick={() => { setRun((r) => r + 1); setPhase('quiz'); }}>
              {doneToday != null ? t('daily.practice') : t('common.bismillah')}
            </button>
          </div>
        </>
      )}
      {phase === 'quiz' && <QuizFlow key={run} questions={daily.questions} onFinish={finish} onExit={() => setPhase('intro')} />}
      {phase === 'results' && summary && (
        <ScoreBoard
          summary={summary}
          title={t('daily.title')}
          actions={
            <>
              <Link className="btn btn-ghost" to="/">{t('common.home')}</Link>
              <Link className="btn btn-primary" to="/practice">{t('nav.practice')}</Link>
            </>
          }
        >
          <p className="muted">{t('daily.comeBack')}</p>
        </ScoreBoard>
      )}
    </div>
  );
}

function SaveBox() {
  const { t, fmt, lang } = usePrefs();
  const { progress, importProgress } = useSave();
  const fileInput = useRef(null);
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState(null);

  const exportFile = async () => {
    try {
      const how = await shareSave(`asma-ul-husna-progress-${dayKey()}.json`, JSON.stringify(packSave(progress), null, 2));
      setMessage({ kind: 'ok', text: t(how === 'shared' ? 'progress.shared' : 'progress.exported') });
    } catch {
      setMessage({ kind: 'error', text: t('progress.exportError') });
    }
  };

  const readFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(null);
    try {
      if (file.size > 1_000_000) throw new Error('too large');
      const raw = JSON.parse(await file.text());
      const clean = scrubSave(raw);
      if (!clean) throw new Error('invalid');
      setPending({ clean, exportedAt: raw?.exportedAt });
    } catch {
      setMessage({ kind: 'error', text: t('progress.importError') });
    }
  };

  const summary = pending && {
    date: pending.exportedAt && !Number.isNaN(Date.parse(pending.exportedAt))
      ? new Date(pending.exportedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
      : '—',
    names: fmt(Object.keys(pending.clean.names).length),
    lessons: fmt(Object.values(pending.clean.lessons).filter((l) => l.done).length),
    answered: fmt(pending.clean.stats.answered),
  };

  return (
    <section className="card backup-card section">
      <h2>{t('progress.backupTitle')}</h2>
      <p className="muted">{t('progress.backupBody')}</p>
      <div className="row-actions start">
        <button className="btn btn-primary" onClick={exportFile}><Glyph name="download" /> {t('progress.export')}</button>
        <button className="btn btn-outline" onClick={() => fileInput.current?.click()}><Glyph name="upload" /> {t('progress.import')}</button>
        <input ref={fileInput} type="file" accept=".json,application/json,text/plain,application/octet-stream" hidden onChange={readFile} />
      </div>
      {message && <p className={`backup-message ${message.kind}`} role="status">{message.text}</p>}
      <AreYouSure
        open={Boolean(pending)}
        title={t('progress.importTitle')}
        body={summary ? t('progress.importBody', summary) : ''}
        confirmLabel={t('progress.importConfirm')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          importProgress(pending.clean);
          setPending(null);
          setMessage({ kind: 'ok', text: t('progress.importDone') });
        }}
      />
    </section>
  );
}

export function ProgressView() {
  const { t, fmt, lang } = usePrefs();
  const { names } = useNamesData();
  const { progress, level, orderMastered, meaningMastered, lessonsDone, dailyStreak, resetProgress } = useSave();
  const [view, setView] = useState('both');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const { stats } = progress;
  const accuracy = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
  const levelOf = (id) => (view === 'order' ? level(id, 'order') : view === 'meaning' ? level(id, 'meaning') : Math.min(level(id, 'order'), level(id, 'meaning')));
  const allMastered = orderMastered === 99 && meaningMastered === 99;

  const statItems = [
    [t('progress.answered'), fmt(stats.answered)],
    [t('progress.accuracy'), lang === 'ar' ? `${fmt(accuracy)}٪` : `${accuracy}%`],
    [t('progress.quizzes'), fmt(stats.quizzes)],
    [t('progress.lessons'), `${fmt(lessonsDone)} / ${fmt(11)}`],
    [t('progress.dailyStreak'), fmt(dailyStreak(dayKey()))],
    [t('progress.bestStreak'), fmt(stats.bestCombo)],
    [t('progress.challengeBest'), fmt(stats.challengeBest)],
  ];

  return (
    <div className="container">
      <PageTop title={t('progress.title')} subtitle={t('progress.subtitle')} />
      {allMastered && (
        <div className="card mastered-banner">
          <Star8 size={32} />
          <p>{t('progress.allMastered')}</p>
          <p lang="ar" dir="rtl" className="footer-dua">{SACRED.dua}</p>
        </div>
      )}
      <div className="progress-top">
        <div className="card ring-card">
          <Donut value={orderMastered / 99} size={120} stroke={10}><strong>{fmt(orderMastered)}</strong><small>/{fmt(99)}</small></Donut>
          <span>{t('progress.order')}</span>
        </div>
        <div className="card ring-card">
          <Donut value={meaningMastered / 99} size={120} stroke={10}><strong>{fmt(meaningMastered)}</strong><small>/{fmt(99)}</small></Donut>
          <span>{t('progress.meaning')}</span>
        </div>
        <div className="card stats-card">
          {statItems.map(([label, value]) => (
            <div key={label} className="stat"><span className="muted">{label}</span><strong>{value}</strong></div>
          ))}
        </div>
      </div>

      <section className="card heat-card">
        <div className="heat-head">
          <p className="muted small">{t('progress.masteryRule')}</p>
          <PillPick label={t('progress.view')} value={view} onChange={setView} options={[{ value: 'both', label: t('progress.viewBoth') }, { value: 'order', label: t('progress.viewOrder') }, { value: 'meaning', label: t('progress.viewMeaning') }]} />
        </div>
        <div className="heatmap">
          {names.map((n) => (
            <button key={n.id} className={`heat-cell lvl-${levelOf(n.id)}`} onClick={() => setDetail(n.id)} title={`${n.id}. ${n.translit}`} aria-label={`${n.id}. ${n.translit}: ${t('progress.levels')[levelOf(n.id)]}`}>
              <span className="heat-num">{fmt(n.id)}</span>
              <span className="heat-ar" lang="ar">{n.arabic}</span>
            </button>
          ))}
        </div>
        <div className="legend">
          {t('progress.levels').map((label, i) => (
            <span key={label}><i className={`lvl-${i}`} /> {label}</span>
          ))}
        </div>
      </section>

      <SaveBox />

      <div className="center section">
        <button className="btn btn-danger-soft" onClick={() => setConfirm(true)}><Glyph name="refresh" /> {t('progress.reset')}</button>
      </div>
      <AreYouSure
        open={confirm}
        danger
        title={t('progress.resetTitle')}
        body={t('progress.resetBody')}
        confirmLabel={t('progress.resetConfirm')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirm(false)}
        onConfirm={() => { resetProgress(); setConfirm(false); }}
      />
      <NamePeek id={detail} onClose={() => setDetail(null)} onNavigate={setDetail} />
    </div>
  );
}

export function LostPage() {
  const { t } = usePrefs();
  return (
    <div className="container narrow">
      <div className="empty-state card">
        <Star8 size={40} />
        <h1>{t('notFound.title')}</h1>
        <p className="muted">{t('notFound.body')}</p>
        <Link className="btn btn-primary" to="/">{t('notFound.back')}</Link>
      </div>
    </div>
  );
}
