import {
  getPropertyForUtility,
  isTextFontSizeUtility,
  isTextColorUtility,
  getPropertiesForUtilities,
  getConflictGroup,
  propertiesConflict
} from '../src/utils/propertyMapper';

describe('propertyMapper', () => {
  describe('getPropertyForUtility', () => {
    it('should map text color utilities to color property', () => {
      expect(getPropertyForUtility('text-red-500')).toBe('color');
      expect(getPropertyForUtility('text-blue-500')).toBe('color');
      expect(getPropertyForUtility('text-white')).toBe('color');
    });

    it('should map text size utilities to font-size property', () => {
      expect(getPropertyForUtility('text-3xl')).toBe('font-size');
      expect(getPropertyForUtility('text-sm')).toBe('font-size');
      expect(getPropertyForUtility('text-base')).toBe('font-size');
    });

    it('should map background utilities to background-color property', () => {
      expect(getPropertyForUtility('bg-red-500')).toBe('background-color');
      expect(getPropertyForUtility('bg-white')).toBe('background-color');
    });

    it('should map display utilities to display property', () => {
      expect(getPropertyForUtility('flex')).toBe('display');
      expect(getPropertyForUtility('block')).toBe('display');
      expect(getPropertyForUtility('hidden')).toBe('display');
    });

    it('should map width utilities to width property', () => {
      expect(getPropertyForUtility('w-full')).toBe('width');
      expect(getPropertyForUtility('w-1/2')).toBe('width');
    });

    it('should map height utilities to height property', () => {
      expect(getPropertyForUtility('h-full')).toBe('height');
    });

    it('should map margin utilities to margin properties', () => {
      expect(getPropertyForUtility('m-4')).toBe('margin');
      expect(getPropertyForUtility('mt-4')).toBe('margin-top');
      expect(getPropertyForUtility('mx-4')).toBe('margin-x');
    });

    it('should map padding utilities to padding properties', () => {
      expect(getPropertyForUtility('p-4')).toBe('padding');
      expect(getPropertyForUtility('pt-4')).toBe('padding-top');
      expect(getPropertyForUtility('px-4')).toBe('padding-x');
    });

    it('should map font weight utilities to font-weight property', () => {
      expect(getPropertyForUtility('font-bold')).toBe('font-weight');
      expect(getPropertyForUtility('font-normal')).toBe('font-weight');
    });

    it('should map border radius utilities to border-radius property', () => {
      expect(getPropertyForUtility('rounded')).toBe('border-radius');
      expect(getPropertyForUtility('rounded-lg')).toBe('border-radius');
      expect(getPropertyForUtility('rounded-full')).toBe('border-radius');
    });

    it('should strip variants and map correctly', () => {
      expect(getPropertyForUtility('md:text-red-500')).toBe('color');
      expect(getPropertyForUtility('hover:text-blue-500')).toBe('color');
      expect(getPropertyForUtility('md:hover:text-green-500')).toBe('color');
    });

    it('should return unknown for unrecognized utilities', () => {
      expect(getPropertyForUtility('unknown-class')).toBe('unknown');
    });
  });

  describe('isTextFontSizeUtility', () => {
    it('should return true for font size utilities', () => {
      expect(isTextFontSizeUtility('text-3xl')).toBe(true);
      expect(isTextFontSizeUtility('text-sm')).toBe(true);
    });

    it('should return false for color utilities', () => {
      expect(isTextFontSizeUtility('text-red-500')).toBe(false);
    });

    it('should handle variant prefixes', () => {
      expect(isTextFontSizeUtility('md:text-3xl')).toBe(true);
    });
  });

  describe('isTextColorUtility', () => {
    it('should return true for color utilities', () => {
      expect(isTextColorUtility('text-red-500')).toBe(true);
      expect(isTextColorUtility('text-blue-500')).toBe(true);
    });

    it('should return false for font size utilities', () => {
      expect(isTextColorUtility('text-3xl')).toBe(false);
    });

    it('should handle variant prefixes', () => {
      expect(isTextColorUtility('hover:text-red-500')).toBe(true);
    });
  });

  describe('getPropertiesForUtilities', () => {
    it('should group utilities by property', () => {
      const utilities = ['text-red-500', 'text-3xl', 'bg-white', 'flex'];
      const map = getPropertiesForUtilities(utilities);
      
      expect(map.get('color')).toEqual(['text-red-500']);
      expect(map.get('font-size')).toEqual(['text-3xl']);
      expect(map.get('background-color')).toEqual(['bg-white']);
      expect(map.get('display')).toEqual(['flex']);
    });
  });

  describe('getConflictGroup', () => {
    it('should return correct group for conflicting properties', () => {
      expect(getConflictGroup('color')).toBe('color');
      expect(getConflictGroup('font-size')).toBe('font-size');
      expect(getConflictGroup('margin')).toBe('margin');
      expect(getConflictGroup('margin-top')).toBe('margin');
    });

    it('should return null for non-conflicting properties', () => {
      expect(getConflictGroup('unknown-property')).toBeNull();
    });
  });

  describe('propertiesConflict', () => {
    it('should return true for same property', () => {
      expect(propertiesConflict('color', 'color')).toBe(true);
      expect(propertiesConflict('font-size', 'font-size')).toBe(true);
    });

    it('should return false for different non-conflicting properties', () => {
      expect(propertiesConflict('color', 'font-size')).toBe(false);
      expect(propertiesConflict('display', 'position')).toBe(false);
    });

    it('should handle margin shorthand vs specific sides', () => {
      expect(propertiesConflict('margin', 'margin-top')).toBe(true);
      expect(propertiesConflict('margin', 'margin')).toBe(true);
    });

    it('should handle padding shorthand vs specific sides', () => {
      expect(propertiesConflict('padding', 'padding-top')).toBe(true);
    });

    it('should not conflict for different specific sides', () => {
      expect(propertiesConflict('margin-top', 'margin-bottom')).toBe(false);
      expect(propertiesConflict('padding-left', 'padding-right')).toBe(false);
    });
  });
});