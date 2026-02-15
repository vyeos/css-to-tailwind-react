import {
  parseSelector,
  processPseudoSelector,
  parseMultipleSelectors,
  SUPPORTED_PSEUDOS,
  PSEUDO_TO_VARIANT
} from '../src/utils/pseudoSelectorResolver';

describe('pseudoSelectorResolver', () => {
  describe('SUPPORTED_PSEUDOS and PSEUDO_TO_VARIANT', () => {
    it('should have correct mapping for hover', () => {
      expect(PSEUDO_TO_VARIANT['hover']).toBe('hover');
      expect(SUPPORTED_PSEUDOS.has('hover')).toBe(true);
    });

    it('should have correct mapping for focus', () => {
      expect(PSEUDO_TO_VARIANT['focus']).toBe('focus');
      expect(SUPPORTED_PSEUDOS.has('focus')).toBe(true);
    });

    it('should have correct mapping for active', () => {
      expect(PSEUDO_TO_VARIANT['active']).toBe('active');
      expect(SUPPORTED_PSEUDOS.has('active')).toBe(true);
    });

    it('should have correct mapping for disabled', () => {
      expect(PSEUDO_TO_VARIANT['disabled']).toBe('disabled');
      expect(SUPPORTED_PSEUDOS.has('disabled')).toBe(true);
    });

    it('should have correct mapping for visited', () => {
      expect(PSEUDO_TO_VARIANT['visited']).toBe('visited');
      expect(SUPPORTED_PSEUDOS.has('visited')).toBe(true);
    });

    it('should have correct mapping for first-child', () => {
      expect(PSEUDO_TO_VARIANT['first-child']).toBe('first');
      expect(SUPPORTED_PSEUDOS.has('first-child')).toBe(true);
    });

    it('should have correct mapping for last-child', () => {
      expect(PSEUDO_TO_VARIANT['last-child']).toBe('last');
      expect(SUPPORTED_PSEUDOS.has('last-child')).toBe(true);
    });

    it('should have correct mapping for before', () => {
      expect(PSEUDO_TO_VARIANT['before']).toBe('before');
      expect(SUPPORTED_PSEUDOS.has('before')).toBe(true);
    });

    it('should have correct mapping for after', () => {
      expect(PSEUDO_TO_VARIANT['after']).toBe('after');
      expect(SUPPORTED_PSEUDOS.has('after')).toBe(true);
    });
  });

  describe('parseSelector', () => {
    it('should parse simple class selector', () => {
      const result = parseSelector('.button');
      expect(result.baseClass).toBe('button');
      expect(result.pseudos).toEqual([]);
      expect(result.isComplex).toBe(false);
    });

    it('should parse :hover selector', () => {
      const result = parseSelector('.button:hover');
      expect(result.baseClass).toBe('button');
      expect(result.pseudos).toEqual(['hover']);
      expect(result.isComplex).toBe(false);
    });

    it('should parse :focus selector', () => {
      const result = parseSelector('.input:focus');
      expect(result.baseClass).toBe('input');
      expect(result.pseudos).toEqual(['focus']);
      expect(result.isComplex).toBe(false);
    });

    it('should parse :active selector', () => {
      const result = parseSelector('.button:active');
      expect(result.baseClass).toBe('button');
      expect(result.pseudos).toEqual(['active']);
      expect(result.isComplex).toBe(false);
    });

    it('should parse :disabled selector', () => {
      const result = parseSelector('.button:disabled');
      expect(result.baseClass).toBe('button');
      expect(result.pseudos).toEqual(['disabled']);
      expect(result.isComplex).toBe(false);
    });

    it('should parse :visited selector', () => {
      const result = parseSelector('.link:visited');
      expect(result.baseClass).toBe('link');
      expect(result.pseudos).toEqual(['visited']);
      expect(result.isComplex).toBe(false);
    });

    it('should parse :first-child selector', () => {
      const result = parseSelector('.item:first-child');
      expect(result.baseClass).toBe('item');
      expect(result.pseudos).toEqual(['first']);
      expect(result.isComplex).toBe(false);
    });

    it('should parse :last-child selector', () => {
      const result = parseSelector('.item:last-child');
      expect(result.baseClass).toBe('item');
      expect(result.pseudos).toEqual(['last']);
      expect(result.isComplex).toBe(false);
    });

    it('should parse ::before selector', () => {
      const result = parseSelector('.card::before');
      expect(result.baseClass).toBe('card');
      expect(result.pseudos).toEqual(['before']);
      expect(result.isComplex).toBe(false);
    });

    it('should parse ::after selector', () => {
      const result = parseSelector('.card::after');
      expect(result.baseClass).toBe('card');
      expect(result.pseudos).toEqual(['after']);
      expect(result.isComplex).toBe(false);
    });

    it('should handle hyphenated class names', () => {
      const result = parseSelector('.blog-main:hover');
      expect(result.baseClass).toBe('blog-main');
      expect(result.pseudos).toEqual(['hover']);
      expect(result.isComplex).toBe(false);
    });

    it('should handle underscored class names', () => {
      const result = parseSelector('.main_head:focus');
      expect(result.baseClass).toBe('main_head');
      expect(result.pseudos).toEqual(['focus']);
      expect(result.isComplex).toBe(false);
    });

    it('should mark :nth-child as complex', () => {
      const result = parseSelector('.item:nth-child(2)');
      expect(result.isComplex).toBe(true);
      expect(result.reason).toContain('nth-child');
    });

    it('should mark :not() as complex', () => {
      const result = parseSelector('.item:not(.active)');
      expect(result.isComplex).toBe(true);
      expect(result.reason).toContain(':not(');
    });

    it('should mark chained pseudo selectors as complex', () => {
      const result = parseSelector('.button:hover:focus');
      expect(result.isComplex).toBe(true);
      expect(result.reason).toContain('complex pseudo chain');
    });

    it('should mark selectors with combinators as complex', () => {
      const result = parseSelector('.parent .child:hover');
      expect(result.isComplex).toBe(true);
      expect(result.reason).toContain('combinators');
    });

    it('should mark non-class selectors as complex', () => {
      const result = parseSelector('#main:hover');
      expect(result.isComplex).toBe(true);
      expect(result.reason).toContain('Not a class selector');
    });
  });

  describe('processPseudoSelector', () => {
    it('should process valid :hover selector', () => {
      const result = processPseudoSelector('.button:hover');
      expect(result.skipped).toBe(false);
      expect(result.baseClass).toBe('button');
      expect(result.variants).toEqual(['hover']);
    });

    it('should process valid :focus selector', () => {
      const result = processPseudoSelector('.input:focus');
      expect(result.skipped).toBe(false);
      expect(result.baseClass).toBe('input');
      expect(result.variants).toEqual(['focus']);
    });

    it('should return base class without variants for simple selector', () => {
      const result = processPseudoSelector('.button');
      expect(result.skipped).toBe(false);
      expect(result.baseClass).toBe('button');
      expect(result.variants).toEqual([]);
    });

    it('should skip complex selectors', () => {
      const result = processPseudoSelector('.item:nth-child(2)');
      expect(result.skipped).toBe(true);
      expect(result.baseClass).toBeNull();
    });
  });

  describe('parseMultipleSelectors', () => {
    it('should parse comma-separated selectors', () => {
      const results = parseMultipleSelectors('.button:hover, .link:hover');
      expect(results).toHaveLength(2);
      
      expect(results[0].baseClass).toBe('button');
      expect(results[0].pseudos).toEqual(['hover']);
      
      expect(results[1].baseClass).toBe('link');
      expect(results[1].pseudos).toEqual(['hover']);
    });

    it('should handle mixed valid and complex selectors', () => {
      const results = parseMultipleSelectors('.button:hover, .item:nth-child(2)');
      expect(results).toHaveLength(2);
      
      expect(results[0].baseClass).toBe('button');
      expect(results[0].isComplex).toBe(false);
      
      expect(results[1].isComplex).toBe(true);
    });

    it('should handle three selectors', () => {
      const results = parseMultipleSelectors('.a:hover, .b:focus, .c:active');
      expect(results).toHaveLength(3);
      
      expect(results[0].pseudos).toEqual(['hover']);
      expect(results[1].pseudos).toEqual(['focus']);
      expect(results[2].pseudos).toEqual(['active']);
    });

    it('should trim whitespace from selectors', () => {
      const results = parseMultipleSelectors('.button:hover ,  .link:focus  ');
      expect(results).toHaveLength(2);
      
      expect(results[0].baseClass).toBe('button');
      expect(results[1].baseClass).toBe('link');
    });
  });
});