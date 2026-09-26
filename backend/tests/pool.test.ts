/**
 * Pool Matching & Route Compatibility Tests
 */

import { areRoutesCompatible, AREAS } from '../src/utils/areas';

describe('Pool Route Compatibility', () => {
  describe('The Banani story (Nusrat + Rafiq)', () => {
    it('Nusrat (Banani→Mohakhali) and Rafiq (Banani→Gulshan) are compatible', () => {
      // Both pickup in Zone A, both dropoff in Zone A
      expect(areRoutesCompatible('Banani', 'Mohakhali', 'Banani', 'Gulshan')).toBe(true);
    });

    it('is symmetric: Rafiq + Nusrat also compatible', () => {
      expect(areRoutesCompatible('Banani', 'Gulshan', 'Banani', 'Mohakhali')).toBe(true);
    });
  });

  describe('Incompatible routes', () => {
    it('rejects when pickups are in different zones (Zone A vs Zone C)', () => {
      // Banani is Zone A, Uttara is Zone C
      expect(areRoutesCompatible('Banani', 'Gulshan', 'Uttara', 'Mirpur')).toBe(false);
    });

    it('rejects when dropoffs span more than one zone boundary', () => {
      // Zone A pickup, Zone A dropoff1, Zone C dropoff2 (too far)
      expect(areRoutesCompatible('Banani', 'Gulshan', 'Banani', 'Uttara')).toBe(false);
    });
  });

  describe('Adjacent-zone dropoffs (allowed)', () => {
    it('Zone A pickup, Zone A and Zone B dropoffs are compatible', () => {
      // Banani (A) → Gulshan (A)  +  Banani (A) → Dhanmondi (B)
      expect(areRoutesCompatible('Banani', 'Gulshan', 'Banani', 'Dhanmondi')).toBe(true);
    });
  });

  describe('Area registry', () => {
    it('Banani is in Zone A', () => {
      expect(AREAS['Banani'].zone).toBe('A');
    });

    it('Gulshan is in Zone A', () => {
      expect(AREAS['Gulshan'].zone).toBe('A');
    });

    it('Mohakhali is in Zone A', () => {
      expect(AREAS['Mohakhali'].zone).toBe('A');
    });

    it('Uttara is in Zone C', () => {
      expect(AREAS['Uttara'].zone).toBe('C');
    });
  });
});
