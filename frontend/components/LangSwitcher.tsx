'use client';

import { useState, useRef, useEffect } from 'react';
import { useLang } from '@/lib/lang-context';
import { LANGUAGES, LangCode } from '@/lib/i18n';

export default function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === lang)!;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function pick(code: LangCode) {
    setLang(code);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          fontWeight: 500,
          transition: 'all 150ms ease',
          whiteSpace: 'nowrap',
        }}
        onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
        onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
        title="Change language"
      >
        🌐 {current.nativeLabel}
        <span style={{ fontSize: '0.625rem', opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 999,
          minWidth: '160px',
          overflow: 'hidden',
          animation: 'fadeIn 120ms ease',
        }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 14px',
                background: l.code === lang ? 'var(--accent-glow)' : 'none',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                color: l.code === lang ? 'var(--accent-primary)' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                textAlign: 'left',
                transition: 'background 100ms ease',
                fontWeight: l.code === lang ? 600 : 400,
              }}
              onMouseOver={e => { if (l.code !== lang) e.currentTarget.style.background = 'var(--bg-glass)'; }}
              onMouseOut={e => { if (l.code !== lang) e.currentTarget.style.background = 'none'; }}
            >
              <span>{l.nativeLabel}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
