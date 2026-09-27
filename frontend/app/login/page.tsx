'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { useLang } from '@/lib/lang-context';
import LangSwitcher from '@/components/LangSwitcher';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { t } = useLang();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(user.role === 'DRIVER' ? '/driver' : '/passenger');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              <span style={{ background: 'linear-gradient(135deg, #00e676, #69f0ae)', borderRadius: '8px', width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(0,230,118,0.4)' }}>⚡</span>
              Dhaka Tesla Pool
            </div>
          </Link>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}><LangSwitcher /></div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9375rem' }}>
            {t('signInToContinue')}
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-error">
                  ⚠️ {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="login-email">{t('emailAddress')}</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">{t('password')}</label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px' }} />
                    {t('signingIn')}
                  </>
                ) : t('signInBtn')}
              </button>
            </form>

            <div className="divider" />

            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {t('noAccount')}{' '}
                <Link href="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
                  {t('signUp')}
                </Link>
              </p>
            </div>

            <div className="divider" />

            {/* Demo credentials */}
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{t('demoCredentials')}</p>
              {[
                { label: 'Driver (Jashim)', email: 'jashim@teslapool.dhaka', pw: 'Bullet@2024' },
                { label: 'Passenger (Nusrat)', email: 'nusrat@teslapool.dhaka', pw: 'Nusrat@2024' },
                { label: 'Passenger (Rafiq)', email: 'rafiq@teslapool.dhaka', pw: 'Rafiq@2024' },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px',
                    background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px',
                    fontSize: '0.8125rem', color: 'var(--text-secondary)',
                    transition: 'background 150ms ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-glass-hover)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{d.label}</span>
                  {' '}— {d.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
