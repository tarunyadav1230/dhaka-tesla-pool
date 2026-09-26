/**
 * API client for Dhaka Tesla Pool
 * All fetch calls go through here for consistent error handling and auth headers.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'Request failed', data.details);
  }

  return data.data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'PASSENGER' | 'DRIVER';
  walletBalancePaisa: number;
  tesla?: Tesla;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const auth = {
  register: (data: { name: string; email: string; password: string; phone: string; role: string }) =>
    apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: (token: string) => apiFetch<User>('/auth/me', {}, token),
};

// ── Areas ─────────────────────────────────────────────────────────────────────

export interface Area {
  name: string;
  zone: string;
  lat: number;
  lng: number;
}

export interface FareEstimate {
  pickup: string;
  dropoff: string;
  soloFare: { finalFarePaisa: number; bdt: string; distanceKm: number; poolDiscountPaisa: number; grossFarePaisa: number; };
  poolFare: { finalFarePaisa: number; bdt: string; distanceKm: number; poolDiscountPaisa: number; grossFarePaisa: number; };
}

export const areas = {
  list: () => apiFetch<Area[]>('/areas'),
  fareEstimate: (pickup: string, dropoff: string) =>
    apiFetch<FareEstimate>(`/areas/fare-estimate?pickup=${pickup}&dropoff=${dropoff}`),
};

// ── Rides (Passenger) ─────────────────────────────────────────────────────────

export interface RideRequest {
  id: string;
  passengerId: string;
  pickupArea: string;
  dropoffArea: string;
  seatsRequested: number;
  status: 'REQUESTED' | 'MATCHED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  estimatedFarePaisa: number;
  actualFarePaisa: number | null;
  paymentMethod: 'CASH' | 'TESLA_PAY';
  paymentStatus: 'PENDING' | 'PAID';
  cancelReason: string | null;
  createdAt: string;
  membership?: PoolMembership;
  statusEvents?: RideStatusEvent[];
}

export interface RideStatusEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export interface Tesla {
  id: string;
  driverId: string;
  name: string;
  licensePlate: string;
  capacity: number;
  isOnline: boolean;
}

export interface Pool {
  id: string;
  teslaId: string;
  status: 'OPEN' | 'MATCHED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  occupiedSeats: number;
  startedAt: string | null;
  completedAt: string | null;
  tesla?: Tesla & { driver: { id: string; name: string; phone: string } };
  memberships?: PoolMembership[];
}

export interface PoolMembership {
  id: string;
  poolId: string;
  farePaisa: number;
  pickupOrder: number;
  dropoffOrder: number;
  pool?: Pool;
  rideRequest?: RideRequest & { passenger?: { id: string; name: string; phone: string } };
}

export interface RequestRideResponse {
  rideRequest: RideRequest;
  fareBreakdown: {
    distanceKm: number;
    estimatedBdt: string;
    pooledEstimatedBdt: string;
    grossFarePaisa: number;
    finalFarePaisa: number;
  };
}

export const rides = {
  request: (data: { pickupArea: string; dropoffArea: string; seatsRequested?: number; paymentMethod?: string }, token: string) =>
    apiFetch<RequestRideResponse>('/rides/request', { method: 'POST', body: JSON.stringify(data) }, token),

  list: (token: string) => apiFetch<RideRequest[]>('/rides', {}, token),

  get: (id: string, token: string) => apiFetch<RideRequest>(`/rides/${id}`, {}, token),

  cancel: (id: string, reason: string, token: string) =>
    apiFetch<{ message: string }>(`/rides/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }, token),
};

// ── Driver ────────────────────────────────────────────────────────────────────

export interface PendingRequestsResponse {
  tesla: Tesla;
  pendingRides: (RideRequest & { passenger: { id: string; name: string; phone: string } })[];
}

export interface DriverPoolsResponse {
  tesla: Tesla;
  pools: Pool[];
}

export const driver = {
  setOnlineStatus: (isOnline: boolean, token: string) =>
    apiFetch<{ tesla: Tesla; message: string }>('/driver/tesla/status', {
      method: 'PATCH',
      body: JSON.stringify({ isOnline }),
    }, token),

  getPendingRequests: (token: string) =>
    apiFetch<PendingRequestsResponse>('/driver/requests', {}, token),

  acceptRides: (rideRequestIds: string[], token: string) =>
    apiFetch<{ pool: Pool; message: string }>('/driver/pools/accept', {
      method: 'POST',
      body: JSON.stringify({ rideRequestIds }),
    }, token),

  getPools: (token: string) => apiFetch<DriverPoolsResponse>('/driver/pools', {}, token),

  getPool: (poolId: string, token: string) => apiFetch<Pool>(`/driver/pools/${poolId}`, {}, token),

  updatePoolStatus: (poolId: string, status: string, token: string) =>
    apiFetch<{ pool: Pool; message: string }>(`/driver/pools/${poolId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, token),
};
