import { logger } from './logger';
import { Specificity, compareSpecificity, ZERO_SPECIFICITY } from './specificityCalculator';
import { getPropertyForUtility, propertiesConflict, getConflictGroup } from './propertyMapper';
import { normalizeVariantOrder } from './variantAssembler';

export interface UtilityWithMeta {
  value: string;
  variants: string[];
  cssProperty: string;
  specificity: Specificity;
  sourceOrder: number;
  originalSelector: string;
}

export interface ResolvedUtility {
  value: string;
  variants: string[];
  cssProperty: string;
}

export interface ConflictInfo {
  winner: UtilityWithMeta;
  losers: UtilityWithMeta[];
  property: string;
  variantKey: string;
}

const VARIANT_SEPARATOR = '\x00';

function createVariantKey(variants: string[]): string {
  const normalized = normalizeVariantOrder(variants);
  return normalized.length > 0 ? normalized.join(':') : VARIANT_SEPARATOR;
}

export function groupUtilitiesByPropertyAndVariant(
  utilities: UtilityWithMeta[]
): Map<string, Map<string, UtilityWithMeta[]>> {
  const groups = new Map<string, Map<string, UtilityWithMeta[]>>();
  
  for (const utility of utilities) {
    const property = utility.cssProperty;
    const variantKey = createVariantKey(utility.variants);
    
    if (!groups.has(property)) {
      groups.set(property, new Map());
    }
    
    const propertyGroup = groups.get(property)!;
    
    if (!propertyGroup.has(variantKey)) {
      propertyGroup.set(variantKey, []);
    }
    
    propertyGroup.get(variantKey)!.push(utility);
  }
  
  return groups;
}

export function resolveConflicts(
  utilities: UtilityWithMeta[],
  verbose = false
): { resolved: ResolvedUtility[]; conflicts: ConflictInfo[] } {
  const groups = groupUtilitiesByPropertyAndVariant(utilities);
  const resolved: ResolvedUtility[] = [];
  const conflicts: ConflictInfo[] = [];
  
  for (const [property, variantGroups] of groups) {
    for (const [variantKey, utilitiesInGroup] of variantGroups) {
      if (utilitiesInGroup.length === 1) {
        const util = utilitiesInGroup[0];
        resolved.push({
          value: util.value,
          variants: util.variants,
          cssProperty: util.cssProperty
        });
        continue;
      }
      
      const sorted = [...utilitiesInGroup].sort((a, b) => {
        const specCompare = compareSpecificity(b.specificity, a.specificity);
        if (specCompare !== 0) return specCompare;
        return b.sourceOrder - a.sourceOrder;
      });
      
      const winner = sorted[0];
      const losers = sorted.slice(1);
      
      resolved.push({
        value: winner.value,
        variants: winner.variants,
        cssProperty: winner.cssProperty
      });
      
      if (losers.length > 0) {
        conflicts.push({
          winner,
          losers,
          property,
          variantKey: variantKey === VARIANT_SEPARATOR ? '(base)' : variantKey
        });
        
        if (verbose) {
          const loserNames = losers.map(l => l.value).join(', ');
          logger.verbose(`Conflict in ${property} (${variantKey === VARIANT_SEPARATOR ? 'base' : variantKey}):`);
          logger.verbose(`  Winner: ${winner.value} (specificity: ${winner.specificity.id}/${winner.specificity.class}/${winner.specificity.element}, order: ${winner.sourceOrder})`);
          logger.verbose(`  Discarded: ${loserNames}`);
        }
      }
    }
  }
  
  return { resolved, conflicts };
}

export function resolveConflictsForElement(
  utilities: UtilityWithMeta[],
  verbose = false
): ResolvedUtility[] {
  const { resolved, conflicts } = resolveConflicts(utilities, verbose);
  
  return resolved;
}

export function mergeAndResolveUtilities(
  existingUtilities: UtilityWithMeta[],
  newUtilities: UtilityWithMeta[],
  verbose = false
): { utilities: UtilityWithMeta[]; conflicts: ConflictInfo[] } {
  const allUtilities = [...existingUtilities, ...newUtilities];
  const { resolved, conflicts } = resolveConflicts(allUtilities, verbose);
  
  return { utilities: allUtilities, conflicts };
}

export function buildUtilityWithMeta(
  value: string,
  variants: string[],
  cssProperty: string,
  specificity: Specificity,
  sourceOrder: number,
  originalSelector: string
): UtilityWithMeta {
  return {
    value,
    variants: normalizeVariantOrder(variants),
    cssProperty,
    specificity,
    sourceOrder,
    originalSelector
  };
}

export function groupUtilitiesByElement(
  utilities: Array<{
    utility: UtilityWithMeta;
    elementKey: string;
  }>
): Map<string, UtilityWithMeta[]> {
  const groups = new Map<string, UtilityWithMeta[]>();
  
  for (const { utility, elementKey } of utilities) {
    if (!groups.has(elementKey)) {
      groups.set(elementKey, []);
    }
    groups.get(elementKey)!.push(utility);
  }
  
  return groups;
}

export function resolveConflictsForAllElements(
  utilitiesByElement: Map<string, UtilityWithMeta[]>,
  verbose = false
): Map<string, ResolvedUtility[]> {
  const results = new Map<string, ResolvedUtility[]>();
  
  for (const [elementKey, utilities] of utilitiesByElement) {
    const resolved = resolveConflictsForElement(utilities, verbose);
    results.set(elementKey, resolved);
  }
  
  return results;
}

export function sortUtilitiesForOutput(utilities: ResolvedUtility[]): ResolvedUtility[] {
  return [...utilities].sort((a, b) => {
    const aVariantKey = createVariantKey(a.variants);
    const bVariantKey = createVariantKey(b.variants);
    
    if (aVariantKey !== bVariantKey) {
      return aVariantKey.localeCompare(bVariantKey);
    }
    
    return a.value.localeCompare(b.value);
  });
}

export function resolvedUtilityToString(utility: ResolvedUtility): string {
  if (utility.variants.length === 0) {
    return utility.value;
  }
  
  const prefix = utility.variants.join(':');
  return `${prefix}:${utility.value}`;
}

export function resolvedUtilitiesToStrings(utilities: ResolvedUtility[]): string[] {
  return sortUtilitiesForOutput(utilities).map(resolvedUtilityToString);
}