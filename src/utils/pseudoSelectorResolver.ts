import { logger } from './logger';

export interface ParsedSelector {
  baseClass: string;
  pseudos: string[];
  isComplex: boolean;
  reason?: string;
}

export const PSEUDO_TO_VARIANT: Record<string, string> = {
  'hover': 'hover',
  'focus': 'focus',
  'active': 'active',
  'disabled': 'disabled',
  'visited': 'visited',
  'first-child': 'first',
  'last-child': 'last',
  'before': 'before',
  'after': 'after'
};

export const SUPPORTED_PSEUDOS = new Set(Object.keys(PSEUDO_TO_VARIANT));

const UNSUPPORTED_PATTERNS = [
  ':nth-child',
  ':nth-of-type',
  ':not(',
  ':has(',
  ':is(',
  ':where(',
  ':first-of-type',
  ':last-of-type',
  ':only-child',
  ':only-of-type',
  ':empty',
  ':checked',
  ':indeterminate',
  ':default',
  ':required',
  ':valid',
  ':invalid',
  ':in-range',
  ':out-of-range',
  ':placeholder-shown',
  ':autofill',
  ':read-only',
  ':target',
  ':root',
  ':scope',
  ':lang(',
  ':dir('
];

export function parseSelector(selector: string): ParsedSelector {
  const trimmed = selector.trim();
  
  if (!trimmed.startsWith('.')) {
    return {
      baseClass: '',
      pseudos: [],
      isComplex: true,
      reason: `Not a class selector: ${selector}`
    };
  }
  
  for (const pattern of UNSUPPORTED_PATTERNS) {
    if (trimmed.toLowerCase().includes(pattern.toLowerCase())) {
      return {
        baseClass: '',
        pseudos: [],
        isComplex: true,
        reason: `Unsupported pseudo selector pattern: ${pattern}`
      };
    }
  }
  
  const pseudoMatches: string[] = [];
  let remaining = trimmed.slice(1);
  
  const pseudoRegex = /:([a-zA-Z-]+)/g;
  let match;
  let hasComplexPseudo = false;
  
  while ((match = pseudoRegex.exec(trimmed)) !== null) {
    const pseudo = match[1].toLowerCase();
    pseudoMatches.push(pseudo);
    
    if (!SUPPORTED_PSEUDOS.has(pseudo)) {
      hasComplexPseudo = true;
    }
  }
  
  if (pseudoMatches.length > 1) {
    return {
      baseClass: '',
      pseudos: [],
      isComplex: true,
      reason: `Skipped complex pseudo chain (${selector})`
    };
  }
  
  if (hasComplexPseudo && pseudoMatches.some(p => !SUPPORTED_PSEUDOS.has(p))) {
    const unsupported = pseudoMatches.find(p => !SUPPORTED_PSEUDOS.has(p));
    return {
      baseClass: '',
      pseudos: [],
      isComplex: true,
      reason: `Unsupported pseudo selector :${unsupported}`
    };
  }
  
  const baseClassMatch = remaining.match(/^([a-zA-Z_-][a-zA-Z0-9_-]*)/);
  if (!baseClassMatch) {
    return {
      baseClass: '',
      pseudos: [],
      isComplex: true,
      reason: `Invalid class name in selector: ${selector}`
    };
  }
  
  const baseClass = baseClassMatch[1];
  
  const expectedSelector = '.' + baseClass + pseudoMatches.map(p => `:${p}`).join('');
  const hasMultipleSelectors = trimmed.includes(',');
  const hasCombinators = /[>\s+~]/.test(trimmed.slice(baseClass.length + 1).replace(/:[a-zA-Z-]+/g, ''));
  
  if (hasCombinators && !hasMultipleSelectors) {
    return {
      baseClass: '',
      pseudos: [],
      isComplex: true,
      reason: `Complex selector with combinators: ${selector}`
    };
  }
  
  const variants = pseudoMatches
    .filter(p => SUPPORTED_PSEUDOS.has(p))
    .map(p => PSEUDO_TO_VARIANT[p]);
  
  return {
    baseClass,
    pseudos: variants,
    isComplex: false
  };
}

export function mapPseudoToVariant(pseudo: string): string | null {
  const normalized = pseudo.toLowerCase().replace(/^:/, '');
  return PSEUDO_TO_VARIANT[normalized] || null;
}

export function processPseudoSelector(selector: string): {
  baseClass: string | null;
  variants: string[];
  skipped: boolean;
  reason?: string;
} {
  const parsed = parseSelector(selector);
  
  if (parsed.isComplex) {
    logger.verbose(parsed.reason || `Skipped complex selector: ${selector}`);
    return {
      baseClass: null,
      variants: [],
      skipped: true,
      reason: parsed.reason
    };
  }
  
  if (parsed.pseudos.length > 0) {
    logger.verbose(`Converted pseudo selector :${parsed.pseudos.join(':')} → ${parsed.pseudos.join(':')}:`);
    logger.verbose(`Applied to class .${parsed.baseClass}`);
  }
  
  return {
    baseClass: parsed.baseClass,
    variants: parsed.pseudos,
    skipped: false
  };
}

export function parseMultipleSelectors(selector: string): ParsedSelector[] {
  const parts = selector.split(',').map(s => s.trim()).filter(Boolean);
  const results: ParsedSelector[] = [];
  
  for (const part of parts) {
    const parsed = parseSelector(part);
    results.push(parsed);
  }
  
  return results;
}