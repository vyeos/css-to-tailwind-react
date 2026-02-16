import { CSSParser } from '../src/cssParser';
import { TailwindMapper } from '../src/tailwindMapper';
import { VariableRegistry } from '../src/utils/variableRegistry';

describe('Cross-file CSS Variable Support', () => {
  it('should resolve variables defined in a separate file', async () => {
    const mapper = new TailwindMapper({});
    const sharedRegistry = new VariableRegistry();
    const parser = new CSSParser(mapper, undefined, sharedRegistry);

    const globalCSS = `
      :root {
        --primary-color: #3b82f6;
        --spacing-md: 16px;
      }
    `;

    const componentCSS = `
      .button {
        background-color: var(--primary-color);
        padding: var(--spacing-md);
      }
    `;

    await parser.collectVariablesOnly(globalCSS, 'globals.css');

    const result = await parser.parse(componentCSS, 'button.css');

    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].className).toBe('button');
    expect(result.rules[0].convertedClasses).toContain('bg-[#3b82f6]');
    expect(result.rules[0].convertedClasses).toContain('p-[16px]');
    expect(result.rules[0].fullyConverted).toBe(true);
  });

  it('should resolve nested variables across files', async () => {
    const mapper = new TailwindMapper({});
    const sharedRegistry = new VariableRegistry();
    const parser = new CSSParser(mapper, undefined, sharedRegistry);

    const globalCSS = `
      :root {
        --color-blue: #3b82f6;
        --primary-color: var(--color-blue);
      }
    `;

    const componentCSS = `
      .element {
        color: var(--primary-color);
      }
    `;

    await parser.collectVariablesOnly(globalCSS, 'globals.css');
    const result = await parser.parse(componentCSS, 'element.css');

    expect(result.rules[0].convertedClasses).toContain('text-[#3b82f6]');
  });

  it('should handle responsive variables from global file', async () => {
    const mapper = new TailwindMapper({});
    const sharedRegistry = new VariableRegistry();
    const parser = new CSSParser(mapper, { sm: '640px', md: '768px' }, sharedRegistry);

    const globalCSS = `
      :root {
        --mobile-padding: 8px;
      }
      
      @media (min-width: 768px) {
        :root {
          --desktop-padding: 16px;
        }
      }
    `;

    const componentCSS = `
      .container {
        padding: var(--mobile-padding);
      }
      
      @media (min-width: 768px) {
        .container {
          padding: var(--desktop-padding);
        }
      }
    `;

    await parser.collectVariablesOnly(globalCSS, 'globals.css');
    const result = await parser.parse(componentCSS, 'container.css');

    expect(result.rules.length).toBeGreaterThanOrEqual(1);
    const baseRule = result.rules.find(r => !r.utilities.some(u => u.variants.includes('md')));
    const mdRule = result.rules.find(r => r.utilities.some(u => u.variants.includes('md')));
    
    expect(baseRule?.convertedClasses).toContain('p-[8px]');
    expect(mdRule?.convertedClasses).toContain('md:p-[16px]');
  });

  it('should handle multiple global CSS files', async () => {
    const mapper = new TailwindMapper({});
    const sharedRegistry = new VariableRegistry();
    const parser = new CSSParser(mapper, undefined, sharedRegistry);

    const colorsCSS = `
      :root {
        --color-primary: #3b82f6;
        --color-secondary: #10b981;
      }
    `;

    const spacingCSS = `
      :root {
        --space-sm: 8px;
        --space-lg: 24px;
      }
    `;

    const componentCSS = `
      .card {
        background-color: var(--color-primary);
        padding: var(--space-sm);
        margin-bottom: var(--space-lg);
        border-color: var(--color-secondary);
      }
    `;

    await parser.collectVariablesOnly(colorsCSS, 'colors.css');
    await parser.collectVariablesOnly(spacingCSS, 'spacing.css');
    const result = await parser.parse(componentCSS, 'card.css');

    expect(result.rules[0].convertedClasses).toContain('bg-[#3b82f6]');
    expect(result.rules[0].convertedClasses).toContain('p-[8px]');
    expect(result.rules[0].convertedClasses).toContain('mb-[24px]');
    expect(result.rules[0].convertedClasses).toContain('border-[#10b981]');
  });

  it('should handle variables in internal CSS from other files', async () => {
    const mapper = new TailwindMapper({});
    const sharedRegistry = new VariableRegistry();
    const parser = new CSSParser(mapper, undefined, sharedRegistry);

    const globalCSS = `
      :root {
        --text-color: #1f2937;
      }
    `;

    const jsxWithInternalCSS = `
      import React from 'react';
      
      export const Component = () => {
        return (
          <style>
            .text-block {
              color: var(--text-color);
            }
          </style>
          <div className="text-block">Hello</div>
        );
      };
    `;

    await parser.collectVariablesOnly(globalCSS, 'globals.css');
    await parser.collectVariablesFromInternalCSS(jsxWithInternalCSS, 'Component.tsx');

    const styles = parser.parseInternalStyle(jsxWithInternalCSS);
    const result = await parser.parse(styles.styles[0].content, 'Component.tsx');

    expect(result.rules[0].convertedClasses).toContain('text-[#1f2937]');
  });

  it('should resolve Tailwind scale values from variables', async () => {
    const mapper = new TailwindMapper({});
    const sharedRegistry = new VariableRegistry();
    const parser = new CSSParser(mapper, undefined, sharedRegistry);

    const globalCSS = `
      :root {
        --spacing-4: 16px;
        --display-flex: flex;
      }
    `;

    const componentCSS = `
      .container {
        padding: var(--spacing-4);
        display: var(--display-flex);
      }
    `;

    await parser.collectVariablesOnly(globalCSS, 'globals.css');
    const result = await parser.parse(componentCSS, 'container.css');

    expect(result.rules[0].convertedClasses.length).toBe(2);
    expect(result.rules[0].convertedClasses).toContain('flex');
  });
});

describe('VariableRegistry persistence', () => {
  it('should maintain variables across multiple parse calls', async () => {
    const mapper = new TailwindMapper({});
    const sharedRegistry = new VariableRegistry();
    const parser = new CSSParser(mapper, undefined, sharedRegistry);

    await parser.collectVariablesOnly(`
      :root {
        --color: #ef4444;
      }
    `, 'file1.css');

    const result1 = await parser.parse(`
      .a { color: var(--color); }
    `, 'file2.css');

    const result2 = await parser.parse(`
      .b { background-color: var(--color); }
    `, 'file3.css');

    expect(result1.rules[0].convertedClasses).toContain('text-[#ef4444]');
    expect(result2.rules[0].convertedClasses).toContain('bg-[#ef4444]');
  });

  it('should not clear shared registry on reset', () => {
    const registry = new VariableRegistry();
    registry.register({
      name: '--test',
      value: '16px',
      scope: { type: 'global' },
      specificity: { inline: 0, id: 0, class: 0, element: 0 },
      sourceOrder: 1,
      variants: []
    });

    const mapper = new TailwindMapper({});
    const parser = new CSSParser(mapper, undefined, registry);

    expect(registry.hasVariable('--test')).toBe(true);

    const result = parser.parse('.test { padding: var(--test); }', 'test.css');
    
    expect(registry.hasVariable('--test')).toBe(true);
  });
});

describe('Variable resolution failure without shared registry', () => {
  it('should fail to resolve cross-file variables without shared registry', async () => {
    const mapper = new TailwindMapper({});
    const parser = new CSSParser(mapper, undefined);

    const globalCSS = `
      :root {
        --primary-color: #3b82f6;
      }
    `;

    const componentCSS = `
      .button {
        background-color: var(--primary-color);
      }
    `;

    await parser.collectVariablesOnly(globalCSS, 'globals.css');
    const result = await parser.parse(componentCSS, 'button.css');

    expect(result.rules[0].convertedClasses).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
