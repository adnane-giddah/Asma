import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNamesData, useSave, usePrefs } from './state.jsx';
import { beep, starCount } from './lib.js';
import { Confetti, AreYouSure, Rule, Glyph, MeaningLine, ArName, OctaNum, Donut, PillPick, Star8, StarRow } from './ui.jsx';

export const gotIt = (q, given) => (q.type === 'arrange' ? q.answer.every((id, i) => given[i] === id) : given === q.answer);

const typingNow = (e) => e.target.closest?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey;

function SlotTile({ id, blank, filled, state }) {
  const { byId } = useNamesData();
  const name = byId.get(filled ?? id);
  return (
    <div className={`seq-tile ${blank ? 'is-blank' : ''} ${state ?? ''}`}>
      <OctaNum n={id} size="sm" />
      {blank && !filled ? (
        <span className="seq-q" aria-label="?">؟</span>
      ) : (
        <ArName name={name} size="md" />
      )}
    </div>
  );
}

function SlotArrow() {
  return <Glyph name="arrow" className="seq-arrow flip-rtl" size={22} />;
}

function AskBox({ q, answered }) {
  const { byId } = useNamesData();
  const { lang } = usePrefs();
  const filled = answered ? q.answer : null;
  const state = answered ? (answered.correct ? 'is-correct' : 'is-wrong') : '';
  if (q.type === 'gap') {
    return (
      <div className="sequence">
        <SlotTile id={q.before} />
        <SlotArrow />
        <SlotTile id={q.answer} blank filled={filled} state={state} />
        <SlotArrow />
        <SlotTile id={q.after} />
      </div>
    );
  }
  if (q.type === 'next' || q.type === 'prev') {
    const shown = <SlotTile id={q.prompt} />;
    const blank = <SlotTile id={q.answer} blank filled={filled} state={state} />;
    return (
      <div className="sequence">
        {q.type === 'next' ? shown : blank}
        <SlotArrow />
        {q.type === 'next' ? blank : shown}
      </div>
    );
  }
  const name = byId.get(q.prompt);
  if (q.type === 'nameToMeaning') {
    return (
      <div className="prompt-name">
        <OctaNum n={name.id} />
        <ArName name={name} size="xl" />
      </div>
    );
  }
  return (
    <div className="prompt-meaning">
      {lang === 'ar' ? (
        <p lang="ar">{name.ar}</p>
      ) : (
        <>
          <p className="pm-title">{name.en}</p>
          <p className="pm-desc">{name.enDesc}</p>
        </>
      )}
    </div>
  );
}

function PickOne({ q, answered, onAnswer }) {
  const { byId } = useNamesData();
  const showsMeaning = q.type === 'nameToMeaning';

  useEffect(() => {
    if (answered) return;
    const onKey = (e) => {
      if (typingNow(e)) return;
      const index = Number(e.key) - 1;
      if (index >= 0 && index < q.options.length) onAnswer(q.options[index]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [answered, q, onAnswer]);

  return (
    <div className={`options ${showsMeaning ? 'options-text' : 'options-names'}`}>
      {q.options.map((id, i) => {
        const name = byId.get(id);
        let state = '';
        if (answered) {
          if (id === q.answer) state = 'is-correct';
          else if (id === answered.given) state = 'is-wrong';
          else state = 'is-dim';
        }
        return (
          <button key={id} type="button" className={`option ${state}`} disabled={Boolean(answered)} onClick={() => onAnswer(id)}>
            <kbd className="option-key">{i + 1}</kbd>
            {showsMeaning ? <MeaningLine name={name} /> : <ArName name={name} size="md" />}
            {state === 'is-correct' && <Glyph name="check" className="option-mark" />}
            {state === 'is-wrong' && <Glyph name="x" className="option-mark" />}
          </button>
        );
      })}
    </div>
  );
}

function PutInOrder({ q, answered, onAnswer }) {
  const { byId } = useNamesData();
  const { t } = usePrefs();
  const [placed, setPlaced] = useState([]);
  const full = placed.length === q.answer.length;

  const place = useCallback((id) => setPlaced((p) => (p.includes(id) || p.length >= q.answer.length ? p : [...p, id])), [q.answer.length]);
  const remove = (id) => !answered && setPlaced((p) => p.filter((x) => x !== id));

  useEffect(() => {
    if (answered) return;
    const onKey = (e) => {
      if (typingNow(e)) return;
      const index = Number(e.key) - 1;
      if (index >= 0 && index < q.items.length) place(q.items[index]);
      else if (e.key === 'Backspace') setPlaced((p) => p.slice(0, -1));
      else if (e.key === 'Enter' && full && !e.target.closest('button')) onAnswer(placed);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [answered, q.items, place, full, placed, onAnswer]);

  return (
    <div className="arrange">
      <ol className="arrange-slots">
        {q.answer.map((expected, i) => {
          const id = placed[i];
          const state = answered ? (id === expected ? 'is-correct' : 'is-wrong') : '';
          return (
            <li key={expected} className={`slot ${id ? 'filled' : ''} ${state}`}>
              <OctaNum n={expected} size="sm" />
              {id ? (
                <button type="button" className="slot-name" onClick={() => remove(id)} disabled={Boolean(answered)}>
                  <ArName name={byId.get(id)} size="md" />
                </button>
              ) : (
                <span className="slot-empty">…</span>
              )}
              {state === 'is-correct' && <Glyph name="check" className="option-mark" />}
              {state === 'is-wrong' && <Glyph name="x" className="option-mark" />}
            </li>
          );
        })}
      </ol>
      {!answered && (
        <>
          <p className="hint">{t('prompts.arrangeHint')}</p>
          <div className="arrange-pool">
            {q.items.map((id, i) => (
              <button key={id} type="button" className="option pool-item" disabled={placed.includes(id)} onClick={() => place(id)}>
                <kbd className="option-key">{i + 1}</kbd>
                <ArName name={byId.get(id)} size="md" />
              </button>
            ))}
          </div>
          <div className="arrange-actions">
            <button type="button" className="btn btn-ghost" disabled={!placed.length} onClick={() => setPlaced([])}>
              <Glyph name="undo" /> {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" disabled={!full} onClick={() => onAnswer(placed)}>
              <Glyph name="check" /> {t('common.check')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChainRow({ ids, highlight }) {
  const { byId } = useNamesData();
  return (
    <div className="mini-chain">
      {ids.map((id, i) => (
        <span key={id} className="mini-chain-item">
          {i > 0 && <Glyph name="arrow" size={14} className="flip-rtl muted" />}
          <span className={`chip ${highlight.includes(id) ? 'chip-gold' : ''}`}>
            <OctaNum n={id} size="xs" />
            <span lang="ar" dir="rtl">{byId.get(id).arabic}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

function AfterAnswer({ q, answered, praise, onNext, nextLabel }) {
  const { t } = usePrefs();
  const { byId } = useNamesData();
  const button = useRef(null);
  useEffect(() => {
    button.current?.focus({ preventScroll: true });
  }, []);
  const answer = q.type === 'arrange' ? null : byId.get(q.answer);
  const around = answer && [answer.id - 1, answer.id, answer.id + 1].filter((id) => id >= 1 && id <= 99);

  return (
    <div className={`feedback ${answered.correct ? 'good' : 'bad'}`} role="status" aria-live="polite">
      <div className="feedback-head">
        <span className="feedback-icon"><Glyph name={answered.correct ? 'check' : 'x'} size={18} /></span>
        <strong>{answered.correct ? praise : t('feedback.wrong')}</strong>
      </div>
      {q.type === 'arrange' ? (
        !answered.correct && (
          <div className="feedback-body">
            <span className="muted">{t('feedback.correctOrder')}</span>
            <ChainRow ids={q.answer} highlight={[]} />
          </div>
        )
      ) : (
        <div className="feedback-body">
          {q.skill === 'order' ? <ChainRow ids={around} highlight={[answer.id]} /> : <ArName name={answer} size="sm" />}
          <MeaningLine name={answer} withDesc />
        </div>
      )}
      <button ref={button} type="button" className="btn btn-primary feedback-next" onClick={onNext}>
        {nextLabel} <Glyph name="arrow" className="flip-rtl" />
      </button>
    </div>
  );
}

export function QuizFlow({ questions, title, lives: maxLives = 0, endless = false, onNeedMore, onFinish, onExit }) {
  const { t, fmt, sound } = usePrefs();
  const { recordAnswer } = useSave();
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [log, setLog] = useState([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lives, setLives] = useState(maxLives);
  const [confirmExit, setConfirmExit] = useState(false);
  const headingRef = useRef(null);

  const q = questions[index];
  const correctCount = log.filter((e) => e.correct).length;
  const praises = t('feedback.correct');
  const praise = praises[index % praises.length];
  const outOfLives = maxLives > 0 && lives <= 0;
  const isLast = !endless && index >= questions.length - 1;

  useEffect(() => {
    if (endless && onNeedMore && questions.length - index <= 4) onNeedMore();
  }, [endless, onNeedMore, index, questions.length]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  const handleAnswer = useCallback(
    (given) => {
      if (answered || !q) return;
      const correct = gotIt(q, given);
      recordAnswer(q, given, correct);
      setAnswered({ given, correct });
      setLog((prev) => [...prev, { q, given, correct }]);
      const nextCombo = correct ? combo + 1 : 0;
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      if (!correct && maxLives) setLives((l) => l - 1);
      if (sound) beep(correct ? 'correct' : 'wrong');
      if (!correct) navigator.vibrate?.(60);
    },
    [answered, q, recordAnswer, combo, maxLives, sound],
  );

  const finish = () => onFinish({ log, correct: correctCount, total: log.length, bestCombo });

  const next = () => {
    if (outOfLives || isLast) return finish();
    setIndex((i) => i + 1);
    setAnswered(null);
  };

  useEffect(() => {
    if (!answered) return;
    const onKey = (e) => {
      if (typingNow(e) || e.target.closest('button, a')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const exit = () => (log.length ? setConfirmExit(true) : onExit());
  const progress = endless ? 0 : (index + (answered ? 1 : 0)) / questions.length;

  return (
    <div className="quiz">
      <div className="quiz-top">
        <button className="icon-btn" onClick={exit} aria-label={t('common.exit')}>
          <Glyph name="x" />
        </button>
        {endless ? (
          <div className="quiz-title">{title}</div>
        ) : (
          <div className="quiz-bar" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index + 1}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <div className="quiz-stats">
          {maxLives > 0 && (
            <span className="lives" aria-label={`${t('quiz.lives')}: ${lives}`}>
              {Array.from({ length: maxLives }, (_, i) => (
                <Star8 key={i} size={18} filled={i < lives} className={i < lives ? 'on' : 'off'} />
              ))}
            </span>
          )}
          <span className="score-pill" title={t('quiz.score')}>
            <Star8 size={14} /> {fmt(correctCount)}
          </span>
          {combo >= 2 && <span className="combo-pill">×{fmt(combo)}</span>}
        </div>
      </div>

      {!q ? (
        <div className="loader"><Star8 size={36} className="spin" /><span>{t('quiz.loadingMore')}</span></div>
      ) : (
        <div key={`${q.id}-${index}`} className="question card question-enter">
          <div className="question-meta">
            <span className="type-chip">{t(`types.${q.type}`)}</span>
            {!endless && <span className="muted">{t('common.of', { a: fmt(index + 1), b: fmt(questions.length) })}</span>}
          </div>
          <h2 className="question-prompt" tabIndex={-1} ref={headingRef}>{t(`prompts.${q.type}`)}</h2>
          {q.type !== 'arrange' && <AskBox q={q} answered={answered} />}
          {q.type === 'arrange' ? <PutInOrder q={q} answered={answered} onAnswer={handleAnswer} /> : <PickOne q={q} answered={answered} onAnswer={handleAnswer} />}
          {answered && <AfterAnswer q={q} answered={answered} praise={praise} onNext={next} nextLabel={outOfLives || isLast ? t('common.seeResults') : t('common.continue')} />}
        </div>
      )}

      <AreYouSure
        open={confirmExit}
        title={t('quiz.exitTitle')}
        body={t('quiz.exitBody')}
        confirmLabel={t('common.leave')}
        cancelLabel={t('common.stay')}
        onCancel={() => setConfirmExit(false)}
        onConfirm={() => {
          setConfirmExit(false);
          onExit();
        }}
      />
    </div>
  );
}

function MissRow({ entry }) {
  const { byId } = useNamesData();
  const { t } = usePrefs();
  const { q, given } = entry;
  const nameOf = (id) => byId.get(id);
  let question;
  let yours;
  let correct;
  if (q.type === 'arrange') {
    question = null;
    yours = <ChainRow ids={given} highlight={[]} />;
    correct = <ChainRow ids={q.answer} highlight={[]} />;
  } else {
    if (q.type === 'gap') question = <ChainRow ids={[q.before, q.after]} highlight={[]} />;
    else if (q.type === 'next' || q.type === 'prev') question = <ChainRow ids={[q.prompt]} highlight={[]} />;
    else if (q.type === 'nameToMeaning') question = <ArName name={nameOf(q.prompt)} size="sm" />;
    else question = <MeaningLine name={nameOf(q.prompt)} />;
    const render = (id) => (q.type === 'nameToMeaning' ? <MeaningLine name={nameOf(id)} /> : <ArName name={nameOf(id)} size="sm" />);
    yours = render(given);
    correct = render(q.answer);
  }
  return (
    <li className="mistake">
      <div className="mistake-head">
        <span className="type-chip">{t(`types.${q.type}`)}</span>
        {question}
      </div>
      <div className="mistake-answers">
        <div className="bad"><span className="label">{t('results.yours')}</span>{yours}</div>
        <div className="good"><span className="label">{t('results.correct')}</span>{correct}</div>
      </div>
    </li>
  );
}

export function ScoreBoard({ summary, title, challenge, newBest, children, actions }) {
  const { t, fmt, lang } = usePrefs();
  const ratio = summary.total ? summary.correct / summary.total : 0;
  const stars = starCount(ratio);
  const mistakes = summary.log.filter((e) => !e.correct);
  const message = ratio === 1 ? t('results.perfect') : ratio >= 0.8 ? t('results.great') : ratio >= 0.6 ? t('results.good') : t('results.keep');
  const pct = Math.round(ratio * 100);

  return (
    <div className="results">
      {(ratio === 1 && summary.total >= 5) || newBest ? <Confetti /> : null}
      <div className="card results-card">
        <h1>{title ?? (challenge ? t('results.challengeTitle') : t('results.title'))}</h1>
        {challenge ? (
          <div className="challenge-score">
            <span className="big-number">{fmt(summary.correct)}</span>
            <span className="muted">{t('results.challengeScore')}</span>
            {newBest && <span className="new-best"><Star8 size={16} /> {t('results.newBest')}</span>}
          </div>
        ) : (
          <>
            <Donut value={ratio} size={140} stroke={10}>
              <span className="ring-pct">{lang === 'ar' ? `${fmt(pct)}٪` : `${pct}%`}</span>
            </Donut>
            <StarRow count={stars} size={30} />
          </>
        )}
        <p className="results-message">{challenge ? '' : message}</p>
        <div className="results-stats">
          <div><strong>{t('results.correctOf', { a: fmt(summary.correct), b: fmt(summary.total) })}</strong></div>
          <div><span className="muted">{t('results.bestStreak')}</span> <strong>{fmt(summary.bestCombo)}</strong></div>
        </div>
        {children}
        <div className="results-actions">{actions}</div>
      </div>

      <section className="card mistakes-card">
        <h2>{t('results.mistakes')}</h2>
        <Rule />
        {mistakes.length ? <ul className="mistakes">{mistakes.map((m, i) => <MissRow key={i} entry={m} />)}</ul> : <p className="muted center">{t('results.noMistakes')}</p>}
      </section>
    </div>
  );
}

export const missedIds = (summary) => [...new Set(summary.log.filter((e) => !e.correct).flatMap((e) => e.q.focus))];

export function QuizPrep({ config, onStart, children }) {
  const { t, fmt } = usePrefs();
  const { lessons } = useNamesData();
  const { progress } = useSave();
  const completed = lessons.filter((l) => progress.lessons[l.id]?.done);
  const [scope, setScope] = useState('all');
  const [lessonId, setLessonId] = useState(1);
  const [count, setCount] = useState(config.counts?.[0] ?? 10);
  const [difficulty, setDifficulty] = useState('normal');

  const start = () => {
    const options = { count, difficulty };
    if (scope === 'lesson') {
      const lesson = lessons[lessonId - 1];
      Object.assign(options, { from: lesson.from, to: lesson.to });
    } else if (scope === 'completed') {
      options.ids = completed.flatMap((l) => Array.from({ length: l.to - l.from + 1 }, (_, i) => l.from + i));
    }
    onStart(options);
  };

  return (
    <div className="card setup">
      {children}
      {config.scope !== false && (
        <div className="field">
          <span className="field-label">{t('setup.scope')}</span>
          <PillPick
            label={t('setup.scope')}
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: t('setup.all') },
              { value: 'lesson', label: t('setup.lesson') },
              { value: 'completed', label: t('setup.completed'), disabled: !completed.length, title: completed.length ? undefined : t('setup.noCompleted') },
            ]}
          />
          {scope === 'lesson' && (
            <div className="lesson-picker">
              {lessons.map((l) => (
                <button key={l.id} type="button" className={`lesson-pick ${lessonId === l.id ? 'active' : ''}`} onClick={() => setLessonId(l.id)} aria-pressed={lessonId === l.id}>
                  <span>{fmt(l.id)}</span>
                  <small>{fmt(l.from)}–{fmt(l.to)}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {config.counts && (
        <div className="field">
          <span className="field-label">{t('setup.count')}</span>
          <PillPick label={t('setup.count')} value={count} onChange={setCount} options={config.counts.map((c) => ({ value: c, label: fmt(c) }))} />
        </div>
      )}
      {config.difficulty !== false && (
        <div className="field">
          <span className="field-label">{t('setup.difficulty')}</span>
          <PillPick label={t('setup.difficulty')} value={difficulty} onChange={setDifficulty} options={['easy', 'normal', 'hard'].map((d) => ({ value: d, label: t(`setup.${d}`) }))} />
        </div>
      )}
      <button className="btn btn-primary btn-lg btn-block" onClick={start}>
        {t('common.bismillah')}
      </button>
    </div>
  );
}

export function useQuizFetch() {
  const [state, setState] = useState({ status: 'idle' });
  const load = useCallback(async (request, fetcher) => {
    setState({ status: 'loading', request });
    try {
      const data = await fetcher(request);
      setState({ status: 'running', request, questions: data.questions, runId: Math.random() });
    } catch {
      setState({ status: 'error', request });
    }
  }, []);
  return useMemo(() => ({ state, setState, load }), [state, load]);
}
