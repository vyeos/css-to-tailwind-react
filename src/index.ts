// Export public API
export { scanProject, ScannedFile } from './scanner';
export { transformFiles, TransformOptions, TransformResults } from './transformer';
export { TailwindMapper, CSSProperty, ConversionResult } from './tailwindMapper';
export { JSXParser, JSXTransformation, JSXParseResult } from './jsxParser';
export { CSSParser, CSSRule, CSSParseResult, UtilityWithVariant } from './cssParser';
export { FileWriter, FileWriteOptions } from './fileWriter';
export { loadTailwindConfig, TailwindConfig } from './utils/config';
export { logger } from './utils/logger';
export {
  Breakpoint,
  MediaQueryInfo,
  getDefaultBreakpoints,
  resolveBreakpointsFromConfig,
  parseMediaQuery,
  findBreakpointForMinWidth,
  processMediaQuery,
  prefixWithBreakpoint
} from './utils/breakpointResolver';
export {
  ParsedSelector,
  PSEUDO_TO_VARIANT,
  SUPPORTED_PSEUDOS,
  parseSelector,
  mapPseudoToVariant,
  processPseudoSelector,
  parseMultipleSelectors
} from './utils/pseudoSelectorResolver';
export {
  VARIANT_ORDER,
  isResponsiveVariant,
  isPseudoVariant,
  sortVariants,
  deduplicateVariants,
  normalizeVariantOrder,
  assembleUtility,
  assembleUtilities,
  mergeUtilities,
  MergedUtility
} from './utils/variantAssembler';
