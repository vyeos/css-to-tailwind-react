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
      '16': '4rem',
      '20': '5rem',
      '24': '6rem',
      '32': '8rem'
    },
    fontSize: {
      'xs': ['0.75rem'],
      'sm': ['0.875rem'],
      'base': ['1rem'],
      'lg': ['1.125rem'],
      'xl': ['1.25rem'],
      '2xl': ['1.5rem'],
      '3xl': ['1.875rem'],
      '4xl': ['2.25rem']
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

describe('CSSParser - Descendant Selector Support', () => {
  let parser: CSSParser;
  let mapper: TailwindMapper;

  beforeEach(() => {
    clearBreakpointCache();
    mapper = new TailwindMapper(DEFAULT_CONFIG);
    parser = new CSSParser(mapper, DEFAULT_CONFIG.theme?.screens);
  });

  describe('.class element selectors', () => {
    it('should parse .blog-main h1', async () => {
      const css = `
.blog-main h1 {
  font-size: 30px;
  font-weight: bold;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.isDescendant).toBe(true);
      expect(rule.parentSelector).toEqual({ type: 'class', name: 'blog-main' });
      expect(rule.targetSelector).toEqual({ type: 'element', name: 'h1' });
      expect(rule.convertedClasses).toContain('text-3xl');
      expect(rule.convertedClasses).toContain('font-bold');
      expect(rule.fullyConverted).toBe(true);
    });

    it('should parse .card img', async () => {
      const css = `
.card img {
  width: 100%;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.isDescendant).toBe(true);
      expect(rule.parentSelector).toEqual({ type: 'class', name: 'card' });
      expect(rule.targetSelector).toEqual({ type: 'element', name: 'img' });
      expect(rule.convertedClasses).toContain('w-full');
    });
  });

  describe('element element selectors', () => {
    it('should parse main img', async () => {
      const css = `
main img {
  width: 100%;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.isDescendant).toBe(true);
      expect(rule.parentSelector).toEqual({ type: 'element', name: 'main' });
      expect(rule.targetSelector).toEqual({ type: 'element', name: 'img' });
    });

    it('should parse section h2', async () => {
      const css = `
section h2 {
  font-size: 24px;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.isDescendant).toBe(true);
      expect(rule.parentSelector).toEqual({ type: 'element', name: 'section' });
      expect(rule.targetSelector).toEqual({ type: 'element', name: 'h2' });
    });
  });

  describe('.class .class selectors', () => {
    it('should parse .card .title', async () => {
      const css = `
.card .title {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.isDescendant).toBe(true);
      expect(rule.parentSelector).toEqual({ type: 'class', name: 'card' });
      expect(rule.targetSelector).toEqual({ type: 'class', name: 'title' });
    });
  });

  describe('element .class selectors', () => {
    it('should parse main .container', async () => {
      const css = `
main .container {
  display: flex;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.isDescendant).toBe(true);
      expect(rule.parentSelector).toEqual({ type: 'element', name: 'main' });
      expect(rule.targetSelector).toEqual({ type: 'class', name: 'container' });
    });
  });

  describe('Responsive + descendant', () => {
    it('should combine responsive variant with descendant', async () => {
      const css = `
@media (min-width: 768px) {
  .blog-main h1 {
    font-size: 36px;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.isDescendant).toBe(true);
      expect(rule.parentSelector).toEqual({ type: 'class', name: 'blog-main' });
      expect(rule.targetSelector).toEqual({ type: 'element', name: 'h1' });
      expect(rule.utilities[0].variants).toContain('md');
      expect(rule.convertedClasses).toContain('md:text-4xl');
    });

    it('should handle multiple responsive breakpoints', async () => {
      const css = `
@media (min-width: 768px) {
  .card img {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .card img {
    width: 100%;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(2);
      
      const mdRule = result.rules.find(r => r.utilities.some(u => u.variants.includes('md')));
      expect(mdRule?.convertedClasses).toContain('md:w-1/2');
      
      const lgRule = result.rules.find(r => r.utilities.some(u => u.variants.includes('lg')));
      expect(lgRule?.convertedClasses).toContain('lg:w-full');
    });
  });

  describe('Unsupported selectors', () => {
    it('should skip child combinator selector', async () => {
      const css = `
.parent > .child {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('child combinator');
    });

    it('should skip multi-level descendant', async () => {
      const css = `
.a .b .c {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('multi-level');
    });

    it('should skip adjacent sibling', async () => {
      const css = `
h1 + p {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings[0]).toContain('adjacent sibling');
    });

    it('should skip general sibling', async () => {
      const css = `
h1 ~ p {
  color: red;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings[0]).toContain('general sibling');
    });
  });

  describe('Mixed rules', () => {
    it('should handle both simple and descendant rules', async () => {
      const css = `
.button {
  display: flex;
}

.blog-main h1 {
  font-size: 30px;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(2);
      
      const simpleRule = result.rules.find(r => !r.isDescendant);
      expect(simpleRule?.className).toBe('button');
      expect(simpleRule?.convertedClasses).toContain('flex');
      
      const descendantRule = result.rules.find(r => r.isDescendant);
      expect(descendantRule?.parentSelector).toEqual({ type: 'class', name: 'blog-main' });
      expect(descendantRule?.targetSelector).toEqual({ type: 'element', name: 'h1' });
    });
  });

  describe('CSS cleanup', () => {
    it('should remove fully converted descendant rules', async () => {
      const css = `
.blog-main h1 {
  font-size: 30px;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.hasChanges).toBe(true);
      expect(result.css.trim()).toBe('');
      expect(result.canDelete).toBe(true);
    });

    it('should preserve unconverted descendant rules', async () => {
      const css = `
.blog-main h1 {
  unsupported: value;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.css).toContain('.blog-main h1');
    });

    it('should handle partial conversion', async () => {
      const css = `
.blog-main h1 {
  font-size: 30px;
  unsupported: value;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].partialConversion).toBe(true);
      expect(result.rules[0].convertedClasses).toContain('text-3xl');
      expect(result.css).toContain('unsupported');
    });
  });

  describe('Utilities with variants', () => {
    it('should store utilities with correct variants for descendant', async () => {
      const css = `
.blog-main h1 {
  font-size: 30px;
  font-weight: bold;
}`;
      const result = await parser.parse(css, 'test.css');

      const rule = result.rules[0];
      expect(rule.utilities).toHaveLength(2);
      
      const fontSizeUtility = rule.utilities.find(u => u.value === 'text-3xl');
      expect(fontSizeUtility?.variants).toHaveLength(0);
      
      const fontWeightUtility = rule.utilities.find(u => u.value === 'font-bold');
      expect(fontWeightUtility?.variants).toHaveLength(0);
    });

    it('should store responsive variants correctly', async () => {
      const css = `
@media (min-width: 768px) {
  .blog-main h1 {
    font-size: 36px;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      const rule = result.rules[0];
      expect(rule.utilities[0].variants).toContain('md');
      expect(rule.utilities[0].value).toBe('text-4xl');
    });
  });
});