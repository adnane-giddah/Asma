import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { SACRED } from './i18n/strings.js';
import { api, beep } from './lib.js';
import { useNamesData, useSave, usePrefs } from './state.jsx';
import { QuizFlow } from './quiz.jsx';
import { Confetti, Glyph, Spinner, MeaningLine, ArName, OctaNum, PageTop, PillPick, Star8, StarRow, useFocusMode } from './ui.jsx';
import { KID_TIERS } from './progressData.js';
import {
  GATE_RULES, BUILD_TIERS, PAIRS_BY_TIER, RUSH_HARDNESS, RUSH_TIME,
  gateStars, letterPool, letterStars, lettersOf, gateOpen, tilesFor, dealCards, cardStars, range, sample,
} from './kidsLogic.js';

const KID_GAMES = [
  { key: 'memory', emoji: '🗂️', to: '/kids/memory' },
  { key: 'rush', emoji: '⚡', to: '/kids/rush' },
  { key: 'build', emoji: '🧩', to: '/kids/build' },
  { key: 'adventure', emoji: '🏰', to: '/kids/adventure' },
];

function useYay() {
  const { t, sound } = usePrefs();
  const cheers = t('kids.cheer');
  return useCallback(
    (ok, index = 0) => {
      if (sound) beep(ok ? 'correct' : 'wrong');
      return ok ? cheers[index % cheers.length] : t('kids.oops');
    },
    [cheers, sound, t],
  );
}

function clockText(seconds, fmt) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${fmt(m)}:${s.split('').map((d) => fmt(Number(d))).join('')}`;
}

function TopStrip({ title, onExit, children }) {
  const { t } = usePrefs();
  return (
    <div className="kid-top">
      <button className="icon-btn" onClick={onExit} aria-label={t('kids.exit')}><Glyph name="x" /></button>
      <strong className="kid-top-title">{title}</strong>
      <div className="kid-top-stats">{children}</div>
    </div>
  );
}

function KidsBack() {
  const { t } = usePrefs();
  return (
    <Link to="/kids" className="back-link">
      <Glyph name="chevron" size={16} className="flip-back" /> {t('kids.back')}
    </Link>
  );
}

export function KidsHub() {
  const { t, fmt } = usePrefs();
  const { progress } = useSave();
  const kids = progress.kids ?? {};
  const gatesDone = Object.values(kids.adventure ?? {}).filter((s) => s >= 1).length;

  const badge = (key) => {
    if (key === 'adventure') return gatesDone ? `${fmt(gatesDone)} / ${fmt(11)}` : null;
    const best = KID_TIERS.map((l) => kids[key]?.[l]).filter((v) => v != null);
    if (!best.length) return null;
    const value = key === 'memory' ? Math.min(...best) : Math.max(...best);
    return t('kids.best', { n: key === 'build' ? '★'.repeat(value) : fmt(value) });
  };

  return (
    <div className="container">
      <PageTop title={t('kids.title')} subtitle={t('kids.subtitle')} />
      <div className="kids-grid">
        {KID_GAMES.map((g) => (
          <Link key={g.key} to={g.to} className={`kid-card kid-${g.key}`}>
            <span className="kid-emoji" aria-hidden="true">{g.emoji}</span>
            <strong>{t(`kids.${g.key}`)}</strong>
            <span>{t(`kids.${g.key}Body`)}</span>
            {badge(g.key) && <span className="kid-badge">{badge(g.key)}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function KidStart({ game, onStart }) {
  const { t, fmt } = usePrefs();
  const { lessons } = useNamesData();
  const [level, setLevel] = useState('easy');
  const [lesson, setLesson] = useState(0);

  return (
    <div className="container narrow">
      <KidsBack />
      <PageTop title={`${KID_GAMES.find((g) => g.key === game).emoji} ${t(`kids.${game}`)}`} subtitle={t(`kids.${game}Body`)} />
      <div className="card setup kid-setup">
        <div className="field">
          <span className="field-label">{t('kids.level')}</span>
          <PillPick label={t('kids.level')} value={level} onChange={setLevel} options={KID_TIERS.map((l) => ({ value: l, label: t(`kids.${l}`) }))} />
        </div>
        <div className="field">
          <span className="field-label">{t('kids.names')}</span>
          <div className="lesson-picker">
            <button type="button" className={`lesson-pick wide ${lesson === 0 ? 'active' : ''}`} aria-pressed={lesson === 0} onClick={() => setLesson(0)}>
              <span>{t('kids.allNames')}</span>
            </button>
            {lessons.map((l) => (
              <button key={l.id} type="button" className={`lesson-pick ${lesson === l.id ? 'active' : ''}`} aria-pressed={lesson === l.id} onClick={() => setLesson(l.id)}>
                <span>{fmt(l.id)}</span>
                <small>{fmt(l.from)}–{fmt(l.to)}</small>
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => {
            const scope = lesson ? lessons[lesson - 1] : { from: 1, to: 99 };
            onStart({ level, from: scope.from, to: scope.to, runId: Date.now() });
          }}
        >
          {t('kids.start')}
        </button>
      </div>
    </div>
  );
}

function KidScore({ title, stars, children, onAgain, onExit, celebrate }) {
  const { t } = usePrefs();
  return (
    <div className="container narrow">
      {celebrate && <Confetti />}
      <div className="card results-card kid-result">
        <h1>{title}</h1>
        {stars != null && <StarRow count={stars} size={38} />}
        {children}
        <div className="results-actions">
          <button className="btn btn-ghost" onClick={onExit}>{t('kids.back')}</button>
          <button className="btn btn-primary btn-lg" onClick={onAgain}><Glyph name="refresh" /> {t('kids.again')}</button>
        </div>
      </div>
    </div>
  );
}

export function MemoryCards() {
  const [config, setConfig] = useState(null);
  if (!config) return <KidStart game="memory" onStart={setConfig} />;
  return <CardTable key={config.runId} config={config} onAgain={() => setConfig({ ...config, runId: Date.now() })} onExit={() => setConfig(null)} />;
}

function CardTable({ config, onAgain, onExit }) {
  const { t, fmt } = usePrefs();
  const { byId } = useNamesData();
  const { progress, saveKidsRecord } = useSave();
  const cheer = useYay();
  const pairs = PAIRS_BY_TIER[config.level];
  const deck = useMemo(() => dealCards(sample(range(config.from, config.to), pairs)), [config, pairs]);
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState(() => new Set());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState(t('kids.memoryHint'));
  const [previousBest] = useState(() => progress.kids?.memory?.[config.level]);
  const won = matched.size === pairs;
  const locked = open.length === 2;
  useFocusMode(!won);

  useEffect(() => {
    if (won) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [won]);

  useEffect(() => {
    if (won) saveKidsRecord('memory', config.level, moves, 'min');
  }, [won, config.level, moves, saveKidsRecord]);

  const flip = (card) => {
    if (locked || open.includes(card.key) || matched.has(card.id)) return;
    const next = [...open, card.key];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next.map((key) => deck.find((c) => c.key === key));
    if (a.id === b.id) {
      setMatched((set) => new Set(set).add(a.id));
      setOpen([]);
      setMessage(cheer(true, matched.size));
    } else {
      setMessage(cheer(false));
      setTimeout(() => setOpen([]), 1000);
    }
  };

  if (won) {
    const isBest = previousBest == null || moves < previousBest;
    return (
      <KidScore title={t('kids.memoryWin')} stars={cardStars(moves, pairs)} onAgain={onAgain} onExit={onExit} celebrate>
        <p className="results-message">{t('kids.memoryResult', { moves: fmt(moves), time: clockText(seconds, fmt) })}</p>
        {isBest && previousBest != null && <span className="new-best"><Star8 size={16} /> {t('kids.newBest')}</span>}
      </KidScore>
    );
  }

  return (
    <div className="container">
      <TopStrip title={`🗂️ ${t('kids.memory')}`} onExit={onExit}>
        <span className="score-pill">{t('kids.pairs')}: {fmt(matched.size)}/{fmt(pairs)}</span>
        <span className="score-pill">{t('kids.moves')}: {fmt(moves)}</span>
        <span className="score-pill hide-mobile">{clockText(seconds, fmt)}</span>
      </TopStrip>
      <p className="kid-message" role="status">{message}</p>
      <div className={`memory-board pairs-${pairs}`}>
        {deck.map((card) => {
          const name = byId.get(card.id);
          const faceUp = open.includes(card.key) || matched.has(card.id);
          return (
            <button
              key={card.key}
              type="button"
              className={`mem-card ${faceUp ? 'is-up' : ''} ${matched.has(card.id) ? 'is-matched' : ''}`}
              onClick={() => flip(card)}
              aria-label={faceUp ? (card.face === 'name' ? name.translit : name.en) : '?'}
            >
              <span className="mem-inner">
                <span className="mem-back" aria-hidden="true"><Star8 size={34} /></span>
                <span className={`mem-front ${card.face}`}>
                  {card.face === 'name' ? <ArName name={name} size="md" /> : <MeaningLine name={name} />}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NameRush() {
  const [config, setConfig] = useState(null);
  if (!config) return <KidStart game="rush" onStart={setConfig} />;
  return <RushRound key={config.runId} config={config} onAgain={() => setConfig({ ...config, runId: Date.now() })} onExit={() => setConfig(null)} />;
}

function RushRound({ config, onAgain, onExit }) {
  const { t, fmt, lang } = usePrefs();
  const { byId } = useNamesData();
  const { progress, recordAnswer, saveKidsRecord } = useSave();
  const cheer = useYay();
  const total = RUSH_TIME[config.level];
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(total);
  const [feedback, setFeedback] = useState(null);
  const [previousBest] = useState(() => progress.kids?.rush?.[config.level]);
  const loadingMore = useRef(false);
  const over = timeLeft <= 0;
  useFocusMode(!over);

  const fetchBatch = useCallback(
    () => api.quiz({ mode: 'meaning', count: 40, difficulty: RUSH_HARDNESS[config.level], from: config.from, to: config.to })
      .then((data) => data.questions.filter((q) => q.type === 'meaningToName')),
    [config],
  );

  useEffect(() => {
    fetchBatch().then(setQuestions).catch(() => setError(true));
  }, [fetchBatch]);

  useEffect(() => {
    if (!questions || over) return;
    const timer = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [questions, over]);

  useEffect(() => {
    if (over) saveKidsRecord('rush', config.level, score, 'max');
  }, [over, config.level, score, saveKidsRecord]);

  useEffect(() => {
    if (!questions || loadingMore.current || questions.length - index > 5) return;
    loadingMore.current = true;
    fetchBatch()
      .then((more) => setQuestions((qs) => [...qs, ...more]))
      .finally(() => { loadingMore.current = false; });
  }, [questions, index, fetchBatch]);

  if (error) {
    return (
      <div className="container narrow"><div className="empty-state card"><p>{t('errors.quiz')}</p><button className="btn btn-primary" onClick={onExit}>{t('common.back')}</button></div></div>
    );
  }
  if (!questions) return <Spinner label={t('common.loading')} />;

  if (over) {
    const isBest = previousBest == null ? score > 0 : score > previousBest;
    return (
      <KidScore title={t('kids.rushOver')} onAgain={onAgain} onExit={onExit} celebrate={isBest && score > 0}>
        <div className="challenge-score">
          <span className="big-number">{fmt(score)}</span>
          <span className="muted">{t('kids.rushScore')}</span>
          {isBest && score > 0 && <span className="new-best"><Star8 size={16} /> {t('kids.newBest')}</span>}
          {previousBest != null && <span className="muted small">{t('kids.best', { n: fmt(Math.max(previousBest, score)) })}</span>}
        </div>
      </KidScore>
    );
  }

  const q = questions[index];
  if (!q) return <Spinner label={t('common.loading')} />;
  const target = byId.get(q.prompt);

  const answer = (id) => {
    if (feedback) return;
    const correct = id === q.answer;
    recordAnswer(q, id, correct);
    if (correct) setScore((s) => s + 1);
    setFeedback({ given: id, correct, text: cheer(correct, score) });
    setTimeout(() => {
      setFeedback(null);
      setIndex((i) => i + 1);
    }, correct ? 450 : 1100);
  };

  return (
    <div className="container narrow">
      <TopStrip title={`⚡ ${t('kids.rush')}`} onExit={onExit}>
        <span className="score-pill"><Star8 size={14} /> {fmt(score)}</span>
      </TopStrip>
      <div className={`rush-timer ${timeLeft <= 10 ? 'low' : ''}`} role="timer" aria-label={t('kids.time')}>
        <span style={{ width: `${(timeLeft / total) * 100}%` }} />
        <strong>{t('kids.seconds', { n: fmt(timeLeft) })}</strong>
      </div>
      {index === 0 && !feedback && <p className="kid-message">{t('kids.rushHint', { n: fmt(total) })}</p>}
      <div key={index} className="rush-prompt card-enter">
        {lang === 'ar' ? <p lang="ar">{target.ar}</p> : <><p className="pm-title">{target.en}</p><p className="pm-desc">{target.enDesc}</p></>}
      </div>
      <div className="options options-names rush-options">
        {q.options.map((id) => {
          let state = '';
          if (feedback) state = id === q.answer ? 'is-correct' : id === feedback.given ? 'is-wrong' : 'is-dim';
          return (
            <button key={id} type="button" className={`option ${state}`} disabled={Boolean(feedback)} onClick={() => answer(id)}>
              <ArName name={byId.get(id)} size="md" />
            </button>
          );
        })}
      </div>
      <p className={`kid-message ${feedback ? (feedback.correct ? 'good' : 'bad') : ''}`} role="status">{feedback?.text ?? ' '}</p>
    </div>
  );
}

export function BuildName() {
  const [config, setConfig] = useState(null);
  if (!config) return <KidStart game="build" onStart={setConfig} />;
  return <LetterRound key={config.runId} config={config} onAgain={() => setConfig({ ...config, runId: Date.now() })} onExit={() => setConfig(null)} />;
}

function LetterRound({ config, onAgain, onExit }) {
  const { t, fmt, lang } = usePrefs();
  const { names } = useNamesData();
  const { saveKidsRecord } = useSave();
  const cheer = useYay();
  const { rounds: maxRounds, decoys } = BUILD_TIERS[config.level];
  const targets = useMemo(() => {
    const pool = letterPool(names.filter((n) => n.id >= config.from && n.id <= config.to), config.level);
    return sample(pool, Math.min(maxRounds, pool.length));
  }, [names, config, maxRounds]);
  const [round, setRound] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [placed, setPlaced] = useState([]);
  const [wrongTile, setWrongTile] = useState(null);
  const [hintTile, setHintTile] = useState(null);
  const finished = round >= targets.length;
  useFocusMode(!finished);

  const target = targets[round];
  const stem = target ? lettersOf(target.arabic) : '';
  const tiles = useMemo(() => (target ? tilesFor(stem, decoys) : []), [target, stem, decoys]);
  const solved = target && placed.length === stem.length;
  const stars = letterStars(mistakes, targets.length);

  useEffect(() => {
    if (finished && targets.length) saveKidsRecord('build', config.level, stars, 'max');
  }, [finished, targets.length, config.level, stars, saveKidsRecord]);

  if (finished) {
    return (
      <KidScore title={t('kids.buildWin')} stars={stars} onAgain={onAgain} onExit={onExit} celebrate={stars === 3}>
        <p className="results-message">{t('kids.mistakes')}: {fmt(mistakes)}</p>
      </KidScore>
    );
  }

  const tap = (tile) => {
    if (solved || placed.includes(tile.id)) return;
    if (tile.letter === stem[placed.length]) {
      const next = [...placed, tile.id];
      setPlaced(next);
      setHintTile(null);
      if (next.length === stem.length) cheer(true);
    } else {
      setMistakes((m) => m + 1);
      setWrongTile(tile.id);
      setTimeout(() => setWrongTile(null), 450);
    }
  };

  const hint = () => {
    const tile = tiles.find((x) => !placed.includes(x.id) && x.letter === stem[placed.length]);
    if (!tile) return;
    setMistakes((m) => m + 1);
    setHintTile(tile.id);
  };

  const nextRound = () => {
    setRound((r) => r + 1);
    setPlaced([]);
    setHintTile(null);
  };

  const built = placed.map((id) => tiles[id].letter).join('');

  return (
    <div className="container narrow">
      <TopStrip title={`🧩 ${t('kids.build')}`} onExit={onExit}>
        <span className="score-pill">{t('kids.buildRound', { a: fmt(round + 1), b: fmt(targets.length) })}</span>
      </TopStrip>
      <div key={target.id} className="build-clue card-enter">
        <OctaNum n={target.id} />
        {lang === 'ar' ? <p lang="ar" className="build-meaning">{target.ar}</p> : <p className="build-meaning"><strong>{target.en}</strong><span className="build-translit">{target.translit}</span></p>}
      </div>

      <div className={`build-word ${solved ? 'is-solved' : ''}`} lang="ar" dir="rtl" aria-live="polite">
        {solved ? (
          <span className="build-full">{target.arabic}</span>
        ) : (
          <>
            <span className="build-letters"><span className="build-al">ال</span>{built}</span>
            <span className="build-slots" aria-hidden="true">
              {Array.from({ length: stem.length - placed.length }, (_, i) => <i key={i} />)}
            </span>
          </>
        )}
      </div>

      {solved ? (
        <div className="build-done card-enter">
          <p className="kid-message good">{t('kids.buildNice')}</p>
          <MeaningLine name={target} withDesc />
          <button className="btn btn-primary btn-lg" onClick={nextRound} autoFocus>
            {round + 1 < targets.length ? t('kids.buildNext') : t('common.seeResults')} <Glyph name="arrow" className="flip-rtl" />
          </button>
        </div>
      ) : (
        <>
          <p className="kid-message">{t('kids.buildHint')}</p>
          <div className="build-tiles" dir="rtl">
            {tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                lang="ar"
                className={`letter-tile ${placed.includes(tile.id) ? 'is-used' : ''} ${wrongTile === tile.id ? 'is-wrong' : ''} ${hintTile === tile.id ? 'is-hint' : ''}`}
                disabled={placed.includes(tile.id)}
                onClick={() => tap(tile)}
              >
                {tile.letter}
              </button>
            ))}
          </div>
          <div className="center">
            <button className="btn btn-ghost" onClick={hint}><Glyph name="lightbulb" /> {t('kids.buildHelp')}</button>
          </div>
        </>
      )}
    </div>
  );
}

function Fanous({ lit }) {
  return (
    <svg className={`lantern ${lit ? 'lit' : ''}`} viewBox="0 0 40 60" aria-hidden="true">
      <path d="M20 2v5" className="lantern-line" />
      <path d="M13 9h14l-2 6H15z" />
      <path d="M11 15h18l3 23-12 11-12-11z" />
      <path d="M15 49h10v5H15z" />
      <path d="M20 22l4 8-4 8-4-8z" className="lantern-core" />
    </svg>
  );
}

export function Adventure99() {
  const { t, fmt } = usePrefs();
  const { lessons, byId } = useNamesData();
  const { progress } = useSave();
  const [gate, setGate] = useState(null);
  const stars = progress.kids?.adventure ?? {};
  const allDone = lessons.every((l) => (stars[l.id] ?? 0) >= 1);
  const current = lessons.find((l) => gateOpen(l.id, stars) && !(stars[l.id] >= 1))?.id;

  if (gate) return <GateRun key={gate} lesson={lessons[gate - 1]} onExit={() => setGate(null)} onNext={() => setGate(gate < lessons.length ? gate + 1 : null)} />;

  return (
    <div className="container narrow">
      <KidsBack />
      <PageTop title={`🏰 ${t('kids.adventure')}`} subtitle={t('kids.adventureBody')} />
      {allDone && (
        <div className="card mastered-banner">
          <Star8 size={30} />
          <p>{t('kids.finished')}</p>
          <p lang="ar" dir="rtl" className="footer-dua">{SACRED.dua}</p>
        </div>
      )}
      <ol className="adventure-map" aria-label={t('kids.map')}>
        {lessons.map((l, i) => {
          const open = gateOpen(l.id, stars);
          const earned = stars[l.id] ?? 0;
          return (
            <li key={l.id} className={`gate-step ${i % 2 ? 'right' : 'left'}`}>
              <button
                type="button"
                className={`gate-node ${open ? '' : 'is-locked'} ${earned ? 'is-done' : ''} ${current === l.id ? 'is-current' : ''}`}
                disabled={!open}
                onClick={() => setGate(l.id)}
                title={open ? undefined : t('kids.locked')}
              >
                <span className="gate-icon" aria-hidden="true">{open ? '🏰' : '🔒'}</span>
                <span className="gate-text">
                  <strong>{t('kids.gate', { n: fmt(l.id) })}</strong>
                  <span lang="ar" dir="rtl">{byId.get(l.from).arabic} … {byId.get(l.to).arabic}</span>
                </span>
                {earned > 0 && <StarRow count={earned} size={16} />}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function GateRun({ lesson, onExit, onNext }) {
  const { t, fmt } = usePrefs();
  const { byId } = useNamesData();
  const { saveKidsRecord } = useSave();
  const [phase, setPhase] = useState('discover');
  const [lit, setLit] = useState(() => new Set());
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState(false);
  const [result, setResult] = useState(null);
  const ids = range(lesson.from, lesson.to);
  useFocusMode(phase === 'quiz');

  const startChallenge = () => {
    setPhase('quiz');
    setQuiz(null);
    setError(false);
    api.quiz({ mode: 'mixed', count: GATE_RULES.questions, difficulty: 'easy', from: lesson.from, to: lesson.to })
      .then((data) => setQuiz({ questions: data.questions, runId: Date.now() }))
      .catch(() => setError(true));
  };

  const finish = (summary) => {
    const stars = gateStars(summary.correct);
    if (stars) saveKidsRecord('adventure', lesson.id, stars, 'max');
    setResult({ correct: summary.correct, stars });
    setPhase('result');
  };

  if (phase === 'quiz') {
    if (error) return <div className="container narrow"><div className="empty-state card"><p>{t('errors.quiz')}</p><button className="btn btn-primary" onClick={startChallenge}>{t('common.retry')}</button></div></div>;
    if (!quiz) return <Spinner label={t('common.loading')} />;
    return (
      <div className="container narrow">
        <QuizFlow key={quiz.runId} questions={quiz.questions} onFinish={finish} onExit={() => setPhase('discover')} />
      </div>
    );
  }

  if (phase === 'result') {
    const passed = result.stars > 0;
    return (
      <div className="container narrow">
        {passed && <Confetti />}
        <div className="card results-card kid-result">
          <span className="kid-emoji big" aria-hidden="true">{passed ? '🏰' : '🔒'}</span>
          <h1>{passed ? t('kids.passed') : t('kids.failed')}</h1>
          <StarRow count={result.stars} size={38} />
          <p className="results-message">{t('kids.correctOf', { a: fmt(result.correct), b: fmt(GATE_RULES.questions) })}</p>
          {!passed && <p className="notice">{t('kids.needed', { n: fmt(GATE_RULES.pass) })}</p>}
          <div className="results-actions">
            <button className="btn btn-ghost" onClick={onExit}>{t('kids.toMap')}</button>
            <button className="btn btn-outline" onClick={startChallenge}><Glyph name="refresh" /> {t('common.retry')}</button>
            {passed && lesson.id < 11 && <button className="btn btn-primary" onClick={onNext}>{t('kids.nextGate')} <Glyph name="arrow" className="flip-rtl" /></button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <TopStrip title={`🏰 ${t('kids.gate', { n: fmt(lesson.id) })}`} onExit={onExit}>
        <span className="score-pill">{fmt(lit.size)}/{fmt(ids.length)}</span>
      </TopStrip>
      <p className="kid-message">{t('kids.discoverHint')}</p>
      <div className="lantern-grid">
        {ids.map((id) => {
          const name = byId.get(id);
          const on = lit.has(id);
          return (
            <button key={id} type="button" className={`lantern-card ${on ? 'is-lit' : ''}`} onClick={() => setLit((s) => new Set(s).add(id))} aria-pressed={on}>
              <Fanous lit={on} />
              {on ? (
                <span className="lantern-name card-enter">
                  <ArName name={name} size="sm" />
                  <MeaningLine name={name} />
                </span>
              ) : (
                <span className="lantern-q"><OctaNum n={id} size="sm" /></span>
              )}
            </button>
          );
        })}
      </div>
      <div className="center kid-cta">
        <p className="muted small">{t('kids.challengeHint', { n: fmt(GATE_RULES.pass) })}</p>
        <button className="btn btn-primary btn-lg" disabled={lit.size < ids.length} onClick={startChallenge}>
          <Star8 size={18} /> {t('kids.toChallenge')}
        </button>
      </div>
    </div>
  );
}
