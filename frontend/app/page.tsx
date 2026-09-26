'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'DRIVER') router.replace('/driver');
      else router.replace('/passenger');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-center">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Navbar */}
      <nav className="navbar">
        <a className="navbar-brand" href="/">
          <span className="logo-icon">⚡</span>
          Dhaka Tesla Pool
        </a>
        <div className="navbar-actions">
          <Link href="/login" className="btn btn-secondary btn-sm">Sign in</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main>
        <section className="hero">
          <div className="hero-tag">
            <span>⚡</span>
            Now live in Banani, Gulshan & Mohakhali
          </div>
          <h1 className="hero-title">
            Share a seat.<br />
            Split the fare.<br />
            <span className="highlight">Survive Dhaka traffic.</span>
          </h1>
          <p className="hero-sub">
            Dhaka Tesla Pool connects you with neighbours heading the same way.
            Pool rides, pay less, arrive together.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register?role=PASSENGER" className="btn btn-primary btn-lg">
              Book a ride →
            </Link>
            <Link href="/register?role=DRIVER" className="btn btn-secondary btn-lg">
              Drive with us
            </Link>
          </div>
        </section>

        {/* Story */}
        <section style={{ maxWidth: '760px', margin: '0 auto', padding: '0 1.5rem 5rem' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">🕗 8:41 AM, Banani Road 11</span>
              <span className="badge badge-in_progress">
                <span className="badge-dot" />
                Live story
              </span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', lineHeight: 1.75, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                <p>
                  Jashim is leaning against <strong style={{ color: 'var(--text-primary)' }}>Bullet</strong>, his three-seat,
                  battery-powered, entirely unaffiliated "Tesla." Nusrat, already late, books
                  a ride to Mohakhali.
                </p>
                <p>
                  Two minutes later a stranger named Rafiq books almost the same route to Gulshan 1.
                  The app figures out — in about a second — whether these two can share a seat,
                  split the fare fairly, and survive a ten-minute ride.
                </p>
                <p>
                  Then Shirin tries to grab the last seat thirty seconds later, and things get{' '}
                  <em>properly interesting</em>.
                </p>
              </div>
              <div className="divider" />
              <div className="grid-3" style={{ gap: '0.75rem' }}>
                {[
                  { name: 'Nusrat Jahan', route: 'Banani → Mohakhali', role: 'Passenger', emoji: '👩' },
                  { name: 'Rafiq Islam', route: 'Banani → Gulshan', role: 'Passenger', emoji: '👨' },
                  { name: 'Jashim Uddin', route: 'Driver · Bullet', role: 'Driver', emoji: '🚗' },
                ].map((p) => (
                  <div key={p.name} className="passenger-chip">
                    <div className="passenger-avatar">{p.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.route}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid-3 mt-6">
            {[
              { icon: '💰', title: 'Fair fares', desc: 'Each passenger pays their own rate. Pool discount applied automatically.' },
              { icon: '🔒', title: 'Private by default', desc: 'You see your fare and status only. No peeking at your poolmates.' },
              { icon: '⚡', title: 'Instant matching', desc: 'Compatible routes get matched in seconds. Zone-based, no map API.' },
            ].map((f) => (
              <div key={f.title} className="card">
                <div className="card-body" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{f.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Demo credentials — Driver: jashim@teslapool.dhaka / Bullet@2024 ·
              Passenger: nusrat@teslapool.dhaka / Nusrat@2024
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
