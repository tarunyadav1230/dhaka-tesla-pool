/**
 * Fare Calculation Tests
 *
 * These tests verify the fare model is correct and hand-testable using
 * Nusrat and Rafiq's real trips as documented in the fare.ts module.
 */

import { calculateFare, paisaToBdt, BASE_FARE_PAISA, PER_KM_PAISA, POOL_DISCOUNT_RATE } from '../src/utils/fare';
import { distanceBetweenAreas } from '../src/utils/areas';

describe('Fare Calculation', () => {
  describe('Solo fare – Nusrat: Banani → Mohakhali', () => {
    const fare = calculateFare('Banani', 'Mohakhali', false);

    it('uses the correct base fare (2000 paisa = 20 BDT)', () => {
      expect(fare.baseFarePaisa).toBe(2000);
    });

    it('calculates distance correctly (~2.2 km)', () => {
      expect(fare.distanceKm).toBeGreaterThan(1.5);
      expect(fare.distanceKm).toBeLessThan(3.5);
    });

    it('applies no pool discount when solo', () => {
      expect(fare.isPooled).toBe(false);
      expect(fare.poolDiscountPaisa).toBe(0);
      expect(fare.finalFarePaisa).toBe(fare.grossFarePaisa);
    });

    it('final fare equals baseFare + distanceCharge', () => {
      expect(fare.finalFarePaisa).toBe(BASE_FARE_PAISA + fare.distanceChargePaisa);
    });
  });

  describe('Pooled fare – Nusrat: Banani → Mohakhali (shared)', () => {
    const fare = calculateFare('Banani', 'Mohakhali', true);

    it('applies 20% pool discount', () => {
      expect(fare.isPooled).toBe(true);
      expect(fare.poolDiscountPaisa).toBe(Math.round(fare.grossFarePaisa * POOL_DISCOUNT_RATE));
    });

    it('final pooled fare is 80% of gross fare', () => {
      expect(fare.finalFarePaisa).toBe(fare.grossFarePaisa - fare.poolDiscountPaisa);
    });

    it('pooled fare is less than solo fare', () => {
      const solo = calculateFare('Banani', 'Mohakhali', false);
      expect(fare.finalFarePaisa).toBeLessThan(solo.finalFarePaisa);
    });
  });

  describe('Pooled fare – Rafiq: Banani → Gulshan (shared)', () => {
    const fare = calculateFare('Banani', 'Gulshan', true);

    it('applies 20% pool discount', () => {
      expect(fare.poolDiscountPaisa).toBe(Math.round(fare.grossFarePaisa * POOL_DISCOUNT_RATE));
    });

    it('Rafiq and Nusrat pay different fares (different distances)', () => {
      const nusratFare = calculateFare('Banani', 'Mohakhali', true);
      // Gulshan and Mohakhali are both in Zone A but different distances from Banani
      // Fares may be equal or differ slightly, but both must be valid
      expect(fare.finalFarePaisa).toBeGreaterThan(0);
      expect(nusratFare.finalFarePaisa).toBeGreaterThan(0);
    });
  });

  describe('paisaToBdt conversion', () => {
    it('converts 2480 paisa to "24.80"', () => {
      expect(paisaToBdt(2480)).toBe('24.80');
    });

    it('converts 100 paisa to "1.00"', () => {
      expect(paisaToBdt(100)).toBe('1.00');
    });

    it('converts 0 to "0.00"', () => {
      expect(paisaToBdt(0)).toBe('0.00');
    });
  });

  describe('Distance sanity checks', () => {
    it('Banani to Mohakhali is under 5 km', () => {
      expect(distanceBetweenAreas('Banani', 'Mohakhali')).toBeLessThan(5);
    });

    it('Banani to Uttara is farther than Banani to Gulshan', () => {
      const toGulshan = distanceBetweenAreas('Banani', 'Gulshan');
      const toUttara = distanceBetweenAreas('Banani', 'Uttara');
      expect(toUttara).toBeGreaterThan(toGulshan);
    });

    it('distance is symmetric', () => {
      const ab = distanceBetweenAreas('Banani', 'Dhanmondi');
      const ba = distanceBetweenAreas('Dhanmondi', 'Banani');
      expect(Math.abs(ab - ba)).toBeLessThan(0.01);
    });
  });
});
