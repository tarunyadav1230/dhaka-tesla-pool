/**
 * Fare Calculation Engine – Dhaka Tesla Pool
 *
 * Model (documented and hand-testable):
 *   baseFare         = 2000 paisa (20 BDT)
 *   distanceCharge   = round(distanceKm * 500) paisa  (5 BDT/km)
 *   grossFare        = baseFare + distanceCharge
 *   poolDiscount     = 20% if totalPassengers >= 2, else 0%
 *   passengerFare    = round(grossFare * (1 - poolDiscount))
 *
 * All amounts stored and returned as INTEGER paisa (1 BDT = 100 paisa).
 * Reason: avoids floating-point rounding errors in money arithmetic.
 *
 * Example (hand-testable with Nusrat & Rafiq):
 *   Nusrat:  Banani → Mohakhali  ≈ 2.2 km
 *     grossFare = 2000 + round(2.2 * 500) = 2000 + 1100 = 3100 paisa
 *     pooled    = round(3100 * 0.80)      = 2480 paisa  (24.80 BDT)
 *
 *   Rafiq:   Banani → Gulshan    ≈ 2.0 km
 *     grossFare = 2000 + round(2.0 * 500) = 2000 + 1000 = 3000 paisa
 *     pooled    = round(3000 * 0.80)      = 2400 paisa  (24.00 BDT)
 */

import { distanceBetweenAreas } from './areas';

const BASE_FARE_PAISA = 2000;          // 20 BDT
const PER_KM_PAISA = 500;             // 5 BDT/km
const POOL_DISCOUNT_RATE = 0.20;      // 20% discount when sharing

export interface FareBreakdown {
  baseFarePaisa: number;
  distanceKm: number;
  distanceChargePaisa: number;
  grossFarePaisa: number;
  isPooled: boolean;
  poolDiscountPaisa: number;
  finalFarePaisa: number;
}

/**
 * Calculate individual passenger fare.
 *
 * @param pickupArea   Named Dhaka area
 * @param dropoffArea  Named Dhaka area
 * @param isPooled     Whether this ride is being shared
 */
export function calculateFare(
  pickupArea: string,
  dropoffArea: string,
  isPooled: boolean = false
): FareBreakdown {
  const distanceKm = distanceBetweenAreas(pickupArea, dropoffArea);
  const distanceChargePaisa = Math.round(distanceKm * PER_KM_PAISA);
  const grossFarePaisa = BASE_FARE_PAISA + distanceChargePaisa;
  const poolDiscountPaisa = isPooled ? Math.round(grossFarePaisa * POOL_DISCOUNT_RATE) : 0;
  const finalFarePaisa = grossFarePaisa - poolDiscountPaisa;

  return {
    baseFarePaisa: BASE_FARE_PAISA,
    distanceKm: Math.round(distanceKm * 100) / 100,
    distanceChargePaisa,
    grossFarePaisa,
    isPooled,
    poolDiscountPaisa,
    finalFarePaisa,
  };
}

/**
 * Convert paisa to BDT string for display.
 * e.g. 2480 → "24.80"
 */
export function paisaToBdt(paisa: number): string {
  return (paisa / 100).toFixed(2);
}

export { BASE_FARE_PAISA, PER_KM_PAISA, POOL_DISCOUNT_RATE };
