'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') || 'PASSENGER';

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: defaultRole,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              <span style={{ background: 'linear-gradient(135deg, #00e676, #69f0ae)', borderRadius: '8px', width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(0,230,118,0.4)' }}>⚡</span>
              Dhaka Tesla Pool
            </div>
          </Link>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9375rem' }}>Create your account</p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">⚠️ {error}</div>}

              <div className="form-group">
                <label className="form-label" htmlFor="reg-role">I am a</label>
                <select id="reg-role" name="role" className="form-select" value={form.role} onChange={handleChange}>
                  <option value="PASSENGER">Passenger</option>
                  <option value="DRIVER">Driver</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full name</label>
                <input id="reg-name" name="name" type="text" className="form-input" placeholder="Nusrat Jahan" value={form.name} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email address</label>
                <input id="reg-email" name="email" type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-phone">Mobile number</label>
                <input id="reg-phone" name="phone" type="tel" className="form-input" placeholder="+8801711234567" value={form.phone} onChange={handleChange} required />
                <span className="form-error" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Format: +8801XXXXXXXXX</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password</label>
                <input id="reg-password" name="password" type="password" className="form-input" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? (
                  <><span className="spinner" style={{ width: '16px', height: '16px' }} /> Creating account...</>
                ) : 'Create account →'}
              </button>
            </form>

            <div className="divider" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="loading-center"><div className="spinner" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
