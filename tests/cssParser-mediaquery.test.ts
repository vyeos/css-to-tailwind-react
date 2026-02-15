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
      '32': '8rem',
      '40': '10rem',
      '48': '12rem',
      '56': '14rem',
      '64': '16rem'
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

describe('CSSParser - Media Query Support', () => {
  let parser: CSSParser;
  let mapper: TailwindMapper;

  beforeEach(() => {
    clearBreakpointCache();
    mapper = new TailwindMapper(DEFAULT_CONFIG);
    parser = new CSSParser(mapper, DEFAULT_CONFIG.theme?.screens);
  });

  describe('Simple min-width media query', () => {
    it('should convert @media (min-width: 768px) with single rule', async () => {
      const css = `
@media (min-width: 768px) {
  .box {
    display: flex;
    margin: 16px;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(rule.className).toBe('box');
      expect(hasOnlyVariant(rule, 'md')).toBe(true);
      expect(rule.convertedClasses).toContain('md:flex');
      expect(rule.convertedClasses).toContain('md:m-4');
      expect(rule.fullyConverted).toBe(true);
    });

    it('should convert @media (min-width: 640px) with sm breakpoint', async () => {
      const css = `
@media (min-width: 640px) {
  .container {
    display: block;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(hasOnlyVariant(rule, 'sm')).toBe(true);
      expect(rule.convertedClasses).toContain('sm:block');
    });

    it('should convert @media (min-width: 1024px) with lg breakpoint', async () => {
      const css = `
@media (min-width: 1024px) {
  .sidebar {
    display: flex;
    padding: 8px;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      const rule = result.rules[0];
      
      expect(hasOnlyVariant(rule, 'lg')).toBe(true);
      expect(rule.convertedClasses).toContain('lg:flex');
      expect(rule.convertedClasses).toContain('lg:p-2');
    });
  });

  describe('Multiple nested rules in media query', () => {
    it('should convert multiple rules inside single @media', async () => {
      const css = `
@media (min-width: 768px) {
  .box {
    display: flex;
  }
  .card {
    margin: 8px;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(2);
      
      const boxRule = result.rules.find(r => r.className === 'box');
      expect(hasOnlyVariant(boxRule!, 'md')).toBe(true);
      expect(boxRule?.convertedClasses).toContain('md:flex');
      
      const cardRule = result.rules.find(r => r.className === 'card');
      expect(hasOnlyVariant(cardRule!, 'md')).toBe(true);
      expect(cardRule?.convertedClasses).toContain('md:m-2');
    });

    it('should handle three nested rules', async () => {
      const css = `
@media (min-width: 768px) {
  .header {
    display: flex;
  }
  .main {
    display: block;
  }
  .footer {
    padding: 16px;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(3);
      expect(result.rules.every(r => hasOnlyVariant(r, 'md'))).toBe(true);
    });
  });

  describe('Mixed normal + responsive rules', () => {
    it('should handle both base rules and media queries', async () => {
      const css = `
.box {
  display: block;
}

@media (min-width: 768px) {
  .box {
    display: flex;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(2);
      
      const baseRule = result.rules.find(r => hasNoVariants(r));
      expect(baseRule?.className).toBe('box');
      expect(baseRule?.convertedClasses).toContain('block');
      
      const responsiveRule = result.rules.find(r => hasVariant(r, 'md'));
      expect(responsiveRule?.className).toBe('box');
      expect(hasOnlyVariant(responsiveRule!, 'md')).toBe(true);
      expect(responsiveRule?.convertedClasses).toContain('md:flex');
    });

    it('should preserve correct order', async () => {
      const css = `
.container {
  display: flex;
}

@media (min-width: 640px) {
  .container {
    padding: 8px;
  }
}

@media (min-width: 1024px) {
  .container {
    margin: 16px;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      const baseRule = result.rules.find(r => hasNoVariants(r));
      expect(baseRule?.convertedClasses).toContain('flex');

      const smRule = result.rules.find(r => hasOnlyVariant(r, 'sm'));
      expect(smRule?.convertedClasses).toContain('sm:p-2');

      const lgRule = result.rules.find(r => hasOnlyVariant(r, 'lg'));
      expect(lgRule?.convertedClasses).toContain('lg:m-4');
    });
  });

  describe('Unsupported media queries', () => {
    it('should skip max-width media queries with warning', async () => {
      const css = `
@media (max-width: 768px) {
  .box {
    display: flex;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('max-width');
    });

    it('should skip orientation media queries', async () => {
      const css = `
@media (orientation: portrait) {
  .box {
    display: flex;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
    });

    it('should skip print media queries', async () => {
      const css = `
@media print {
  .box {
    display: none;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
    });

    it('should skip combined conditions', async () => {
      const css = `
@media screen and (min-width: 768px) and (max-width: 1024px) {
  .box {
    display: flex;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
    });
  });

  describe('Custom tailwind.config.js screens', () => {
    it('should use custom screens from config', async () => {
      const customScreens: Record<string, string | [string, string]> = {
        'tablet': '768px',
        'desktop': '1024px',
        'wide': '1280px'
      };
      
      const customMapper = new TailwindMapper(DEFAULT_CONFIG);
      const customParser = new CSSParser(customMapper, customScreens);
      
      const css = `
@media (min-width: 768px) {
  .box {
    display: flex;
  }
}`;
      const result = await customParser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(hasOnlyVariant(result.rules[0], 'tablet')).toBe(true);
    });

    it('should handle rem values in custom screens', async () => {
      const customScreens: Record<string, string | [string, string]> = {
        'sm': '40rem',
        'md': '48rem'
      };
      
      const customMapper = new TailwindMapper(DEFAULT_CONFIG);
      const customParser = new CSSParser(customMapper, customScreens);
      
      const css = `
@media (min-width: 768px) {
  .box {
    display: flex;
  }
}`;
      const result = await customParser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(hasOnlyVariant(result.rules[0], 'md')).toBe(true);
    });
  });

  describe('Utilities with variants', () => {
    it('should store utilities with variant information', async () => {
      const css = `
@media (min-width: 768px) {
  .box {
    display: flex;
    margin: 16px;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      const rule = result.rules[0];
      expect(rule.utilities).toHaveLength(2);
      
      const flexUtility = rule.utilities.find(u => u.value === 'flex');
      expect(flexUtility?.variants).toContain('md');
      
      const marginUtility = rule.utilities.find(u => u.value === 'm-4');
      expect(marginUtility?.variants).toContain('md');
    });

    it('should store base utilities without variants', async () => {
      const css = `
.box {
  display: block;
}`;
      const result = await parser.parse(css, 'test.css');

      const rule = result.rules[0];
      expect(rule.utilities).toHaveLength(1);
      expect(rule.utilities[0].value).toBe('block');
      expect(rule.utilities[0].variants).toHaveLength(0);
    });
  });

  describe('CSS cleanup', () => {
    it('should remove converted rules from @media', async () => {
      const css = `
@media (min-width: 768px) {
  .box {
    display: flex;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.hasChanges).toBe(true);
      expect(result.css.trim()).toBe('');
      expect(result.canDelete).toBe(true);
    });

    it('should remove empty @media after conversion', async () => {
      const css = `
@media (min-width: 768px) {
  .box {
    display: flex;
  }
}

.other {
  custom-property: value;
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.css).not.toContain('@media');
      expect(result.css).toContain('.other');
    });

    it('should preserve unconverted rules in @media', async () => {
      const css = `
@media (min-width: 768px) {
  .box {
    unsupported-property: value;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.css).toContain('@media');
      expect(result.css).toContain('.box');
    });
  });

  describe('Edge cases', () => {
    it('should handle min-width that does not match any breakpoint', async () => {
      const css = `
@media (min-width: 500px) {
  .box {
    display: flex;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle partial conversion in media query', async () => {
      const css = `
@media (min-width: 768px) {
  .box {
    display: flex;
    unsupported: value;
  }
}`;
      const result = await parser.parse(css, 'test.css');

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].partialConversion).toBe(true);
      expect(result.rules[0].convertedClasses).toContain('md:flex');
    });
  });
});