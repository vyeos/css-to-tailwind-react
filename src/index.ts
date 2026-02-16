// Export public API
export { scanProject, ScannedFile, ScanOptions } from './scanner';
export { transformFiles, transformFilesDetailed, TransformOptions, TransformResults, DetailedTransformResults } from './transformer';
export { TailwindMapper, CSSProperty, ConversionResult, MultiConversionResult, MapperOptions } from './tailwindMapper';
export { JSXParser, JSXTransformation, JSXParseResult } from './jsxParser';
export { CSSParser, CSSRule, CSSParseResult, UtilityWithVariant, SelectorTarget, CSSParserOptions } from './cssParser';
export { FileWriter, FileWriteOptions, writeFiles } from './fileWriter';
export { loadTailwindConfig, TailwindConfig } from './utils/config';
export { logger } from './utils/logger';
export { Reporter, FileResult, SummaryStats, ReporterOptions } from './utils/reporter';
export { 
  computeUnifiedDiff, 
  formatDiff, 
  computeAndFormatDiff, 
  getChangeStats,
  DiffResult,
  DiffHunk,
  DiffLine
} from './utils/diff';
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
export {
  DescendantSelector,
  SelectorPart,
  SelectorType,
  parseDescendantSelector,
  isDescendantSelector,
  isSimpleSelector,
  processDescendantSelector,
  isHtmlElement
} from './utils/descendantSelectorResolver';
export {
  transformDescendantSelectors,
  DescendantTransformResult,
  groupDescendantRulesByParent
} from './jsxDescendantTransformer';
export {
  Config,
  ConfigFile,
  CLIConfigOverrides,
  LogLevel,
  OutputMode,
  DEFAULT_CONFIG,
  ConfigValidationError,
  validateConfig,
  loadConfigFile,
  mergeConfigWithDefaults,
  applyCLIOverrides,
  resolveConfig,
  formatConfigForDebug
} from './utils/projectConfig';
