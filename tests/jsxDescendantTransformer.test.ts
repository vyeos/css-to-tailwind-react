import { transformDescendantSelectors } from '../src/jsxDescendantTransformer';
import { CSSRule, UtilityWithVariant } from '../src/cssParser';
import { Specificity } from '../src/utils/specificityCalculator';
import { getPropertyForUtility } from '../src/utils/propertyMapper';

const DEFAULT_SPECIFICITY: Specificity = { inline: 0, id: 0, class: 1, element: 0 };

function createDescendantRule(
  parentType: 'class' | 'element',
  parentName: string,
  targetType: 'class' | 'element',
  targetName: string,
  utilities: Array<{ value: string; variants: string[] }>
): CSSRule {
  let sourceOrder = 0;
  const utilitiesWithMeta: UtilityWithVariant[] = utilities.map(u => ({
    value: u.value,
    variants: u.variants,
    cssProperty: getPropertyForUtility(u.value),
    specificity: DEFAULT_SPECIFICITY,
    sourceOrder: ++sourceOrder
  }));
  
  return {
    selector: '',
    className: parentType === 'class' ? parentName : '',
    declarations: [],
    convertedClasses: utilitiesWithMeta.map(u => 
      u.variants.length > 0 ? `${u.variants.join(':')}:${u.value}` : u.value
    ),
    utilities: utilitiesWithMeta,
    skipped: false,
    fullyConverted: true,
    partialConversion: false,
    isDescendant: true,
    parentSelector: { type: parentType, name: parentName },
    targetSelector: { type: targetType, name: targetName }
  };
}

describe('jsxDescendantTransformer', () => {
  describe('.class element selectors', () => {
    it('should apply classes to h1 inside .blog-main', () => {
      const jsx = `
<div className="blog-main">
  <h1>Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] },
          { value: 'font-bold', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.transformations).toBe(1);
      expect(result.code).toContain('text-3xl');
      expect(result.code).toContain('font-bold');
    });

    it('should apply classes to img inside .card', () => {
      const jsx = `
<div className="card">
  <img src="test.jpg" />
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'card', 'element', 'img', [
          { value: 'w-full', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="w-full"');
    });
  });

  describe('element element selectors', () => {
    it('should apply classes to img inside main', () => {
      const jsx = `
<main>
  <img src="test.jpg" />
</main>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('element', 'main', 'element', 'img', [
          { value: 'w-full', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="w-full"');
    });
  });

  describe('.class .class selectors', () => {
    it('should apply classes to .title inside .card', () => {
      const jsx = `
<div className="card">
  <h1 className="title">Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'card', 'class', 'title', [
          { value: 'text-red-500', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="title text-red-500"');
    });
  });

  describe('Nested structures', () => {
    it('should apply to deeply nested elements', () => {
      const jsx = `
<div className="blog-main">
  <section>
    <div>
      <h1>Title</h1>
    </div>
  </section>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('<h1 className="text-3xl"');
    });
  });

  describe('Multiple parent matches', () => {
    it('should apply to multiple instances of parent class', () => {
      const jsx = `
<div className="blog-main">
  <h1>First</h1>
</div>
<div className="blog-main">
  <h1>Second</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.transformations).toBe(2);
      expect(result.code).toMatch(/className="text-3xl"/);
    });
  });

  describe('Preserving existing className', () => {
    it('should merge with existing className', () => {
      const jsx = `
<div className="blog-main">
  <h1 className="title">Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="title text-3xl"');
    });

    it('should not duplicate classes', () => {
      const jsx = `
<div className="blog-main">
  <h1 className="text-3xl">Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.code).toMatch(/className="text-3xl"/);
      expect(result.code).not.toContain('text-3xl text-3xl');
    });
  });

  describe('Responsive variants', () => {
    it('should apply responsive variant classes', () => {
      const jsx = `
<div className="blog-main">
  <h1>Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-4xl', variants: ['md'] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="md:text-4xl"');
    });
  });

  describe('Ignored cases', () => {
    it('should not apply to React components', () => {
      const jsx = `
<div className="blog-main">
  <MyComponent />
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'MyComponent', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(false);
    });

    it('should not apply to elements outside parent', () => {
      const jsx = `
<div className="other">
  <h1>Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(false);
    });

    it('should handle multi-class parent selectors', () => {
      const jsx = `
<div className="container blog-main">
  <h1>Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="text-3xl"');
    });
  });

  describe('Multiple descendant rules', () => {
    it('should apply multiple rules to same parent', () => {
      const jsx = `
<div className="blog-main">
  <h1>Title</h1>
  <p>Paragraph</p>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ]),
        createDescendantRule('class', 'blog-main', 'element', 'p', [
          { value: 'text-base', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.transformations).toBe(2);
      expect(result.code).toContain('className="text-3xl"');
      expect(result.code).toContain('className="text-base"');
    });
  });

  describe('element .class selectors', () => {
    it('should apply classes to .container inside main', () => {
      const jsx = `
<main>
  <div className="container">Content</div>
</main>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('element', 'main', 'class', 'container', [
          { value: 'flex', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="container flex"');
    });
  });

  describe('Multiple different parent selectors', () => {
    it('should apply different rules for different parents', () => {
      const jsx = `
<div className="blog-main">
  <h1>Title</h1>
</div>
<div className="card">
  <h1>Card Title</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ]),
        createDescendantRule('class', 'card', 'element', 'h1', [
          { value: 'text-lg', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.transformations).toBe(2);
    });
  });

  describe('Non-descendant rules filter', () => {
    it('should ignore non-descendant rules', () => {
      const jsx = `
<div className="blog-main">
  <h1>Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        {
          selector: '.title',
          className: 'title',
          declarations: [],
          convertedClasses: ['text-3xl'],
          utilities: [{ 
            value: 'text-3xl', 
            variants: [], 
            cssProperty: getPropertyForUtility('text-3xl'), 
            specificity: DEFAULT_SPECIFICITY, 
            sourceOrder: 1 
          }],
          skipped: false,
          fullyConverted: true,
          partialConversion: false,
          isDescendant: false
        }
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(false);
    });
  });

  describe('Dynamic className handling', () => {
    it('should handle template literal className', () => {
      const jsx = `
<div className={\`blog-main\`}>
  <h1>Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="text-3xl"');
    });
  });

  describe('Mixed with React code structure', () => {
    it('should handle JSX within function components', () => {
      const jsx = `
function BlogPost() {
  return (
    <div className="blog-main">
      <h1>Title</h1>
    </div>
  );
}`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="text-3xl"');
    });

    it('should handle JSX within arrow function components', () => {
      const jsx = `
const BlogPost = () => (
  <div className="blog-main">
    <h1>Title</h1>
  </div>
);`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(true);
      expect(result.code).toContain('className="text-3xl"');
    });
  });

  describe('No transformations', () => {
    it('should return unchanged code when no rules apply', () => {
      const jsx = `
<div className="other">
  <h1>Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [
        createDescendantRule('class', 'blog-main', 'element', 'h1', [
          { value: 'text-3xl', variants: [] }
        ])
      ];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(false);
      expect(result.transformations).toBe(0);
    });

    it('should return unchanged code when no rules provided', () => {
      const jsx = `
<div className="blog-main">
  <h1>Hello</h1>
</div>`;
      
      const rules: CSSRule[] = [];
      
      const result = transformDescendantSelectors(jsx, rules);
      
      expect(result.hasChanges).toBe(false);
      expect(result.code).toBe(jsx);
    });
  });
});