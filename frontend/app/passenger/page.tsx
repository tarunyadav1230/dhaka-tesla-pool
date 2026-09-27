'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { rides, areas, Area, RideRequest, ApiError } from '@/lib/api';
import LangSwitcher from '@/components/LangSwitcher';
import dynamic from 'next/dynamic';

// Leaflet must be loaded client-side only (no SSR)
const RideMap = dynamic(() => import('@/components/RideMap'), { ssr: false });

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Searching for driver...',
  MATCHED: 'Driver assigned',
  DRIVER_ARRIVED: 'Driver has arrived!',
  IN_PROGRESS: 'On the way',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Cancelled',
};

const CANCEL_ALLOWED = ['REQUESTED', 'MATCHED'];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(status) && (
        <span className="badge-dot" />
      )}
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function RideCard({ ride, onCancel }: { ride: RideRequest; onCancel: (id: string) => void }) {
  const fare = ride.membership?.farePaisa ?? ride.estimatedFarePaisa;
  const fareBdt = (fare / 100).toFixed(2);
  const isPooled = (ride.membership?.pool?.memberships?.length ?? 0) > 1;

  return (
    <div className="ride-card" style={{ cursor: 'default' }}>
      <div className="flex justify-between items-center mb-4">
        <div className="ride-route">
          <span>📍 {ride.pickupArea}</span>
          <span className="arrow">→</span>
          <span>🏁 {ride.dropoffArea}</span>
        </div>
        <StatusBadge status={ride.status} />
      </div>

      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        {STATUS_LABELS[ride.status]}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted" style={{ marginBottom: '12px' }}>
        <span>💺 {ride.seatsRequested} seat{ride.seatsRequested > 1 ? 's' : ''}</span>
        <span>{ride.paymentMethod === 'CASH' ? '💵 Cash' : '💳 TeslaPay'}</span>
        {isPooled && <span style={{ color: 'var(--accent-primary)' }}>🔀 Pooled</span>}
      </div>

      {/* Driver info */}
      {ride.membership?.pool?.tesla && (
        <div style={{ background: 'var(--bg-glass)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '0.875rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            🚗 {ride.membership.pool.tesla.name} — {ride.membership.pool.tesla.licensePlate}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Driver: {ride.membership.pool.tesla.driver?.name} · {ride.membership.pool.tesla.driver?.phone}
          </div>
        </div>
      )}

      {/* ── Live Map ──────────────────────────────────────────────── */}
      {['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(ride.status) && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            🗺️ Live location
          </div>
          <RideMap
            status={ride.status as 'REQUESTED' | 'MATCHED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'}
            pickupArea={ride.pickupArea}
            dropoffArea={ride.dropoffArea}
            driverName={ride.membership?.pool?.tesla?.driver?.name}
            vehicleName={ride.membership?.pool?.tesla?.name}
          />
        </div>
      )}


      <div className="flex justify-between items-center" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <div>
          <div className="fare-amount" style={{ fontSize: '1.5rem' }}>৳{fareBdt}</div>
          {isPooled && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>✓ Pool discount applied</div>
          )}
        </div>
        {CANCEL_ALLOWED.includes(ride.status) && (
          <button className="btn btn-danger btn-sm" onClick={() => onCancel(ride.id)}>
            Cancel ride
          </button>
        )}
      </div>

      {/* Status timeline */}
      {ride.statusEvents && ride.statusEvents.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div className="timeline">
            {ride.statusEvents.map((ev, idx) => (
              <div key={ev.id} className={`timeline-item ${idx === ride.statusEvents!.length - 1 ? 'active' : 'completed'}`}>
                <div className="timeline-time">{new Date(ev.createdAt).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="timeline-label">{ev.toStatus.replace(/_/g, ' ')}</div>
                {ev.note && <div className="timeline-note">{ev.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestRideModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuth();
  const [areaList, setAreaList] = useState<Area[]>([]);
  const [form, setForm] = useState({
    pickupArea: '',
    dropoffArea: '',
    paymentMethod: 'CASH',
    rideType: 'POOL',   // 'SOLO' | 'POOL'
    seatsRequested: 1,
  });
  const [fareEst, setFareEst] = useState<{ solo: string; pooled: string; distKm: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    areas.list().then(setAreaList).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.pickupArea && form.dropoffArea && form.pickupArea !== form.dropoffArea) {
      areas.fareEstimate(form.pickupArea, form.dropoffArea).then((est) => {
        setFareEst({
          solo:   est.soloFare.bdt,
          pooled: est.poolFare.bdt,
          distKm: Number(est.soloFare.distanceKm).toFixed(1),
        });
      }).catch(() => setFareEst(null));
    } else {
      setFareEst(null);
    }
  }, [form.pickupArea, form.dropoffArea]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await rides.request({
        pickupArea:     form.pickupArea,
        dropoffArea:    form.dropoffArea,
        paymentMethod:  form.paymentMethod,
        seatsRequested: form.seatsRequested,
      }, token!);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to request ride');
    } finally {
      setLoading(false);
    }
  }

  const isPool = form.rideType === 'POOL';
  const displayFare = fareEst ? (isPool ? fareEst.pooled : fareEst.solo) : null;
  const savingPct   = 20; // pool discount

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(2, 4, 10, 0.8)',
      backdropFilter: 'blur(16px)',
      zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 180ms ease',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(0,230,118,0.12)',
              border: '1px solid rgba(0,230,118,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            }}>⚡</div>
            <span className="card-title">Request a ride</span>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm">✕</button>
        </div>

        <div className="card-body" style={{ padding: '1.5rem' }}>
          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>

            {/* ── Ride Type Toggle ──────────────────────────── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="form-label" style={{ marginBottom: 10 }}>Ride type</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {(['POOL', 'SOLO'] as const).map((type) => {
                  const active = form.rideType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, rideType: type }))}
                      style={{
                        padding: '14px 12px',
                        borderRadius: 'var(--r-md)',
                        border: active
                          ? '2px solid var(--accent-primary)'
                          : '1px solid var(--border-color)',
                        background: active
                          ? 'rgba(0,230,118,0.08)'
                          : 'var(--bg-glass)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 180ms ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {active && (
                        <div style={{
                          position: 'absolute', top: 8, right: 10,
                          width: 18, height: 18, borderRadius: '50%',
                          background: 'var(--accent-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.65rem', color: '#02040a', fontWeight: 800,
                        }}>✓</div>
                      )}
                      <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>
                        {type === 'POOL' ? '🔀' : '🚗'}
                      </div>
                      <div style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700, fontSize: '0.9rem',
                        color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
                        letterSpacing: '-0.01em',
                      }}>
                        {type === 'POOL' ? 'Share & Save' : 'Solo ride'}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: type === 'POOL' ? 'var(--accent-secondary)' : 'var(--text-muted)',
                        marginTop: 3,
                      }}>
                        {type === 'POOL'
                          ? `Save up to ${savingPct}% by pooling`
                          : 'Private — no sharing'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Seats Requested ───────────────────────────── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="form-label" style={{ marginBottom: 10 }}>
                Seats needed
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>
                  (max 3 per booking)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3].map((n) => {
                  const active = form.seatsRequested === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, seatsRequested: n }))}
                      style={{
                        flex: 1, padding: '12px 0',
                        borderRadius: 'var(--r-sm)',
                        border: active
                          ? '2px solid var(--accent-primary)'
                          : '1px solid var(--border-color)',
                        background: active ? 'rgba(0,230,118,0.09)' : 'var(--bg-glass)',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 4,
                        transition: 'all 160ms ease',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>
                        {n === 1 ? '🧍' : n === 2 ? '🧍‍♂️🧍' : '👨‍👩‍👦'}
                      </span>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700, fontSize: '0.875rem',
                        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}>
                        {n} {n === 1 ? 'seat' : 'seats'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Pickup / Dropoff ──────────────────────────── */}
            <div className="form-group">
              <label className="form-label" htmlFor="req-pickup">📍 Pickup area</label>
              <select
                id="req-pickup"
                className="form-select"
                value={form.pickupArea}
                onChange={(e) => setForm(f => ({ ...f, pickupArea: e.target.value }))}
                required
              >
                <option value="">Select pickup area</option>
                {areaList.map((a) => <option key={a.name} value={a.name}>{a.name} (Zone {a.zone})</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-dropoff">🏁 Drop-off area</label>
              <select
                id="req-dropoff"
                className="form-select"
                value={form.dropoffArea}
                onChange={(e) => setForm(f => ({ ...f, dropoffArea: e.target.value }))}
                required
              >
                <option value="">Select drop-off area</option>
                {areaList.filter(a => a.name !== form.pickupArea).map((a) => (
                  <option key={a.name} value={a.name}>{a.name} (Zone {a.zone})</option>
                ))}
              </select>
            </div>

            {/* ── Fare Estimate ─────────────────────────────── */}
            {fareEst && (
              <div style={{
                background: isPool
                  ? 'linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,200,83,0.04))'
                  : 'var(--bg-glass)',
                border: `1px solid ${isPool ? 'rgba(0,230,118,0.22)' : 'var(--border-color)'}`,
                borderRadius: 'var(--r-lg)',
                padding: '1.25rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      {isPool ? '🔀 Pooled fare estimate' : '🚗 Solo fare estimate'} · {fareEst.distKm} km
                    </div>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 800, fontSize: '2.25rem',
                      color: isPool ? 'var(--accent-primary)' : 'var(--text-primary)',
                      letterSpacing: '-0.04em', lineHeight: 1,
                    }}>
                      ৳{displayFare}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      per seat · {form.seatsRequested} seat{form.seatsRequested > 1 ? 's' : ''} total
                    </div>
                  </div>
                  {isPool && (
                    <div style={{
                      background: 'rgba(0,230,118,0.15)',
                      border: '1px solid rgba(0,230,118,0.3)',
                      borderRadius: 'var(--r-full)',
                      padding: '4px 12px',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: 'var(--accent-primary)',
                      whiteSpace: 'nowrap',
                    }}>
                      −{savingPct}% off
                    </div>
                  )}
                </div>
                {isPool && (
                  <div style={{
                    marginTop: '0.875rem', paddingTop: '0.875rem',
                    borderTop: '1px solid rgba(0,230,118,0.12)',
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.8125rem', color: 'var(--text-muted)',
                  }}>
                    <span>Solo would be ৳{fareEst.solo}</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                      You save ৳{(parseFloat(fareEst.solo) - parseFloat(fareEst.pooled)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Payment Method ────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" htmlFor="req-payment">Payment method</label>
              <select
                id="req-payment"
                className="form-select"
                value={form.paymentMethod}
                onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              >
                <option value="CASH">💵 Cash</option>
                <option value="TESLA_PAY">💳 TeslaPay (wallet)</option>
              </select>
            </div>

            {/* ── Summary pill ──────────────────────────────── */}
            {form.pickupArea && form.dropoffArea && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', marginBottom: '1rem',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-sm)',
                fontSize: '0.8125rem', color: 'var(--text-secondary)',
              }}>
                <span>📍 <strong style={{ color: 'var(--text-primary)' }}>{form.pickupArea}</strong></span>
                <span style={{ color: 'var(--accent-primary)' }}>→</span>
                <span>🏁 <strong style={{ color: 'var(--text-primary)' }}>{form.dropoffArea}</strong></span>
                <span style={{ marginLeft: 'auto' }}>
                  {form.seatsRequested} × {isPool ? '🔀' : '🚗'}
                </span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || !form.pickupArea || !form.dropoffArea}
              style={{ marginTop: '0.25rem' }}
            >
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Requesting...</>
                : `⚡ Request ${isPool ? 'pool' : 'solo'} ride →`}
            </button>

            {isPool && (
              <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Pool discount applied automatically when matched with another rider
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}



export default function PassengerDashboard() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();
  const [myRides, setMyRides] = useState<RideRequest[]>([]);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.role === 'DRIVER') router.replace('/driver');
  }, [user, loading, router]);

  const fetchRides = useCallback(async () => {
    if (!token) return;
    try {
      const data = await rides.list(token);
      setMyRides(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRidesLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  // Poll for status updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchRides, 5000);
    return () => clearInterval(interval);
  }, [fetchRides]);

  async function handleCancel(rideId: string) {
    if (!window.confirm('Cancel this ride?')) return;
    setCancelLoading(rideId);
    try {
      await rides.cancel(rideId, 'Cancelled by passenger', token!);
      fetchRides();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setCancelLoading(null);
    }
  }

  if (loading || !user) return <div className="loading-center"><div className="spinner" /></div>;

  const activeRides = myRides.filter(r => !['COMPLETED', 'CANCELLED'].includes(r.status));
  const pastRides = myRides.filter(r => ['COMPLETED', 'CANCELLED'].includes(r.status));

  return (
    <div className="page-container">
      <nav className="navbar">
        <a className="navbar-brand" href="/">
          <span className="logo-icon">⚡</span>
          Dhaka Tesla Pool
        </a>
        <div className="navbar-actions">
          <LangSwitcher />
          <a href="/" className="btn btn-secondary btn-sm">← Home</a>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            👋 {user.name}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>Sign out</button>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1 className="page-title">My Rides</h1>
          <p className="page-subtitle">Track your journeys across Dhaka</p>
        </div>

        {error && <div className="alert alert-error" style={{ maxWidth: '600px' }}>⚠️ {error}</div>}

        {/* CTA */}
        {activeRides.length === 0 && (
          <div className="card mb-6" style={{ maxWidth: '600px' }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚗</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                Ready to ride?
              </div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                Book a Tesla, split the fare with Banani neighbours.
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
                ⚡ Request a ride
              </button>
            </div>
          </div>
        )}

        {activeRides.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '1.1rem' }}>Active rides</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New ride</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeRides.map((r) => <RideCard key={r.id} ride={r} onCancel={handleCancel} />)}
            </div>
          </div>
        )}

        {ridesLoading && (
          <div className="loading-center"><div className="spinner" /><span>Loading rides...</span></div>
        )}

        {pastRides.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '1.1rem', marginBottom: '1rem' }}>
              Ride history
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pastRides.map((r) => <RideCard key={r.id} ride={r} onCancel={handleCancel} />)}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <RequestRideModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchRides(); }}
        />
      )}
    </div>
  );
}
