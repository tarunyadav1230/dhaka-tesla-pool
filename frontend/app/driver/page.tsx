'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { driver, Pool, RideRequest, ApiError, Tesla } from '@/lib/api';
import LangSwitcher from '@/components/LangSwitcher';

type PendingRide = RideRequest & { passenger: { id: string; name: string; phone: string } };

const NEXT_POOL_STATUS: Record<string, { label: string; action: string; status: string }> = {
  MATCHED: { label: 'Mark Arrived', action: 'Mark as Arrived', status: 'DRIVER_ARRIVED' },
  DRIVER_ARRIVED: { label: 'Start Trip', action: 'Start Trip', status: 'IN_PROGRESS' },
  IN_PROGRESS: { label: 'Complete Trip', action: 'Complete Trip', status: 'COMPLETED' },
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status.toLowerCase().replace('_', '-')}`}>
      {['MATCHED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(status) && <span className="badge-dot" />}
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function PoolCard({ pool, onAdvance }: { pool: Pool; onAdvance: (poolId: string, status: string) => void }) {
  const nextAction = NEXT_POOL_STATUS[pool.status];
  const memberships = pool.memberships || [];
  const isActive = !['COMPLETED', 'CANCELLED'].includes(pool.status);

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-header">
        <div className="flex items-center gap-3">
          <span className="card-title">Pool</span>
          <StatusBadge status={pool.status} />
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          💺 {pool.occupiedSeats}/{pool.tesla?.capacity || '?'} seats
        </span>
      </div>
      <div className="card-body">
        {/* Passengers */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
            Passengers ({memberships.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {memberships.map((m, idx) => {
              const rr = m.rideRequest;
              if (!rr) return null;
              const fareBdt = (m.farePaisa / 100).toFixed(2);
              return (
                <div key={m.id} className="passenger-chip">
                  <div className="passenger-avatar">{rr.passenger?.name?.[0] || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {rr.passenger?.name} — ৳{fareBdt}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      📍 {rr.pickupArea} → 🏁 {rr.dropoffArea}
                      {memberships.length > 1 && ' · Pooled'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {rr.passenger?.phone}
                    </div>
                  </div>
                  <StatusBadge status={rr.status} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Fare summary */}
        {memberships.length > 0 && (
          <div style={{ background: 'var(--bg-glass)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            <div className="fare-row">
              <span style={{ color: 'var(--text-secondary)' }}>Total fares collected</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                ৳{(memberships.reduce((s, m) => s + m.farePaisa, 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Advance action */}
        {isActive && nextAction && (
          <button
            className="btn btn-primary btn-full"
            onClick={() => onAdvance(pool.id, nextAction.status)}
          >
            {nextAction.action} →
          </button>
        )}

        {pool.status === 'COMPLETED' && (
          <div className="alert alert-success" style={{ margin: 0 }}>
            ✅ Trip completed!
            {pool.completedAt && (
              <span style={{ marginLeft: '8px', fontSize: '0.8125rem', opacity: 0.8 }}>
                {new Date(pool.completedAt).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {pool.status === 'CANCELLED' && (
          <div className="alert alert-error" style={{ margin: 0 }}>❌ Pool cancelled</div>
        )}
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();

  const [tesla, setTesla] = useState<Tesla | null>(null);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedRides, setSelectedRides] = useState<Set<string>>(new Set());
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'requests' | 'pools'>('requests');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.role === 'PASSENGER') router.replace('/passenger');
  }, [user, loading, router]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      // Fetch pools
      const poolsData = await driver.getPools(token);
      setTesla(poolsData.tesla);
      setPools(poolsData.pools);

      // Fetch pending requests (only if online)
      if (poolsData.tesla.isOnline) {
        const reqData = await driver.getPendingRequests(token);
        setPendingRides(reqData.pendingRides);
      } else {
        setPendingRides([]);
      }
    } catch (err) {
      // If offline 403, that's expected
      if (!(err instanceof ApiError && err.status === 403)) {
        console.error(err);
      }
    } finally {
      setDataLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function toggleOnline() {
    if (!token || !tesla) return;
    try {
      const res = await driver.setOnlineStatus(!tesla.isOnline, token);
      setTesla(res.tesla);
      if (res.tesla.isOnline) fetchData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  async function handleAcceptRides() {
    if (!token || selectedRides.size === 0) return;
    setError('');
    try {
      await driver.acceptRides([...selectedRides], token);
      setSelectedRides(new Set());
      setTab('pools');
      fetchData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to accept rides');
    }
  }

  async function handleAdvancePool(poolId: string, status: string) {
    if (!token) return;
    setError('');
    try {
      await driver.updatePoolStatus(poolId, status, token);
      fetchData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  function toggleRideSelection(id: string) {
    setSelectedRides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading || !user) return <div className="loading-center"><div className="spinner" /></div>;

  const activePools = pools.filter(p => !['COMPLETED', 'CANCELLED'].includes(p.status));
  const pastPools = pools.filter(p => ['COMPLETED', 'CANCELLED'].includes(p.status));

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
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>🚗 {user.name}</span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>Sign out</button>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Driver Dashboard</h1>
          <p className="page-subtitle">Manage Bullet's rides and pools</p>
        </div>

        {error && <div className="alert alert-error" style={{ maxWidth: '700px' }}>⚠️ {error}</div>}

        {/* Tesla Status Card */}
        {tesla && (
          <div className="card mb-6" style={{ maxWidth: '700px' }}>
            <div className="card-body">
              <div className="flex justify-between items-center">
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.25rem' }}>
                    🚗 {tesla.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {tesla.licensePlate} · {tesla.capacity} seats
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${tesla.isOnline ? 'badge-online' : 'badge-offline'}`}>
                    {tesla.isOnline && <span className="badge-dot" />}
                    {tesla.isOnline ? 'Online' : 'Offline'}
                  </span>
                  <button
                    className={`btn btn-sm ${tesla.isOnline ? 'btn-danger' : 'btn-primary'}`}
                    onClick={toggleOnline}
                  >
                    {tesla.isOnline ? 'Go offline' : 'Go online'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs mb-6">
          <button className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
            Ride Requests {pendingRides.length > 0 && `(${pendingRides.length})`}
          </button>
          <button className={`tab ${tab === 'pools' ? 'active' : ''}`} onClick={() => setTab('pools')}>
            My Pools {activePools.length > 0 && `(${activePools.length})`}
          </button>
        </div>

        {dataLoading && <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>}

        {/* Ride Requests Tab */}
        {tab === 'requests' && !dataLoading && (
          <div style={{ maxWidth: '700px' }}>
            {!tesla?.isOnline ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔌</div>
                <div className="empty-state-title">Bullet is offline</div>
                <div className="empty-state-text">Go online to start seeing ride requests.</div>
              </div>
            ) : pendingRides.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <div className="empty-state-title">No pending requests</div>
                <div className="empty-state-text">Waiting for passengers in your area...</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Select one or more compatible rides to pool together (Bullet has {tesla?.capacity} seats).
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                  {pendingRides.map((ride) => (
                    <label key={ride.id} className={`ride-select-item ${selectedRides.has(ride.id) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedRides.has(ride.id)}
                        onChange={() => toggleRideSelection(ride.id)}
                      />
                      <div className="passenger-avatar">{ride.passenger.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{ride.passenger.name}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          📍 {ride.pickupArea} → 🏁 {ride.dropoffArea}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {ride.passenger.phone} · {ride.paymentMethod}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1rem' }}>
                          ৳{(ride.estimatedFarePaisa / 100).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>est. solo</div>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedRides.size > 0 && (
                  <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-accent)', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {selectedRides.size} ride{selectedRides.size > 1 ? 's' : ''} selected
                      {selectedRides.size > 1 && ' — will be pooled (20% discount each)'}
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleAcceptRides}
                  disabled={selectedRides.size === 0}
                >
                  Accept {selectedRides.size > 0 ? `${selectedRides.size} ride${selectedRides.size > 1 ? 's' : ''}` : 'selected rides'} →
                </button>
              </>
            )}
          </div>
        )}

        {/* Pools Tab */}
        {tab === 'pools' && !dataLoading && (
          <div style={{ maxWidth: '700px' }}>
            {activePools.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginBottom: '1rem' }}>
                  Active pools
                </h2>
                {activePools.map((p) => <PoolCard key={p.id} pool={p} onAdvance={handleAdvancePool} />)}
              </div>
            )}

            {activePools.length === 0 && pastPools.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🏊</div>
                <div className="empty-state-title">No pools yet</div>
                <div className="empty-state-text">Accept some rides from the Requests tab to create your first pool.</div>
              </div>
            )}

            {pastPools.length > 0 && (
              <div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginBottom: '1rem' }}>
                  Completed trips
                </h2>
                {pastPools.map((p) => <PoolCard key={p.id} pool={p} onAdvance={handleAdvancePool} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
