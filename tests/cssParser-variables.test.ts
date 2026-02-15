import { CSSParser } from '../src/cssParser';
import { TailwindMapper } from '../src/tailwindMapper';

describe('CSSParser - CSS Variable Support', () => {
  let parser: CSSParser;
  let mapper: TailwindMapper;

  beforeEach(() => {
    mapper = new TailwindMapper({});
    parser = new CSSParser(mapper);
  });

  describe('Global variables from :root', () => {
    it('should resolve :root variable in class selector', async () => {
      const css = `
:root {
  --primary-color: #ff0000;
}

.button {
  color: var(--primary-color);
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].convertedClasses).toContain('text-[#ff0000]');
    });

    it('should resolve multiple :root variables', async () => {
      const css = `
:root {
  --primary-color: #ff0000;
  --secondary-color: #00ff00;
}

.button {
  color: var(--primary-color);
  background-color: var(--secondary-color);
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('text-[#ff0000]');
      expect(result.rules[0].convertedClasses).toContain('bg-[#00ff00]');
    });
  });

  describe('Selector-scoped variables', () => {
    it('should resolve variable scoped to same selector', async () => {
      const css = `
.card {
  --card-bg: #ffffff;
  background-color: var(--card-bg);
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].convertedClasses).toContain('bg-[#ffffff]');
    });

    it('should prefer scoped variable over global', async () => {
      const css = `
:root {
  --color: #ff0000;
}

.special {
  --color: #0000ff;
  color: var(--color);
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].convertedClasses).toContain('text-[#0000ff]');
    });
  });

  describe('Variable usage in different properties', () => {
    it('should resolve color variable', async () => {
      const css = `
:root { --text-color: #333333; }
.text { color: var(--text-color); }`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('text-[#333333]');
    });

    it('should resolve background-color variable', async () => {
      const css = `
:root { --bg: #ffffff; }
.box { background-color: var(--bg); }`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('bg-[#ffffff]');
    });

    it('should resolve margin variable', async () => {
      const css = `
:root { --spacing: 16px; }
.box { margin: var(--spacing); }`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('m-[16px]');
    });

    it('should resolve padding variable', async () => {
      const css = `
:root { --spacing: 16px; }
.box { padding: var(--spacing); }`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('p-[16px]');
    });

    it('should resolve font-size variable with arbitrary value', async () => {
      const css = `
:root { --font-size: 60px; }
.text { font-size: var(--font-size); }`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('text-[60px]');
    });

    it('should resolve width variable', async () => {
      const css = `
:root { --width: 100%; }
.box { width: var(--width); }`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('w-full');
    });
  });

  describe('Fallback values', () => {
    it('should use fallback when variable is undefined', async () => {
      const css = `
.button {
  color: var(--undefined-color, #ff0000);
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('text-[#ff0000]');
    });

    it('should use variable value over fallback when defined', async () => {
      const css = `
:root { --color: #0000ff; }
.button {
  color: var(--color, #ff0000);
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('text-[#0000ff]');
    });
  });

  describe('Responsive variants with variables', () => {
    it('should resolve variable in media query', async () => {
      const css = `
:root { --color: #ff0000; }

@media (min-width: 768px) {
  .button {
    color: var(--color);
  }
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('md:text-[#ff0000]');
    });

    it('should resolve media-query scoped variable', async () => {
      const css = `
@media (min-width: 768px) {
  :root {
    --color: #0000ff;
  }
  .button {
    color: var(--color);
  }
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('md:text-[#0000ff]');
    });
  });

  describe('Pseudo selectors with variables', () => {
    it('should resolve variable in pseudo selector', async () => {
      const css = `
:root { --hover-color: #0000ff; }

.button:hover {
  color: var(--hover-color);
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.rules[0].convertedClasses).toContain('hover:text-[#0000ff]');
    });
  });

  describe('Unresolved variables', () => {
    it('should warn and skip when variable is undefined', async () => {
      const css = `
.button {
  color: var(--undefined-var);
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('CSS cleanup with variables', () => {
    it('should remove converted declarations using variables', async () => {
      const css = `
:root { --color: #ff0000; }
.button {
  color: var(--color);
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.hasChanges).toBe(true);
      expect(result.css).not.toContain('color: var(--color)');
    });

    it('should keep variable declarations in output', async () => {
      const css = `
:root { --color: #ff0000; }
.button {
  color: var(--color);
  border: 1px solid black;
}`;
      
      const result = await parser.parse(css, 'test.css');
      
      expect(result.css).toContain('--color: #ff0000');
    });
  });
});