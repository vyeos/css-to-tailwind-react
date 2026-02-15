import {
  Specificity,
  createSpecificity,
  addSpecificity,
  compareSpecificity,
  specificityToString,
  calculateSelectorSpecificity,
  calculateDescendantSpecificity,
  isHigherSpecificity,
  isEqualSpecificity,
  getHigherSpecificity,
  ZERO_SPECIFICITY
} from '../src/utils/specificityCalculator';

describe('specificityCalculator', () => {
  describe('createSpecificity', () => {
    it('should create specificity with all values', () => {
      const spec = createSpecificity(1, 2, 3, 4);
      expect(spec.inline).toBe(1);
      expect(spec.id).toBe(2);
      expect(spec.class).toBe(3);
      expect(spec.element).toBe(4);
    });

    it('should create zero specificity with no arguments', () => {
      const spec = createSpecificity();
      expect(spec.inline).toBe(0);
      expect(spec.id).toBe(0);
      expect(spec.class).toBe(0);
      expect(spec.element).toBe(0);
    });
  });

  describe('addSpecificity', () => {
    it('should add two specificities', () => {
      const a = createSpecificity(1, 2, 3, 4);
      const b = createSpecificity(1, 1, 1, 1);
      const result = addSpecificity(a, b);
      
      expect(result.inline).toBe(2);
      expect(result.id).toBe(3);
      expect(result.class).toBe(4);
      expect(result.element).toBe(5);
    });
  });

  describe('compareSpecificity', () => {
    it('should return positive when first is higher', () => {
      const a = createSpecificity(1, 0, 0, 0);
      const b = createSpecificity(0, 1, 0, 0);
      expect(compareSpecificity(a, b)).toBeGreaterThan(0);
    });

    it('should return negative when first is lower', () => {
      const a = createSpecificity(0, 0, 1, 0);
      const b = createSpecificity(0, 1, 0, 0);
      expect(compareSpecificity(a, b)).toBeLessThan(0);
    });

    it('should return zero when equal', () => {
      const a = createSpecificity(0, 1, 2, 3);
      const b = createSpecificity(0, 1, 2, 3);
      expect(compareSpecificity(a, b)).toBe(0);
    });

    it('should compare inline styles as highest', () => {
      const inline = createSpecificity(1, 0, 0, 0);
      const id = createSpecificity(0, 100, 0, 0);
      expect(compareSpecificity(inline, id)).toBeGreaterThan(0);
    });

    it('should compare id selectors as second highest', () => {
      const id = createSpecificity(0, 1, 0, 0);
      const classes = createSpecificity(0, 0, 100, 0);
      expect(compareSpecificity(id, classes)).toBeGreaterThan(0);
    });

    it('should compare class selectors as third highest', () => {
      const classes = createSpecificity(0, 0, 1, 0);
      const element = createSpecificity(0, 0, 0, 100);
      expect(compareSpecificity(classes, element)).toBeGreaterThan(0);
    });
  });

  describe('specificityToString', () => {
    it('should format specificity as string', () => {
      const spec = createSpecificity(1, 2, 3, 4);
      expect(specificityToString(spec)).toBe('(1, 2, 3, 4)');
    });
  });

  describe('calculateSelectorSpecificity', () => {
    it('should calculate specificity for simple class selector', () => {
      const spec = calculateSelectorSpecificity('.button');
      expect(spec.class).toBe(1);
      expect(spec.id).toBe(0);
      expect(spec.element).toBe(0);
    });

    it('should calculate specificity for ID selector', () => {
      const spec = calculateSelectorSpecificity('#header');
      expect(spec.id).toBe(1);
      expect(spec.class).toBe(0);
    });

    it('should calculate specificity for element selector', () => {
      const spec = calculateSelectorSpecificity('h1');
      expect(spec.element).toBe(1);
      expect(spec.class).toBe(0);
    });

    it('should calculate specificity for combined selectors', () => {
      const spec = calculateSelectorSpecificity('#header .nav li');
      expect(spec.id).toBe(1);
      expect(spec.class).toBe(1);
      expect(spec.element).toBe(1);
    });

    it('should handle multiple classes', () => {
      const spec = calculateSelectorSpecificity('.card.primary.active');
      expect(spec.class).toBe(3);
    });

    it('should handle pseudo classes', () => {
      const spec = calculateSelectorSpecificity('.button:hover');
      expect(spec.class).toBe(2);
    });

    it('should return zero for empty selector', () => {
      const spec = calculateSelectorSpecificity('');
      expect(spec).toEqual(ZERO_SPECIFICITY);
    });
  });

  describe('calculateDescendantSpecificity', () => {
    it('should calculate specificity for .class element', () => {
      const spec = calculateDescendantSpecificity('class', 'blog-main', 'element', 'h1');
      expect(spec.class).toBe(1);
      expect(spec.element).toBe(1);
    });

    it('should calculate specificity for element element', () => {
      const spec = calculateDescendantSpecificity('element', 'main', 'element', 'img');
      expect(spec.element).toBe(2);
    });

    it('should calculate specificity for .class .class', () => {
      const spec = calculateDescendantSpecificity('class', 'card', 'class', 'title');
      expect(spec.class).toBe(2);
    });
  });

  describe('isHigherSpecificity', () => {
    it('should return true when first is higher', () => {
      const a = createSpecificity(0, 1, 0, 0);
      const b = createSpecificity(0, 0, 1, 0);
      expect(isHigherSpecificity(a, b)).toBe(true);
    });

    it('should return false when first is lower', () => {
      const a = createSpecificity(0, 0, 1, 0);
      const b = createSpecificity(0, 1, 0, 0);
      expect(isHigherSpecificity(a, b)).toBe(false);
    });
  });

  describe('isEqualSpecificity', () => {
    it('should return true for equal specificities', () => {
      const a = createSpecificity(0, 1, 2, 3);
      const b = createSpecificity(0, 1, 2, 3);
      expect(isEqualSpecificity(a, b)).toBe(true);
    });

    it('should return false for different specificities', () => {
      const a = createSpecificity(0, 1, 2, 3);
      const b = createSpecificity(0, 1, 2, 4);
      expect(isEqualSpecificity(a, b)).toBe(false);
    });
  });

  describe('getHigherSpecificity', () => {
    it('should return the higher specificity', () => {
      const a = createSpecificity(0, 1, 0, 0);
      const b = createSpecificity(0, 0, 100, 0);
      const result = getHigherSpecificity(a, b);
      expect(result.id).toBe(1);
    });

    it('should return first when equal', () => {
      const a = createSpecificity(0, 1, 2, 3);
      const b = createSpecificity(0, 1, 2, 3);
      const result = getHigherSpecificity(a, b);
      expect(result).toEqual(a);
    });
  });
});