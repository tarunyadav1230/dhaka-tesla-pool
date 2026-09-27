'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useLang } from '@/lib/lang-context';
import LangSwitcher from '@/components/LangSwitcher';

export default function HomePage() {
  const { user, loading } = useAuth();
  const { t } = useLang();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-center">
          <div className="spinner" />
          <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="navbar">
        <a className="navbar-brand" href="/">
          <span className="logo-icon">⚡</span>
          Dhaka Tesla Pool
        </a>
        <div className="navbar-actions">
          <LangSwitcher />
          {user ? (
            <>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {user.name}
              </span>
              <a href={user.role === 'DRIVER' ? '/driver' : '/passenger'} className="btn btn-primary btn-sm">
                {t('myDashboard')}
              </a>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary btn-sm">{t('signIn')}</Link>
              <Link href="/register" className="btn btn-primary btn-sm">{t('getStarted')}</Link>
            </>
          )}
        </div>
      </nav>

      <main>
        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="hero" style={{ paddingBottom: '2rem' }}>

          {/* Floating orbs behind hero */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
            <div style={{
              position: 'absolute', top: '10%', left: '15%',
              width: '480px', height: '480px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,230,118,0.07) 0%, transparent 70%)',
              filter: 'blur(40px)',
              animation: 'ambientDrift 10s ease-in-out infinite alternate',
            }} />
            <div style={{
              position: 'absolute', top: '20%', right: '10%',
              width: '340px', height: '340px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)',
              filter: 'blur(40px)',
              animation: 'ambientDrift 14s ease-in-out infinite alternate-reverse',
            }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="hero-tag">
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)', animation: 'pulse 2s ease infinite' }} />
              Now live in Banani · Gulshan · Mohakhali
            </div>

            <h1 className="hero-title">
              {t('heroTitle1')}<br />
              {t('heroTitle2')}<br />
              <span className="highlight">{t('heroTitle3')}</span>
            </h1>

            <p className="hero-sub">{t('heroSub')}</p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', animation: 'fadeInUp 0.7s ease 0.3s both' }}>
              <Link
                href={user ? '/passenger' : '/register?role=PASSENGER'}
                className="btn btn-primary btn-xl"
              >
                ⚡ {t('bookRide')}
              </Link>
              <Link
                href={user ? '/driver' : '/register?role=DRIVER'}
                className="btn btn-secondary btn-xl"
              >
                🚗 {t('driveWithUs')}
              </Link>
            </div>

            {/* Stats row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '40px', marginTop: '3.5rem',
              animation: 'fadeInUp 0.7s ease 0.45s both',
              flexWrap: 'wrap',
            }}>
              {[
                { value: '3,200+', label: 'Rides pooled' },
                { value: '৳18L', label: 'Fares saved' },
                { value: '9 zones', label: 'Across Dhaka' },
                { value: '4.9 ★', label: 'Driver rating' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 800, fontSize: '1.625rem',
                    color: 'var(--accent-primary)',
                    letterSpacing: '-0.04em', lineHeight: 1,
                  }}>{s.value}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Story card ──────────────────────────────────────────── */}
        <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 2rem' }}>
          <div className="card" style={{ borderColor: 'rgba(0,230,118,0.14)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: 'rgba(0,230,118,0.1)',
                  border: '1px solid rgba(0,230,118,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                }}>🕗</div>
                <div>
                  <div className="card-title">8:41 AM, Banani Road 11</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>A real morning in Dhaka</div>
                </div>
              </div>
              <span className="badge badge-in_progress">
                <span className="badge-dot" />
                Live story
              </span>
            </div>
            <div className="card-body" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                <p>
                  Jashim is leaning against <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Bullet</strong>, his three-seat,
                  battery-powered, entirely unaffiliated "Tesla." Nusrat, already late, books
                  a ride to Mohakhali.
                </p>
                <p>
                  Two minutes later a stranger named Rafiq books almost the same route to Gulshan 1.
                  The app figures out — in about a second — whether these two can share a seat,
                  split the fare fairly, and survive a ten-minute ride together.
                </p>
                <p>
                  Then Shirin tries to grab the last seat thirty seconds later, and things get{' '}
                  <em style={{ color: 'var(--accent-primary)', fontStyle: 'italic' }}>properly interesting</em>.
                </p>
              </div>
              <div className="divider" style={{ margin: '1.5rem 0' }} />
              <div className="grid-3" style={{ gap: '0.875rem' }}>
                {[
                  { name: 'Nusrat Jahan', route: 'Banani → Mohakhali', role: 'Passenger', emoji: '👩' },
                  { name: 'Rafiq Islam',  route: 'Banani → Gulshan',   role: 'Passenger', emoji: '👨' },
                  { name: 'Jashim Uddin', route: 'Driver · Bullet',    role: 'Driver',    emoji: '🚗' },
                ].map((p) => (
                  <div key={p.name} className="passenger-chip">
                    <div className="passenger-avatar">{p.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '-0.01em' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{p.route}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────── */}
        <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 2.5rem' }}>
          <div className="grid-3" style={{ gap: '1rem' }}>
            {[
              {
                icon: '💰',
                gradient: 'linear-gradient(135deg, rgba(0,230,118,0.12), rgba(0,200,83,0.05))',
                border: 'rgba(0,230,118,0.18)',
                title: t('fairFares'),
                desc: t('fairFaresDesc'),
              },
              {
                icon: '🔒',
                gradient: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.04))',
                border: 'rgba(56,189,248,0.18)',
                title: t('privateDefault'),
                desc: t('privateDefaultDesc'),
              },
              {
                icon: '⚡',
                gradient: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.04))',
                border: 'rgba(251,146,60,0.18)',
                title: t('instantMatching'),
                desc: t('instantMatchingDesc'),
              },
            ].map((f) => (
              <div key={f.title} style={{
                background: f.gradient,
                border: `1px solid ${f.border}`,
                borderRadius: 'var(--r-xl)',
                padding: '1.75rem',
                textAlign: 'center',
                transition: 'transform var(--t-med), box-shadow var(--t-med)',
                cursor: 'default',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <div style={{
                  fontSize: '2.25rem', marginBottom: '1rem',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
                }}>{f.icon}</div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700, marginBottom: '0.6rem',
                  fontSize: '1rem', letterSpacing: '-0.01em',
                }}>{f.title}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800, fontSize: '1.625rem',
              letterSpacing: '-0.035em', color: 'var(--text-primary)',
            }}>How it works</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9375rem' }}>Three steps to a cheaper commute</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { step: '01', icon: '📍', title: 'Book your zone', desc: 'Pick your pickup and drop-off from 9 Dhaka zones. Get an instant fare estimate — solo vs. pooled.' },
              { step: '02', icon: '🔀', title: 'We match your ride', desc: 'Our engine pairs you with neighbours heading the same way. Pool discount applied automatically.' },
              { step: '03', icon: '⚡', title: 'Track & ride', desc: 'Watch your driver approach on the live map. Get notified when they arrive. Arrive together, pay less.' },
            ].map((step) => (
              <div key={step.step} style={{
                display: 'flex', alignItems: 'flex-start', gap: '1.25rem',
                padding: '1.25rem 1.5rem',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-lg)',
                transition: 'all var(--t-med)',
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'var(--bg-glass-hover)';
                  el.style.borderColor = 'var(--border-color)';
                  el.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'var(--bg-glass)';
                  el.style.borderColor = 'var(--border-subtle)';
                  el.style.transform = '';
                }}
              >
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.7rem', fontWeight: 600,
                  color: 'var(--accent-primary)', opacity: 0.7,
                  minWidth: 28, paddingTop: 4,
                }}>{step.step}</div>
                <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>{step.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>{step.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <p style={{
              color: 'var(--text-muted)', fontSize: '0.775rem',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.04em',
            }}>
              {t('demoCredentials')}: jashim@teslapool.dhaka / Bullet@2024 &nbsp;·&nbsp; nusrat@teslapool.dhaka / Nusrat@2024
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.75rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
        background: 'rgba(6,9,18,0.6)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.25rem' }}>⚡</span>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.02em' }}>Dhaka Tesla Pool</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace" }}>
          © 2024 · Banani · Gulshan · Mohakhali
        </p>
      </footer>
    </div>
  );
}
