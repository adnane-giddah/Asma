import { APK_URL, offerApp } from './platform.js';
import { readStore, writeStore } from './lib.js';
import { Component, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { SACRED } from './i18n/strings.js';
import { useNamesData, useSave, usePrefs } from './state.jsx';

const GLYPHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 16V5M8 7h7',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  sun: 'M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M8 10v4M16 16v4',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12.5 4.5 4.5L19 7',
  chevron: 'm9 6 6 6-6 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  refresh: 'M20 11a8 8 0 0 0-14.8-3.5M4 4v4h4M4 13a8 8 0 0 0 14.8 3.5M20 20v-4h-4',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm10 3-5-5',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  puzzle: 'M4 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H4v-3a2 2 0 1 0 0-4z',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm0 4h16M8 2v4M16 2v4',
  lightbulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  meaning: 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5',
  order: 'M8 4v16m0 0-3-3m3 3 3-3M14 6h6M14 12h4M14 18h2',
  volume: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12',
  translit: 'M4 5h8M8 3v2M5 11c2-1 4-3.5 5-6M6 7c1 2 3 4 5 4M12 21l4-9 4 9M13.5 18h5',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  quran: 'M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zm0 0v13',
  memorize: 'M3 12s3.5-7 9-7c1.6 0 3 .5 4.3 1.2M21 12s-1.3 2.6-3.7 4.6M9.9 9.9a3 3 0 0 0 4.2 4.2M4 4l16 16M7.7 16.3C9 17.4 10.4 19 12 19',
  names: 'M6 6h12v12H6zM12 3.5 20.5 12 12 20.5 3.5 12z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  practice: 'M9 11.5l2.5 2.5L20 5.5M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10',
  kids: 'M4 14h7v7H4zM13 14h7v7h-7zM8.5 4h7v7h-7z',
  download: 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14',
  upload: 'M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 20h14',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
};

export function Glyph({ name, size = 20, className = '', ...rest }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={GLYPHS[name]} />
    </svg>
  );
}

export const OCTA_PATH = 'M12 1.5 15.08 4.57 19.42 4.58 19.43 8.92 22.5 12 19.43 15.08 19.42 19.42 15.08 19.43 12 22.5 8.92 19.43 4.58 19.42 4.57 15.08 1.5 12 4.57 8.92 4.58 4.58 8.92 4.57Z';

export function Star8({ filled = true, size = 18, className = '' }) {
  return (
    <svg className={`star-shape ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.6} strokeLinejoin="round">
        <path d="M12 1.5 15 5.2l4.4-.6-.6 4.4 3.7 3-3.7 3 .6 4.4-4.4-.6-3 3.7-3-3.7-4.4.6.6-4.4-3.7-3 3.7-3-.6-4.4 4.4.6z" />
      </g>
    </svg>
  );
}

export function Rose({ className = '' }) {
  const squares = [0, 22.5, 45, 67.5];
  return (
    <svg className={`rosette ${className}`} viewBox="0 0 200 200" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        <circle cx="100" cy="100" r="96" />
        <circle cx="100" cy="100" r="88" strokeDasharray="2 4" />
        {squares.map((a) => (
          <rect key={a} x="38" y="38" width="124" height="124" transform={`rotate(${a} 100 100)`} />
        ))}
        {squares.map((a) => (
          <rect key={`i${a}`} x="62" y="62" width="76" height="76" transform={`rotate(${a + 11.25} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="30" />
        <circle cx="100" cy="100" r="22" strokeDasharray="1 3" />
      </g>
    </svg>
  );
}

export function OctaNum({ n, size = 'md', className = '' }) {
  const { fmt } = usePrefs();
  return (
    <span className={`badge badge-${size} ${className}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <rect x="19" y="19" width="62" height="62" rx="5" />
        <rect x="19" y="19" width="62" height="62" rx="5" transform="rotate(45 50 50)" />
      </svg>
      <span className="badge-num">{fmt(n)}</span>
    </span>
  );
}

export function Rule({ className = '' }) {
  return (
    <div className={`divider ${className}`} aria-hidden="true">
      <span />
      <Star8 size={14} />
      <span />
    </div>
  );
}

export function Mark({ size = 40, className = '' }) {
  return (
    <span className={`logo ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <img className="logo-on-light" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={size} height={size} />
      <img className="logo-on-dark" src={`${import.meta.env.BASE_URL}logo-on-dark.svg`} alt="" width={size} height={size} />
    </span>
  );
}

export function ArName({ name, translit, className = '', size = 'md' }) {
  const { showTranslit } = usePrefs();
  const show = translit ?? showTranslit;
  return (
    <span className={`name-text name-${size} ${className}`}>
      <span className="ar" lang="ar" dir="rtl">{name.arabic}</span>
      {show && <span className="translit" dir="ltr">{name.translit}</span>}
    </span>
  );
}

export function MeaningLine({ name, withDesc = false }) {
  const { lang } = usePrefs();
  if (lang === 'ar') return <span className="meaning" lang="ar">{name.ar}</span>;
  return (
    <span className="meaning">
      <strong>{name.en}</strong>
      {withDesc && <span className="meaning-desc"> — {name.enDesc}</span>}
    </span>
  );
}

export function Donut({ value, size = 96, stroke = 8, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="ring-track" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

export function StarRow({ count, max = 3, size = 20 }) {
  return (
    <span className="stars" aria-label={`${count} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star8 key={i} size={size} filled={i < count} className={i < count ? 'on' : 'off'} />
      ))}
    </span>
  );
}

export function PillPick({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} disabled={o.disabled} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)} title={o.title}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, icon }) {
  return (
    <label className="switch-row">
      {icon && <Glyph name={icon} size={18} />}
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

export function PageTop({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      <Rule />
      {children}
    </header>
  );
}

export function Sheet({ open, onClose, title, children, className = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      previous?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1}>
        {title && <h2 id={titleId} className="modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function AreYouSure({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  return (
    <Sheet open={open} onClose={onCancel} title={title} className="modal-sm">
      <p className="muted">{body}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Sheet>
  );
}

export function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 34 }, (_, i) => ({ id: i, left: Math.random() * 100, delay: Math.random() * 1.2, duration: 2.4 + Math.random() * 2, size: 10 + Math.random() * 14, drift: (Math.random() - 0.5) * 120 })),
    [],
  );
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div className="celebration" aria-hidden="true">
      {pieces.map((p) => (
        <span key={p.id} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, '--drift': `${p.drift}px` }}>
          <Star8 size={p.size} />
        </span>
      ))}
    </div>
  );
}

const LVL_CSS = ['lvl-0', 'lvl-1', 'lvl-2', 'lvl-3'];

export function LvlTag({ level, label }) {
  const { t } = usePrefs();
  return (
    <span className={`level-chip ${LVL_CSS[level]}`}>
      <i />
      {label}: {t('progress.levels')[level]}
    </span>
  );
}

export function NamePeek({ id, onClose, onNavigate }) {
  const { byId } = useNamesData();
  const { t, isRTL } = usePrefs();
  const { level } = useSave();
  const name = id ? byId.get(id) : null;

  useEffect(() => {
    if (!id) return;
    const onKey = (e) => {
      const forward = isRTL ? 'ArrowLeft' : 'ArrowRight';
      const backward = isRTL ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === forward && id < 99) onNavigate(id + 1);
      if (e.key === backward && id > 1) onNavigate(id - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [id, isRTL, onNavigate]);

  return (
    <Sheet open={Boolean(name)} onClose={onClose} className="modal-name">
      {name && (
        <>
          <button className="icon-btn modal-close" onClick={onClose} aria-label={t('common.close')}>
            <Glyph name="x" />
          </button>
          <div className="detail-head">
            <OctaNum n={name.id} size="lg" />
            <span className="detail-ar" lang="ar" dir="rtl">{name.arabic}</span>
            <span className="detail-translit" dir="ltr">{name.translit}</span>
          </div>
          <Rule />
          <div className="detail-body">
            <p className="detail-en" dir="ltr" lang="en"><strong>{name.en}</strong> — {name.enDesc}</p>
            <p className="detail-arm" dir="rtl" lang="ar">{name.ar}</p>
          </div>
          <div className="detail-levels">
            <LvlTag level={level(name.id, 'order')} label={t('detail.order')} />
            <LvlTag level={level(name.id, 'meaning')} label={t('detail.meaningSkill')} />
          </div>
          <Link to={`/names/${name.id}`} className="btn btn-outline btn-block detail-more">
            <Glyph name="quran" /> {t('namePage.details')}
          </Link>
          <div className="detail-nav">
            <button className="btn btn-ghost" disabled={name.id === 1} onClick={() => onNavigate(name.id - 1)}>
              <Glyph name="chevron" className="flip-back" /> {t('common.previous')}
            </button>
            <button className="btn btn-ghost" disabled={name.id === 99} onClick={() => onNavigate(name.id + 1)}>
              {t('common.next')} <Glyph name="chevron" className="flip-rtl" />
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

const MENU_ITEMS = [
  { to: '/', key: 'home', icon: 'home', end: true },
  { to: '/quran', key: 'quran', icon: 'quran' },
  { to: '/memorize', key: 'memorize', icon: 'memorize' },
  { to: '/plan', key: 'plan', icon: 'calendar' },
  { to: '/names', key: 'names', icon: 'names' },
  { to: '/learn', key: 'learn', icon: 'book' },
  { to: '/practice', key: 'practice', icon: 'practice' },
  { to: '/kids', key: 'kids', icon: 'kids' },
  { to: '/progress', key: 'progress', icon: 'chart' },
];

function PrefsMenu() {
  const { t, showTranslit, setTranslit, sound, setSound } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="settings" ref={ref}>
      <button className="icon-btn" aria-label={t('settings.open')} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Glyph name="settings" />
      </button>
      {open && (
        <div className="settings-pop" role="menu">
          <p className="settings-title">{t('settings.title')}</p>
          <Toggle checked={showTranslit} onChange={setTranslit} label={t('settings.translit')} icon="translit" />
          <Toggle checked={sound} onChange={setSound} label={t('settings.sound')} icon="volume" />
        </div>
      )}
    </div>
  );
}

function BrandLink({ onNavigate }) {
  const { t, lang } = usePrefs();
  return (
    <Link to="/" className="brand" aria-label={t('app.name')} onClick={onNavigate}>
      <Mark size={44} className="brand-logo" />
      <span className="brand-text">
        <span className="brand-ar" lang="ar">{SACRED.title}</span>
        {lang === 'en' && <span className="brand-en">Asma’ul Husna</span>}
      </span>
    </Link>
  );
}

function SideTools() {
  const { t, theme, toggleLang, toggleTheme } = usePrefs();
  return (
    <div className="sidebar-actions">
      <button className="icon-btn lang-btn" onClick={toggleLang} aria-label={t('settings.switchLang')} title={t('settings.switchLang')}>
        {t('settings.langShort')}
      </button>
      <button className="icon-btn" onClick={toggleTheme} aria-label={t('settings.toggleTheme')} title={t('settings.toggleTheme')}>
        <Glyph name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>
      <PrefsMenu />
    </div>
  );
}

function SideNav({ open, onClose }) {
  const { t } = usePrefs();
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('drawer-open');
    panel.current?.querySelector('a, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('drawer-open');
    };
  }, [open, onClose]);

  return (
    <>
      <aside ref={panel} id="site-nav" className={`sidebar ${open ? 'is-open' : ''}`} aria-label={t('nav.main')}>
        <div className="sidebar-head">
          <BrandLink onNavigate={onClose} />
          <button className="icon-btn drawer-close" onClick={onClose} aria-label={t('nav.closeMenu')}>
            <Glyph name="x" />
          </button>
        </div>
        <nav className="side-nav">
          {MENU_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose} title={t(`nav.${item.key}`)}>
              <Glyph name={item.icon} size={20} />
              <span>{t(`nav.${item.key}`)}</span>
            </NavLink>
          ))}
        </nav>
        {offerApp() && (
          <a className="get-app" href={APK_URL} download>
            <Glyph name="download" size={20} />
            <span>{t('nav.getApp')}</span>
          </a>
        )}
        <SideTools />
      </aside>
      <div className={`drawer-backdrop ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />
    </>
  );
}

function PhoneBar({ open, onOpen }) {
  const { t } = usePrefs();
  return (
    <header className="mobile-bar">
      <BrandLink />
      <button className="icon-btn menu-btn" onClick={onOpen} aria-label={t('nav.menu')} aria-expanded={open} aria-controls="site-nav">
        <Glyph name="menu" size={22} />
      </button>
    </header>
  );
}

function Bottom() {
  const { t, lang } = usePrefs();
  return (
    <footer className="site-footer">
      <div className="container">
        <Rule />
        <p className="footer-dua" lang="ar" dir="rtl">{SACRED.dua}</p>
        {lang === 'en' && <p className="footer-dua-en">{t('footer.dua')}</p>}
        <p className="footer-note">{t('footer.note')}</p>
      </div>
    </footer>
  );
}

export function Shell({ children }) {
  const { t } = usePrefs();
  const { pathname, hash } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    setMenuOpen(false);
  }, [pathname, hash]);

  return (
    <div className="app-shell">
      <a href="#" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>{t('common.skip')}</a>
      <PhoneBar open={menuOpen} onOpen={() => setMenuOpen(true)} />
      <SideNav open={menuOpen} onClose={closeMenu} />
      <div className="app-content">
        <AppOffer />
        <main id="main" className="app-main" tabIndex={-1}>
          <div key={pathname} className="page-enter">{children}</div>
        </main>
        <Bottom />
      </div>
    </div>
  );
}

const OFFER_KEY = 'asma:app-offer-dismissed';

function AppOffer() {
  const { t } = usePrefs();
  const [hidden, setHidden] = useState(() => readStore(OFFER_KEY, false));
  if (hidden || !offerApp()) return null;
  const later = () => {
    writeStore(OFFER_KEY, true);
    setHidden(true);
  };
  return (
    <section className="app-offer" aria-label={t('offer.title')}>
      <Mark size={42} />
      <div className="app-offer-text">
        <strong>{t('offer.title')}</strong>
        <span>{t('offer.body')}</span>
      </div>
      <div className="app-offer-actions">
        <a className="btn btn-primary" href={APK_URL} download>
          <Glyph name="download" /> {t('offer.download')}
        </a>
        <button type="button" className="btn btn-ghost" onClick={later}>{t('offer.later')}</button>
      </div>
    </section>
  );
}

export function useFocusMode(active) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add('immersive');
    return () => document.body.classList.remove('immersive');
  }, [active]);
}

export function Spinner({ label }) {
  return (
    <div className="loader" role="status">
      <Star8 size={44} className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function WaitForNames({ children }) {
  const data = useNamesData();
  const { t } = usePrefs();
  if (data.status === 'loading') return <Spinner label={t('common.loading')} />;
  if (data.status === 'error') {
    return (
      <div className="empty-state card">
        <h2>{t('errors.title')}</h2>
        <p className="muted">{t('errors.body')}</p>
        <button className="btn btn-primary" onClick={data.reload}>
          <Glyph name="refresh" /> {t('common.retry')}
        </button>
      </div>
    );
  }
  return children;
}

export class CrashGuard extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error(error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const ar = document.documentElement.lang === 'ar';
    return (
      <div className="empty-state card">
        <h2>{ar ? 'حدث خطأ ما' : 'Something went wrong'}</h2>
        <p className="muted">{ar ? 'يرجى إعادة تحميل الصفحة، فتقدّمك محفوظ.' : 'Please reload the page. Your progress is safe.'}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>{ar ? 'إعادة التحميل' : 'Reload'}</button>
      </div>
    );
  }
}
