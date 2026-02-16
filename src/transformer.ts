import fs from 'fs';
import path from 'path';
import { ScannedFile } from './scanner';
import { TailwindMapper } from './tailwindMapper';
import { JSXParser } from './jsxParser';
import { CSSParser, CSSRule, UtilityWithVariant } from './cssParser';
import { TailwindConfig } from './utils/config';
import { logger } from './utils/logger';
import { clearBreakpointCache } from './utils/breakpointResolver';
import { 
  assembleUtilities, 
  normalizeVariantOrder 
} from './utils/variantAssembler';
import { transformDescendantSelectors } from './jsxDescendantTransformer';
import { 
  UtilityWithMeta, 
  resolveConflicts, 
  resolvedUtilitiesToStrings 
} from './utils/conflictResolver';
import { Specificity } from './utils/specificityCalculator';
import { FileResult, SummaryStats } from './utils/reporter';
import { VariableRegistry } from './utils/variableRegistry';
import { Config, DEFAULT_CONFIG } from './utils/projectConfig';

export interface TransformOptions {
  dryRun: boolean;
  deleteCss: boolean;
  skipExternal: boolean;
  skipInline: boolean;
  skipInternal: boolean;
  tailwindConfig: TailwindConfig | null;
  projectRoot: string;
  config?: Config;
  preserveOriginalCSS?: boolean;
  strictMode?: boolean;
  disableArbitraryValues?: boolean;
  ignoreSelectors?: string[];
  ignoreProperties?: string[];
}

export interface TransformResults {
  filesScanned: number;
  filesModified: number;
  stylesConverted: number;
  classesReplaced: number;
  warnings: number;
}

export interface DetailedTransformResults {
  fileResults: FileResult[];
  stats: SummaryStats;
}

interface ClassInfo {
  utilities: UtilityWithMeta[];
  sourceFile: string;
  fullyConvertible: boolean;
}

interface CSSClassMap {
  [className: string]: ClassInfo;
}

interface ProcessedCSSFile {
  path: string;
  content: string;
  newContent: string;
  rules: CSSRule[];
  canDelete: boolean;
  hasChanges: boolean;
  fullyConvertible: boolean;
  warnings: string[];
  error?: string;
}

interface ProcessedJSXFile {
  path: string;
  content: string;
  newContent: string;
  hasChanges: boolean;
  warnings: string[];
  error?: string;
  utilitiesGenerated: number;
  classesReplaced: number;
}

export async function transformFiles(
  files: ScannedFile[],
  options: TransformOptions
): Promise<TransformResults> {
  const detailed = await transformFilesDetailed(files, options);
  return {
    filesScanned: detailed.stats.filesScanned,
    filesModified: detailed.stats.filesModified,
    stylesConverted: detailed.stats.utilitiesGenerated,
    classesReplaced: detailed.stats.classesReplaced,
    warnings: detailed.stats.warnings
  };
}

export async function transformFilesDetailed(
  files: ScannedFile[],
  options: TransformOptions
): Promise<DetailedTransformResults> {
  const stats: SummaryStats = {
    filesScanned: files.length,
    filesModified: 0,
    filesUnchanged: 0,
    filesWithError: 0,
    utilitiesGenerated: 0,
    classesReplaced: 0,
    conflictsResolved: 0,
    unsupportedSelectors: 0,
    errors: 0,
    warnings: 0
  };

  const fileResults: FileResult[] = [];

  const config = options.config ?? DEFAULT_CONFIG;
  const strictMode = options.strictMode ?? config.strictMode;
  const disableArbitraryValues = options.disableArbitraryValues ?? config.disableArbitraryValues;
  const preserveOriginalCSS = options.preserveOriginalCSS ?? config.preserveOriginalCSS;
  const ignoreSelectors = options.ignoreSelectors ?? config.ignoreSelectors;
  const ignoreProperties = options.ignoreProperties ?? config.ignoreProperties;

  const mapper = new TailwindMapper(options.tailwindConfig || {}, {
    strictMode,
    disableArbitraryValues,
    customSpacingScale: config.customSpacingScale
  });
  const jsxParser = new JSXParser(mapper);
  const screens = options.tailwindConfig?.theme?.screens;
  
  const sharedVariableRegistry = new VariableRegistry();
  const cssParser = new CSSParser(mapper, screens, sharedVariableRegistry, {
    ignoreSelectors,
    ignoreProperties,
    preserveOriginalCSS
  });

  clearBreakpointCache();

  const cssClassMap: CSSClassMap = {};
  const allDescendantRules: CSSRule[] = [];

  const cssFiles = files.filter(f => f.type === 'css');
  const jsxFiles = files.filter(f => f.type === 'jsx');

  logger.info('\n🔍 Phase 0: Collecting CSS variables from all files...');

  if (!options.skipExternal) {
    for (const file of cssFiles) {
      try {
        const content = fs.readFileSync(file.path, 'utf-8');
        await cssParser.collectVariablesOnly(content, file.path);
      } catch (error) {
        logger.warn(`Failed to collect variables from ${file.path}: ${error}`);
      }
    }
    
    for (const file of jsxFiles) {
      if (options.skipInternal) continue;
      try {
        const content = fs.readFileSync(file.path, 'utf-8');
        await cssParser.collectVariablesFromInternalCSS(content, file.path);
      } catch (error) {
        logger.warn(`Failed to collect internal CSS variables from ${file.path}: ${error}`);
      }
    }
    
    logger.verbose(`Collected ${sharedVariableRegistry.getRegisteredVariables().length} unique CSS variables`);
  }

  logger.info('\n🔍 Phase 1: Analyzing CSS files...');

  const cssFileResults: Map<string, ProcessedCSSFile> = new Map();

  if (!options.skipExternal) {
    for (const file of cssFiles) {
      try {
        const content = fs.readFileSync(file.path, 'utf-8');
        const result = await cssParser.parse(content, file.path);

        const totalRules = result.rules.length;
        const fullyConvertedRules = result.rules.filter(r => r.fullyConverted).length;
        const partiallyConvertedRules = result.rules.filter(r => r.partialConversion).length;
        const fullyConvertible = totalRules > 0 && totalRules === fullyConvertedRules && partiallyConvertedRules === 0;

        result.rules.forEach(rule => {
          if (rule.isDescendant) {
            if (rule.convertedClasses.length > 0) {
              allDescendantRules.push(rule);
              stats.utilitiesGenerated += rule.declarations.length;
            }
          } else if (rule.className && rule.convertedClasses.length > 0) {
            const existing = cssClassMap[rule.className];
            if (existing) {
              mergeRuleIntoClassInfo(existing, rule);
            } else {
              cssClassMap[rule.className] = buildClassInfoFromRule(rule, file.path);
            }
            if (rule.fullyConverted) {
              stats.utilitiesGenerated += rule.declarations.length;
            } else {
              stats.utilitiesGenerated += rule.convertedClasses.length;
              logger.verbose(`  Rule .${rule.className}: partial conversion (${rule.convertedClasses.length}/${rule.declarations.length} declarations)`);
            }
          }
        });

        cssFileResults.set(file.path, {
          path: file.path,
          content,
          newContent: result.css,
          rules: result.rules,
          canDelete: result.canDelete,
          hasChanges: result.hasChanges,
          fullyConvertible,
          warnings: result.warnings
        });

        stats.warnings += result.warnings.length;

        logger.verbose(`Analyzed ${file.path}:`);
        logger.verbose(`  - Total rules: ${totalRules}`);
        logger.verbose(`  - Fully converted rules: ${fullyConvertedRules}`);
        logger.verbose(`  - Partially converted rules: ${partiallyConvertedRules}`);
        logger.verbose(`  - Fully convertible: ${fullyConvertible}`);

        result.warnings.forEach(warning => {
          logger.verbose(`⚠️  ${file.path}: ${warning}`);
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to analyze ${file.path}:`, error);
        cssFileResults.set(file.path, {
          path: file.path,
          content: '',
          newContent: '',
          rules: [],
          canDelete: false,
          hasChanges: false,
          fullyConvertible: false,
          warnings: [],
          error: errorMessage
        });
        stats.errors++;
        stats.warnings++;
      }
    }
  }

  logger.info('\n⚛️  Phase 2: Transforming React components...');

  const jsxFileResults: Map<string, ProcessedJSXFile> = new Map();

  for (const file of jsxFiles) {
    try {
      let content = fs.readFileSync(file.path, 'utf-8');
      const originalContent = content;
      let hasChanges = false;
      let fileWarnings: string[] = [];
      let utilitiesGenerated = 0;
      let classesReplaced = 0;

      if (!options.skipInline) {
        try {
          const jsxResult = jsxParser.parse(content, file.path);
          
          if (jsxResult.hasChanges) {
            content = jsxResult.code;
            hasChanges = true;
            utilitiesGenerated += jsxResult.transformations.reduce(
              (sum, t) => sum + t.classes.length, 0
            );
            fileWarnings.push(...jsxResult.warnings);
          }
        } catch (error) {
          logger.warn(`Failed to parse JSX inline styles in ${file.path}: ${error}`);
          fileWarnings.push(`JSX parse error: ${error}`);
        }
      }

      if (!options.skipInternal) {
        try {
          const internalResult = await cssParser.parseInternalCSS(content, file.path);
          
          if (internalResult.hasChanges) {
            content = internalResult.html;
            hasChanges = true;
            
            internalResult.rules.forEach(rule => {
              if (rule.isDescendant) {
                if (rule.convertedClasses.length > 0) {
                  allDescendantRules.push(rule);
                  utilitiesGenerated += rule.declarations.length;
                }
              } else if (rule.convertedClasses.length > 0 && rule.className) {
                const existing = cssClassMap[rule.className];
                if (existing) {
                  mergeRuleIntoClassInfo(existing, rule);
                } else {
                  cssClassMap[rule.className] = buildClassInfoFromRule(rule, file.path);
                }
                utilitiesGenerated += rule.declarations.length;
              }
            });
            
            fileWarnings.push(...internalResult.warnings);
          }
        } catch (error) {
          logger.warn(`Failed to parse internal CSS in ${file.path}: ${error}`);
          fileWarnings.push(`Internal CSS parse error: ${error}`);
        }
      }

      jsxFileResults.set(file.path, {
        path: file.path,
        content: originalContent,
        newContent: content,
        hasChanges,
        warnings: fileWarnings,
        utilitiesGenerated,
        classesReplaced
      });

      stats.warnings += fileWarnings.length;

      fileWarnings.forEach(warning => {
        logger.verbose(`⚠️  ${file.path}: ${warning}`);
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to process ${file.path}:`, error);
      jsxFileResults.set(file.path, {
        path: file.path,
        content: '',
        newContent: '',
        hasChanges: false,
        warnings: [],
        utilitiesGenerated: 0,
        classesReplaced: 0,
        error: errorMessage
      });
      stats.errors++;
    }
  }

  if (Object.keys(cssClassMap).length > 0) {
    logger.info('\n🔄 Phase 3: Replacing className references...');

    for (const [filePath, fileResult] of jsxFileResults) {
      if (fileResult.error) continue;
      
      let content = fileResult.newContent;
      let hasChanges = fileResult.hasChanges;

      const replacementResult = replaceClassNameReferences(content, cssClassMap);
      if (replacementResult.hasChanges) {
        content = replacementResult.code;
        hasChanges = true;
        fileResult.classesReplaced += replacementResult.replacements;
        stats.classesReplaced += replacementResult.replacements;
        
        logger.verbose(`Replaced ${replacementResult.replacements} class references in ${path.basename(filePath)}`);
      }

      jsxFileResults.set(filePath, {
        ...fileResult,
        newContent: content,
        hasChanges
      });
    }
  }

  if (allDescendantRules.length > 0) {
    logger.info('\n🌳 Phase 3.5: Applying descendant selector rules...');

    for (const [filePath, fileResult] of jsxFileResults) {
      if (fileResult.error) continue;
      
      let content = fileResult.newContent;
      let hasChanges = fileResult.hasChanges;

      const descendantResult = transformDescendantSelectors(content, allDescendantRules);
      if (descendantResult.hasChanges) {
        content = descendantResult.code;
        hasChanges = true;
        fileResult.classesReplaced += descendantResult.transformations;
        stats.classesReplaced += descendantResult.transformations;
        
        logger.verbose(`Applied ${descendantResult.transformations} descendant transformations in ${path.basename(filePath)}`);
      }

      if (descendantResult.warnings.length > 0) {
        stats.warnings += descendantResult.warnings.length;
        descendantResult.warnings.forEach(warning => {
          logger.verbose(`⚠️  ${filePath}: ${warning}`);
        });
      }

      jsxFileResults.set(filePath, {
        ...fileResult,
        newContent: content,
        hasChanges
      });
    }
  }

  for (const [filePath, fileResult] of jsxFileResults) {
    if (fileResult.error) {
      fileResults.push({
        filePath,
        originalContent: fileResult.content,
        newContent: fileResult.newContent,
        hasChanges: false,
        status: 'error',
        error: fileResult.error
      });
      stats.filesWithError++;
      continue;
    }
    
    const hasChanges = fileResult.newContent !== fileResult.content;
    
    fileResults.push({
      filePath,
      originalContent: fileResult.content,
      newContent: fileResult.newContent,
      hasChanges,
      status: hasChanges ? 'modified' : 'unchanged',
      transformations: {
        utilitiesGenerated: fileResult.utilitiesGenerated,
        classesReplaced: fileResult.classesReplaced,
        conflictsResolved: 0
      }
    });
    
    if (hasChanges) {
      stats.filesModified++;
    } else {
      stats.filesUnchanged++;
    }
  }

  for (const [filePath, fileResult] of cssFileResults) {
    if (fileResult.error) {
      fileResults.push({
        filePath,
        originalContent: fileResult.content,
        newContent: fileResult.newContent,
        hasChanges: false,
        status: 'error',
        error: fileResult.error
      });
      stats.filesWithError++;
      continue;
    }
    
    const hasChanges = fileResult.hasChanges && fileResult.newContent !== fileResult.content;
    
    fileResults.push({
      filePath,
      originalContent: fileResult.content,
      newContent: fileResult.newContent,
      hasChanges,
      status: hasChanges ? 'modified' : 'unchanged'
    });
    
    if (hasChanges) {
      stats.filesModified++;
    } else {
      stats.filesUnchanged++;
    }
  }

  stats.utilitiesGenerated = stats.classesReplaced + stats.utilitiesGenerated;

  return { fileResults, stats };
}

function buildClassInfoFromRule(rule: CSSRule, sourceFile: string): ClassInfo {
  return {
    utilities: rule.utilities.map(u => ({
      value: u.value,
      variants: normalizeVariantOrder([...u.variants]),
      cssProperty: u.cssProperty,
      specificity: u.specificity,
      sourceOrder: u.sourceOrder,
      originalSelector: rule.selector
    })),
    sourceFile,
    fullyConvertible: rule.fullyConverted
  };
}

function mergeRuleIntoClassInfo(info: ClassInfo, rule: CSSRule): void {
  for (const utility of rule.utilities) {
    const utilityWithMeta: UtilityWithMeta = {
      value: utility.value,
      variants: normalizeVariantOrder([...utility.variants]),
      cssProperty: utility.cssProperty,
      specificity: utility.specificity,
      sourceOrder: utility.sourceOrder,
      originalSelector: rule.selector
    };
    
    info.utilities.push(utilityWithMeta);
  }
}

function assembleTailwindClasses(info: ClassInfo): string {
  const { resolved } = resolveConflicts(info.utilities, false);
  return resolvedUtilitiesToStrings(resolved).join(' ');
}

function replaceClassNameReferences(
  code: string, 
  classMap: CSSClassMap
): { 
  code: string; 
  hasChanges: boolean; 
  replacements: number 
} {
  let hasChanges = false;
  let replacements = 0;
  let modifiedCode = code;

  Object.entries(classMap).forEach(([oldClass, info]) => {
    if (info.utilities.length === 0) {
      return;
    }

    const tailwindClassString = assembleTailwindClasses(info);
    
    if (info.fullyConvertible) {
      const pattern1 = new RegExp(`className="${oldClass}"`, 'g');
      if (pattern1.test(modifiedCode)) {
        modifiedCode = modifiedCode.replace(pattern1, `className="${tailwindClassString}"`);
        hasChanges = true;
        replacements++;
        logger.verbose(`Replaced className="${oldClass}" with "${tailwindClassString}"`);
      }

      const pattern2 = new RegExp(`className=\\{"${oldClass}"\\}`, 'g');
      if (pattern2.test(modifiedCode)) {
        modifiedCode = modifiedCode.replace(pattern2, `className="${tailwindClassString}"`);
        hasChanges = true;
        replacements++;
        logger.verbose(`Replaced className={"${oldClass}"} with "${tailwindClassString}"`);
      }

      const pattern3 = new RegExp(`className=\\{\`\\s*${oldClass}\\s*\`\\}`, 'g');
      if (pattern3.test(modifiedCode)) {
        modifiedCode = modifiedCode.replace(pattern3, `className="${tailwindClassString}"`);
        hasChanges = true;
        replacements++;
        logger.verbose(`Replaced className={\`${oldClass}\`} with "${tailwindClassString}"`);
      }
    } else {
      const combinedClassString = `${oldClass} ${tailwindClassString}`;
      
      const pattern1 = new RegExp(`className="${oldClass}"`, 'g');
      if (pattern1.test(modifiedCode)) {
        modifiedCode = modifiedCode.replace(pattern1, `className="${combinedClassString}"`);
        hasChanges = true;
        replacements++;
        logger.verbose(`Appended to className="${oldClass}" → "${combinedClassString}"`);
      }

      const pattern2 = new RegExp(`className=\\{"${oldClass}"\\}`, 'g');
      if (pattern2.test(modifiedCode)) {
        modifiedCode = modifiedCode.replace(pattern2, `className="${combinedClassString}"`);
        hasChanges = true;
        replacements++;
        logger.verbose(`Appended to className={"${oldClass}"} → "${combinedClassString}"`);
      }

      const pattern3 = new RegExp(`className=\\{\`\\s*${oldClass}\\s*\`\\}`, 'g');
      if (pattern3.test(modifiedCode)) {
        modifiedCode = modifiedCode.replace(pattern3, `className="${combinedClassString}"`);
        hasChanges = true;
        replacements++;
        logger.verbose(`Appended to className={\`${oldClass}\`} → "${combinedClassString}"`);
      }
    }
  });

  return { code: modifiedCode, hasChanges, replacements };
}
