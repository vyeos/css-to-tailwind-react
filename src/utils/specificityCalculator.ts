import { logger } from './logger';

export interface Specificity {
  inline: number;
  id: number;
  class: number;
  element: number;
}

export const ZERO_SPECIFICITY: Specificity = { inline: 0, id: 0, class: 0, element: 0 };

export function createSpecificity(inline = 0, id = 0, cls = 0, element = 0): Specificity {
  return { inline, id, class: cls, element };
}

export function addSpecificity(a: Specificity, b: Specificity): Specificity {
  return {
    inline: a.inline + b.inline,
    id: a.id + b.id,
    class: a.class + b.class,
    element: a.element + b.element
  };
}

export function compareSpecificity(a: Specificity, b: Specificity): number {
  if (a.inline !== b.inline) return a.inline - b.inline;
  if (a.id !== b.id) return a.id - b.id;
  if (a.class !== b.class) return a.class - b.class;
  return a.element - b.element;
}

export function specificityToString(spec: Specificity): string {
  return `(${spec.inline}, ${spec.id}, ${spec.class}, ${spec.element})`;
}

const ID_SELECTOR_REGEX = /#[a-zA-Z_-][a-zA-Z0-9_-]*/g;
const CLASS_SELECTOR_REGEX = /\.[a-zA-Z_-][a-zA-Z0-9_-]*/g;
const PSEUDO_CLASS_REGEX = /:[a-zA-Z-]+/g;
const ATTRIBUTE_SELECTOR_REGEX = /\[[^\]]+\]/g;
const ELEMENT_REGEX = /^[a-zA-Z][a-zA-Z0-9]*/;

const PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter', 'selection', 'marker', 'placeholder']);
const PSEUDO_CLASSES_WITH_ARGS = new Set(['not', 'has', 'is', 'where', 'nth-child', 'nth-of-type', 'nth-last-child', 'nth-last-of-type']);

function countIds(selector: string): number {
  const matches = selector.match(ID_SELECTOR_REGEX);
  return matches ? matches.length : 0;
}

function countClasses(selector: string): number {
  const matches = selector.match(CLASS_SELECTOR_REGEX);
  return matches ? matches.length : 0;
}

function countAttributeSelectors(selector: string): number {
  const matches = selector.match(ATTRIBUTE_SELECTOR_REGEX);
  return matches ? matches.length : 0;
}

function countPseudoClasses(selector: string): number {
  let count = 0;
  const pseudoMatches = selector.match(PSEUDO_CLASS_REGEX);
  
  if (pseudoMatches) {
    for (const match of pseudoMatches) {
      const pseudoName = match.slice(1);
      
      if (PSEUDO_ELEMENTS.has(pseudoName)) {
        continue;
      }
      
      if (PSEUDO_CLASSES_WITH_ARGS.has(pseudoName)) {
        continue;
      }
      
      count++;
    }
  }
  
  return count;
}

function countElements(selector: string): number {
  let count = 0;
  
  const cleaned = selector
    .replace(ID_SELECTOR_REGEX, ' ')
    .replace(CLASS_SELECTOR_REGEX, ' ')
    .replace(PSEUDO_CLASS_REGEX, ' ')
    .replace(ATTRIBUTE_SELECTOR_REGEX, ' ')
    .replace(/[>+~]/g, ' ')
    .trim();
  
  const parts = cleaned.split(/\s+/).filter(Boolean);
  
  for (const part of parts) {
    if (ELEMENT_REGEX.test(part)) {
      if (!PSEUDO_ELEMENTS.has(part) && !PSEUDO_CLASSES_WITH_ARGS.has(part)) {
        count++;
      }
    }
  }
  
  return count;
}

export function calculateSelectorSpecificity(selector: string): Specificity {
  const trimmed = selector.trim();
  
  if (!trimmed) {
    return ZERO_SPECIFICITY;
  }
  
  if (trimmed.startsWith('style=')) {
    return createSpecificity(1, 0, 0, 0);
  }
  
  try {
    const idCount = countIds(trimmed);
    const classCount = countClasses(trimmed);
    const attrCount = countAttributeSelectors(trimmed);
    const pseudoClassCount = countPseudoClasses(trimmed);
    const elementCount = countElements(trimmed);
    
    return createSpecificity(
      0,
      idCount,
      classCount + attrCount + pseudoClassCount,
      elementCount
    );
  } catch (error) {
    logger.verbose(`Failed to calculate specificity for: ${selector}`);
    return ZERO_SPECIFICITY;
  }
}

export function calculateDescendantSpecificity(
  parentType: 'class' | 'element',
  parentName: string,
  targetType: 'class' | 'element',
  targetName: string
): Specificity {
  const parentSpec = parentType === 'class'
    ? createSpecificity(0, 0, 1, 0)
    : createSpecificity(0, 0, 0, 1);
  
  const targetSpec = targetType === 'class'
    ? createSpecificity(0, 0, 1, 0)
    : createSpecificity(0, 0, 0, 1);
  
  return addSpecificity(parentSpec, targetSpec);
}

export function calculateSelectorSpecificityFromParts(parts: {
  hasClass: boolean;
  hasElement: boolean;
  hasPseudo: boolean;
  pseudoCount?: number;
  isDescendant?: boolean;
  parentType?: 'class' | 'element';
  targetType?: 'class' | 'element';
}): Specificity {
  let spec = ZERO_SPECIFICITY;
  
  if (parts.hasClass) {
    spec = addSpecificity(spec, createSpecificity(0, 0, 1, 0));
  }
  
  if (parts.hasElement) {
    spec = addSpecificity(spec, createSpecificity(0, 0, 0, 1));
  }
  
  if (parts.hasPseudo) {
    const pseudoCount = parts.pseudoCount || 1;
    spec = addSpecificity(spec, createSpecificity(0, 0, pseudoCount, 0));
  }
  
  if (parts.isDescendant && parts.parentType && parts.targetType) {
    spec = calculateDescendantSpecificity(parts.parentType, '', parts.targetType, '');
  }
  
  return spec;
}

export function isHigherSpecificity(a: Specificity, b: Specificity): boolean {
  return compareSpecificity(a, b) > 0;
}

export function isEqualSpecificity(a: Specificity, b: Specificity): boolean {
  return compareSpecificity(a, b) === 0;
}

export function getHigherSpecificity(a: Specificity, b: Specificity): Specificity {
  return compareSpecificity(a, b) >= 0 ? a : b;
}