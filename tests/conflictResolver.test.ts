import {
  UtilityWithMeta,
  ResolvedUtility,
  ConflictInfo,
  resolveConflicts,
  resolveConflictsForElement,
  groupUtilitiesByPropertyAndVariant,
  sortUtilitiesForOutput,
  resolvedUtilityToString,
  resolvedUtilitiesToStrings,
  buildUtilityWithMeta
} from '../src/utils/conflictResolver';
import { Specificity, createSpecificity } from '../src/utils/specificityCalculator';

function createTestUtility(
  value: string,
  cssProperty: string,
  specificity: Specificity,
  sourceOrder: number,
  variants: string[] = []
): UtilityWithMeta {
  return {
    value,
    variants,
    cssProperty,
    specificity,
    sourceOrder,
    originalSelector: '.test'
  };
}

const SPEC_HIGH = createSpecificity(0, 1, 0, 0);
const SPEC_MEDIUM = createSpecificity(0, 0, 1, 0);
const SPEC_LOW = createSpecificity(0, 0, 0, 1);

describe('conflictResolver', () => {
  describe('groupUtilitiesByPropertyAndVariant', () => {
    it('should group utilities by property', () => {
      const utilities = [
        createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1),
        createTestUtility('text-3xl', 'font-size', SPEC_MEDIUM, 2)
      ];
      
      const groups = groupUtilitiesByPropertyAndVariant(utilities);
      
      expect(groups.size).toBe(2);
      expect(groups.has('color')).toBe(true);
      expect(groups.has('font-size')).toBe(true);
    });

    it('should group utilities by variant within property', () => {
      const utilities = [
        createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1),
        createTestUtility('text-blue-500', 'color', SPEC_MEDIUM, 2, ['md'])
      ];
      
      const groups = groupUtilitiesByPropertyAndVariant(utilities);
      
      const colorGroup = groups.get('color')!;
      expect(colorGroup.size).toBe(2);
    });
  });

  describe('resolveConflicts', () => {
    describe('equal specificity with later override', () => {
      it('should choose later utility when specificity is equal', () => {
        const utilities = [
          createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1),
          createTestUtility('text-blue-500', 'color', SPEC_MEDIUM, 2)
        ];
        
        const { resolved, conflicts } = resolveConflicts(utilities, false);
        
        expect(resolved).toHaveLength(1);
        expect(resolved[0].value).toBe('text-blue-500');
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].losers).toHaveLength(1);
      });
    });

    describe('higher specificity override', () => {
      it('should choose higher specificity over later order', () => {
        const utilities = [
          createTestUtility('text-red-500', 'color', SPEC_HIGH, 1),
          createTestUtility('text-blue-500', 'color', SPEC_LOW, 2)
        ];
        
        const { resolved } = resolveConflicts(utilities, false);
        
        expect(resolved).toHaveLength(1);
        expect(resolved[0].value).toBe('text-red-500');
      });
    });

    describe('no conflict across different properties', () => {
      it('should keep all utilities for different properties', () => {
        const utilities = [
          createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1),
          createTestUtility('text-3xl', 'font-size', SPEC_MEDIUM, 2)
        ];
        
        const { resolved, conflicts } = resolveConflicts(utilities, false);
        
        expect(resolved).toHaveLength(2);
        expect(conflicts).toHaveLength(0);
      });
    });

    describe('no conflict across different variants', () => {
      it('should keep base and responsive variants for same property', () => {
        const utilities = [
          createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1),
          createTestUtility('text-blue-500', 'color', SPEC_MEDIUM, 2, ['md'])
        ];
        
        const { resolved, conflicts } = resolveConflicts(utilities, false);
        
        expect(resolved).toHaveLength(2);
        expect(conflicts).toHaveLength(0);
      });

      it('should resolve conflict within same responsive breakpoint', () => {
        const utilities = [
          createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1, ['md']),
          createTestUtility('text-blue-500', 'color', SPEC_MEDIUM, 2, ['md'])
        ];
        
        const { resolved, conflicts } = resolveConflicts(utilities, false);
        
        expect(resolved).toHaveLength(1);
        expect(conflicts).toHaveLength(1);
        expect(resolved[0].value).toBe('text-blue-500');
      });

      it('should resolve conflict within same pseudo variant', () => {
        const utilities = [
          createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1, ['hover']),
          createTestUtility('text-blue-500', 'color', SPEC_MEDIUM, 2, ['hover'])
        ];
        
        const { resolved, conflicts } = resolveConflicts(utilities, false);
        
        expect(resolved).toHaveLength(1);
        expect(conflicts).toHaveLength(1);
      });
    });
  });

  describe('sortUtilitiesForOutput', () => {
    it('should sort utilities by variant then by value', () => {
      const utilities: ResolvedUtility[] = [
        { value: 'text-red-500', variants: [], cssProperty: 'color' },
        { value: 'text-blue-500', variants: ['md'], cssProperty: 'color' },
        { value: 'text-green-500', variants: ['hover'], cssProperty: 'color' }
      ];
      
      const sorted = sortUtilitiesForOutput(utilities);
      
      expect(sorted[0].variants).toHaveLength(0);
      expect(sorted[1].variants).toContain('hover');
      expect(sorted[2].variants).toContain('md');
    });
  });

  describe('resolvedUtilityToString', () => {
    it('should return value without prefix when no variants', () => {
      const utility: ResolvedUtility = {
        value: 'text-red-500',
        variants: [],
        cssProperty: 'color'
      };
      
      expect(resolvedUtilityToString(utility)).toBe('text-red-500');
    });

    it('should prefix with variants', () => {
      const utility: ResolvedUtility = {
        value: 'text-red-500',
        variants: ['md', 'hover'],
        cssProperty: 'color'
      };
      
      expect(resolvedUtilityToString(utility)).toBe('md:hover:text-red-500');
    });
  });

  describe('resolvedUtilitiesToStrings', () => {
    it('should convert all utilities to strings', () => {
      const utilities: ResolvedUtility[] = [
        { value: 'flex', variants: [], cssProperty: 'display' },
        { value: 'text-red-500', variants: [], cssProperty: 'color' },
        { value: 'text-blue-500', variants: ['md'], cssProperty: 'color' }
      ];
      
      const strings = resolvedUtilitiesToStrings(utilities);
      
      expect(strings).toHaveLength(3);
      expect(strings).toContain('flex');
      expect(strings).toContain('text-red-500');
      expect(strings).toContain('md:text-blue-500');
    });
  });

  describe('mixed scenarios', () => {
    it('should handle responsive + pseudo combinations correctly', () => {
      const utilities = [
        createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1),
        createTestUtility('text-blue-500', 'color', SPEC_MEDIUM, 2, ['md']),
        createTestUtility('text-green-500', 'color', SPEC_MEDIUM, 3, ['hover']),
        createTestUtility('text-yellow-500', 'color', SPEC_MEDIUM, 4, ['md', 'hover'])
      ];
      
      const { resolved, conflicts } = resolveConflicts(utilities, false);
      
      expect(resolved).toHaveLength(4);
      expect(conflicts).toHaveLength(0);
    });

    it('should resolve conflicts when same variant combination exists', () => {
      const utilities = [
        createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1, ['md', 'hover']),
        createTestUtility('text-blue-500', 'color', SPEC_MEDIUM, 2, ['md', 'hover'])
      ];
      
      const { resolved, conflicts } = resolveConflicts(utilities, false);
      
      expect(resolved).toHaveLength(1);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].winner.value).toBe('text-blue-500');
    });

    it('should handle multiple pseudo variants correctly', () => {
      const utilities = [
        createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1, ['hover', 'focus']),
        createTestUtility('text-blue-500', 'color', SPEC_MEDIUM, 2, ['hover', 'focus'])
      ];
      
      const { resolved, conflicts } = resolveConflicts(utilities, false);
      
      expect(resolved).toHaveLength(1);
      expect(conflicts).toHaveLength(1);
    });

    it('should not conflict across different responsive + pseudo combinations', () => {
      const utilities = [
        createTestUtility('text-red-500', 'color', SPEC_MEDIUM, 1, ['md', 'hover']),
        createTestUtility('text-blue-500', 'color', SPEC_MEDIUM, 2, ['lg', 'hover'])
      ];
      
      const { resolved, conflicts } = resolveConflicts(utilities, false);
      
      expect(resolved).toHaveLength(2);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('buildUtilityWithMeta', () => {
    it('should build utility with all metadata', () => {
      const spec = createSpecificity(0, 0, 1, 0);
      const utility = buildUtilityWithMeta('text-red-500', ['hover'], 'color', spec, 1, '.test:hover');
      
      expect(utility.value).toBe('text-red-500');
      expect(utility.variants).toContain('hover');
      expect(utility.cssProperty).toBe('color');
      expect(utility.specificity).toEqual(spec);
      expect(utility.sourceOrder).toBe(1);
      expect(utility.originalSelector).toBe('.test:hover');
    });
  });
});