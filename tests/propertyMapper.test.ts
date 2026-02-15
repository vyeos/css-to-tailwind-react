import {
  getPropertyForUtility,
  isTextFontSizeUtility,
  isTextColorUtility,
  getPropertiesForUtilities,
  getConflictGroup,
  propertiesConflict,
  isLineHeightUtility,
  isLetterSpacingUtility
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
      expect(getPropertyForUtility('flow-root')).toBe('display');
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

    it('should map text-decoration utilities', () => {
      expect(getPropertyForUtility('underline')).toBe('text-decoration');
      expect(getPropertyForUtility('line-through')).toBe('text-decoration');
      expect(getPropertyForUtility('no-underline')).toBe('text-decoration');
    });

    it('should map text-transform utilities', () => {
      expect(getPropertyForUtility('uppercase')).toBe('text-transform');
      expect(getPropertyForUtility('lowercase')).toBe('text-transform');
      expect(getPropertyForUtility('capitalize')).toBe('text-transform');
      expect(getPropertyForUtility('normal-case')).toBe('text-transform');
    });

    it('should map letter-spacing utilities', () => {
      expect(getPropertyForUtility('tracking-tight')).toBe('letter-spacing');
      expect(getPropertyForUtility('tracking-wide')).toBe('letter-spacing');
      expect(getPropertyForUtility('tracking-[0.1em]')).toBe('letter-spacing');
    });

    it('should map line-height utilities', () => {
      expect(getPropertyForUtility('leading-none')).toBe('line-height');
      expect(getPropertyForUtility('leading-tight')).toBe('line-height');
      expect(getPropertyForUtility('leading-[1.5]')).toBe('line-height');
    });

    it('should map aspect-ratio utilities', () => {
      expect(getPropertyForUtility('aspect-square')).toBe('aspect-ratio');
      expect(getPropertyForUtility('aspect-video')).toBe('aspect-ratio');
      expect(getPropertyForUtility('aspect-auto')).toBe('aspect-ratio');
      expect(getPropertyForUtility('aspect-[4/3]')).toBe('aspect-ratio');
    });

    it('should map object-fit utilities', () => {
      expect(getPropertyForUtility('object-contain')).toBe('object-fit');
      expect(getPropertyForUtility('object-cover')).toBe('object-fit');
      expect(getPropertyForUtility('object-fill')).toBe('object-fit');
      expect(getPropertyForUtility('object-none')).toBe('object-fit');
      expect(getPropertyForUtility('object-scale-down')).toBe('object-fit');
    });

    it('should map object-position utilities', () => {
      expect(getPropertyForUtility('object-center')).toBe('object-position');
      expect(getPropertyForUtility('object-top')).toBe('object-position');
      expect(getPropertyForUtility('object-left')).toBe('object-position');
      expect(getPropertyForUtility('object-[25%_75%]')).toBe('object-position');
    });

    it('should map flex shorthand utilities', () => {
      expect(getPropertyForUtility('flex-1')).toBe('flex');
      expect(getPropertyForUtility('flex-auto')).toBe('flex');
      expect(getPropertyForUtility('flex-none')).toBe('flex');
      expect(getPropertyForUtility('flex-initial')).toBe('flex');
    });

    it('should map flex-grow utilities', () => {
      expect(getPropertyForUtility('grow')).toBe('flex-grow');
      expect(getPropertyForUtility('grow-0')).toBe('flex-grow');
      expect(getPropertyForUtility('grow-[2]')).toBe('flex-grow');
    });

    it('should map flex-shrink utilities', () => {
      expect(getPropertyForUtility('shrink')).toBe('flex-shrink');
      expect(getPropertyForUtility('shrink-0')).toBe('flex-shrink');
    });

    it('should map flex-basis utilities', () => {
      expect(getPropertyForUtility('basis-auto')).toBe('flex-basis');
      expect(getPropertyForUtility('basis-0')).toBe('flex-basis');
      expect(getPropertyForUtility('basis-[200px]')).toBe('flex-basis');
    });

    it('should map overflow utilities', () => {
      expect(getPropertyForUtility('overflow-hidden')).toBe('overflow');
      expect(getPropertyForUtility('overflow-auto')).toBe('overflow');
      expect(getPropertyForUtility('overflow-x-auto')).toBe('overflow-x');
      expect(getPropertyForUtility('overflow-y-hidden')).toBe('overflow-y');
    });

    it('should map word-break utilities', () => {
      expect(getPropertyForUtility('break-all')).toBe('word-break');
      expect(getPropertyForUtility('break-words')).toBe('word-break');
      expect(getPropertyForUtility('break-normal')).toBe('word-break');
      expect(getPropertyForUtility('break-keep')).toBe('word-break');
    });

    it('should map border-style utilities', () => {
      expect(getPropertyForUtility('border-solid')).toBe('border-style');
      expect(getPropertyForUtility('border-dashed')).toBe('border-style');
      expect(getPropertyForUtility('border-dotted')).toBe('border-style');
      expect(getPropertyForUtility('border-double')).toBe('border-style');
    });

    it('should map dimension constraint utilities', () => {
      expect(getPropertyForUtility('max-w-full')).toBe('max-width');
      expect(getPropertyForUtility('min-w-0')).toBe('min-width');
      expect(getPropertyForUtility('max-h-full')).toBe('max-height');
      expect(getPropertyForUtility('min-h-screen')).toBe('min-height');
    });

    it('should map opacity utilities', () => {
      expect(getPropertyForUtility('opacity-0')).toBe('opacity');
      expect(getPropertyForUtility('opacity-50')).toBe('opacity');
      expect(getPropertyForUtility('opacity-100')).toBe('opacity');
      expect(getPropertyForUtility('opacity-[0.75]')).toBe('opacity');
    });

    it('should map z-index utilities', () => {
      expect(getPropertyForUtility('z-0')).toBe('z-index');
      expect(getPropertyForUtility('z-10')).toBe('z-index');
      expect(getPropertyForUtility('z-50')).toBe('z-index');
      expect(getPropertyForUtility('z-auto')).toBe('z-index');
      expect(getPropertyForUtility('z-[100]')).toBe('z-index');
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

  describe('isLineHeightUtility', () => {
    it('should return true for line-height utilities', () => {
      expect(isLineHeightUtility('leading-none')).toBe(true);
      expect(isLineHeightUtility('leading-tight')).toBe(true);
      expect(isLineHeightUtility('leading-[1.5]')).toBe(true);
    });

    it('should return false for other utilities', () => {
      expect(isLineHeightUtility('text-sm')).toBe(false);
    });
  });

  describe('isLetterSpacingUtility', () => {
    it('should return true for letter-spacing utilities', () => {
      expect(isLetterSpacingUtility('tracking-tight')).toBe(true);
      expect(isLetterSpacingUtility('tracking-wide')).toBe(true);
      expect(isLetterSpacingUtility('tracking-[0.1em]')).toBe(true);
    });

    it('should return false for other utilities', () => {
      expect(isLetterSpacingUtility('text-sm')).toBe(false);
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

    it('should group new property types correctly', () => {
      const utilities = ['underline', 'uppercase', 'aspect-square', 'object-cover'];
      const map = getPropertiesForUtilities(utilities);
      
      expect(map.get('text-decoration')).toEqual(['underline']);
      expect(map.get('text-transform')).toEqual(['uppercase']);
      expect(map.get('aspect-ratio')).toEqual(['aspect-square']);
      expect(map.get('object-fit')).toEqual(['object-cover']);
    });
  });

  describe('getConflictGroup', () => {
    it('should return correct group for conflicting properties', () => {
      expect(getConflictGroup('color')).toBe('color');
      expect(getConflictGroup('font-size')).toBe('font-size');
      expect(getConflictGroup('margin')).toBe('margin');
      expect(getConflictGroup('margin-top')).toBe('margin');
    });

    it('should return correct groups for new properties', () => {
      expect(getConflictGroup('text-decoration')).toBe('text-decoration');
      expect(getConflictGroup('text-transform')).toBe('text-transform');
      expect(getConflictGroup('letter-spacing')).toBe('letter-spacing');
      expect(getConflictGroup('line-height')).toBe('line-height');
      expect(getConflictGroup('aspect-ratio')).toBe('aspect-ratio');
      expect(getConflictGroup('object-fit')).toBe('object-fit');
      expect(getConflictGroup('object-position')).toBe('object-position');
      expect(getConflictGroup('word-break')).toBe('word-break');
    });

    it('should return null for non-conflicting properties', () => {
      expect(getConflictGroup('unknown-property')).toBeNull();
    });

    it('should group flex properties correctly', () => {
      expect(getConflictGroup('flex')).toBe('flex');
      expect(getConflictGroup('flex-grow')).toBe('flex');
      expect(getConflictGroup('flex-shrink')).toBe('flex');
      expect(getConflictGroup('flex-basis')).toBe('flex');
    });

    it('should group overflow properties correctly', () => {
      expect(getConflictGroup('overflow')).toBe('overflow');
      expect(getConflictGroup('overflow-x')).toBe('overflow');
      expect(getConflictGroup('overflow-y')).toBe('overflow');
    });

    it('should group border-width properties correctly', () => {
      expect(getConflictGroup('border-width')).toBe('border-width');
      expect(getConflictGroup('border-top-width')).toBe('border-width');
      expect(getConflictGroup('border-left-width')).toBe('border-width');
    });

    it('should group border-color properties correctly', () => {
      expect(getConflictGroup('border-color')).toBe('border-color');
      expect(getConflictGroup('border-top-color')).toBe('border-color');
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

    it('should handle overflow conflicts', () => {
      expect(propertiesConflict('overflow', 'overflow-x')).toBe(true);
      expect(propertiesConflict('overflow', 'overflow')).toBe(true);
      expect(propertiesConflict('overflow-x', 'overflow-y')).toBe(false);
    });

    it('should handle flex property conflicts', () => {
      expect(propertiesConflict('flex', 'flex-grow')).toBe(true);
      expect(propertiesConflict('flex', 'flex-shrink')).toBe(true);
      expect(propertiesConflict('flex-grow', 'flex-shrink')).toBe(false);
    });

    it('should handle border-width conflicts', () => {
      expect(propertiesConflict('border-width', 'border-top-width')).toBe(true);
      expect(propertiesConflict('border-top-width', 'border-bottom-width')).toBe(false);
    });

    it('should handle border-color conflicts', () => {
      expect(propertiesConflict('border-color', 'border-top-color')).toBe(true);
      expect(propertiesConflict('border-top-color', 'border-bottom-color')).toBe(false);
    });

    it('should handle text-decoration conflicts', () => {
      expect(propertiesConflict('text-decoration', 'text-decoration')).toBe(true);
    });

    it('should handle text-transform conflicts', () => {
      expect(propertiesConflict('text-transform', 'text-transform')).toBe(true);
    });

    it('should handle aspect-ratio conflicts', () => {
      expect(propertiesConflict('aspect-ratio', 'aspect-ratio')).toBe(true);
    });

    it('should handle object-fit vs object-position', () => {
      expect(propertiesConflict('object-fit', 'object-position')).toBe(false);
      expect(propertiesConflict('object-fit', 'object-fit')).toBe(true);
      expect(propertiesConflict('object-position', 'object-position')).toBe(true);
    });

    it('should handle word-break conflicts', () => {
      expect(propertiesConflict('word-break', 'word-break')).toBe(true);
    });
  });
});
