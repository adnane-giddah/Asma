import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api, dayKey, readStore, shiftDay, writeStore } from './lib.js';
import { usePrefs } from './state.jsx';
import { AreYouSure, Glyph, PageTop, PillPick, Rule, Spinner } from './ui.jsx';
import { AyahStar, Oops, useLoad } from './quran.jsx';
import { cleanPlan, newPlan, planDay, setLabel, verseTotal, wordDiff, WINDOWS } from './hifzLogic.js';

const PLAN_KEY = 'asma:plan:v1';
const PER_DAY = [1, 2, 3, 4, 5, 7, 10];

function useSurahMeta() {
  const surahs = useLoad(() => api.surahs(), []);
  const meta = useMemo(() => {
    if (surahs.status !== 'ready') return null;
    const list = surahs.data.surahs;
    return { list, counts: list.map((s) => s.count) };
  }, [surahs]);
  return { ...surahs, meta };
}

function Range({ seg, list }) {
  const { lang, fmt } = usePrefs();
  const surah = list[seg.s - 1];
  const name = lang === 'ar' ? surah.ar : surah.tr;
  return (
    <span className="plan-range">
      {name} {fmt(seg.from)}{seg.to > seg.from && `–${fmt(seg.to)}`}
    </span>
  );
}

function SetBlock({ set, list, pending }) {
  const { t } = usePrefs();
  return (
    <div className={`plan-set ${pending ? 'is-pending' : ''}`}>
      <span className="plan-letter">{set.label}</span>
      <div className="plan-set-body">
        {set.seg.map((seg) => (
          <div key={`${seg.s}:${seg.from}`} className="plan-seg">
            <Range seg={seg} list={list} />
            <span className="plan-seg-links">
              <Link className="btn btn-ghost btn-sm" to={`/quran/${seg.s}#a${seg.from}`}><Glyph name="quran" size={16} /> {t('plan.read')}</Link>
              <Link className="btn btn-ghost btn-sm" to={`/memorize?surah=${seg.s}&from=${seg.from}&to=${seg.to}&order=build`}><Glyph name="memorize" size={16} /> {t('plan.practice')}</Link>
            </span>
          </div>
        ))}
        {pending && <span className="muted small">{t('plan.afterMorning')}</span>}
      </div>
    </div>
  );
}

function Tick({ checked, onChange, label }) {
  return (
    <button type="button" className={`plan-tick ${checked ? 'is-done' : ''}`} aria-pressed={checked} onClick={() => onChange(!checked)}>
      <span className="plan-tick-box">{checked && <Glyph name="check" size={16} />}</span>
      {label}
    </button>
  );
}

function Slot({ icon, title, when, children, done }) {
  return (
    <section className={`card plan-slot ${done ? 'is-done' : ''}`}>
      <header className="plan-slot-head">
        <span className="mode-icon"><Glyph name={icon} size={22} /></span>
        <span>
          <h2>{title}</h2>
          <span className="muted small">{when}</span>
        </span>
      </header>
      {children}
    </section>
  );
}

function PlanSetup({ list, onStart, initial }) {
  const { t, fmt } = usePrefs();
  const [form, setForm] = useState(initial ?? { surah: 67, ayah: 1, perDay: 3, window: 3 });
  const count = list[form.surah - 1].count;
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const ayah = Math.min(count, Math.max(1, Number(form.ayah) || 1));

  return (
    <div className="card setup">
      <p className="muted">{t('plan.intro')}</p>
      <div className="field">
        <label className="field-label" htmlFor="pl-surah">{t('plan.startAt')}</label>
        <select id="pl-surah" className="select" value={form.surah} onChange={(e) => update({ surah: Number(e.target.value), ayah: 1 })}>
          {list.map((s) => (
            <option key={s.n} value={s.n}>{fmt(s.n)}. {s.ar} — {s.en} ({fmt(s.count)})</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="pl-ayah">{t('memorize.from')}</label>
        <input id="pl-ayah" className="input" type="number" inputMode="numeric" min={1} max={count} value={form.ayah}
          onChange={(e) => update({ ayah: e.target.value })} onBlur={() => update({ ayah })} />
      </div>
      <div className="field">
        <span className="field-label">{t('plan.perDay')}</span>
        <PillPick label={t('plan.perDay')} value={form.perDay} onChange={(perDay) => update({ perDay })} options={PER_DAY.map((n) => ({ value: n, label: fmt(n) }))} />
        <span className="hint start">{t('plan.perDayHint')}</span>
      </div>
      <div className="field">
        <span className="field-label">{t('plan.window')}</span>
        <PillPick label={t('plan.window')} value={form.window} onChange={(window) => update({ window })} options={WINDOWS.map((n) => ({ value: n, label: t('plan.days', { n: fmt(n) }) }))} />
        <span className="hint start">{t('plan.windowHint')}</span>
      </div>
      <button className="btn btn-primary btn-lg btn-block" onClick={() => onStart({ ...form, ayah })}>{t('plan.begin')}</button>
    </div>
  );
}

function ReviewSteps() {
  const { t } = usePrefs();
  return (
    <ol className="plan-steps">
      {t('plan.reviewSteps').map((step, i) => <li key={i}>{step}</li>)}
    </ol>
  );
}

function History({ plan, today, list }) {
  const { t, fmt, lang } = usePrefs();
  const dateText = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { weekday: 'short', day: 'numeric', month: 'short' });
  const rows = [];
  for (let i = 0; i < 14; i++) {
    const d = shiftDay(today, -i);
    if (plan.began && d < plan.began) break;
    rows.push(d);
  }
  const labelled = plan.sets.map((set, i) => ({ ...set, label: setLabel(i) }));
  const mark = (on) => (on ? <Glyph name="check" size={16} className="plan-yes" /> : <span className="muted">·</span>);

  return (
    <div className="plan-table-wrap">
      <table className="plan-table">
        <thead>
          <tr>
            <th>{t('plan.date')}</th>
            <th>{t('plan.set')}</th>
            <th>{t('plan.morningShort')}</th>
            <th>{t('plan.dhuhaShort')}</th>
            <th>{t('plan.qiyamShort')}</th>
            <th>{t('plan.notes')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const [y, m, day] = d.split('-').map(Number);
            const set = labelled.find((s) => s.d === d);
            const log = plan.log[d] ?? {};
            return (
              <tr key={d} className={d === today ? 'is-today' : ''}>
                <td>{dateText.format(new Date(y, m - 1, day))}</td>
                <td>{set ? <><strong>{set.label}</strong> {set.seg.map((seg) => <Fragment key={seg.s}><Range seg={seg} list={list} /> </Fragment>)}</> : <span className="muted">—</span>}</td>
                <td>{mark(!!set)}</td>
                <td>{mark(log.d)}</td>
                <td>{mark(log.q)}</td>
                <td className="plan-note-cell">{log.note || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted center">{fmt(0)}</p>}
    </div>
  );
}

export function PlanPage() {
  const { t, fmt, lang } = usePrefs();
  const surahs = useSurahMeta();
  const [stored, setStored] = useState(() => readStore(PLAN_KEY, null));
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showMonth, setShowMonth] = useState(false);
  const today = dayKey();

  const plan = surahs.meta ? cleanPlan(stored, surahs.meta.counts) : null;
  const save = (next) => {
    writeStore(PLAN_KEY, next);
    setStored(next);
  };

  const head = <PageTop title={t('plan.title')} subtitle={t('plan.subtitle')} />;
  if (surahs.status === 'loading') return <div className="container narrow">{head}<Spinner label={t('common.loading')} /></div>;
  if (surahs.status === 'error') return <div className="container narrow">{head}<Oops message={t('errors.title')} onRetry={surahs.retry} /></div>;
  const { list, counts } = surahs.meta;

  if (!plan || editing) {
    const initial = plan && { surah: plan.start.s, ayah: plan.start.a, perDay: plan.perDay, window: plan.window };
    return (
      <div className="container narrow">
        {head}
        <PlanSetup
          list={list}
          initial={initial}
          onStart={(form) => {
            setEditing(false);
            if (plan && plan.sets.length) save({ ...plan, perDay: form.perDay, window: form.window });
            else save(newPlan(form, today));
          }}
        />
        {plan && <button className="btn btn-ghost btn-block" onClick={() => setEditing(false)}>{t('common.cancel')}</button>}
        <p className="hint"><Link to="/memorize/method">{t('plan.aboutMethod')}</Link></p>
      </div>
    );
  }

  const day = planDay(plan, today, counts);
  const log = day.log;
  const setLog = (patch) => save({ ...plan, log: { ...plan.log, [today]: { ...log, ...patch } } });
  const memorized = () => save({ ...plan, sets: [...plan.sets, { d: today, seg: day.proposal.segments }] });
  const undoMorning = () => save({ ...plan, sets: plan.sets.filter((s) => s.d !== today) });
  const qiyamSets = day.qiyamPending ? [...day.qiyam, { ...day.proposal, seg: day.proposal.segments, pending: true }] : day.qiyam;
  const dateText = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="container narrow plan">
      {head}
      <div className="plan-today">
        <strong>{dateText.format(new Date())}</strong>
        <span className="muted small">
          {t('plan.totals', { n: fmt(verseTotal(plan.sets)), sets: fmt(plan.sets.length) })}
        </span>
      </div>
      {day.isJumuah && <p className="notice">{t('plan.jumuahNote')}</p>}

      {day.isJumuah && (
        <Slot icon="calendar" title={t('plan.weekly')} when={t('plan.weeklyWhen')} done={log.w}>
          {day.week.length ? day.week.map((set) => <SetBlock key={set.index} set={set} list={list} />) : <p className="muted">{t('plan.nothingYet')}</p>}
          <ReviewSteps />
          <Tick checked={log.w} onChange={(w) => setLog({ w })} label={t('plan.doneWeekly')} />
        </Slot>
      )}

      <Slot icon="sun" title={t('plan.morning')} when={day.isJumuah ? t('plan.morningJumuah') : t('plan.morningWhen')} done={!!day.todaySet}>
        {day.todaySet && <SetBlock set={day.todaySet} list={list} />}
        {day.proposal && <SetBlock set={{ ...day.proposal, seg: day.proposal.segments }} list={list} />}
        {day.finished && <p className="notice">{t('plan.finished')}</p>}
        {day.proposal && <p className="hint start">{t('plan.morningHint')}</p>}
        {(day.todaySet || day.proposal) && (
          <Tick checked={!!day.todaySet} onChange={(on) => (on ? memorized() : undoMorning())} label={t('plan.doneMorning')} />
        )}
      </Slot>

      <Slot icon="sun" title={t('plan.dhuha')} when={t('plan.dhuhaWhen')} done={log.d}>
        {day.dhuha ? <SetBlock set={day.dhuha} list={list} /> : <p className="muted">{t('plan.dhuhaEmpty')}</p>}
        {day.dhuha && <Tick checked={log.d} onChange={(d) => setLog({ d })} label={t('plan.doneDhuha')} />}
      </Slot>

      <Slot icon="moon" title={t('plan.qiyam')} when={t('plan.qiyamWhen')} done={log.q}>
        {qiyamSets.length ? qiyamSets.map((set) => <SetBlock key={set.label} set={set} list={list} pending={set.pending} />) : <p className="muted">{t('plan.nothingYet')}</p>}
        <p className="hint start">{t('plan.qiyamHint')}</p>
        {qiyamSets.length > 0 && <Tick checked={log.q} onChange={(q) => setLog({ q })} label={t('plan.doneQiyam')} />}
      </Slot>

      <section className="card plan-slot">
        <label className="field-label" htmlFor="pl-note">{t('plan.noteLabel')}</label>
        <textarea id="pl-note" className="input plan-note" rows={3} maxLength={500} defaultValue={log.note} placeholder={t('plan.notePlaceholder')}
          onBlur={(e) => e.target.value !== log.note && setLog({ note: e.target.value })} />
      </section>

      <section className={`card plan-slot ${day.monthlyDue ? '' : 'is-quiet'}`}>
        <header className="plan-slot-head">
          <span className="mode-icon"><Glyph name="chart" size={22} /></span>
          <span>
            <h2>{t('plan.monthly')}</h2>
            <span className="muted small">{day.monthlyDue ? t('plan.monthlyDue') : t('plan.monthlyWhen')}</span>
          </span>
        </header>
        <p className="muted">{t('plan.monthlyBody', { n: fmt(verseTotal(day.month)), sets: fmt(day.month.length) })}</p>
        {(day.monthlyDue || showMonth) ? (
          <>
            {day.month.map((set) => <SetBlock key={set.index} set={set} list={list} />)}
            <ReviewSteps />
          </>
        ) : (
          day.month.length > 0 && <button className="btn btn-ghost" onClick={() => setShowMonth(true)}>{t('plan.showMonth')}</button>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">{t('plan.sheet')}</h2>
        <Rule />
        <History plan={plan} today={today} list={list} />
      </section>

      <div className="plan-footer">
        <Link className="btn btn-ghost" to="/memorize/method"><Glyph name="lightbulb" /> {t('plan.aboutMethod')}</Link>
        <button className="btn btn-ghost" onClick={() => setEditing(true)}><Glyph name="settings" /> {t('plan.edit')}</button>
        <button className="btn btn-ghost" onClick={() => setConfirmReset(true)}><Glyph name="refresh" /> {t('plan.reset')}</button>
      </div>
      <AreYouSure
        open={confirmReset}
        title={t('plan.resetTitle')}
        body={t('plan.resetBody')}
        confirmLabel={t('plan.reset')}
        cancelLabel={t('common.cancel')}
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          save(null);
        }}
      />
    </div>
  );
}

const EXAMPLES = [
  [[2, 58], [7, 161]],
  [[2, 35], [7, 19]],
  [[2, 49], [7, 141]],
  [[2, 62], [5, 69]],
];

function VersePick({ id, value, list, onChange, label }) {
  const { fmt } = usePrefs();
  const count = list[value.s - 1].count;
  return (
    <div className="field compare-pick">
      <span className="field-label">{label}</span>
      <div className="field-row">
        <select className="select" aria-label={label} value={value.s} onChange={(e) => onChange({ s: Number(e.target.value), a: 1 })}>
          {list.map((s) => <option key={s.n} value={s.n}>{fmt(s.n)}. {s.ar}</option>)}
        </select>
        <input id={id} className="input" type="number" inputMode="numeric" min={1} max={count} value={value.a}
          onChange={(e) => onChange({ ...value, a: Math.min(count, Math.max(1, Number(e.target.value) || 1)) })} />
      </div>
    </div>
  );
}

function DiffVerse({ surah, a, tokens, marks }) {
  const { lang, fmt } = usePrefs();
  return (
    <div className="card compare-verse">
      <Link className="ref-cite" to={`/quran/${surah.n}#a${a}`}>
        <span lang="ar">{surah.ar}</span>
        <span className="ref-num">{lang === 'ar' ? `${fmt(surah.n)}:${fmt(a)}` : `${surah.en} ${surah.n}:${a}`}</span>
      </Link>
      <p className="compare-text" lang="ar" dir="rtl">
        {tokens.map((token, i) => (
          <Fragment key={i}>{marks.has(i) ? <mark className="diff">{token}</mark> : token} </Fragment>
        ))}
        <AyahStar n={a} />
      </p>
    </div>
  );
}

export function ComparePage() {
  const { t, fmt } = usePrefs();
  const surahs = useSurahMeta();
  const [left, setLeft] = useState({ s: 2, a: 58 });
  const [right, setRight] = useState({ s: 7, a: 161 });
  const a = useLoad(() => api.surah(left.s), [left.s]);
  const b = useLoad(() => api.surah(right.s), [right.s]);

  const head = (
    <PageTop title={t('compare.title')} subtitle={t('compare.subtitle')}>
      <Link to="/memorize" className="back-link"><Glyph name="chevron" size={16} className="flip-back" /> {t('nav.memorize')}</Link>
    </PageTop>
  );
  if (surahs.status !== 'ready') {
    return <div className="container narrow">{head}{surahs.status === 'error' ? <Oops message={t('errors.title')} onRetry={surahs.retry} /> : <Spinner label={t('common.loading')} />}</div>;
  }
  const { list } = surahs.meta;
  const ready = a.status === 'ready' && b.status === 'ready';
  const ta = ready ? (a.data.ayahs[left.a - 1] ?? '').split(' ') : [];
  const tb = ready ? (b.data.ayahs[right.a - 1] ?? '').split(' ') : [];
  const [onlyA, onlyB] = ready ? wordDiff(ta, tb) : [new Set(), new Set()];

  return (
    <div className="container narrow">
      {head}
      <div className="card setup">
        <div className="field">
          <span className="field-label">{t('compare.examples')}</span>
          <div className="chip-row">
            {EXAMPLES.map(([x, y]) => (
              <button key={`${x}-${y}`} type="button" className="btn btn-outline btn-sm" onClick={() => { setLeft({ s: x[0], a: x[1] }); setRight({ s: y[0], a: y[1] }); }}>
                {fmt(x[0])}:{fmt(x[1])} ↔ {fmt(y[0])}:{fmt(y[1])}
              </button>
            ))}
          </div>
        </div>
        <VersePick id="cmp-a" label={t('compare.first')} value={left} list={list} onChange={setLeft} />
        <VersePick id="cmp-b" label={t('compare.second')} value={right} list={list} onChange={setRight} />
      </div>
      {!ready && <Spinner label={t('common.loading')} />}
      {ready && (
        <>
          <DiffVerse surah={a.data} a={left.a} tokens={ta} marks={onlyA} />
          <DiffVerse surah={b.data} a={right.a} tokens={tb} marks={onlyB} />
          <p className="hint">{onlyA.size + onlyB.size === 0 ? t('compare.same') : t('compare.count', { n: fmt(onlyA.size + onlyB.size) })}</p>
        </>
      )}
      <section className="card plan-slot">
        <h2>{t('compare.howTitle')}</h2>
        <ol className="plan-steps">
          {t('compare.how').map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </section>
    </div>
  );
}

const LAYER_ICONS = ['grid', 'puzzle', 'target', 'volume', 'meaning'];

export function MethodPage() {
  const { t } = usePrefs();
  return (
    <div className="container narrow method">
      <PageTop title={t('method.title')} subtitle={t('method.subtitle')}>
        <Link to="/memorize" className="back-link"><Glyph name="chevron" size={16} className="flip-back" /> {t('nav.memorize')}</Link>
      </PageTop>

      <p className="method-lead">{t('method.lead')}</p>

      <section className="section">
        <h2 className="section-title">{t('method.layersTitle')}</h2>
        <Rule />
        <div className="method-layers">
          {t('method.layers').map((layer, i) => (
            <div key={i} className="card method-layer">
              <span className="mode-icon"><Glyph name={LAYER_ICONS[i]} size={22} /></span>
              <div>
                <h3>{layer[0]}</h3>
                <p className="muted">{layer[1]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('method.cycleTitle')}</h2>
        <Rule />
        <ol className="card plan-steps method-cycle">
          {t('method.cycle').map((step, i) => <li key={i}><strong>{step[0]}</strong> {step[1]}</li>)}
        </ol>
        <div className="method-try">
          <Link className="btn btn-primary" to="/memorize?order=build"><Glyph name="memorize" /> {t('method.tryBuild')}</Link>
          <Link className="btn btn-outline" to="/memorize?order=shuffle"><Glyph name="refresh" /> {t('method.tryShuffle')}</Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('method.dayTitle')}</h2>
        <Rule />
        <div className="card">
          <ul className="method-day">
            {t('method.day').map((row, i) => <li key={i}><strong>{row[0]}</strong><span>{row[1]}</span></li>)}
          </ul>
          <Link className="btn btn-primary btn-block" to="/plan"><Glyph name="calendar" /> {t('method.openPlan')}</Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('method.fixTitle')}</h2>
        <Rule />
        <div className="method-fixes">
          {t('method.fixes').map((row, i) => (
            <div key={i} className="card method-fix">
              <strong>{row[0]}</strong>
              <span className="muted">{row[1]}</span>
            </div>
          ))}
        </div>
        <div className="method-try">
          <Link className="btn btn-outline" to="/memorize/compare"><Glyph name="list" /> {t('compare.title')}</Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('method.testTitle')}</h2>
        <Rule />
        <ul className="card plan-steps">
          {t('method.tests').map((row, i) => <li key={i}><strong>{row[0]}</strong> {row[1]}</li>)}
        </ul>
      </section>

      <p className="notice">{t('method.closing')}</p>
      <p className="source-note">{t('method.credit')}</p>
    </div>
  );
}
