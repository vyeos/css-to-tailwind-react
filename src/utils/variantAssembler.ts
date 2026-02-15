import { logger } from './logger';

export const VARIANT_ORDER = ['sm', 'md', 'lg', 'xl', '2xl', 'hover', 'focus', 'active', 'disabled', 'visited', 'first', 'last', 'before', 'after', 'dark', 'light'];

const RESPONSIVE_VARIANTS = new Set(['sm', 'md', 'lg', 'xl', '2xl']);
const PSEUDO_VARIANTS = new Set(['hover', 'focus', 'active', 'disabled', 'visited', 'first', 'last', 'before', 'after']);

export function isResponsiveVariant(variant: string): boolean {
  return RESPONSIVE_VARIANTS.has(variant);
}

export function isPseudoVariant(variant: string): boolean {
  return PSEUDO_VARIANTS.has(variant);
}

export function sortVariants(variants: string[]): string[] {
  return [...variants].sort((a, b) => {
    const aIndex = VARIANT_ORDER.indexOf(a);
    const bIndex = VARIANT_ORDER.indexOf(b);
    
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    
    return aIndex - bIndex;
  });
}

export function deduplicateVariants(variants: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const variant of variants) {
    if (!seen.has(variant)) {
      seen.add(variant);
      result.push(variant);
    }
  }
  
  return result;
}

export function validateVariantOrder(variants: string[]): boolean {
  let hasSeenPseudo = false;
  
  for (const variant of variants) {
    if (isPseudoVariant(variant)) {
      hasSeenPseudo = true;
    } else if (isResponsiveVariant(variant) && hasSeenPseudo) {
      return false;
    }
  }
  
  return true;
}

export function normalizeVariantOrder(variants: string[]): string[] {
  const deduped = deduplicateVariants(variants);
  const responsive: string[] = [];
  const pseudo: string[] = [];
  const other: string[] = [];
  
  for (const variant of deduped) {
    if (isResponsiveVariant(variant)) {
      responsive.push(variant);
    } else if (isPseudoVariant(variant)) {
      pseudo.push(variant);
    } else {
      other.push(variant);
    }
  }
  
  const sortedResponsive = sortVariants(responsive);
  const sortedPseudo = sortVariants(pseudo);
  const sortedOther = sortVariants(other);
  
  return [...sortedResponsive, ...sortedPseudo, ...sortedOther];
}

export function assembleUtility(utility: string, variants?: string[]): string {
  if (!variants || variants.length === 0) {
    return utility;
  }
  
  const normalized = normalizeVariantOrder(variants);
  
  if (normalized.length === 0) {
    return utility;
  }
  
  const prefix = normalized.join(':');
  return `${prefix}:${utility}`;
}

export function assembleUtilities(utilities: Array<{ value: string; variants?: string[] }>): string[] {
  return utilities.map(u => assembleUtility(u.value, u.variants));
}

export interface MergedUtility {
  value: string;
  variants: string[];
}

export function mergeUtilities(utilities: Array<{ value: string; variants?: string[] }>): MergedUtility[] {
  const merged = new Map<string, Set<string>>();
  
  for (const utility of utilities) {
    const key = utility.value;
    const existing = merged.get(key) || new Set<string>();
    
    if (utility.variants) {
      for (const v of utility.variants) {
        existing.add(v);
      }
    }
    
    merged.set(key, existing);
  }
  
  const result: MergedUtility[] = [];
  
  for (const [value, variantSet] of merged.entries()) {
    result.push({
      value,
      variants: Array.from(variantSet)
    });
  }
  
  return result;
}