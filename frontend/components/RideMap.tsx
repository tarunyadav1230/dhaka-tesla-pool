'use client';

/**
 * RideMap — live driver-tracking map for Dhaka Tesla Pool
 *
 * Uses Leaflet + OpenStreetMap (free, no API key).
 * Simulates driver movement based on ride status:
 *   MATCHED       → driver approaching pickup (animated)
 *   DRIVER_ARRIVED → driver pinned at pickup
 *   IN_PROGRESS   → driver moving toward dropoff (animated)
 *   COMPLETED     → driver at dropoff
 */

import { useEffect, useRef, useState } from 'react';

// All Dhaka area coordinates
const AREA_COORDS: Record<string, [number, number]> = {
  Banani:       [23.7937, 90.4066],
  Gulshan:      [23.7808, 90.4142],
  Mohakhali:    [23.7780, 90.4005],
  Bashundhara:  [23.8041, 90.4264],
  Dhanmondi:    [23.7461, 90.3742],
  Farmgate:     [23.7588, 90.3877],
  Motijheel:    [23.7232, 90.4185],
  Mirpur:       [23.8223, 90.3654],
  Uttara:       [23.8759, 90.3795],
};

type RideStatus =
  | 'REQUESTED'
  | 'MATCHED'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface Props {
  status: RideStatus;
  pickupArea: string;
  dropoffArea: string;
  driverName?: string;
  vehicleName?: string;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function randomNearby([lat, lng]: [number, number], radius = 0.012): [number, number] {
  return [
    lat + (Math.random() - 0.5) * radius * 2,
    lng + (Math.random() - 0.5) * radius * 2,
  ];
}

export default function RideMap({ status, pickupArea, dropoffArea, driverName, vehicleName }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import('leaflet').Map | null>(null);
  const driverMarkerRef = useRef<import('leaflet').Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const pickup = AREA_COORDS[pickupArea] ?? [23.7937, 90.4066];
  const dropoff = AREA_COORDS[dropoffArea] ?? [23.7808, 90.4142];

  // Driver start position: random nearby point when MATCHED
  const driverStartRef = useRef<[number, number]>(randomNearby(pickup));

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current) return;

    // Leaflet must be loaded client-side
    import('leaflet').then((L) => {
      // Fix Leaflet's broken icon paths in webpack bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Initialize map only once
      if (!leafletMapRef.current) {
        const center: [number, number] = [
          (pickup[0] + dropoff[0]) / 2,
          (pickup[1] + dropoff[1]) / 2,
        ];
        const map = L.map(mapRef.current!, {
          center,
          zoom: 14,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        // Attribution small
        L.control.attribution({ position: 'bottomright', prefix: '' })
          .addAttribution('© <a href="https://openstreetmap.org" target="_blank">OSM</a>')
          .addTo(map);

        leafletMapRef.current = map;
      }

      const map = leafletMapRef.current;

      // ── Custom icons ───────────────────────────────────────────────
      const greenIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:linear-gradient(135deg,#00e676,#69f0ae);
          border:3px solid #fff;
          box-shadow:0 2px 12px rgba(0,230,118,0.6);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
        ">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const redIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:linear-gradient(135deg,#ff5252,#ff867f);
          border:3px solid #fff;
          box-shadow:0 2px 12px rgba(255,82,82,0.6);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
        ">🏁</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const carIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:44px;height:44px;border-radius:50%;
          background:linear-gradient(135deg,#1565c0,#42a5f5);
          border:3px solid #fff;
          box-shadow:0 3px 16px rgba(66,165,245,0.7);
          display:flex;align-items:center;justify-content:center;
          font-size:22px;
          animation: pulse-car 1.5s ease-in-out infinite;
        ">⚡</div>
        <style>
          @keyframes pulse-car {
            0%,100%{transform:scale(1);box-shadow:0 3px 16px rgba(66,165,245,0.7);}
            50%{transform:scale(1.12);box-shadow:0 3px 24px rgba(66,165,245,0.9);}
          }
        </style>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      // ── Clear previous layers except tile ─────────────────────────
      map.eachLayer((layer) => {
        // @ts-expect-error _url is internal
        if (!layer._url) map.removeLayer(layer);
      });

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      // ── Draw pickup / dropoff markers ──────────────────────────────
      const pickupMarker = L.marker(pickup, { icon: greenIcon }).addTo(map);
      pickupMarker.bindPopup(`<b>📍 Pickup</b><br>${pickupArea}`);

      if (status !== 'REQUESTED' && status !== 'CANCELLED') {
        const dropoffMarker = L.marker(dropoff, { icon: redIcon }).addTo(map);
        dropoffMarker.bindPopup(`<b>🏁 Drop-off</b><br>${dropoffArea}`);
      }

      // ── Draw route polyline ────────────────────────────────────────
      if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
        L.polyline([pickup, dropoff], {
          color: '#42a5f5',
          weight: 4,
          opacity: 0.7,
          dashArray: '8 6',
        }).addTo(map);
      } else if (status === 'MATCHED' || status === 'DRIVER_ARRIVED') {
        // Driver → pickup route
        L.polyline([driverStartRef.current, pickup], {
          color: '#00e676',
          weight: 3,
          opacity: 0.6,
          dashArray: '6 5',
        }).addTo(map);
      }

      // ── Place / animate driver ─────────────────────────────────────
      let driverPos: [number, number];

      if (status === 'MATCHED') {
        driverPos = driverStartRef.current;
      } else if (status === 'DRIVER_ARRIVED') {
        driverPos = pickup;
      } else if (status === 'IN_PROGRESS') {
        driverPos = pickup; // will animate
      } else if (status === 'COMPLETED') {
        driverPos = dropoff;
      } else {
        // REQUESTED / CANCELLED — show pulsing "searching" at pickup
        driverPos = pickup;
      }

      if (status !== 'CANCELLED') {
        const marker = L.marker(driverPos, { icon: carIcon }).addTo(map);
        const name = vehicleName || 'Bullet';
        const driver = driverName || 'Jashim';
        marker.bindPopup(`<b>⚡ ${name}</b><br>Driver: ${driver}<br><span style="color:#00e676">Tesla Pool Car</span>`);
        driverMarkerRef.current = marker;

        // ── Animate driver movement ────────────────────────────────
        if (status === 'MATCHED') {
          // Animate from start → pickup over ~12 seconds
          const startTime = Date.now();
          const duration = 12000;
          const start = driverStartRef.current;
          const end = pickup;

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Ease in-out
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const pos: [number, number] = [
              lerp(start[0], end[0], ease),
              lerp(start[1], end[1], ease),
            ];
            driverMarkerRef.current?.setLatLng(pos);
            if (t < 1) animFrameRef.current = requestAnimationFrame(animate);
          };
          animFrameRef.current = requestAnimationFrame(animate);
        }

        if (status === 'IN_PROGRESS') {
          // Animate pickup → dropoff over ~20 seconds
          const startTime = Date.now();
          const duration = 20000;
          const start = pickup;
          const end = dropoff;

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const pos: [number, number] = [
              lerp(start[0], end[0], ease),
              lerp(start[1], end[1], ease),
            ];
            driverMarkerRef.current?.setLatLng(pos);
            if (t < 1) animFrameRef.current = requestAnimationFrame(animate);
          };
          animFrameRef.current = requestAnimationFrame(animate);
        }
      }

      // ── Fit map bounds ─────────────────────────────────────────────
      const allPoints: [number, number][] = [pickup];
      if (status !== 'REQUESTED' && status !== 'CANCELLED') allPoints.push(dropoff);
      if (status === 'MATCHED') allPoints.push(driverStartRef.current);
      map.fitBounds(L.latLngBounds(allPoints), { padding: [48, 48] });
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, status, pickupArea, dropoffArea]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  if (!mounted) return (
    <div style={{
      height: '340px',
      background: 'var(--bg-glass)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-muted)',
    }}>
      <div className="spinner" /> &nbsp; Loading map...
    </div>
  );

  return (
    <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      {/* Map container */}
      <div ref={mapRef} style={{ height: '340px', width: '100%' }} />

      {/* Status overlay badge */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        zIndex: 1000,
        background: 'rgba(15,17,23,0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}>
        <StatusBadge status={status} />
      </div>

      {/* Route info */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        zIndex: 1000,
        background: 'rgba(15,17,23,0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '8px 14px',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}>
        <span style={{ color: '#00e676' }}>📍 {pickupArea}</span>
        <span style={{ margin: '0 8px', opacity: 0.5 }}>→</span>
        <span style={{ color: '#ff7043' }}>🏁 {dropoffArea}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RideStatus }) {
  const cfg: Record<RideStatus, { icon: string; label: string; color: string }> = {
    REQUESTED:      { icon: '🔍', label: 'Finding driver...', color: '#ffc107' },
    MATCHED:        { icon: '🚗', label: 'Driver on the way', color: '#42a5f5' },
    DRIVER_ARRIVED: { icon: '📍', label: 'Driver arrived!',   color: '#00e676' },
    IN_PROGRESS:    { icon: '⚡', label: 'On your way',       color: '#00e676' },
    COMPLETED:      { icon: '✅', label: 'Trip complete',      color: '#69f0ae' },
    CANCELLED:      { icon: '❌', label: 'Cancelled',          color: '#ff5252' },
  };
  const { icon, label, color } = cfg[status] ?? cfg.REQUESTED;
  return (
    <>
      <span style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: color,
        display: 'inline-block',
        boxShadow: `0 0 6px ${color}`,
        animation: status === 'MATCHED' || status === 'IN_PROGRESS' ? 'ping 1s ease infinite' : 'none',
      }} />
      <span style={{ color }}>{icon} {label}</span>
    </>
  );
}
