import { CSSParser, CSSRule } from '../src/cssParser';
import { TailwindMapper } from '../src/tailwindMapper';
import { clearBreakpointCache } from '../src/utils/breakpointResolver';
import { TailwindConfig } from '../src/utils/config';

const DEFAULT_CONFIG: TailwindConfig = {
  theme: {
    spacing: {
      '0': '0px',
      '1': '0.25rem',
      '2': '0.5rem',
      '3': '0.75rem',
      '4': '1rem',
      '5': '1.25rem',
      '6': '1.5rem',
      '8': '2rem',
      '10': '2.5rem',
      '12': '3rem',
      '16': '4rem'
    },
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    }
  }
};

function hasVariant(rule: CSSRule, variant: string): boolean {
  return rule.utilities.some(u => u.variants.includes(variant));
}

function hasOnlyVariant(rule: CSSRule, variant: string): boolean {
  return rule.utilities.every(u => u.variants.length === 1 && u.variants[0] === variant);
}

function hasNoVariants(rule: CSSRule): boolean {
  return rule.utilities.every(u => u.variants.length === 0);
}

function hasVariants(rule: CSSRule, variants: string[]): boolean {
  return rule.utilities.every(u => 
    variants.length === u.variants.length && 
    variants.every(v => u.variants.includes(v))
  );
}

describe('CSSParser - Pseudo Selector Support', () => {
  let parser: CSSParser;
  let mapper: TailwindMapper;

  beforeEach(() => {
    clearBreakpointCache();
    mapper = new TailwindMapper(DEFAULT_CONFIG);
    parser = new CSSParser(mapper, DEFAULT_CONFIG.theme?.screens);
  });

  describe('Basic pseudo selectors', () => {
    it('should convert :hover selector', async () => {
      const css = `
.button:hover {
  background-color: blue;
  color: white;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.className).toBe('button');
      expect(hasOnlyVariant(rule, 'hover')).toBe(true);
      expect(rule.convertedClasses).toContain('hover:bg-blue-500');
      expect(rule.convertedClasses).toContain('hover:text-white');
      expect(rule.fullyConverted).toBe(true);
    });

    it('should convert :focus selector', async () => {
      const css = `
.input:focus {
  border-color: blue;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].className).toBe('input');
      expect(hasOnlyVariant(result.rules[0], 'focus')).toBe(true);
    });

    it('should convert :active selector', async () => {
      const css = `
.button:active {
  background-color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(hasOnlyVariant(result.rules[0], 'active')).toBe(true);
    });

    it('should convert :disabled selector', async () => {
      const css = `
.button:disabled {
  opacity: 0.5;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(hasOnlyVariant(result.rules[0], 'disabled')).toBe(true);
    });

    it('should convert :visited selector', async () => {
      const css = `
.link:visited {
  color: purple;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(hasOnlyVariant(result.rules[0], 'visited')).toBe(true);
    });
  });

  describe(':first-child and :last-child', () => {
    it('should convert :first-child selector', async () => {
      const css = `
.item:first-child {
  margin-top: 0;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(hasOnlyVariant(result.rules[0], 'first')).toBe(true);
    });

    it('should convert :last-child selector', async () => {
      const css = `
.item:last-child {
  margin-bottom: 0;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(hasOnlyVariant(result.rules[0], 'last')).toBe(true);
    });
  });

  describe('::before and ::after', () => {
    it('should convert ::before selector', async () => {
      const css = `
.card::before {
  display: block;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(hasOnlyVariant(result.rules[0], 'before')).toBe(true);
    });

    it('should convert ::after selector', async () => {
      const css = `
.card::after {
  display: block;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(hasOnlyVariant(result.rules[0], 'after')).toBe(true);
    });
  });

  describe('Multiple selectors', () => {
    it('should handle comma-separated selectors with same pseudo', async () => {
      const css = `
.button:hover,
.link:hover {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(2);
      
      const buttonRule = result.rules.find(r => r.className === 'button');
      expect(buttonRule).toBeDefined();
      expect(hasOnlyVariant(buttonRule!, 'hover')).toBe(true);
      
      const linkRule = result.rules.find(r => r.className === 'link');
      expect(linkRule).toBeDefined();
      expect(hasOnlyVariant(linkRule!, 'hover')).toBe(true);
    });

    it('should handle comma-separated selectors with different pseudos', async () => {
      const css = `
.button:hover,
.link:focus {
  color: blue;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(2);
      
      const buttonRule = result.rules.find(r => r.className === 'button');
      expect(hasOnlyVariant(buttonRule!, 'hover')).toBe(true);
      
      const linkRule = result.rules.find(r => r.className === 'link');
      expect(hasOnlyVariant(linkRule!, 'focus')).toBe(true);
    });

    it('should handle comma-separated selectors with mixed base and pseudo', async () => {
      const css = `
.button,
.link:hover {
  display: flex;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(2);
      
      const buttonRule = result.rules.find(r => r.className === 'button');
      expect(hasNoVariants(buttonRule!)).toBe(true);
      
      const linkRule = result.rules.find(r => r.className === 'link');
      expect(hasOnlyVariant(linkRule!, 'hover')).toBe(true);
    });
  });

  describe('Normal + Pseudo rules', () => {
    it('should handle base and hover rules for same class', async () => {
      const css = `
.button {
  background-color: red;
}

.button:hover {
  background-color: blue;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(2);
      
      const baseRule = result.rules.find(r => hasNoVariants(r));
      expect(baseRule?.className).toBe('button');
      expect(baseRule?.convertedClasses).toContain('bg-red-500');
      
      const hoverRule = result.rules.find(r => hasVariant(r, 'hover'));
      expect(hoverRule?.className).toBe('button');
      expect(hoverRule?.convertedClasses).toContain('hover:bg-blue-500');
    });

    it('should preserve logical override order', async () => {
      const css = `
.button {
  background-color: red;
}

.button:hover {
  background-color: blue;
}

.button:active {
  background-color: green;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(3);
      
      const baseRule = result.rules.find(r => hasNoVariants(r));
      const hoverRule = result.rules.find(r => hasOnlyVariant(r, 'hover'));
      const activeRule = result.rules.find(r => hasOnlyVariant(r, 'active'));
      
      expect(baseRule).toBeDefined();
      expect(hoverRule).toBeDefined();
      expect(activeRule).toBeDefined();
    });
  });

  describe('Responsive + Pseudo combined', () => {
    it('should combine responsive and hover variants', async () => {
      const css = `
@media (min-width: 768px) {
  .button:hover {
    background-color: green;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.className).toBe('button');
      expect(hasVariants(rule, ['md', 'hover'])).toBe(true);
      expect(rule.convertedClasses).toContain('md:hover:bg-green-500');
    });

    it('should combine lg and focus variants', async () => {
      const css = `
@media (min-width: 1024px) {
  .input:focus {
    border-color: blue;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(hasVariants(rule, ['lg', 'focus'])).toBe(true);
    });

    it('should handle multiple responsive + pseudo rules', async () => {
      const css = `
@media (min-width: 768px) {
  .button:hover {
    display: flex;
  }
}

@media (min-width: 1024px) {
  .button:active {
    display: block;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(2);
      
      const mdHoverRule = result.rules.find(r => hasVariants(r, ['md', 'hover']));
      expect(mdHoverRule).toBeDefined();
      expect(mdHoverRule?.convertedClasses).toContain('md:hover:flex');
      
      const lgActiveRule = result.rules.find(r => hasVariants(r, ['lg', 'active']));
      expect(lgActiveRule).toBeDefined();
      expect(lgActiveRule?.convertedClasses).toContain('lg:active:block');
    });
  });

  describe('Unsupported pseudo selectors', () => {
    it('should skip :nth-child with warning', async () => {
      const css = `
.item:nth-child(2) {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('nth-child');
    });

    it('should skip :not() with warning', async () => {
      const css = `
.item:not(.active) {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain(':not(');
    });

    it('should skip chained pseudo selectors with warning', async () => {
      const css = `
.button:hover:focus {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Invalid selector part');
    });

    it('should skip selector with combinator', async () => {
      const css = `
.parent .child:hover {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Hyphenated class names with pseudo', () => {
    it('should handle hyphenated class with :hover', async () => {
      const css = `
.blog-main:hover {
  display: flex;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].className).toBe('blog-main');
      expect(hasOnlyVariant(result.rules[0], 'hover')).toBe(true);
    });

    it('should handle hyphenated class in media query with pseudo', async () => {
      const css = `
@media (min-width: 768px) {
  .main-head:hover {
    display: block;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].className).toBe('main-head');
      expect(hasVariants(result.rules[0], ['md', 'hover'])).toBe(true);
    });
  });

  describe('CSS cleanup with pseudo selectors', () => {
    it('should remove fully converted pseudo rules', async () => {
      const css = `
.button:hover {
  background-color: blue;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.hasChanges).toBe(true);
      expect(result.css.trim()).toBe('');
    });

    it('should preserve unconverted pseudo rules', async () => {
      const css = `
.button:hover {
  unsupported: value;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.css).toContain('.button:hover');
    });
  });

  describe('Edge cases', () => {
    it('should handle partial conversion with pseudo', async () => {
      const css = `
.button:hover {
  display: flex;
  unsupported: value;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].partialConversion).toBe(true);
      expect(result.rules[0].convertedClasses).toContain('hover:flex');
    });

    it('should handle multiple declarations with same pseudo', async () => {
      const css = `
.card:hover {
  display: flex;
  margin: 16px;
  padding: 8px;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.convertedClasses).toContain('hover:flex');
      expect(rule.convertedClasses).toContain('hover:m-4');
      expect(rule.convertedClasses).toContain('hover:p-2');
    });
  });
});