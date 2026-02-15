import fs from 'fs';
import path from 'path';
import { ScannedFile } from './scanner';
import { TailwindMapper } from './tailwindMapper';
import { JSXParser } from './jsxParser';
import { CSSParser, CSSRule } from './cssParser';
import { FileWriter } from './fileWriter';
import { TailwindConfig } from './utils/config';
import { logger } from './utils/logger';

export interface TransformOptions {
  dryRun: boolean;
  deleteCss: boolean;
  skipExternal: boolean;
  skipInline: boolean;
  skipInternal: boolean;
  tailwindConfig: TailwindConfig | null;
  projectRoot: string;
}

export interface TransformResults {
  filesScanned: number;
  filesModified: number;
  stylesConverted: number;
  classesReplaced: number;
  warnings: number;
}

interface CSSClassMap {
  [className: string]: {
    tailwindClasses: string[];
    sourceFile: string;
    fullyConvertible: boolean;
  };
}

export async function transformFiles(
  files: ScannedFile[],
  options: TransformOptions
): Promise<TransformResults> {
  const results: TransformResults = {
    filesScanned: files.length,
    filesModified: 0,
    stylesConverted: 0,
    classesReplaced: 0,
    warnings: 0
  };

  const mapper = new TailwindMapper(options.tailwindConfig || {});
  const jsxParser = new JSXParser(mapper);
  const cssParser = new CSSParser(mapper);
  const fileWriter = new FileWriter({ dryRun: options.dryRun });

  // PASS 1: Analyze all files WITHOUT modifying anything
  // Collect CSS mappings and gather info about what can be safely converted
  const cssClassMap: CSSClassMap = {};
  const cssFileResults: Map<string, {
    content: string;
    newContent: string;
    rules: CSSRule[];
    canDelete: boolean;
    hasChanges: boolean;
    fullyConvertible: boolean;
  }> = new Map();

  logger.info('\n🔍 Phase 1: Analyzing files...');

  // Analyze CSS files
  if (!options.skipExternal) {
    for (const file of files.filter(f => f.type === 'css')) {
      try {
        const content = fs.readFileSync(file.path, 'utf-8');
        const result = await cssParser.parse(content, file.path);

        // Check if ALL rules in this file are FULLY converted (all declarations)
        const totalRules = result.rules.length;
        const fullyConvertedRules = result.rules.filter(r => r.fullyConverted).length;
        const partiallyConvertedRules = result.rules.filter(r => r.partialConversion).length;
        // A file is only "fully convertible" if ALL rules are fully converted (no partial conversions)
        const fullyConvertible = totalRules > 0 && totalRules === fullyConvertedRules && partiallyConvertedRules === 0;

        // Build class map (only for fully converted classes - partial conversions keep the CSS)
        result.rules.forEach(rule => {
          if (rule.fullyConverted) {
            cssClassMap[rule.className] = {
              tailwindClasses: rule.convertedClasses,
              sourceFile: file.path,
              fullyConvertible: true
            };
            results.stylesConverted += rule.declarations.length;
          } else if (rule.partialConversion) {
            // For partial conversions, we converted some declarations but keep the CSS rule
            // Count the converted declarations
            results.stylesConverted += rule.convertedClasses.length;
            logger.verbose(`  Rule .${rule.className}: partial conversion (${rule.convertedClasses.length}/${rule.declarations.length} declarations)`);
          }
        });

        cssFileResults.set(file.path, {
          content,
          newContent: result.css,
          rules: result.rules,
          canDelete: result.canDelete,
          hasChanges: result.hasChanges,
          fullyConvertible
        });

        results.warnings += result.warnings.length;

        // Log analysis
        logger.verbose(`Analyzed ${file.path}:`);
        logger.verbose(`  - Total rules: ${totalRules}`);
        logger.verbose(`  - Fully converted rules: ${fullyConvertedRules}`);
        logger.verbose(`  - Partially converted rules: ${partiallyConvertedRules}`);
        logger.verbose(`  - Fully convertible: ${fullyConvertible}`);

        // Log warnings
        result.warnings.forEach(warning => {
          logger.verbose(`⚠️  ${file.path}: ${warning}`);
        });

      } catch (error) {
        logger.error(`Failed to analyze ${file.path}:`, error);
        results.warnings++;
      }
    }
  }

  // PASS 2: Transform JSX/TSX files
  logger.info('\n⚛️  Phase 2: Transforming React components...');

  const jsxFileResults: Map<string, {
    content: string;
    newContent: string;
    hasChanges: boolean;
  }> = new Map();

  for (const file of files.filter(f => f.type === 'jsx')) {
    try {
      let content = fs.readFileSync(file.path, 'utf-8');
      const originalContent = content;
      let hasChanges = false;
      let fileWarnings: string[] = [];

      // Process inline styles
      if (!options.skipInline) {
        try {
          const jsxResult = jsxParser.parse(content, file.path);
          
          if (jsxResult.hasChanges) {
            content = jsxResult.code;
            hasChanges = true;
            results.stylesConverted += jsxResult.transformations.reduce(
              (sum, t) => sum + t.classes.length, 0
            );
            fileWarnings.push(...jsxResult.warnings);
          }
        } catch (error) {
          logger.warn(`Failed to parse JSX inline styles in ${file.path}: ${error}`);
          fileWarnings.push(`JSX parse error: ${error}`);
        }
      }

      // Process internal CSS
      if (!options.skipInternal) {
        try {
          const internalResult = await cssParser.parseInternalCSS(content, file.path);
          
          if (internalResult.hasChanges) {
            content = internalResult.html;
            hasChanges = true;
            
            // Build class map from internal styles
            internalResult.rules.forEach(rule => {
              if (rule.convertedClasses.length > 0) {
                cssClassMap[rule.className] = {
                  tailwindClasses: rule.convertedClasses,
                  sourceFile: file.path,
                  fullyConvertible: true
                };
                results.stylesConverted += rule.declarations.length;
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
        content: originalContent,
        newContent: content,
        hasChanges
      });

      results.warnings += fileWarnings.length;

      // Log warnings
      fileWarnings.forEach(warning => {
        logger.verbose(`⚠️  ${file.path}: ${warning}`);
      });

    } catch (error) {
      logger.error(`Failed to process ${file.path}:`, error);
      results.warnings++;
    }
  }

  // PASS 3: Replace className references from external CSS
  // This must happen after all JSX files are parsed
  if (Object.keys(cssClassMap).length > 0) {
    logger.info('\n🔄 Phase 3: Replacing className references...');

    for (const [filePath, fileResult] of jsxFileResults) {
      let content = fileResult.newContent;
      let hasChanges = fileResult.hasChanges;

      // Replace className references
      const replacementResult = replaceClassNameReferences(content, cssClassMap);
      if (replacementResult.hasChanges) {
        content = replacementResult.code;
        hasChanges = true;
        results.classesReplaced += replacementResult.replacements;
        
        logger.verbose(`Replaced ${replacementResult.replacements} class references in ${path.basename(filePath)}`);
      }

      // Update the result
      jsxFileResults.set(filePath, {
        ...fileResult,
        newContent: content,
        hasChanges
      });
    }
  }

  // PASS 4: Write all changes
  logger.info('\n💾 Phase 4: Writing changes...');

  // Write JSX files
  for (const [filePath, fileResult] of jsxFileResults) {
    if (fileResult.hasChanges) {
      const success = await fileWriter.writeFile(filePath, fileResult.newContent, fileResult.content);
      if (success) {
        results.filesModified++;
      }
    }
  }

  // Write CSS files (SAFETY: Only modify if fully convertible or explicitly allowed)
  if (!options.skipExternal) {
    for (const [filePath, fileResult] of cssFileResults) {
      if (!fileResult.hasChanges) continue;

      // SAFETY RULE 1: Never modify CSS files that aren't fully convertible
      // unless they only have unconvertible rules (no changes needed)
      if (!fileResult.fullyConvertible) {
        logger.warn(`⏭️  Skipping ${path.basename(filePath)} - not fully convertible (would break styles)`);
        logger.warn(`   Convertible: ${fileResult.rules.filter(r => r.convertedClasses.length > 0).length}/${fileResult.rules.length} rules`);
        continue;
      }

      // SAFETY RULE 2: Only delete if ALL rules converted AND --delete-css flag used
      if (fileResult.canDelete && options.deleteCss) {
        const success = await fileWriter.deleteFile(filePath);
        if (success) {
          results.filesModified++;
          logger.info(`🗑️  Deleted ${path.basename(filePath)} (all rules converted)`);
        }
      } else if (fileResult.canDelete && !options.deleteCss) {
        // File is empty but don't delete without permission
        logger.info(`ℹ️  ${path.basename(filePath)} is now empty (use --delete-css to remove)`);
      } else {
        // Write modified CSS (only if fully convertible)
        const success = await fileWriter.writeFile(filePath, fileResult.newContent, fileResult.content);
        if (success) {
          results.filesModified++;
        }
      }
    }
  }

  return results;
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
    // Skip if not fully convertible
    if (!info.fullyConvertible) {
      return;
    }

    const tailwindClassString = info.tailwindClasses.join(' ');
    
    // Pattern 1: className="oldClass" (simple string)
    const pattern1 = new RegExp(`className="${oldClass}"`, 'g');
    if (pattern1.test(modifiedCode)) {
      modifiedCode = modifiedCode.replace(pattern1, `className="${tailwindClassString}"`);
      hasChanges = true;
      replacements++;
      logger.verbose(`Replaced className="${oldClass}" with "${tailwindClassString}"`);
    }

    // Pattern 2: className={"oldClass"} (expression with string)
    const pattern2 = new RegExp(`className=\\{"${oldClass}"\\}`, 'g');
    if (pattern2.test(modifiedCode)) {
      modifiedCode = modifiedCode.replace(pattern2, `className="${tailwindClassString}"`);
      hasChanges = true;
      replacements++;
      logger.verbose(`Replaced className={"${oldClass}"} with "${tailwindClassString}"`);
    }

    // Pattern 3: className={`oldClass`} (simple template literal)
    const pattern3 = new RegExp(`className=\\{\`\\s*${oldClass}\\s*\`\\}`, 'g');
    if (pattern3.test(modifiedCode)) {
      modifiedCode = modifiedCode.replace(pattern3, `className="${tailwindClassString}"`);
      hasChanges = true;
      replacements++;
      logger.verbose(`Replaced className={\`${oldClass}\`} with "${tailwindClassString}"`);
    }
  });

  return { code: modifiedCode, hasChanges, replacements };
}
