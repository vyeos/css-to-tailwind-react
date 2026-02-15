import { 
  VariableRegistry, 
  VariableDefinition, 
  VariableScope,
  ResolutionContext,
  parseVarExpression,
  isCssVariable,
  isVarExpression,
  createGlobalScope,
  createSelectorScope
} from '../src/utils/variableRegistry';
import { createSpecificity } from '../src/utils/specificityCalculator';

describe('variableRegistry', () => {
  let registry: VariableRegistry;

  beforeEach(() => {
    registry = new VariableRegistry();
  });

  describe('Variable Registration', () => {
    it('should register a global variable from :root', () => {
      const varDef: VariableDefinition = {
        name: '--primary-color',
        value: '#ff0000',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 1,
        variants: []
      };
      
      registry.register(varDef);
      
      expect(registry.hasVariable('--primary-color')).toBe(true);
    });

    it('should register a selector-scoped variable', () => {
      const varDef: VariableDefinition = {
        name: '--local-color',
        value: '#00ff00',
        scope: createSelectorScope('.card', 'class'),
        specificity: createSpecificity(0, 0, 1, 0),
        sourceOrder: 1,
        variants: []
      };
      
      registry.register(varDef);
      
      expect(registry.hasVariable('--local-color')).toBe(true);
    });

    it('should track multiple definitions of the same variable', () => {
      const globalDef: VariableDefinition = {
        name: '--color',
        value: 'red',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 1,
        variants: []
      };
      
      const scopedDef: VariableDefinition = {
        name: '--color',
        value: 'blue',
        scope: createSelectorScope('.special', 'class'),
        specificity: createSpecificity(0, 0, 1, 0),
        sourceOrder: 2,
        variants: []
      };
      
      registry.register(globalDef);
      registry.register(scopedDef);
      
      const defs = registry.getVariableDefinitions('--color');
      expect(defs).toHaveLength(2);
    });
  });

  describe('Variable Resolution', () => {
    it('should resolve a global variable', () => {
      registry.register({
        name: '--primary-color',
        value: '#ff0000',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 1,
        variants: []
      });
      
      const context: ResolutionContext = {
        selector: '.button',
        specificity: createSpecificity(0, 0, 1, 0),
        variants: []
      };
      
      const result = registry.resolve('--primary-color', context);
      
      expect(result.resolved).toBe(true);
      expect(result.value).toBe('#ff0000');
    });

    it('should resolve var() expression in value', () => {
      registry.register({
        name: '--primary-color',
        value: '#ff0000',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 1,
        variants: []
      });
      
      const context: ResolutionContext = {
        selector: '.button',
        specificity: createSpecificity(0, 0, 1, 0),
        variants: []
      };
      
      const result = registry.resolveValue('var(--primary-color)', context);
      
      expect(result.hasUnresolved).toBe(false);
      expect(result.value).toBe('#ff0000');
    });

    it('should use fallback value when variable is undefined', () => {
      const context: ResolutionContext = {
        selector: '.button',
        specificity: createSpecificity(0, 0, 1, 0),
        variants: []
      };
      
      const result = registry.resolve('--undefined-var', context, 'red');
      
      expect(result.resolved).toBe(true);
      expect(result.value).toBe('red');
      expect(result.source).toBe('fallback');
    });

    it('should return empty for undefined variable without fallback', () => {
      const context: ResolutionContext = {
        selector: '.button',
        specificity: createSpecificity(0, 0, 1, 0),
        variants: []
      };
      
      const result = registry.resolve('--undefined-var', context);
      
      expect(result.resolved).toBe(false);
      expect(result.value).toBe('');
    });

    it('should detect circular references', () => {
      registry.register({
        name: '--a',
        value: 'var(--a)',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 1,
        variants: []
      });
      
      const context: ResolutionContext = {
        selector: '.test',
        specificity: createSpecificity(0, 0, 1, 0),
        variants: []
      };
      
      const result = registry.resolveValue('var(--a)', context);
      
      expect(result.hasUnresolved).toBe(true);
    });

    it('should prefer higher specificity definitions', () => {
      registry.register({
        name: '--color',
        value: 'red',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 1,
        variants: []
      });
      
      registry.register({
        name: '--color',
        value: 'blue',
        scope: createSelectorScope('.special', 'class'),
        specificity: createSpecificity(0, 0, 1, 0),
        sourceOrder: 2,
        variants: []
      });
      
      const scopedContext: ResolutionContext = {
        selector: '.special',
        specificity: createSpecificity(0, 0, 1, 0),
        variants: []
      };
      
      const result = registry.resolve('--color', scopedContext);
      
      expect(result.value).toBe('blue');
    });

    it('should use later source order when specificity is equal', () => {
      registry.register({
        name: '--color',
        value: 'red',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 1,
        variants: []
      });
      
      registry.register({
        name: '--color',
        value: 'blue',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 2,
        variants: []
      });
      
      const context: ResolutionContext = {
        selector: '.test',
        specificity: createSpecificity(0, 0, 1, 0),
        variants: []
      };
      
      const result = registry.resolve('--color', context);
      
      expect(result.value).toBe('blue');
    });
  });

  describe('Variant-aware Resolution', () => {
    it('should resolve variables with matching variants', () => {
      registry.register({
        name: '--color',
        value: 'red',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 1,
        variants: ['md']
      });
      
      const context: ResolutionContext = {
        selector: '.test',
        specificity: createSpecificity(0, 0, 1, 0),
        variants: ['md']
      };
      
      const result = registry.resolve('--color', context);
      
      expect(result.resolved).toBe(true);
      expect(result.value).toBe('red');
    });

    it('should not resolve variant-scoped variable without matching variant', () => {
      registry.register({
        name: '--color',
        value: 'red',
        scope: createGlobalScope(),
        specificity: createSpecificity(0, 0, 0, 0),
        sourceOrder: 1,
        variants: ['md']
      });
      
      const context: ResolutionContext = {
        selector: '.test',
        specificity: createSpecificity(0, 0, 1, 0),
        variants: []
      };
      
      const result = registry.resolve('--color', context);
      
      expect(result.resolved).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    describe('parseVarExpression', () => {
      it('should parse simple var() expression', () => {
        const result = parseVarExpression('var(--color)');
        
        expect(result.hasVar).toBe(true);
        expect(result.varName).toBe('--color');
        expect(result.fallback).toBeUndefined();
      });

      it('should parse var() with fallback', () => {
        const result = parseVarExpression('var(--color, red)');
        
        expect(result.hasVar).toBe(true);
        expect(result.varName).toBe('--color');
        expect(result.fallback).toBe('red');
      });

      it('should return false for non-var() values', () => {
        const result = parseVarExpression('#ff0000');
        
        expect(result.hasVar).toBe(false);
        expect(result.rawValue).toBe('#ff0000');
      });
    });

    describe('isCssVariable', () => {
      it('should return true for CSS variable names', () => {
        expect(isCssVariable('--primary-color')).toBe(true);
        expect(isCssVariable('--my-var')).toBe(true);
      });

      it('should return false for regular properties', () => {
        expect(isCssVariable('color')).toBe(false);
        expect(isCssVariable('background-color')).toBe(false);
      });
    });

    describe('isVarExpression', () => {
      it('should return true for var() expressions', () => {
        expect(isVarExpression('var(--color)')).toBe(true);
        expect(isVarExpression('var(--color, red)')).toBe(true);
      });

      it('should return false for non-var() values', () => {
        expect(isVarExpression('#ff0000')).toBe(false);
        expect(isVarExpression('16px')).toBe(false);
      });
    });

    describe('Scope Helpers', () => {
      it('should create global scope', () => {
        const scope = createGlobalScope();
        expect(scope.type).toBe('global');
      });

      it('should create selector scope', () => {
        const scope = createSelectorScope('.card', 'class');
        expect(scope.type).toBe('selector');
        expect(scope.selector).toBe('.card');
        expect(scope.selectorType).toBe('class');
      });
    });
  });
});