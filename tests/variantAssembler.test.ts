import {
  assembleUtility,
  assembleUtilities,
  mergeUtilities,
  normalizeVariantOrder,
  sortVariants,
  deduplicateVariants,
  isResponsiveVariant,
  isPseudoVariant,
  VARIANT_ORDER
} from '../src/utils/variantAssembler';

describe('variantAssembler', () => {
  describe('VARIANT_ORDER', () => {
    it('should have responsive variants before pseudo variants', () => {
      const responsiveIndex = VARIANT_ORDER.indexOf('md');
      const pseudoIndex = VARIANT_ORDER.indexOf('hover');
      expect(responsiveIndex).toBeLessThan(pseudoIndex);
    });

    it('should have correct responsive variant order', () => {
      expect(VARIANT_ORDER.indexOf('sm')).toBeLessThan(VARIANT_ORDER.indexOf('md'));
      expect(VARIANT_ORDER.indexOf('md')).toBeLessThan(VARIANT_ORDER.indexOf('lg'));
      expect(VARIANT_ORDER.indexOf('lg')).toBeLessThan(VARIANT_ORDER.indexOf('xl'));
      expect(VARIANT_ORDER.indexOf('xl')).toBeLessThan(VARIANT_ORDER.indexOf('2xl'));
    });

    it('should have correct pseudo variant order', () => {
      expect(VARIANT_ORDER.indexOf('hover')).toBeLessThan(VARIANT_ORDER.indexOf('focus'));
      expect(VARIANT_ORDER.indexOf('focus')).toBeLessThan(VARIANT_ORDER.indexOf('active'));
    });
  });

  describe('isResponsiveVariant', () => {
    it('should return true for responsive variants', () => {
      expect(isResponsiveVariant('sm')).toBe(true);
      expect(isResponsiveVariant('md')).toBe(true);
      expect(isResponsiveVariant('lg')).toBe(true);
      expect(isResponsiveVariant('xl')).toBe(true);
      expect(isResponsiveVariant('2xl')).toBe(true);
    });

    it('should return false for pseudo variants', () => {
      expect(isResponsiveVariant('hover')).toBe(false);
      expect(isResponsiveVariant('focus')).toBe(false);
      expect(isResponsiveVariant('active')).toBe(false);
    });
  });

  describe('isPseudoVariant', () => {
    it('should return true for pseudo variants', () => {
      expect(isPseudoVariant('hover')).toBe(true);
      expect(isPseudoVariant('focus')).toBe(true);
      expect(isPseudoVariant('active')).toBe(true);
      expect(isPseudoVariant('disabled')).toBe(true);
      expect(isPseudoVariant('before')).toBe(true);
      expect(isPseudoVariant('after')).toBe(true);
    });

    it('should return false for responsive variants', () => {
      expect(isPseudoVariant('sm')).toBe(false);
      expect(isPseudoVariant('md')).toBe(false);
    });
  });

  describe('sortVariants', () => {
    it('should sort variants in correct order', () => {
      const result = sortVariants(['hover', 'md']);
      expect(result).toEqual(['md', 'hover']);
    });

    it('should sort multiple variants correctly', () => {
      const result = sortVariants(['active', 'sm', 'hover', 'lg']);
      expect(result).toEqual(['sm', 'lg', 'hover', 'active']);
    });

    it('should handle unknown variants', () => {
      const result = sortVariants(['hover', 'unknown', 'md']);
      expect(result).toEqual(['md', 'hover', 'unknown']);
    });
  });

  describe('deduplicateVariants', () => {
    it('should remove duplicate variants', () => {
      const result = deduplicateVariants(['hover', 'hover', 'focus']);
      expect(result).toEqual(['hover', 'focus']);
    });

    it('should preserve order', () => {
      const result = deduplicateVariants(['hover', 'focus', 'hover', 'active']);
      expect(result).toEqual(['hover', 'focus', 'active']);
    });
  });

  describe('normalizeVariantOrder', () => {
    it('should place responsive variants before pseudo variants', () => {
      const result = normalizeVariantOrder(['hover', 'md']);
      expect(result).toEqual(['md', 'hover']);
    });

    it('should deduplicate while normalizing', () => {
      const result = normalizeVariantOrder(['hover', 'md', 'hover']);
      expect(result).toEqual(['md', 'hover']);
    });

    it('should sort responsive variants by size', () => {
      const result = normalizeVariantOrder(['lg', 'sm', 'md']);
      expect(result).toEqual(['sm', 'md', 'lg']);
    });

    it('should sort pseudo variants correctly', () => {
      const result = normalizeVariantOrder(['active', 'hover', 'focus']);
      expect(result).toEqual(['hover', 'focus', 'active']);
    });

    it('should handle combined responsive and pseudo variants', () => {
      const result = normalizeVariantOrder(['active', 'lg', 'hover', 'md']);
      expect(result).toEqual(['md', 'lg', 'hover', 'active']);
    });
  });

  describe('assembleUtility', () => {
    it('should return utility without prefix when no variants', () => {
      const result = assembleUtility('flex', []);
      expect(result).toBe('flex');
    });

    it('should return utility without prefix when variants undefined', () => {
      const result = assembleUtility('flex');
      expect(result).toBe('flex');
    });

    it('should prefix with single variant', () => {
      const result = assembleUtility('flex', ['hover']);
      expect(result).toBe('hover:flex');
    });

    it('should prefix with responsive variant', () => {
      const result = assembleUtility('flex', ['md']);
      expect(result).toBe('md:flex');
    });

    it('should prefix with multiple variants in correct order', () => {
      const result = assembleUtility('flex', ['hover', 'md']);
      expect(result).toBe('md:hover:flex');
    });

    it('should handle three variants', () => {
      const result = assembleUtility('flex', ['active', 'hover', 'lg']);
      expect(result).toBe('lg:hover:active:flex');
    });

    it('should deduplicate variants', () => {
      const result = assembleUtility('flex', ['hover', 'hover', 'md']);
      expect(result).toBe('md:hover:flex');
    });
  });

  describe('assembleUtilities', () => {
    it('should assemble multiple utilities', () => {
      const utilities = [
        { value: 'flex', variants: ['hover'] },
        { value: 'm-4', variants: ['hover'] }
      ];
      const result = assembleUtilities(utilities);
      expect(result).toEqual(['hover:flex', 'hover:m-4']);
    });

    it('should handle mixed variants', () => {
      const utilities = [
        { value: 'flex', variants: ['md', 'hover'] },
        { value: 'block', variants: [] }
      ];
      const result = assembleUtilities(utilities);
      expect(result).toEqual(['md:hover:flex', 'block']);
    });
  });

  describe('mergeUtilities', () => {
    it('should merge utilities with same value but different variants', () => {
      const utilities = [
        { value: 'flex', variants: ['hover'] },
        { value: 'flex', variants: ['focus'] }
      ];
      const result = mergeUtilities(utilities);
      
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('flex');
      expect(result[0].variants).toContain('hover');
      expect(result[0].variants).toContain('focus');
    });

    it('should handle utilities with same variants', () => {
      const utilities = [
        { value: 'flex', variants: ['hover'] },
        { value: 'flex', variants: ['hover'] }
      ];
      const result = mergeUtilities(utilities);
      
      expect(result).toHaveLength(1);
      expect(result[0].variants).toEqual(['hover']);
    });

    it('should handle base utilities merging with variant utilities', () => {
      const utilities = [
        { value: 'flex', variants: [] },
        { value: 'flex', variants: ['hover'] }
      ];
      const result = mergeUtilities(utilities);
      
      expect(result).toHaveLength(1);
      expect(result[0].variants).toEqual(['hover']);
    });

    it('should preserve multiple unique utilities', () => {
      const utilities = [
        { value: 'flex', variants: ['hover'] },
        { value: 'block', variants: ['hover'] }
      ];
      const result = mergeUtilities(utilities);
      
      expect(result).toHaveLength(2);
    });
  });
});