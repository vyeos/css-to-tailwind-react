import {
  parseDescendantSelector,
  processDescendantSelector,
  isDescendantSelector,
  isSimpleSelector,
  isHtmlElement
} from '../src/utils/descendantSelectorResolver';

describe('descendantSelectorResolver', () => {
  describe('isHtmlElement', () => {
    it('should return true for HTML elements', () => {
      expect(isHtmlElement('div')).toBe(true);
      expect(isHtmlElement('h1')).toBe(true);
      expect(isHtmlElement('img')).toBe(true);
      expect(isHtmlElement('main')).toBe(true);
      expect(isHtmlElement('section')).toBe(true);
    });

    it('should return false for custom components', () => {
      expect(isHtmlElement('MyComponent')).toBe(false);
      expect(isHtmlElement('BlogMain')).toBe(false);
    });
  });

  describe('parseDescendantSelector', () => {
    describe('Simple selectors', () => {
      it('should parse simple class selector', () => {
        const result = parseDescendantSelector('.button');
        expect(result.isComplex).toBe(false);
        expect(result.parent).toBeUndefined();
        expect(result.target).toEqual({ type: 'class', name: 'button' });
      });

      it('should parse simple element selector', () => {
        const result = parseDescendantSelector('h1');
        expect(result.isComplex).toBe(false);
        expect(result.parent).toBeUndefined();
        expect(result.target).toEqual({ type: 'element', name: 'h1' });
      });

      it('should parse hyphenated class names', () => {
        const result = parseDescendantSelector('.blog-main');
        expect(result.isComplex).toBe(false);
        expect(result.target).toEqual({ type: 'class', name: 'blog-main' });
      });
    });

    describe('Descendant selectors', () => {
      it('should parse .class element selector', () => {
        const result = parseDescendantSelector('.blog-main h1');
        expect(result.isComplex).toBe(false);
        expect(result.parent).toEqual({ type: 'class', name: 'blog-main' });
        expect(result.target).toEqual({ type: 'element', name: 'h1' });
      });

      it('should parse element element selector', () => {
        const result = parseDescendantSelector('main img');
        expect(result.isComplex).toBe(false);
        expect(result.parent).toEqual({ type: 'element', name: 'main' });
        expect(result.target).toEqual({ type: 'element', name: 'img' });
      });

      it('should parse .class .class selector', () => {
        const result = parseDescendantSelector('.card .title');
        expect(result.isComplex).toBe(false);
        expect(result.parent).toEqual({ type: 'class', name: 'card' });
        expect(result.target).toEqual({ type: 'class', name: 'title' });
      });

      it('should parse element .class selector', () => {
        const result = parseDescendantSelector('main .container');
        expect(result.isComplex).toBe(false);
        expect(result.parent).toEqual({ type: 'element', name: 'main' });
        expect(result.target).toEqual({ type: 'class', name: 'container' });
      });
    });

    describe('Unsupported selectors', () => {
      it('should mark child combinator as complex', () => {
        const result = parseDescendantSelector('.parent > .child');
        expect(result.isComplex).toBe(true);
        expect(result.reason).toContain('child combinator');
      });

      it('should mark adjacent sibling as complex', () => {
        const result = parseDescendantSelector('h1 + p');
        expect(result.isComplex).toBe(true);
        expect(result.reason).toContain('adjacent sibling');
      });

      it('should mark general sibling as complex', () => {
        const result = parseDescendantSelector('h1 ~ p');
        expect(result.isComplex).toBe(true);
        expect(result.reason).toContain('general sibling');
      });

      it('should mark multi-level descendant as complex', () => {
        const result = parseDescendantSelector('.a .b .c');
        expect(result.isComplex).toBe(true);
        expect(result.reason).toContain('multi-level descendant');
      });

      it('should mark comma-separated selectors as complex', () => {
        const result = parseDescendantSelector('.a, .b');
        expect(result.isComplex).toBe(true);
        expect(result.reason).toContain('comma-separated');
      });

      it('should mark :not() as complex', () => {
        const result = parseDescendantSelector('.item:not(.active)');
        expect(result.isComplex).toBe(true);
        expect(result.reason).toContain('pseudo-class with argument');
      });

      it('should mark attribute selectors as complex', () => {
        const result = parseDescendantSelector('input[type="text"]');
        expect(result.isComplex).toBe(true);
        expect(result.reason).toContain('attribute selector');
      });
    });
  });

  describe('isDescendantSelector', () => {
    it('should return true for descendant selectors', () => {
      expect(isDescendantSelector('.blog-main h1')).toBe(true);
      expect(isDescendantSelector('main img')).toBe(true);
      expect(isDescendantSelector('.card .title')).toBe(true);
    });

    it('should return false for simple selectors', () => {
      expect(isDescendantSelector('.button')).toBe(false);
      expect(isDescendantSelector('h1')).toBe(false);
    });

    it('should return false for complex selectors', () => {
      expect(isDescendantSelector('.a .b .c')).toBe(false);
      expect(isDescendantSelector('.a > .b')).toBe(false);
    });
  });

  describe('isSimpleSelector', () => {
    it('should return true for simple class selectors', () => {
      expect(isSimpleSelector('.button')).toBe(true);
      expect(isSimpleSelector('.blog-main')).toBe(true);
    });

    it('should return true for simple element selectors', () => {
      expect(isSimpleSelector('h1')).toBe(true);
      expect(isSimpleSelector('div')).toBe(true);
    });

    it('should return false for descendant selectors', () => {
      expect(isSimpleSelector('.blog-main h1')).toBe(false);
    });
  });

  describe('processDescendantSelector', () => {
    it('should process valid descendant selector', () => {
      const result = processDescendantSelector('.blog-main h1');
      expect(result.skipped).toBe(false);
      expect(result.parsed?.parent).toEqual({ type: 'class', name: 'blog-main' });
      expect(result.parsed?.target).toEqual({ type: 'element', name: 'h1' });
    });

    it('should skip complex selectors', () => {
      const result = processDescendantSelector('.a .b .c');
      expect(result.skipped).toBe(true);
      expect(result.parsed).toBeNull();
      expect(result.reason).toContain('multi-level');
    });
  });
});