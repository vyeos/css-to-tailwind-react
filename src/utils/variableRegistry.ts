import { Specificity, ZERO_SPECIFICITY, compareSpecificity } from './specificityCalculator';
import { logger } from './logger';

export interface VariableDefinition {
  name: string;
  value: string;
  scope: VariableScope;
  specificity: Specificity;
  sourceOrder: number;
  variants: string[];
}

export interface VariableScope {
  type: 'global' | 'selector';
  selector?: string;
  selectorType?: 'class' | 'element' | 'root';
}

export interface ResolutionContext {
  selector: string;
  specificity: Specificity;
  variants: string[];
}

interface VariableKey {
  name: string;
  scopeKey: string;
}

function createScopeKey(scope: VariableScope): string {
  if (scope.type === 'global') {
    return ':root';
  }
  return scope.selector || '';
}

export class VariableRegistry {
  private variables: Map<string, VariableDefinition[]> = new Map();
  private resolutionCache: Map<string, string> = new Map();
  private resolutionStack: Set<string> = new Set();

  register(variable: VariableDefinition): void {
    const key = variable.name;
    
    if (!this.variables.has(key)) {
      this.variables.set(key, []);
    }
    
    const definitions = this.variables.get(key)!;
    definitions.push(variable);
    
    definitions.sort((a, b) => {
      const specCompare = compareSpecificity(b.specificity, a.specificity);
      if (specCompare !== 0) return specCompare;
      return b.sourceOrder - a.sourceOrder;
    });
    
    this.resolutionCache.clear();
  }

  resolve(
    varName: string,
    context: ResolutionContext,
    fallback?: string
  ): { value: string; resolved: boolean; source: string } {
    const cacheKey = `${varName}:${context.selector}:${context.variants.join(',')}`;
    
    if (this.resolutionCache.has(cacheKey)) {
      return { value: this.resolutionCache.get(cacheKey)!, resolved: true, source: 'cache' };
    }
    
    if (this.resolutionStack.has(varName)) {
      logger.warn(`Circular reference detected for variable: ${varName}`);
      return { value: fallback || '', resolved: false, source: 'circular' };
    }
    
    this.resolutionStack.add(varName);
    
    try {
      const definitions = this.variables.get(varName);
      
      if (!definitions || definitions.length === 0) {
        if (fallback !== undefined) {
          const resolvedFallback = this.resolveValue(fallback, context);
          return { value: resolvedFallback.value, resolved: true, source: 'fallback' };
        }
        logger.warn(`Undefined CSS variable: ${varName}`);
        return { value: '', resolved: false, source: 'undefined' };
      }
      
      const applicableDefs = definitions.filter(def => 
        this.isApplicable(def, context)
      );
      
      if (applicableDefs.length === 0) {
        if (fallback !== undefined) {
          const resolvedFallback = this.resolveValue(fallback, context);
          return { value: resolvedFallback.value, resolved: true, source: 'fallback' };
        }
        logger.warn(`No applicable definition for variable: ${varName} in context: ${context.selector}`);
        return { value: '', resolved: false, source: 'no-match' };
      }
      
      const bestMatch = applicableDefs[0];
      const resolvedValue = this.resolveValue(bestMatch.value, context);
      
      if (resolvedValue.isCircular) {
        return { 
          value: resolvedValue.value, 
          resolved: false, 
          source: 'circular' 
        };
      }
      
      const result = { 
        value: resolvedValue.value, 
        resolved: !resolvedValue.hasUnresolved, 
        source: resolvedValue.hasUnresolved ? 'unresolved' : 'resolved' 
      };
      
      this.resolutionCache.set(cacheKey, result.value);
      return result;
      
    } finally {
      this.resolutionStack.delete(varName);
    }
  }

  resolveValue(value: string, context: ResolutionContext): { value: string; hasUnresolved: boolean; isCircular?: boolean } {
    const varPattern = /var\s*\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+))?\s*\)/g;
    let result = value;
    let hasUnresolved = false;
    let isCircular = false;
    let match;
    let iterations = 0;
    const maxIterations = 10;
    
    while ((match = varPattern.exec(result)) !== null) {
      if (++iterations > maxIterations) {
        logger.warn(`Max variable resolution depth reached for: ${value}`);
        hasUnresolved = true;
        break;
      }
      
      const fullMatch = match[0];
      const varName = match[1];
      const fallback = match[2]?.trim();
      
      const resolved = this.resolve(varName, context, fallback);
      
      if (resolved.source === 'circular') {
        isCircular = true;
        hasUnresolved = true;
        result = resolved.value || '';
        break;
      }
      
      if (!resolved.resolved) {
        hasUnresolved = true;
        result = resolved.value;
      } else {
        result = result.replace(fullMatch, resolved.value);
      }
      varPattern.lastIndex = 0;
    }
    
    return { value: result, hasUnresolved, isCircular };
  }

  private isApplicable(def: VariableDefinition, context: ResolutionContext): boolean {
    if (def.scope.type === 'global') {
      if (def.variants.length === 0) {
        return true;
      }
      return this.variantsMatch(def.variants, context.variants);
    }
    
    const scopeSelector = def.scope.selector || '';
    const contextSelector = context.selector;
    
    if (scopeSelector === contextSelector) {
      return this.variantsMatch(def.variants, context.variants);
    }
    
    if (this.selectorContains(contextSelector, scopeSelector)) {
      return this.variantsMatch(def.variants, context.variants);
    }
    
    return false;
  }

  private variantsMatch(defVariants: string[], contextVariants: string[]): boolean {
    if (defVariants.length === 0) {
      return true;
    }
    
    if (contextVariants.length === 0) {
      return false;
    }
    
    return defVariants.every(v => contextVariants.includes(v));
  }

  private selectorContains(outer: string, inner: string): boolean {
    const innerClasses: string[] = inner.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g) || [];
    const outerClasses: string[] = outer.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g) || [];
    
    return innerClasses.every(cls => outerClasses.includes(cls));
  }

  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  getVariableDefinitions(name: string): VariableDefinition[] {
    return this.variables.get(name) || [];
  }

  clear(): void {
    this.variables.clear();
    this.resolutionCache.clear();
    this.resolutionStack.clear();
  }

  getRegisteredVariables(): string[] {
    return Array.from(this.variables.keys());
  }
}

export function parseVarExpression(value: string): { 
  hasVar: boolean; 
  varName?: string; 
  fallback?: string;
  rawValue: string;
} {
  const varPattern = /^var\s*\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*(.+)\s*)?\)$/;
  const match = value.match(varPattern);
  
  if (match) {
    const fallback = match[2]?.trim();
    return {
      hasVar: true,
      varName: match[1],
      fallback: fallback && fallback.length > 0 ? fallback : undefined,
      rawValue: value
    };
  }
  
  return { hasVar: false, rawValue: value };
}

export function isCssVariable(property: string): boolean {
  return property.startsWith('--');
}

export function isVarExpression(value: string): boolean {
  return /var\s*\(\s*--[a-zA-Z0-9_-]+\s*(?:,[^)]+)?\s*\)/.test(value);
}

export function createGlobalScope(): VariableScope {
  return { type: 'global' };
}

export function createSelectorScope(selector: string, selectorType: 'class' | 'element' | 'root' = 'class'): VariableScope {
  return { type: 'selector', selector, selectorType };
}
