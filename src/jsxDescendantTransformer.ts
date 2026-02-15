import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { CSSRule, SelectorTarget } from './cssParser';
import { assembleUtilities } from './utils/variantAssembler';
import { logger } from './utils/logger';

export interface DescendantTransformResult {
  code: string;
  hasChanges: boolean;
  transformations: number;
  warnings: string[];
}

interface DescendantRule {
  parentSelector: SelectorTarget;
  targetSelector: SelectorTarget;
  utilities: Array<{ value: string; variants: string[] }>;
}

function isReactComponent(name: string): boolean {
  return name.length > 0 && name[0] === name[0].toUpperCase();
}

function getJSXElementName(node: t.JSXOpeningElement): string | null {
  if (t.isJSXIdentifier(node.name)) {
    return node.name.name;
  }
  return null;
}

function parseClassNameValue(attr: t.JSXAttribute): string[] {
  const classes: string[] = [];
  
  if (!attr.value) {
    return classes;
  }
  
  if (t.isStringLiteral(attr.value)) {
    return attr.value.value.split(/\s+/).filter(Boolean);
  }
  
  if (t.isJSXExpressionContainer(attr.value)) {
    const expr = attr.value.expression;
    
    if (t.isStringLiteral(expr)) {
      return expr.value.split(/\s+/).filter(Boolean);
    }
    
    if (t.isTemplateLiteral(expr) && expr.quasis.length > 0 && expr.expressions.length === 0) {
      return expr.quasis[0].value.raw.split(/\s+/).filter(Boolean);
    }
  }
  
  return classes;
}

function elementMatchesSelector(
  node: t.JSXOpeningElement,
  selector: SelectorTarget
): boolean {
  const elementName = getJSXElementName(node);
  
  if (!elementName) {
    return false;
  }
  
  if (isReactComponent(elementName)) {
    return false;
  }
  
  if (selector.type === 'element') {
    return elementName.toLowerCase() === selector.name.toLowerCase();
  }
  
  if (selector.type === 'class') {
    const classNameAttr = node.attributes?.find(
      attr => t.isJSXAttribute(attr) && 
              t.isJSXIdentifier(attr.name) && 
              attr.name.name === 'className'
    );
    
    if (!classNameAttr || !t.isJSXAttribute(classNameAttr)) {
      return false;
    }
    
    const classes = parseClassNameValue(classNameAttr);
    return classes.includes(selector.name);
  }
  
  return false;
}

function mergeClassesIntoAttribute(
  node: t.JSXOpeningElement,
  newClasses: string[]
): boolean {
  if (newClasses.length === 0) {
    return false;
  }
  
  const classNameAttr = node.attributes?.find(
    attr => t.isJSXAttribute(attr) && 
            t.isJSXIdentifier(attr.name) && 
            attr.name.name === 'className'
  );
  
  if (!classNameAttr) {
    const newAttr = t.jsxAttribute(
      t.jsxIdentifier('className'),
      t.stringLiteral(newClasses.join(' '))
    );
    
    if (!node.attributes) {
      node.attributes = [];
    }
    node.attributes.push(newAttr);
    return true;
  }
  
  if (!t.isJSXAttribute(classNameAttr)) {
    return false;
  }
  
  const existingClasses = parseClassNameValue(classNameAttr);
  const allClasses = new Set([...existingClasses, ...newClasses]);
  const mergedClasses = Array.from(allClasses);
  
  if (t.isStringLiteral(classNameAttr.value)) {
    classNameAttr.value.value = mergedClasses.join(' ');
    return true;
  }
  
  if (t.isJSXExpressionContainer(classNameAttr.value)) {
    const expr = classNameAttr.value.expression;
    
    if (t.isStringLiteral(expr)) {
      expr.value = mergedClasses.join(' ');
      return true;
    }
    
    if (t.isTemplateLiteral(expr) && expr.quasis.length > 0 && expr.expressions.length === 0) {
      expr.quasis[0].value.raw = mergedClasses.join(' ');
      expr.quasis[0].value.cooked = mergedClasses.join(' ');
      return true;
    }
  }
  
  classNameAttr.value = t.stringLiteral(mergedClasses.join(' '));
  return true;
}

function wrapInFragment(code: string): string {
  return `<>${code}</>`;
}

function unwrapFragment(code: string): string {
  return code.replace(/^<>\n?/, '').replace(/\n?<\/>$/, '');
}

function needsFragmentWrapping(code: string): boolean {
  const trimmed = code.trim();
  
  if (trimmed.startsWith('<>') || trimmed.startsWith('<Fragment')) {
    return false;
  }
  
  const firstChar = trimmed.search(/<[a-zA-Z]/);
  if (firstChar === -1) return false;
  
  let depth = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = firstChar; i < trimmed.length; i++) {
    const char = trimmed[i];
    
    if (inString) {
      if (char === stringChar && trimmed[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }
    
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (trimmed.slice(i, i + 2) === '</') {
      depth--;
      i++;
    } else if (char === '<' && trimmed[i + 1]?.match(/[a-zA-Z]/)) {
      depth++;
    }
    
    if (depth === 0 && i > firstChar) {
      const remaining = trimmed.slice(i + 1).trim();
      if (remaining.startsWith('<') && !remaining.startsWith('</')) {
        return true;
      }
    }
  }
  
  return false;
}

export function transformDescendantSelectors(
  code: string,
  rules: CSSRule[]
): DescendantTransformResult {
  const descendantRules: DescendantRule[] = [];
  
  for (const rule of rules) {
    if (rule.isDescendant && rule.parentSelector && rule.targetSelector) {
      if (rule.convertedClasses.length > 0) {
        descendantRules.push({
          parentSelector: rule.parentSelector,
          targetSelector: rule.targetSelector,
          utilities: rule.utilities
        });
      }
    }
  }
  
  if (descendantRules.length === 0) {
    return {
      code,
      hasChanges: false,
      transformations: 0,
      warnings: []
    };
  }
  
  let hasChanges = false;
  let transformations = 0;
  const warnings: string[] = [];
  
  const needsWrapping = needsFragmentWrapping(code);
  const codeToParse = needsWrapping ? wrapInFragment(code) : code;
  
  try {
    const ast = parse(codeToParse, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
        'dynamicImport'
      ]
    });
    
    traverse(ast, {
      JSXOpeningElement(path) {
        const node = path.node;
        
        for (const rule of descendantRules) {
          if (elementMatchesSelector(node, rule.parentSelector)) {
            const parentPath = path.parentPath;
            
            if (!parentPath) continue;
            
            const appliedClasses = applyToDescendants(parentPath, rule);
            
            if (appliedClasses > 0) {
              hasChanges = true;
              transformations += appliedClasses;
            }
          }
        }
      }
    });
    
    const output = generate(ast, {
      retainLines: true,
      retainFunctionParens: true,
      comments: true
    });
    
    let outputCode = output.code;
    if (needsWrapping) {
      outputCode = unwrapFragment(outputCode);
    }
    
    return {
      code: outputCode,
      hasChanges,
      transformations,
      warnings
    };
    
  } catch (error) {
    logger.error('Failed to transform descendant selectors:', error);
    warnings.push(`Descendant transformation failed: ${error}`);
    
    return {
      code,
      hasChanges: false,
      transformations: 0,
      warnings
    };
  }
}

function applyToDescendants(
  parentPath: any,
  rule: DescendantRule
): number {
  let appliedCount = 0;
  const newClasses = assembleUtilities(rule.utilities);
  
  const parentNode = parentPath.node;
  
  if (!parentNode) {
    return appliedCount;
  }
  
  if (t.isJSXElement(parentNode)) {
    if (parentNode.children) {
      for (const child of parentNode.children) {
        if (t.isJSXElement(child)) {
          appliedCount += applyToJSXElement(child, rule, newClasses);
        }
      }
    }
  }
  
  return appliedCount;
}

function applyToJSXElement(
  element: t.JSXElement,
  rule: DescendantRule,
  newClasses: string[]
): number {
  let appliedCount = 0;
  
  if (elementMatchesSelector(element.openingElement, rule.targetSelector)) {
    if (mergeClassesIntoAttribute(element.openingElement, newClasses)) {
      appliedCount++;
      
      const elementName = getJSXElementName(element.openingElement);
      logger.verbose(`Applied descendant classes to <${elementName}>: ${newClasses.join(' ')}`);
    }
  }
  
  if (element.children) {
    for (const child of element.children) {
      if (t.isJSXElement(child)) {
        appliedCount += applyToJSXElement(child, rule, newClasses);
      }
    }
  }
  
  return appliedCount;
}

export function groupDescendantRulesByParent(rules: CSSRule[]): Map<string, DescendantRule[]> {
  const grouped = new Map<string, DescendantRule[]>();
  
  for (const rule of rules) {
    if (rule.isDescendant && rule.parentSelector && rule.targetSelector) {
      const parentKey = rule.parentSelector.type === 'class' 
        ? `.${rule.parentSelector.name}` 
        : rule.parentSelector.name;
      
      if (!grouped.has(parentKey)) {
        grouped.set(parentKey, []);
      }
      
      grouped.get(parentKey)!.push({
        parentSelector: rule.parentSelector,
        targetSelector: rule.targetSelector,
        utilities: rule.utilities
      });
    }
  }
  
  return grouped;
}